import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Database types
export interface User {
  id: string;
  username: string;
  password: string;
  role: 'admin' | 'manager' | 'employee';
  status: 'active' | 'deactive';
}

// Public user data (excludes sensitive information like password)
export interface UserPublicData {
  id: string;
  username: string;
  role: 'admin' | 'manager' | 'employee';
  status: 'active' | 'deactive';
}

export interface Item {
  id: string;
  material: string;
  description: string | null;
  serial_number: string;
  status: 'available' | 'used' | 'pending_borrow' | 'pending_return' | 'archived';
  last_used_by: string | null;
  changed_by: string | null;
  archived_reason: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  pending_request_id: string | null;
  // Joined data
  last_used_by_user?: UserPublicData;
  changed_by_user?: UserPublicData;
  pending_request?: PendingRequest;
}

export interface PendingRequest {
  id: string;
  item_id: string;
  type: 'use' | 'return';
  requested_by: string;
  requested_at: string;
  requested_by_user?: UserPublicData;
  item?: Item; // Add item property for joined data
}

export interface History {
  id: string;
  item_id: string;
  action: 'created' | 'edited' | 'borrowed' | 'returned' | 'archived' | 'rejected' | 'requested_borrow' | 'requested_return';
  performed_by: string;
  timestamp: string;
  details: string | null;
  previous_status: string | null;
  new_status: string | null;
  performed_by_user?: UserPublicData;
}