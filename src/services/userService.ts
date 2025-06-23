import { supabase } from '../lib/supabase';
import type { User, UserPublicData } from '../lib/supabase';

export interface CreateUserData {
  username: string;
  password: string;
  role: 'admin' | 'manager' | 'employee';
}

class UserService {
  async createUser(userData: CreateUserData): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .insert({
        username: userData.username,
        password: userData.password, // Note: In production, use proper password hashing
        role: userData.role,
        status: 'active', // New accounts are active by default
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('A user with this username already exists');
      }
      throw new Error(`Failed to create user: ${error.message}`);
    }

    return data;
  }

  async getAllUsers(): Promise<UserPublicData[]> {
    const { data, error } = await supabase
      .from('users')
      .select('id, username, role, status')
      .order('username', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch users: ${error.message}`);
    }

    return data || [];
  }

  async getUserById(id: string): Promise<UserPublicData | null> {
    const { data, error } = await supabase
      .from('users')
      .select('id, username, role, status')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Failed to fetch user: ${error.message}`);
    }

    return data;
  }

  async updateUser(id: string, userData: Partial<CreateUserData & { status?: 'active' | 'deactive' }>): Promise<UserPublicData> {
    const { data, error } = await supabase
      .from('users')
      .update(userData)
      .eq('id', id)
      .select('id, username, role, status')
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('A user with this username already exists');
      }
      throw new Error(`Failed to update user: ${error.message}`);
    }

    return data;
  }

  async toggleUserStatus(id: string, newStatus: 'active' | 'deactive'): Promise<UserPublicData> {
    const { data, error } = await supabase
      .from('users')
      .update({ status: newStatus })
      .eq('id', id)
      .select('id, username, role, status')
      .single();

    if (error) {
      throw new Error(`Failed to update user status: ${error.message}`);
    }

    return data;
  }

  async deleteUser(id: string): Promise<void> {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete user: ${error.message}`);
    }
  }
}

export const userService = new UserService();