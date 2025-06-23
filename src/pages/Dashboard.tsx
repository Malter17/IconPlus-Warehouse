import { useState, useEffect } from 'react';
import { itemService } from '../services/itemService';
import { pendingRequestService } from '../services/pendingRequestService';
import type { Item, PendingRequest } from '../lib/supabase';
import type { UserRole } from '../App';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  ClipboardDocumentListIcon, 
  BuildingStorefrontIcon, 
  TruckIcon,
  CheckCircleIcon,
  ClockIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';

interface DashboardProps {
  userRole?: UserRole;
}

export default function Dashboard({ userRole }: DashboardProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [processingRequests, setProcessingRequests] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

  // Track window width for responsive chart
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadItems = async () => {
    try {
      const itemsData = await itemService.getItems();
      setItems(itemsData);
    } catch (error) {
      console.error('Failed to load items:', error);
    }
  };

  const loadPendingRequests = async () => {
    try {
      const requests = await pendingRequestService.getAllPendingRequests();
      setPendingRequests(requests);
    } catch (error) {
      console.error('Failed to load pending requests:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([loadItems(), loadPendingRequests()]);
      setLoading(false);
    };
    loadData();
  }, []);

  // Group pending requests by item and action type for display
  const groupedPendingRequests = pendingRequests.reduce((acc, request) => {
    const key = `${request.item_id}-${request.type}`;
    if (!acc[key]) {
      acc[key] = {
        item: request.item,
        type: request.type,
        requests: []
      };
    }
    acc[key].requests.push(request);
    return acc;
  }, {} as Record<string, { item: any; type: string; requests: PendingRequest[] }>);

  const stats = {
    total: items.length,
    available: items.filter(item => item.status === 'available').length,
    used: items.filter(item => item.status === 'used').length,
    pending: Object.keys(groupedPendingRequests).length
  };

  const pieData = [
    { name: 'Available', value: stats.available },
    { name: 'Used', value: stats.used },
    { name: 'Pending', value: stats.pending },
  ];
  const COLORS = ['#22c55e', '#ef4444', '#f59e0b'];

  const handleApproval = async (requestId: string, approve: boolean) => {
    // Only admin can approve/reject requests
    if (userRole !== 'admin') return;
    
    if (processingRequests.has(requestId)) return;
    
    setProcessingRequests(prev => new Set(prev).add(requestId));
    
    try {
      const currentUserId = localStorage.getItem('userId');
      
      if (!currentUserId) {
        throw new Error('User ID not found. Please log in again.');
      }

      if (approve) {
        await pendingRequestService.approveRequest(requestId, currentUserId);
      } else {
        await pendingRequestService.rejectRequest(requestId, currentUserId);
      }

      // Reload data to reflect changes
      await Promise.all([loadItems(), loadPendingRequests()]);

    } catch (error) {
      console.error('Failed to handle approval:', error);
    } finally {
      setProcessingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  const getRequestTypeInfo = (type: string) => {
    switch (type) {
      case 'use':
        return {
          label: 'Use Request',
          icon: '📤',
          color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
          description: 'Employee wants to use this item'
        };
      case 'return':
        return {
          label: 'Return Request',
          icon: '📥',
          color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
          description: 'Employee wants to return this item'
        };
      default:
        return {
          label: 'Unknown',
          icon: '❓',
          color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
          description: 'Unknown request type'
        };
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  // Calculate responsive chart dimensions
  const getChartDimensions = () => {
    if (windowWidth < 320) {
      return { height: 200, outerRadius: 50, fontSize: '9px' };
    } else if (windowWidth < 480) {
      return { height: 220, outerRadius: 60, fontSize: '10px' };
    } else if (windowWidth < 640) {
      return { height: 250, outerRadius: 70, fontSize: '11px' };
    } else if (windowWidth < 768) {
      return { height: 280, outerRadius: 80, fontSize: '12px' };
    } else {
      return { height: 320, outerRadius: 100, fontSize: '12px' };
    }
  };

  const chartDimensions = getChartDimensions();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 sm:h-24 sm:w-24 md:h-32 md:w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-4 lg:p-6 max-w-7xl mx-auto">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 lg:gap-6">
        <motion.div 
          className="glass-effect rounded-lg shadow-glow p-3 sm:p-4 lg:p-6"
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <div className="flex items-center">
            <ClipboardDocumentListIcon className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-primary-600 flex-shrink-0" />
            <div className="ml-2 sm:ml-3 lg:ml-4 min-w-0 flex-1">
              <h3 className="text-xs sm:text-sm lg:text-lg font-semibold text-gray-700 dark:text-slate-300 truncate">Total Items</h3>
              <p className="text-lg sm:text-xl lg:text-3xl font-bold text-primary-600">{stats.total}</p>
            </div>
          </div>
        </motion.div>

        <motion.div 
          className="glass-effect rounded-lg shadow-glow p-3 sm:p-4 lg:p-6"
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <div className="flex items-center">
            <BuildingStorefrontIcon className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-green-600 flex-shrink-0" />
            <div className="ml-2 sm:ml-3 lg:ml-4 min-w-0 flex-1">
              <h3 className="text-xs sm:text-sm lg:text-lg font-semibold text-gray-700 dark:text-slate-300 truncate">Available</h3>
              <p className="text-lg sm:text-xl lg:text-3xl font-bold text-green-600">{stats.available}</p>
            </div>
          </div>
        </motion.div>

        <motion.div 
          className="glass-effect rounded-lg shadow-glow p-3 sm:p-4 lg:p-6"
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <div className="flex items-center">
            <TruckIcon className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-red-600 flex-shrink-0" />
            <div className="ml-2 sm:ml-3 lg:ml-4 min-w-0 flex-1">
              <h3 className="text-xs sm:text-sm lg:text-lg font-semibold text-gray-700 dark:text-slate-300 truncate">Used</h3>
              <p className="text-lg sm:text-xl lg:text-3xl font-bold text-red-600">{stats.used}</p>
            </div>
          </div>
        </motion.div>

        <motion.div 
          className="glass-effect rounded-lg shadow-glow p-3 sm:p-4 lg:p-6"
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <div className="flex items-center">
            <ClockIcon className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-yellow-600 flex-shrink-0" />
            <div className="ml-2 sm:ml-3 lg:ml-4 min-w-0 flex-1">
              <h3 className="text-xs sm:text-sm lg:text-lg font-semibold text-gray-700 dark:text-slate-300 truncate">Pending</h3>
              <p className="text-lg sm:text-xl lg:text-3xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Pending Approvals Section - Only show for admin */}
      <AnimatePresence>
        {Object.keys(groupedPendingRequests).length > 0 && userRole === 'admin' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass-effect rounded-lg shadow-glow p-3 sm:p-4 lg:p-6"
          >
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-800 dark:text-slate-200 flex items-center">
                <ClockIcon className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-yellow-600 mr-2 flex-shrink-0" />
                <span className="hidden sm:inline">Pending Approvals</span>
                <span className="sm:hidden">Pending</span>
                <span className="ml-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 text-xs sm:text-sm font-medium px-2 sm:px-2.5 py-0.5 rounded-full">
                  {Object.keys(groupedPendingRequests).length}
                </span>
              </h3>
            </div>

            <div className="space-y-2 sm:space-y-3 lg:space-y-4">
              {Object.values(groupedPendingRequests).map((group, index) => {
                const requestInfo = getRequestTypeInfo(group.type);
                
                if (!group.item) {
                  return null; // Skip requests without item data
                }
                
                return (
                  <motion.div
                    key={`${group.item.id}-${group.type}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-600 p-3 sm:p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="space-y-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start space-x-2 sm:space-x-3 mb-2">
                          <span className="text-base sm:text-lg lg:text-xl flex-shrink-0">{requestInfo.icon}</span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className="font-semibold text-gray-900 dark:text-slate-100 text-sm sm:text-base truncate">{group.item.material}</h4>
                            </div>
                            <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-400 truncate">{group.item.description}</p>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-gray-500 dark:text-slate-400 mb-2">
                          <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium ${requestInfo.color}`}>
                            {requestInfo.label}
                          </span>
                          <span className="text-xs text-gray-400 dark:text-slate-500">
                            {group.requests.length} employee{group.requests.length > 1 ? 's' : ''} requesting
                          </span>
                        </div>
                        
                        <p className="text-xs text-gray-400 dark:text-slate-500 font-mono truncate">
                          Serial: {group.item.serial_number}
                        </p>
                      </div>

                      {/* Show all requesting employees vertically */}
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-gray-600 dark:text-slate-400">Requesting employees:</p>
                        
                        {/* employees listed vertically */}
                        <div className="space-y-2">
                          {group.requests.map((request) => {
                            const isProcessing = processingRequests.has(request.id);
                            return (
                              <div key={request.id} className="flex items-center justify-between bg-gray-50 dark:bg-slate-600 rounded-lg p-3">
                                <div className="flex items-center space-x-2 min-w-0 flex-1">
                                  <UserIcon className="h-4 w-4 text-gray-400 dark:text-slate-500 flex-shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <span className="text-sm font-medium text-gray-700 dark:text-slate-300 block truncate">
                                      {request.requested_by_user?.username || 'Unknown'}
                                    </span>
                                    <span className="text-xs text-gray-500 dark:text-slate-400">
                                      {formatTimeAgo(request.requested_at)}
                                    </span>
                                  </div>
                                </div>
                                
                                <div className="flex space-x-2 flex-shrink-0">
                                  <motion.button
                                    onClick={() => handleApproval(request.id, true)}
                                    disabled={isProcessing}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                                      isProcessing
                                        ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                                        : 'bg-green-600 text-white hover:bg-green-700'
                                    }`}
                                  >
                                    {isProcessing ? (
                                      <div className="flex items-center space-x-1">
                                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                                        <span>Processing...</span>
                                      </div>
                                    ) : (
                                      'Approve'
                                    )}
                                  </motion.button>

                                  <motion.button
                                    onClick={() => handleApproval(request.id, false)}
                                    disabled={isProcessing}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                                      isProcessing
                                        ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                                        : 'bg-red-600 text-white hover:bg-red-700'
                                    }`}
                                  >
                                    {isProcessing ? (
                                      <div className="flex items-center space-x-1">
                                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                                        <span>Processing...</span>
                                      </div>
                                    ) : (
                                      'Reject'
                                    )}
                                  </motion.button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pending Requests View for Manager - Read Only */}
      <AnimatePresence>
        {Object.keys(groupedPendingRequests).length > 0 && userRole === 'manager' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass-effect rounded-lg shadow-glow p-3 sm:p-4 lg:p-6"
          >
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-800 dark:text-slate-200 flex items-center">
                <ClockIcon className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-yellow-600 mr-2 flex-shrink-0" />
                <span className="hidden sm:inline">Pending Requests</span>
                <span className="sm:hidden">Pending</span>
                <span className="ml-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 text-xs sm:text-sm font-medium px-2 sm:px-2.5 py-0.5 rounded-full">
                  {Object.keys(groupedPendingRequests).length}
                </span>
              </h3>
            </div>

            <div className="space-y-2 sm:space-y-3 lg:space-y-4">
              {Object.values(groupedPendingRequests).map((group, index) => {
                const requestInfo = getRequestTypeInfo(group.type);
                
                if (!group.item) {
                  return null; // Skip requests without item data
                }
                
                return (
                  <motion.div
                    key={`${group.item.id}-${group.type}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-600 p-3 sm:p-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start space-x-2 sm:space-x-3 mb-2">
                        <span className="text-base sm:text-lg lg:text-xl flex-shrink-0">{requestInfo.icon}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-semibold text-gray-900 dark:text-slate-100 text-sm sm:text-base truncate">{group.item.material}</h4>
                          </div>
                          <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-400 truncate">{group.item.description}</p>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-gray-500 dark:text-slate-400 mb-2">
                        <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium ${requestInfo.color}`}>
                          {requestInfo.label}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-slate-500">
                          {group.requests.length} employee{group.requests.length > 1 ? 's' : ''} requesting
                        </span>
                      </div>

                      {/* Show all requesting employees */}
                      <div className="mb-2">
                        <div className="flex flex-wrap gap-1">
                          {group.requests.map((request) => (
                            <div key={request.id} className="flex items-center space-x-1 bg-gray-100 dark:bg-slate-600 rounded px-2 py-1">
                              <UserIcon className="h-3 w-3 text-gray-400 dark:text-slate-500 flex-shrink-0" />
                              <span className="text-xs text-gray-700 dark:text-slate-300">
                                {request.requested_by_user?.username || 'Unknown'}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-slate-400">
                                ({formatTimeAgo(request.requested_at)})
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <p className="text-xs text-gray-400 dark:text-slate-500 font-mono truncate">
                        Serial: {group.item.serial_number}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
            
            <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
              <p className="text-xs sm:text-sm text-orange-800 dark:text-orange-300">
                👔 <strong>Manager View:</strong> You can view pending requests but only administrators can approve or reject them.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* No Pending Requests Message */}
      {Object.keys(groupedPendingRequests).length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-effect rounded-lg shadow-glow p-4 sm:p-6 lg:p-8 text-center"
        >
          <CheckCircleIcon className="h-10 w-10 sm:h-12 sm:w-12 lg:h-16 lg:w-16 text-green-500 mx-auto mb-3 sm:mb-4" />
          <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-700 dark:text-slate-300 mb-2">All Caught Up!</h3>
          <p className="text-xs sm:text-sm lg:text-base text-gray-500 dark:text-slate-400">No pending approval requests at the moment.</p>
        </motion.div>
      )}

      {/* Pie Chart - Fully Responsive */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-effect rounded-lg shadow-glow p-3 sm:p-4 lg:p-6"
      >
        <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-700 dark:text-slate-300 mb-3 sm:mb-4">Item Status Distribution</h3>
        <div className="w-full overflow-hidden">
          <ResponsiveContainer width="100%" height={chartDimensions.height} minWidth={200}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => {
                  // Show shorter labels on very small screens
                  if (windowWidth < 480) {
                    const shortName = name === 'Available' ? 'Avail' : name === 'Pending' ? 'Pend' : name;
                    return `${shortName} ${(percent * 100).toFixed(0)}%`;
                  } else if (windowWidth < 640) {
                    const shortName = name === 'Available' ? 'Avail' : name === 'Pending' ? 'Pend' : name;
                    return `${shortName} ${(percent * 100).toFixed(0)}%`;
                  } else {
                    return `${name} ${(percent * 100).toFixed(0)}%`;
                  }
                }}
                outerRadius={chartDimensions.outerRadius}
                dataKey="value"
                style={{ fontSize: chartDimensions.fontSize }}
              >
                {pieData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  fontSize: chartDimensions.fontSize,
                  padding: windowWidth < 480 ? '8px' : '12px'
                }}
              />
              {/* Only show legend on larger screens */}
              {windowWidth >= 768 && (
                <Legend 
                  wrapperStyle={{ fontSize: chartDimensions.fontSize }}
                  iconType="circle"
                />
              )}
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        {/* Custom legend for smaller screens */}
        {windowWidth < 768 && (
          <div className="flex justify-center flex-wrap gap-2 sm:gap-3 lg:gap-4 mt-3 sm:mt-4">
            {pieData.map((entry, index) => (
              <div key={entry.name} className="flex items-center space-x-1 sm:space-x-1.5">
                <div 
                  className="w-2 h-2 sm:w-3 sm:h-3 rounded-full flex-shrink-0" 
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                ></div>
                <span className="text-xs sm:text-sm text-gray-600 dark:text-slate-400 whitespace-nowrap">
                  {windowWidth < 480 && entry.name === 'Available' ? 'Avail' : 
                   windowWidth < 480 && entry.name === 'Pending' ? 'Pend' : 
                   entry.name}
                </span>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}