import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, UserIcon, CalendarIcon } from '@heroicons/react/24/outline';
import type { Item, PendingRequest } from '../lib/supabase';
import type { UserRole } from '../App';
import { useState, useEffect, useCallback } from 'react';

interface ItemDetailModalProps {
  item: Item | null;
  isOpen: boolean;
  onClose: () => void;
  userRole: UserRole;
  onEdit?: (itemId: string) => void;
  onArchive?: (item: Item) => void;
  onUnarchive?: (item: Item) => void;
  pendingRequests?: PendingRequest[];
}

export function ItemDetailModal({ 
  item, 
  isOpen, 
  onClose, 
  userRole, 
  onEdit, 
  onArchive,
  onUnarchive,
  pendingRequests
}: ItemDetailModalProps) {
  const [requesting, setRequesting] = useState(false);
  const [userPendingRequests, setUserPendingRequests] = useState<PendingRequest[]>([]);

  // Load user's pending requests when modal opens
  const loadUserPendingRequests = useCallback(() => {
    if (!item) return;
    
    const currentUserId = localStorage.getItem('userId');
    if (!currentUserId) return;

    if (pendingRequests) {
      // Use the provided pendingRequests prop
      const userRequests = pendingRequests.filter(request => 
        request.requested_by === currentUserId && request.item_id === item.id
      );
      setUserPendingRequests(userRequests);
    } else {
      // Fallback to API call if pendingRequests prop is not provided
      const fetchRequests = async () => {
        try {
          const { pendingRequestService } = await import('../services/pendingRequestService');
          const requests = await pendingRequestService.getPendingRequestsForItem(item.id);
          
          // Filter to only current user's requests
          const userRequests = requests.filter(request => request.requested_by === currentUserId);
          setUserPendingRequests(userRequests);
        } catch (error) {
          console.error('Error loading pending requests:', error);
          setUserPendingRequests([]);
        }
      };
      
      fetchRequests();
    }
  }, [item, pendingRequests]);

  useEffect(() => {
    if (isOpen && item && userRole === 'employee') {
      loadUserPendingRequests();
    }
  }, [isOpen, item, userRole, loadUserPendingRequests]);

  if (!item) return null;

  const getStatusDisplay = (status: string) => {
    const statusMap: Record<string, { label: string; color: string }> = {
      available: { label: 'Available', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
      used: { label: 'Used', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
      archived: { label: 'Archived', color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300' }
    };

    return statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300' };
  };

  const statusInfo = getStatusDisplay(item.status);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Check if current user has pending request for this item
  const hasUserPendingRequest = (actionType: 'use' | 'return'): boolean => {
    return userPendingRequests.some(request => request.type === actionType);
  };

  // employee borrow/return functionality
  const handleBorrowReturn = async () => {
    const currentUserId = localStorage.getItem('userId');
    if (!currentUserId) {
      return;
    }

    // Check if item can be acted upon
    if (item.status === 'used' && item.last_used_by !== currentUserId) {
      return; // Can't return items not borrowed by current user
    }

    if (!canUserActOnItem(item)) return;

    // Check if user already has a pending request for this action
    const actionType = item.status === 'available' ? 'use' : 'return';
    if (hasUserPendingRequest(actionType)) {
      return; // User already has a pending request
    }

    setRequesting(true);

    try {
      // Import services dynamically to avoid circular dependencies
      const { pendingRequestService } = await import('../services/pendingRequestService');
      const { historyService } = await import('../services/historyService');

      let historyAction: string;
      
      if (item.status === 'available') {
        historyAction = 'requested_borrow';
      } else if (item.status === 'used') {
        historyAction = 'requested_return';
      } else {
        return; // Invalid status
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

      // Close modal and refresh parent
      onClose();
      window.location.reload(); // Simple refresh to update the list
    } catch (err) {
      console.error('Failed to process request:', err);
    } finally {
      setRequesting(false);
    }
  };

  const canUserActOnItem = (item: Item) => {
    const currentUserId = localStorage.getItem('userId');
    
    if (item.status === 'available') {
      // Check if user already has a pending borrow request
      return !hasUserPendingRequest('use');
    }
    if (item.status === 'used') {
      // Only borrower can return and only if they don't have a pending return request
      return item.last_used_by === currentUserId && !hasUserPendingRequest('return');
    }
    return false; // Cannot act on archived items
  };

  const getBorrowReturnButtonText = (item: Item) => {
    if (item.status === 'available') {
      if (hasUserPendingRequest('use')) {
        return 'Pending';
      }
      return 'Request';
    }
    if (item.status === 'used') {
      if (hasUserPendingRequest('return')) {
        return 'Pending';
      }
      return 'Return';
    }
    return '';
  };

  const getBorrowReturnButtonColor = (item: Item) => {
    if (item.status === 'available') {
      if (hasUserPendingRequest('use')) {
        return 'bg-yellow-500 text-white cursor-not-allowed';
      }
      return 'bg-blue-600 hover:bg-blue-700 text-white';
    }
    if (item.status === 'used') {
      if (hasUserPendingRequest('return')) {
        return 'bg-yellow-500 text-white cursor-not-allowed';
      }
      return 'bg-green-600 hover:bg-green-700 text-white';
    }
    return 'bg-gray-400 text-gray-600 cursor-not-allowed';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <div className="flex items-center justify-center min-h-screen px-4 py-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-25 backdrop-blur-sm"
              onClick={onClose}
            />

            {/* Modal Container - Improved positioning and responsiveness */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="relative z-10 w-full max-w-md mx-auto"
            >
              {/* Modal Content */}
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-slate-700">
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-slate-100">
                    Item Details
                  </h3>
                  <button
                    onClick={onClose}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                  {/* Material Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-slate-400 mb-1">
                      Material
                    </label>
                    <p className="text-base sm:text-lg font-semibold text-gray-900 dark:text-slate-100 break-words">
                      {item.material}
                    </p>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-slate-400 mb-1">
                      Description
                    </label>
                    <p className="text-sm text-gray-700 dark:text-slate-300 break-words">
                      {item.description || 'No description provided'}
                    </p>
                  </div>

                  {/* Serial Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-slate-400 mb-1">
                      Serial Number
                    </label>
                    <p className="text-sm font-mono text-gray-900 dark:text-slate-100 bg-gray-50 dark:bg-slate-700 px-3 py-2 rounded-md break-all">
                      {item.serial_number}
                    </p>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-slate-400 mb-1">
                      Status
                    </label>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color}`}>
                      <span className="w-2 h-2 rounded-full bg-current mr-2"></span>
                      {statusInfo.label}
                    </span>
                  </div>

                  {/* Last Used By */}
                  {item.last_used_by_user && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-slate-400 mb-1">
                        Last Used By
                      </label>
                      <div className="flex items-center space-x-2">
                        <UserIcon className="h-4 w-4 text-gray-400" />
                        <p className="text-sm text-gray-700 dark:text-slate-300">
                          {item.last_used_by_user.username}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Pending Request Status - Show for employees */}
                  {userRole === 'employee' && userPendingRequests.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-slate-400 mb-1">
                        Your Pending Request
                      </label>
                      <div className="space-y-1">
                        {userPendingRequests.map((request) => (
                          <span key={request.id} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                            <span className="w-2 h-2 rounded-full bg-current mr-2"></span>
                            {request.type === 'use' ? 'Borrow Request Pending' : 'Return Request Pending'}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Archived Info */}
                  {item.status === 'archived' && item.archived_reason && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-slate-400 mb-1">
                        Archive Reason
                      </label>
                      <p className="text-sm text-gray-700 dark:text-slate-300 bg-gray-50 dark:bg-slate-700 px-3 py-2 rounded-md break-words">
                        {item.archived_reason}
                      </p>
                    </div>
                  )}

                  {/* Timestamps */}
                  <div className="space-y-3 pt-2 border-t border-gray-200 dark:border-slate-600">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-slate-400 mb-1">
                        Created
                      </label>
                      <div className="flex items-center space-x-2">
                        <CalendarIcon className="h-4 w-4 text-gray-400" />
                        <p className="text-xs text-gray-600 dark:text-slate-400">
                          {formatDate(item.created_at)}
                        </p>
                      </div>
                    </div>
                    
                    {item.updated_at !== item.created_at && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500 dark:text-slate-400 mb-1">
                          Last Updated
                        </label>
                        <div className="flex items-center space-x-2">
                          <CalendarIcon className="h-4 w-4 text-gray-400" />
                          <p className="text-xs text-gray-600 dark:text-slate-400">
                            {formatDate(item.updated_at)}
                          </p>
                        </div>
                      </div>
                    )}

                    {item.archived_at && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500 dark:text-slate-400 mb-1">
                          Archived
                        </label>
                        <div className="flex items-center space-x-2">
                          <CalendarIcon className="h-4 w-4 text-gray-400" />
                          <p className="text-xs text-gray-600 dark:text-slate-400">
                            {formatDate(item.archived_at)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="px-4 sm:px-6 py-4 bg-gray-50 dark:bg-slate-700 border-t border-gray-200 dark:border-slate-600">
                  {userRole === 'admin' ? (
                    <div className="flex flex-col sm:flex-row gap-3">
                      {item.status !== 'archived' && (
                        <button
                          onClick={() => {
                            onEdit?.(item.id);
                            onClose();
                          }}
                          className="flex-1 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                          Edit Item
                        </button>
                      )}
                      
                      {item.status === 'archived' ? (
                        <button
                          onClick={() => {
                            onUnarchive?.(item);
                            onClose();
                          }}
                          className="flex-1 bg-green-600 text-white px-4 py-2.5 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                        >
                          Restore Item
                        </button>
                      ) : (
                        item.status !== 'used' && onArchive && (
                          <button
                            onClick={() => {
                              onArchive(item);
                              onClose();
                            }}
                            className="flex-1 bg-red-600 text-white px-4 py-2.5 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                          >
                            Archive Item
                          </button>
                        )
                      )}
                    </div>
                  ) : userRole === 'manager' ? (
                    // Manager has no actions - view only
                    <div className="text-center">
                      <span className="text-gray-500 dark:text-slate-400 text-sm italic bg-gray-100 dark:bg-slate-600 px-4 py-2 rounded-lg">
                        View Only Mode
                      </span>
                    </div>
                  ) : (
                    // employee actions
                    item.status !== 'archived' && (
                      <button
                        onClick={handleBorrowReturn}
                        disabled={!canUserActOnItem(item) || requesting}
                        className={`w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center ${getBorrowReturnButtonColor(item)} ${
                          !canUserActOnItem(item) || requesting ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        {requesting ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                            Processing...
                          </>
                        ) : (
                          getBorrowReturnButtonText(item)
                        )}
                      </button>
                    )
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}