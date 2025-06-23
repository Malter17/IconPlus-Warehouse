import { supabase } from '../lib/supabase';
import type { History } from '../lib/supabase';

export interface CreateHistoryEntry {
  item_id: string;
  action: History['action'];
  performed_by: string;
  details?: string;
  previous_status?: string;
  new_status?: string;
}

class HistoryService {
  async createEntry(entry: CreateHistoryEntry): Promise<History> {
    const { data, error } = await supabase
      .from('histories')
      .insert({
        item_id: entry.item_id,
        action: entry.action,
        performed_by: entry.performed_by,
        details: entry.details || null,
        previous_status: entry.previous_status || null,
        new_status: entry.new_status || null,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create history entry: ${error.message}`);
    }

    return data;
  }

  async getItemHistory(itemId: string): Promise<History[]> {
    const { data, error } = await supabase
      .from('histories')
      .select(`
        *,
        performed_by_user:performed_by(id, username, role)
      `)
      .eq('item_id', itemId)
      .order('timestamp', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch item history: ${error.message}`);
    }

    return data || [];
  }

  async getRecentHistory(limit: number = 50): Promise<History[]> {
    const { data, error } = await supabase
      .from('histories')
      .select(`
        *,
        performed_by_user:performed_by(id, username, role)
      `)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch recent history: ${error.message}`);
    }

    return data || [];
  }
}

export const historyService = new HistoryService();