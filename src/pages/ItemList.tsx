import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { itemService } from '../services/itemService';
import { historyService } from '../services/historyService';
import { pendingRequestService } from '../services/pendingRequestService';
import type { Item, PendingRequest } from '../lib/supabase';
import type { UserRole } from '../App';
import { ArchiveModal } from '../components/ArchiveModal';
import { UnarchiveModal } from '../components/UnarchiveModal';
import { ItemDetailModal } from '../components/ItemDetailModal';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

interface ItemListProps {
  userRole: UserRole;
}

export default function ItemList({ userRole }: ItemListProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showUnarchiveModal, setShowUnarchiveModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [unarchiving, setUnarchiving] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailItem, setDetailItem] = useState<Item | null>(null);
  const [requesting, setRequesting] = useState<Set<string>>(new Set());
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const navigate = useNavigate();

  // Long press handling for mobile
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const [isLongPress, setIsLongPress] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  const filterOptions = [
    { value: 'all', label: 'Active Items' },
    { value: 'available', label: 'Available' },
    { value: 'used', label: 'Used' },
    { value: 'archived', label: 'Archived' },
  ];

  useEffect(() => {
    loadData();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setShowFilterDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const loadData = async () => {
    try {
      setError(null);
      const [itemsData, pendingRequestsData] = await Promise.all([
        itemService.getItems(),
        pendingRequestService.getAllPendingRequests()
      ]);
      setItems(itemsData);
      setPendingRequests(pendingRequestsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const searchLower = search.toLowerCase();
      const matchesSearch =
        item.material.toLowerCase().includes(searchLower) ||
        (item.description && item.description.toLowerCase().includes(searchLower)) ||
        item.serial_number.toLowerCase().includes(searchLower) ||
        (item.last_used_by_user?.username && item.last_used_by_user.username.toLowerCase().includes(searchLower));

      if (filter === 'archived') return item.status === 'archived' && matchesSearch;
      if (filter === 'all') return item.status !== 'archived' && matchesSearch;
      return matchesSearch && item.status === filter;
    });
  }, [items, filter, search]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const handleFilterChange = (newFilter: string) => {
    setFilter(newFilter);
    setShowFilterDropdown(false);
  };

  const handleArchive = (item: Item, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedItem(item);
    setShowArchiveModal(true);
  };

  const handleUnarchive = (item: Item, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedItem(item);
    setShowUnarchiveModal(true);
  };

  const confirmArchive = async (reason: string) => {
    if (!selectedItem) return;

    setArchiving(true);
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        throw new Error('User not authenticated');
      }

      await itemService.updateItemStatus(
        selectedItem.id,
        'archived',
        userId,
        { archived_reason: reason }
      );

      await historyService.createEntry({
        item_id: selectedItem.id,
        action: 'archived',
        performed_by: userId,
        details: `Item archived: ${reason}`,
        previous_status: selectedItem.status,
        new_status: 'archived'
      });

      await loadData();
      
      setShowArchiveModal(false);
      setSelectedItem(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to archive item');
    } finally {
      setArchiving(false);
    }
  };

  const confirmUnarchive = async (reason: string) => {
    if (!selectedItem) return;

    setUnarchiving(true);
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Restore item to available status
      await itemService.updateItemStatus(
        selectedItem.id,
        'available',
        userId,
        { 
          archived_reason: null,
          last_used_by: null // Clear last used by when restoring
        }
      );

      await historyService.createEntry({
        item_id: selectedItem.id,
        action: 'edited', // Using 'edited' as the closest action type for restoration
        performed_by: userId,
        details: `Item restored from archive: ${reason}`,
        previous_status: 'archived',
        new_status: 'available'
      });

      await loadData();
      
      setShowUnarchiveModal(false);
      setSelectedItem(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore item');
    } finally {
      setUnarchiving(false);
    }
  };

  // Mobile long press handlers
  const handleTouchStart = (item: Item) => {
    setIsLongPress(false);
    longPressTimer.current = setTimeout(() => {
      setIsLongPress(true);
      if (userRole === 'admin' || userRole === 'manager') {
        // Haptic feedback if available
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
        navigate(`/items/history/${item.id}`);
      }
    }, 500); // 500ms for long press
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  const handleRowClick = (item: Item) => {
    // Prevent click if it was a long press
    if (isLongPress) {
      setIsLongPress(false);
      return;
    }

    // On mobile/tablet, single click shows details
    if (window.innerWidth < 1024) {
      setDetailItem(item);
      setShowDetailModal(true);
    }
  };

  const handleRowDoubleClick = (item: Item) => {
    // Double-click behavior for desktop only
    if (window.innerWidth >= 1024) {
      if (userRole === 'admin' || userRole === 'manager') {
        navigate(`/items/history/${item.id}`);
      } else {
        // For employees, double-click also shows details
        setDetailItem(item);
        setShowDetailModal(true);
      }
    }
  };

  const handleEditClick = (itemId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigate(`/items/edit/${itemId}`);
  };

  // Check if current user has pending request for this item
  const hasUserPendingRequest = (itemId: string, actionType: 'use' | 'return'): boolean => {
    const currentUserId = localStorage.getItem('userId');
    if (!currentUserId) return false;

    return pendingRequests.some(request => 
      request.item_id === itemId && 
      request.requested_by === currentUserId && 
      request.type === actionType
    );
  };

  // employee borrow/return functionality
  const handleBorrowReturn = async (item: Item, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    const currentUserId = localStorage.getItem('userId');
    if (!currentUserId) {
      setError('User not authenticated');
      return;
    }

    // Check if item can be acted upon
    if (item.status === 'used' && item.last_used_by !== currentUserId) {
      setError('You can only return items that you borrowed');
      return;
    }

    if (requesting.has(item.id)) return;

    // Check if user already has a pending request for this action
    const actionType = item.status === 'available' ? 'use' : 'return';
    if (hasUserPendingRequest(item.id, actionType)) {
      setError(`You already have a pending ${actionType} request for this item`);
      return;
    }

    setRequesting(prev => new Set(prev).add(item.id));

    try {
      let historyAction: string;
      
      if (item.status === 'available') {
        historyAction = 'requested_borrow';
      } else if (item.status === 'used') {
        historyAction = 'requested_return';
      } else {
        setError('Cannot perform action on this item');
        return;
      }

      // Create pending request
      await pendingRequestService.createRequest({
        item_id: item.id,
        requested_by: currentUserId,
        action_type: actionType
      });

      // Add history entry
      await historyService.createEntry({
        item_id: item.id,
        action: historyAction as any,
        performed_by: currentUserId,
        details: `${historyAction === 'requested_borrow' ? 'Requested to borrow' : 'Requested to return'} item`,
        previous_status: item.status,
        new_status: item.status // Status doesn't change until approved
      });

      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process request');
    } finally {
      setRequesting(prev => {
        const newSet = new Set(prev);
        newSet.delete(item.id);
        return newSet;
      });
    }
  };

  const canUserActOnItem = (item: Item) => {
    const currentUserId = localStorage.getItem('userId');
    
    if (item.status === 'available') {
      // Check if user already has a pending borrow request
      return !hasUserPendingRequest(item.id, 'use');
    }
    if (item.status === 'used') {
      // Only borrower can return and only if they don't have a pending return request
      return item.last_used_by === currentUserId && !hasUserPendingRequest(item.id, 'return');
    }
    return false; // Cannot act on archived items
  };

  const getBorrowReturnButtonText = (item: Item) => {
    if (item.status === 'available') {
      if (hasUserPendingRequest(item.id, 'use')) {
        return 'Pending';
      }
      return 'Request';
    }
    if (item.status === 'used') {
      if (hasUserPendingRequest(item.id, 'return')) {
        return 'Pending';
      }
      return 'Return';
    }
    return '';
  };

  const getBorrowReturnButtonColor = (item: Item) => {
    if (item.status === 'available') {
      if (hasUserPendingRequest(item.id, 'use')) {
        return 'bg-yellow-500 text-white cursor-not-allowed';
      }
      return 'bg-blue-600 hover:bg-blue-700 text-white';
    }
    if (item.status === 'used') {
      if (hasUserPendingRequest(item.id, 'return')) {
        return 'bg-yellow-500 text-white cursor-not-allowed';
      }
      return 'bg-green-600 hover:bg-green-700 text-white';
    }
    return 'bg-gray-400 text-gray-600 cursor-not-allowed';
  };

  const getStatusDisplay = (status: string) => {
    const statusMap: Record<string, { label: string; color: string }> = {
      available: { label: 'Available', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
      used: { label: 'Used', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
      archived: { label: 'Archived', color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300' }
    };

    return statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300' };
  };

  const getCurrentFilterLabel = () => {
    const currentOption = filterOptions.find(option => option.value === filter);
    return currentOption ? currentOption.label : 'Select Filter';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 sm:h-24 sm:w-24 md:h-32 md:w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 sm:space-y-6 p-2 sm:p-4 lg:p-6 max-w-7xl mx-auto"
    >
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-3 sm:p-4 rounded-md border border-red-200 dark:border-red-800"
        >
          <div className="flex justify-between items-start">
            <span className="text-sm sm:text-base">{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-red-800 dark:text-red-200 hover:text-red-900 dark:hover:text-red-100 font-medium ml-2 flex-shrink-0"
            >
              ✕
            </button>
          </div>
        </motion.div>
      )}

      {/* Header Filter & Search */}
      <div className="flex flex-col space-y-3 sm:space-y-4 lg:flex-row lg:justify-between lg:items-center lg:space-y-0 lg:space-x-4">
        <div className="relative w-full lg:w-80 xl:w-96">
          <motion.input
            whileFocus={{ scale: 1.02 }}
            type="text"
            placeholder={userRole === 'employee' ? "Search items to borrow/return..." : "Search by material, description, serial number, or user..."}
            className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all duration-200 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 text-sm sm:text-base"
            value={search}
            onChange={handleSearchChange}
          />
        </div>
        
        {/* Custom dropdown with proper alignment */}
        <div className="relative w-full lg:w-auto" ref={filterDropdownRef}>
          <motion.button
            whileFocus={{ scale: 1.02 }}
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            className="w-full lg:w-auto border border-gray-300 dark:border-slate-600 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 pr-10 shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all duration-200 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 cursor-pointer text-sm sm:text-base text-left flex items-center justify-between min-w-[140px] lg:min-w-[160px]"
          >
            <span className="truncate">{getCurrentFilterLabel()}</span>
            <ChevronDownIcon 
              className={`h-4 w-4 text-gray-400 dark:text-slate-500 transition-transform duration-200 flex-shrink-0 ml-3 ${
                showFilterDropdown ? 'rotate-180' : ''
              }`} 
            />
          </motion.button>

          {/* Dropdown menu - Fixed alignment */}
          <AnimatePresence>
            {showFilterDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="absolute left-0 lg:right-0 lg:left-auto mt-2 w-full lg:w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-600 py-1 z-50"
              >
                {filterOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleFilterChange(option.value)}
                    className={`w-full text-left px-3 sm:px-4 py-2 sm:py-3 text-sm hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors ${
                      filter === option.value 
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium' 
                        : 'text-gray-700 dark:text-slate-300'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Admin Info */}
      {userRole === 'admin' && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-blue-800 dark:text-blue-300 leading-relaxed">
            💡 <strong>Tip:</strong> 
            <span className="hidden lg:inline"> Double-click on any item row to view the complete history of that material.</span>
            <span className="lg:hidden"> Tap on any item to view details, or long press (hold) to view history.</span>
            {filter === 'archived' && (
              <span className="block mt-1">
                📦 <strong>Archived Items:</strong> You can restore archived items back to active status using the "Restore" button.
              </span>
            )}
          </p>
        </div>
      )}

      {/* Manager Info */}
      {userRole === 'manager' && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-orange-800 dark:text-orange-300 leading-relaxed">
            👔 <strong>Manager View:</strong> 
            <span className="hidden lg:inline"> You can view all items and their history. Double-click on any item to view its complete history.</span>
            <span className="lg:hidden"> Tap on any item to view details, or long press (hold) to view history.</span>
            <span className="block mt-1">
              📋 <strong>Note:</strong> You cannot edit, archive, or restore items. Only administrators have these permissions.
            </span>
          </p>
        </div>
      )}

      {/* employee Info */}
      {userRole === 'employee' && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-green-800 dark:text-green-300 leading-relaxed">
            📋 <strong>How to use:</strong> 
            <span className="hidden sm:inline"> Search for items and tap on any item to view details and access borrow/return actions. Once you submit a request, the button will show "Pending" until an admin approves or rejects it.</span>
            <span className="sm:hidden"> Search for items and tap them to view details and access actions. Submitted requests will show as "Pending".</span>
          </p>
        </div>
      )}

      {/* Table Card */}
      <motion.div
        className="bg-white dark:bg-slate-800 shadow-xl rounded-xl overflow-hidden border border-gray-100 dark:border-slate-700"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-slate-700">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wider border-b border-gray-200 dark:border-slate-600">
                  Material
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wider border-b border-gray-200 dark:border-slate-600">
                  Description
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wider border-b border-gray-200 dark:border-slate-600">
                  Serial Number
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wider border-b border-gray-200 dark:border-slate-600">
                  Status
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wider border-b border-gray-200 dark:border-slate-600">
                  Last Used By
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wider border-b border-gray-200 dark:border-slate-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
              <AnimatePresence>
                {filteredItems.map((item) => {
                  const statusInfo = getStatusDisplay(item.status);
                  const isRequesting = requesting.has(item.id);
                  
                  return (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.2 }}
                      className="transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer"
                      onClick={() => handleRowClick(item)}
                      onDoubleClick={() => handleRowDoubleClick(item)}
                      title={userRole === 'admin' || userRole === 'manager' ? 'Double-click to view history' : 'Double-click to view details'}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-slate-100 max-w-[200px] truncate" title={item.material}>
                          {item.material}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600 dark:text-slate-400 max-w-[200px] truncate" title={item.description || '-'}>
                          {item.description || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-mono text-gray-900 dark:text-slate-100 px-2 py-1 rounded">
                          {item.serial_number}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                          <span className="w-2 h-2 rounded-full bg-current mr-2"></span>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="text-sm text-gray-600 dark:text-slate-400 max-w-[120px] truncate mx-auto" title={item.last_used_by_user?.username || '-'}>
                          {item.last_used_by_user?.username || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex justify-center space-x-2">
                          {userRole === 'admin' ? (
                            <>
                              {item.status !== 'archived' && (
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={(e) => handleEditClick(item.id, e)}
                                  className="inline-flex items-center justify-center px-4 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-md transition-colors min-w-[70px]"
                                >
                                  Edit
                                </motion.button>
                              )}
                              
                              {item.status === 'archived' ? (
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={(e) => handleUnarchive(item, e)}
                                  disabled={unarchiving}
                                  className="inline-flex items-center justify-center px-4 py-1.5 text-xs font-medium text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[70px]"
                                >
                                  {unarchiving && selectedItem?.id === item.id ? (
                                    <>
                                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-green-600 mr-1"></div>
                                      Restoring...
                                    </>
                                  ) : (
                                    'Restore'
                                  )}
                                </motion.button>
                              ) : (
                                item.status !== 'used' && (
                                  <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={(e) => handleArchive(item, e)}
                                    disabled={archiving}
                                    className="inline-flex items-center justify-center px-4 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[70px]"
                                  >
                                    {archiving && selectedItem?.id === item.id ? (
                                      <>
                                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600 mr-1"></div>
                                        Archiving...
                                      </>
                                    ) : (
                                      'Archive'
                                    )}
                                  </motion.button>
                                )
                              )}
                            </>
                          ) : userRole === 'manager' ? (
                            // Manager has no actions - view only
                            <span className="text-xs text-gray-400 dark:text-slate-500 italic bg-gray-50 dark:bg-slate-700 px-3 py-1.5 rounded-md min-w-[70px] text-center">
                              View Only
                            </span>
                          ) : (
                            // employee actions
                            item.status !== 'archived' && (
                              <motion.button
                                whileHover={canUserActOnItem(item) && !isRequesting ? { scale: 1.05 } : {}}
                                whileTap={canUserActOnItem(item) && !isRequesting ? { scale: 0.95 } : {}}
                                onClick={(e) => canUserActOnItem(item) && !isRequesting && handleBorrowReturn(item, e)}
                                disabled={!canUserActOnItem(item) || isRequesting}
                                className={`inline-flex items-center justify-center px-4 py-1.5 text-xs font-medium rounded-md transition-colors min-w-[80px] ${getBorrowReturnButtonColor(item)} ${
                                  !canUserActOnItem(item) || isRequesting ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                              >
                                {isRequesting ? (
                                  <>
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-1"></div>
                                    Processing...
                                  </>
                                ) : (
                                  getBorrowReturnButtonText(item)
                                )}
                              </motion.button>
                            )
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* Mobile/Tablet Table - With long press support */}
        <div className="block lg:hidden">
          <table className="w-full divide-y divide-gray-200 dark:divide-slate-700">
            <thead className="bg-gray-100 dark:bg-slate-700">
              <tr>
                <th className="px-3 sm:px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wide">
                  Material & Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-100 dark:divide-slate-700">
              <AnimatePresence>
                {filteredItems.map((item) => {
                  const statusInfo = getStatusDisplay(item.status);
                  
                  return (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.2 }}
                      className="transition-colors duration-150 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer select-none"
                      onClick={() => handleRowClick(item)}
                      onTouchStart={() => handleTouchStart(item)}
                      onTouchEnd={handleTouchEnd}
                      onTouchCancel={handleTouchEnd}
                      style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}
                    >
                      <td className="px-3 sm:px-4 py-4">
                        <div className="min-w-0">
                          <div className="font-medium text-sm text-gray-800 dark:text-slate-200 truncate">
                            {item.material}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-slate-400 font-mono mt-1 break-all">
                            {item.serial_number}
                          </div>
                          <div className="flex items-center space-x-2 mt-2">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                              ● {statusInfo.label}
                            </span>
                          </div>
                          {item.last_used_by_user && (
                            <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                              Last used by: {item.last_used_by_user.username}
                            </div>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {filteredItems.length === 0 && !loading && (
          <div className="text-center py-8 sm:py-12">
            <p className="text-gray-500 dark:text-slate-400 text-base sm:text-lg">
              {search ? 'No items found matching your search.' : 'No items found matching your criteria.'}
            </p>
            {userRole === 'employee' && search && (
              <p className="text-gray-400 dark:text-slate-500 text-sm mt-2">
                Try searching by material name or serial number
              </p>
            )}
          </div>
        )}
      </motion.div>

      {/* Item Detail Modal - Pass pending requests */}
      <ItemDetailModal
        item={detailItem}
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setDetailItem(null);
        }}
        userRole={userRole}
        onEdit={handleEditClick}
        onArchive={handleArchive}
        onUnarchive={handleUnarchive}
        pendingRequests={pendingRequests}
      />

      {/* Archive Modal - Only for admin */}
      {userRole === 'admin' && (
        <ArchiveModal
          isOpen={showArchiveModal}
          onClose={() => {
            setShowArchiveModal(false);
            setSelectedItem(null);
          }}
          onConfirm={confirmArchive}
          isLoading={archiving}
        />
      )}

      {/* Unarchive Modal - Only for admin */}
      {userRole === 'admin' && (
        <UnarchiveModal
          isOpen={showUnarchiveModal}
          onClose={() => {
            setShowUnarchiveModal(false);
            setSelectedItem(null);
          }}
          onConfirm={confirmUnarchive}
          isLoading={unarchiving}
        />
      )}
    </motion.div>
  );
}