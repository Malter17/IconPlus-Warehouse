import { supabase } from '../lib/supabase';
import type { Item } from '../lib/supabase';

export interface ItemFormData {
  material: string;
  description?: string;
  serial_number: string;
}

class ItemService {
  async getItems(): Promise<Item[]> {
    const { data, error } = await supabase
      .from('items')
      .select(`
        *,
        last_used_by_user:last_used_by(id, username, role),
        changed_by_user:changed_by(id, username, role)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch items: ${error.message}`);
    }

    return data || [];
  }

  async getItemById(id: string): Promise<Item | null> {
    const { data, error } = await supabase
      .from('items')
      .select(`
        *,
        last_used_by_user:last_used_by(id, username, role),
        changed_by_user:changed_by(id, username, role)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Failed to fetch item: ${error.message}`);
    }

    return data;
  }

  async createItem(itemData: ItemFormData, changedBy: string): Promise<Item> {
    const { data, error } = await supabase
      .from('items')
      .insert({
        material: itemData.material,
        description: itemData.description || null,
        serial_number: itemData.serial_number,
        status: 'available',
        changed_by: changedBy,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('An item with this serial number already exists');
      }
      throw new Error(`Failed to create item: ${error.message}`);
    }

    return data;
  }

  async updateItem(id: string, itemData: Partial<ItemFormData>, changedBy: string): Promise<Item> {
    const { data, error } = await supabase
      .from('items')
      .update({
        ...itemData,
        changed_by: changedBy,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update item: ${error.message}`);
    }

    return data;
  }

  async updateItemStatus(
    id: string, 
    status: Item['status'], 
    changedBy: string,
    additionalData?: {
      last_used_by?: string | null;
      archived_reason?: string | null;
    }
  ): Promise<Item> {
    const updateData: any = {
      status,
      changed_by: changedBy,
      updated_at: new Date().toISOString(),
    };

    if (additionalData?.last_used_by !== undefined) {
      updateData.last_used_by = additionalData.last_used_by;
    }

    if (status === 'archived') {
      updateData.archived_at = new Date().toISOString();
      if (additionalData?.archived_reason) {
        updateData.archived_reason = additionalData.archived_reason;
      }
    } else if (status === 'available' && additionalData?.archived_reason === null) {
      // When restoring from archive, clear archive-related fields
      updateData.archived_at = null;
      updateData.archived_reason = null;
    }

    // Handle archived_reason updates for restoration
    if (additionalData?.archived_reason !== undefined) {
      updateData.archived_reason = additionalData.archived_reason;
    }

    const { data, error } = await supabase
      .from('items')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update item status: ${error.message}`);
    }

    return data;
  }

  async searchItems(query: string): Promise<Item[]> {
    const { data, error } = await supabase
      .from('items')
      .select(`
        *,
        last_used_by_user:last_used_by(id, username, role),
        changed_by_user:changed_by(id, username, role)
      `)
      .neq('status', 'archived')
      .or(`material.ilike.%${query}%,serial_number.ilike.%${query}%`)
      .limit(10);

    if (error) {
      throw new Error(`Failed to search items: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Check if a user can request to return an item
   * Only the user who borrowed the item can request to return it
   */
  async canUserReturnItem(itemId: string, userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('items')
      .select('last_used_by, status')
      .eq('id', itemId)
      .single();

    if (error || !data) {
      return false;
    }

    return data.status === 'used' && data.last_used_by === userId;
  }

  /**
   * Validate return request before creating pending request
   */
  async validateReturnRequest(itemId: string, userId: string): Promise<{ valid: boolean; message?: string }> {
    const item = await this.getItemById(itemId);
    
    if (!item) {
      return { valid: false, message: 'Item not found' };
    }

    if (item.status !== 'used') {
      return { valid: false, message: 'Item is not currently in use' };
    }

    if (item.last_used_by !== userId) {
      return { 
        valid: false, 
        message: `Only ${item.last_used_by_user?.username || 'the borrower'} can return this item` 
      };
    }

    return { valid: true };
  }

  /**
   * Check if user already has a pending request for this item
   */
  async hasUserPendingRequest(itemId: string, userId: string, actionType: 'use' | 'return'): Promise<boolean> {
    const { data, error } = await supabase
      .from('pending_requests')
      .select('id')
      .eq('item_id', itemId)
      .eq('requested_by', userId)
      .eq('type', actionType)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking pending request:', error);
      return false;
    }

    return !!data;
  }
}

export const itemService = new ItemService();