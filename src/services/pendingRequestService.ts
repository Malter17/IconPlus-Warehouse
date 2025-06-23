import { supabase } from '../lib/supabase';
import { itemService } from './itemService';
import { historyService } from './historyService';
import type { PendingRequest } from '../lib/supabase';

interface CreateRequestParams {
  item_id: string;
  requested_by: string;
  action_type: 'use' | 'return';
}

class PendingRequestService {
  async createRequest(params: CreateRequestParams): Promise<PendingRequest> {
    // Check if user already has a pending request for this item
    const hasPendingRequest = await itemService.hasUserPendingRequest(
      params.item_id, 
      params.requested_by, 
      params.action_type
    );

    if (hasPendingRequest) {
      throw new Error('You already have a pending request for this item');
    }

    // Validate return requests
    if (params.action_type === 'return') {
      const validation = await itemService.validateReturnRequest(params.item_id, params.requested_by);
      if (!validation.valid) {
        throw new Error(validation.message || 'Cannot create return request');
      }
    }

    const { data, error } = await supabase
      .from('pending_requests')
      .insert({
        item_id: params.item_id,
        type: params.action_type,
        requested_by: params.requested_by,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create request: ${error.message}`);
    }

    return data;
  }

  async getAllPendingRequests(): Promise<PendingRequest[]> {
    const { data, error } = await supabase
      .from('pending_requests')
      .select(`
        *,
        item:items!pending_requests_item_id_fkey(*),
        requested_by_user:users!pending_requests_requested_by_fkey(id, username, role)
      `)
      .order('requested_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch pending requests: ${error.message}`);
    }

    return data || [];
  }

  async getPendingRequestsForItem(itemId: string): Promise<PendingRequest[]> {
    const { data, error } = await supabase
      .from('pending_requests')
      .select(`
        *,
        item:items!pending_requests_item_id_fkey(*),
        requested_by_user:users!pending_requests_requested_by_fkey(id, username, role)
      `)
      .eq('item_id', itemId)
      .order('requested_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch pending requests for item: ${error.message}`);
    }

    return data || [];
  }

