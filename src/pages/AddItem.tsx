import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { itemService } from '../services/itemService';
import { historyService } from '../services/historyService';
import type { ItemFormData } from '../services/itemService';

export default function AddItem() {
  const { register, handleSubmit, formState: { errors } } = useForm<ItemFormData>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const onSubmit = async (data: ItemFormData) => {
    setError(null);
    setLoading(true);

    try {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const newItem = await itemService.createItem(data, userId);

      // Add history entry for item creation
      await historyService.createEntry({
        item_id: newItem.id,
        action: 'created',
        performed_by: userId,
        details: 'Item created in system',
        new_status: 'available'
      });

      setShowSuccess(true);
      setTimeout(() => navigate('/items'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto mt-10 bg-white rounded-xl shadow-lg p-8"
    >
      <h2 className="text-3xl font-semibold text-gray-800 mb-6">Add New Item</h2>

      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-4 p-4 text-sm rounded-md bg-red-100 text-red-700 border border-red-300"
        >
          {error}
        </motion.div>
      )}

      {showSuccess && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-4 p-4 text-sm rounded-md bg-green-100 text-green-700 border border-green-300"
        >
          Item added successfully! Redirecting...
        </motion.div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Material <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="Enter material name"
            {...register('material', { required: 'Material is required' })}
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={loading}
          />
          {errors.material && (
            <p className="text-sm text-red-500 mt-1">{errors.material.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <input
            type="text"
            placeholder="Add a short description"
            {...register('description')}
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Serial Number <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="Unique serial number"
            {...register('serial_number', { required: 'Serial number is required' })}
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={loading}
          />
          {errors.serial_number && (
            <p className="text-sm text-red-500 mt-1">{errors.serial_number.message}</p>
          )}
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={() => navigate('/items')}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100 transition"
            disabled={loading}
          >
            Cancel
          </button>
          <motion.button
            type="submit"
            disabled={loading}
            whileTap={{ scale: 0.98 }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Saving...</span>
              </div>
            ) : (
              'Save Item'
            )}
          </motion.button>
        </div>
      </form>
    </motion.div>
  );
}