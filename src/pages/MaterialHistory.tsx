import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeftIcon, ClockIcon, UserIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { itemService } from '../services/itemService';
import { historyService } from '../services/historyService';
import type { Item, History } from '../lib/supabase';

export default function MaterialHistory() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<Item | null>(null);
  const [history, setHistory] = useState<History[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;

      try {
        setError(null);
        const [itemData, historyData] = await Promise.all([
          itemService.getItemById(id),
          historyService.getItemHistory(id)
        ]);

        setItem(itemData);
        setHistory(historyData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id]);

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'created':
        return '🆕';
      case 'borrowed':
        return '📤';
      case 'returned':
        return '📥';
      case 'edited':
        return '✏️';
      case 'archived':
        return '🗄️';
      case 'rejected':
        return '❌';
      case 'requested_borrow':
        return '📋';
      case 'requested_return':
        return '📋';
      default:
        return '📋';
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'created':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'borrowed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'returned':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'edited':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'archived':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
      case 'rejected':
        return 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300';
      case 'requested_borrow':
      case 'requested_return':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDateMobile = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 sm:h-24 sm:w-24 md:h-32 md:w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="max-w-4xl mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <div className="text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-slate-100 mb-4">
            {error ? 'Error' : 'Item Not Found'}
          </h2>
          <p className="text-gray-600 dark:text-slate-400 mb-6 text-sm sm:text-base">
            {error || 'The requested item could not be found.'}
          </p>
          <button
            onClick={() => navigate('/items')}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition text-sm sm:text-base"
          >
            Back to Items
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto px-2 sm:px-4 py-4 sm:py-8 space-y-4 sm:space-y-6"
    >
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate('/items')}
            className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-colors text-sm sm:text-base"
          >
            <ArrowLeftIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            <span>Back to Items</span>
          </button>
        </div>

        <div className="border-l-4 border-blue-500 pl-3 sm:pl-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-100 mb-2">Material History</h1>
          <div className="space-y-1">
            <p className="text-base sm:text-lg font-semibold text-gray-700 dark:text-slate-300 break-words">{item.material}</p>
            <p className="text-gray-600 dark:text-slate-400 text-sm sm:text-base break-words">{item.description || 'No description'}</p>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-500 break-all">
              Serial Number: <span className="font-mono font-medium">{item.serial_number}</span>
            </p>
            <div className="flex items-center space-x-2 mt-2">
              <span className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${
                item.status === 'available' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                item.status === 'used' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                item.status === 'archived' ? 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300' :
                item.status === 'pending_borrow' || item.status === 'pending_return' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
              }`}>
                {item.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* History Timeline */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-slate-100 mb-4 sm:mb-6 flex items-center space-x-2">
          <ClockIcon className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
          <span>Activity History</span>
        </h2>

        {history.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <DocumentTextIcon className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-slate-400 text-base sm:text-lg">No history records found for this item.</p>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {history.map((entry, index) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative flex items-start space-x-3 sm:space-x-4 p-3 sm:p-4 bg-gray-50 dark:bg-slate-700 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors"
              >
                {index < history.length - 1 && (
                  <div className="absolute left-5 sm:left-6 top-10 sm:top-12 w-0.5 h-6 sm:h-8 bg-gray-300 dark:bg-slate-600"></div>
                )}

                <div className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center text-sm sm:text-lg border-2 border-gray-200 dark:border-slate-600">
                  {getActionIcon(entry.action)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 space-y-1 sm:space-y-0">
                    <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getActionColor(entry.action)} w-fit`}>
                        {entry.action.charAt(0).toUpperCase() + entry.action.slice(1).replace('_', ' ')}
                      </span>
                      {entry.previous_status && entry.new_status && (
                        <span className="text-xs sm:text-sm text-gray-600 dark:text-slate-400 break-words">
                          {entry.previous_status} → {entry.new_status}
                        </span>
                      )}
                    </div>
                    <span className="text-xs sm:text-sm text-gray-500 dark:text-slate-500 flex-shrink-0">
                      <span className="hidden sm:inline">{formatDate(entry.timestamp)}</span>
                      <span className="sm:hidden">{formatDateMobile(entry.timestamp)}</span>
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 mb-1">
                    <UserIcon className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 dark:text-slate-500 flex-shrink-0" />
                    <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300 truncate">
                      {entry.performed_by_user?.username || 'Unknown User'}
                    </span>
                  </div>

                  {entry.details && (
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-400 mt-1 break-words leading-relaxed">{entry.details}</p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-3 sm:p-4">
          <h3 className="text-xs sm:text-sm font-medium text-gray-500 dark:text-slate-400 mb-1">Total Activity</h3>
          <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-slate-100">{history.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-3 sm:p-4">
          <h3 className="text-xs sm:text-sm font-medium text-gray-500 dark:text-slate-400 mb-1">Times Borrowed</h3>
          <p className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400">
            {history.filter(h => h.action === 'borrowed').length}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-3 sm:p-4">
          <h3 className="text-xs sm:text-sm font-medium text-gray-500 dark:text-slate-400 mb-1">Times Returned</h3>
          <p className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">
            {history.filter(h => h.action === 'returned').length}
          </p>
        </div>
      </div>
    </motion.div>
  );
}