  async deleteRequest(id: string): Promise<void> {
    const { error } = await supabase
      .from('pending_requests')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete request: ${error.message}`);
    }
  }

  async getRequestsByUser(userId: string): Promise<PendingRequest[]> {
    const { data, error } = await supabase
      .from('pending_requests')
      .select(`
        *,
        item:items!pending_requests_item_id_fkey(*),
        requested_by_user:users!pending_requests_requested_by_fkey(id, username, role)
      `)
      .eq('requested_by', userId)
      .order('requested_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch user requests: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Approve a request and automatically reject ALL other pending requests for the same item
   * This ensures only one user gets the item and prevents double allocation
   */
  async approveRequest(requestId: string, approvedBy: string): Promise<void> {
    // Get the request details first
    const { data: request, error: requestError } = await supabase
      .from('pending_requests')
      .select(`
        *,
        item:items!pending_requests_item_id_fkey(*),
        requested_by_user:users!pending_requests_requested_by_fkey(id, username, role)
      `)
      .eq('id', requestId)
      .single();

    if (requestError || !request) {
      throw new Error('Request not found');
    }

    if (!request.item) {
      throw new Error('Item data not found in request');
    }

    // Get ALL pending requests for the same item (regardless of action type)
    // This ensures we handle conflicts between different types of requests
    const allPendingRequests = await this.getPendingRequestsForItem(request.item_id);
    
    // Find other requests (excluding the one being approved)
    const otherRequests = allPendingRequests.filter(r => r.id !== requestId);

    // Determine new status based on request type
    const newStatus = request.type === 'use' ? 'used' : 'available';
    
    // Prepare additional data for item update
    const additionalData: {
      last_used_by?: string | null;
    } = {};

    // Set last_used_by based on the request type
    if (request.type === 'use') {
      additionalData.last_used_by = request.requested_by;
    } else if (request.type === 'return') {
      additionalData.last_used_by = null;
    }

    try {
      // Start a transaction-like operation
      // 1. Update item status first
      await itemService.updateItemStatus(request.item.id, newStatus, approvedBy, additionalData);

      // 2. Add history entry for the approved request
      await historyService.createEntry({
        item_id: request.item.id,
        action: request.type === 'use' ? 'borrowed' : 'returned',
        performed_by: approvedBy,
        details: `Request approved - ${request.type === 'use' ? 'Item borrowed' : 'Item returned'} by ${request.requested_by_user?.username}`,
        previous_status: request.item.status,
        new_status: newStatus
      });

      // 3. Add history entries for ALL other rejected requests
      for (const otherRequest of otherRequests) {
        if (otherRequest.requested_by_user) {
          const actionDescription = otherRequest.type === 'use' ? 'borrow' : 'return';
          await historyService.createEntry({
            item_id: request.item.id,
            action: 'rejected',
            performed_by: approvedBy,
            details: `Request automatically rejected - ${otherRequest.requested_by_user.username}'s ${actionDescription} request was denied because ${request.requested_by_user?.username}'s ${request.type} request was approved`,
            previous_status: request.item.status,
            new_status: newStatus
          });
        }
      }

      // 4. Delete ALL pending requests for this item (including the approved one)
      const { error: deleteError } = await supabase
        .from('pending_requests')
        .delete()
        .eq('item_id', request.item_id);

      if (deleteError) {
        console.error('Failed to delete pending requests:', deleteError);
        throw new Error(`Failed to delete pending requests: ${deleteError.message}`);
      }

      console.log(`Approved request ${requestId} and rejected ${otherRequests.length} other requests for item ${request.item.id}`);

    } catch (error) {
      console.error('Error in approveRequest:', error);
      throw error;
    }
  }

  /**
   * Reject a specific request
   */
  async rejectRequest(requestId: string, rejectedBy: string): Promise<void> {
    // Get the request details first
    const { data: request, error: requestError } = await supabase
      .from('pending_requests')
      .select(`
        *,
        item:items!pending_requests_item_id_fkey(*),
        requested_by_user:users!pending_requests_requested_by_fkey(id, username, role)
      `)
      .eq('id', requestId)
      .single();

    if (requestError || !request) {
      throw new Error('Request not found');
    }

    if (!request.item) {
      throw new Error('Item data not found in request');
    }

    try {
      // Add history entry for the rejected request
      await historyService.createEntry({
        item_id: request.item.id,
        action: 'rejected',
        performed_by: rejectedBy,
        details: `Request manually rejected - ${request.requested_by_user?.username}'s ${request.type} request was denied by admin`,
        previous_status: request.item.status,
        new_status: request.item.status // Status remains the same for rejection
      });

      // Delete only the specific request
      await this.deleteRequest(requestId);

      console.log(`Rejected request ${requestId} for item ${request.item.id}`);

    } catch (error) {
      console.error('Error in rejectRequest:', error);
      throw error;
    }
  }

  /**
   * Get pending requests grouped by item and action type for dashboard display
   */
  async getGroupedPendingRequests(): Promise<Record<string, { item: any; type: string; requests: PendingRequest[] }>> {
    const requests = await this.getAllPendingRequests();
    
    return requests.reduce((acc, request) => {
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
  }

  /**
   * Check if there are conflicting requests for an item
   * (e.g., both borrow and return requests for the same item)
   */
  async hasConflictingRequests(itemId: string): Promise<boolean> {
    const requests = await this.getPendingRequestsForItem(itemId);
    const types = new Set(requests.map(r => r.type));
    return types.size > 1; // More than one type means conflict
  }

  /**
   * Get statistics about pending requests
   */
  async getRequestStatistics(): Promise<{
    totalPending: number;
    borrowRequests: number;
    returnRequests: number;
    conflictingItems: number;
  }> {
    const requests = await this.getAllPendingRequests();
    const groupedByItem = requests.reduce((acc, request) => {
      if (!acc[request.item_id]) {
        acc[request.item_id] = new Set();
      }
      acc[request.item_id].add(request.type);
      return acc;
    }, {} as Record<string, Set<string>>);

    const conflictingItems = Object.values(groupedByItem).filter(types => types.size > 1).length;

    return {
      totalPending: requests.length,
      borrowRequests: requests.filter(r => r.type === 'use').length,
      returnRequests: requests.filter(r => r.type === 'return').length,
      conflictingItems
    };
  }
}

export const pendingRequestService = new PendingRequestService();