import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { itemService } from '../services/itemService';
import { historyService } from '../services/historyService';
import type { ItemFormData } from '../services/itemService';
import type { Item } from '../lib/supabase';

export default function EditItem() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ItemFormData>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [originalItem, setOriginalItem] = useState<Item | null>(null);

  useEffect(() => {
    const loadItem = async () => {
      if (!id) return;

      try {
        const item = await itemService.getItemById(id);
        if (item) {
          reset({
            material: item.material,
            description: item.description || '',
            serial_number: item.serial_number,
          });
          setOriginalItem(item);
        } else {
          setError('Item not found');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load item');
      } finally {
        setLoading(false);
      }
    };

    loadItem();
  }, [id, reset]);

  const onSubmit = async (data: ItemFormData) => {
    if (!id || !originalItem) return;

    setError(null);
    setSaving(true);

    try {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        throw new Error('User not authenticated');
      }

      await itemService.updateItem(id, data, userId);

      // Add history entry for item edit
      const changes = [];
      if (originalItem.material !== data.material) {
        changes.push(`Material: ${originalItem.material} → ${data.material}`);
      }
      if (originalItem.description !== data.description) {
        changes.push(`Description: ${originalItem.description || 'None'} → ${data.description || 'None'}`);
      }

      if (changes.length > 0) {
        await historyService.createEntry({
          item_id: id,
          action: 'edited',
          performed_by: userId,
          details: `Item updated: ${changes.join(', ')}`,
        });
      }

      setShowSuccess(true);
      setTimeout(() => {
        navigate('/items');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update item');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error && !originalItem) {
    return (
      <div className="max-w-2xl mx-auto mt-10 bg-white rounded-xl shadow-lg p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Error</h2>
        <p className="text-red-600 mb-6">{error}</p>
        <button
          onClick={() => navigate('/items')}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
        >
          Back to Items
        </button>
      </div>
    );
  }

  return (
    <motion.div
      className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-6 space-y-6"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h2 className="text-3xl font-bold text-gray-800">Edit Item</h2>

      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-4 bg-red-100 text-red-700 rounded-md text-sm"
        >
          {error}
        </motion.div>
      )}

      {showSuccess && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-4 bg-green-100 text-green-700 rounded-md text-sm"
        >
          Item updated successfully! Redirecting...
        </motion.div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Material <span className="text-red-500">*</span>
          </label>
          <input
            {...register('material', { required: 'Material is required' })}
            autoFocus
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            disabled={saving}
          />
          {errors.material && (
            <p className="text-sm text-red-600 mt-1">{errors.material.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <input
            {...register('description')}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            disabled={saving}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Serial Number</label>
          <input
            {...register('serial_number')}
            disabled
            className="mt-1 w-full rounded-md border border-gray-300 bg-gray-100 px-3 py-2 shadow-sm text-gray-500"
          />
          <p className="text-xs text-gray-500 mt-1">Serial number cannot be changed</p>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/items')}
            className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
            disabled={saving}
          >
            Cancel
          </button>
          <motion.button
            type="submit"
            disabled={saving}
            whileTap={{ scale: 0.98 }}
            className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Saving...</span>
              </div>
            ) : (
              'Save Changes'
            )}
          </motion.button>
        </div>
      </form>
    </motion.div>
  );
}