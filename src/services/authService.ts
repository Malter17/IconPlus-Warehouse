import { supabase } from '../lib/supabase';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthUser {
  id: string;
  username: string;
  role: 'admin' | 'manager' | 'employee';
}

class AuthService {
  private readonly SESSION_TIMEOUT_KEY = 'sessionTimeout';
  private readonly LOGIN_TIME_KEY = 'loginTime';

  async login(credentials: LoginCredentials): Promise<AuthUser> {
    const { data, error } = await supabase
      .from('users')
      .select('id, username, role, status')
      .eq('username', credentials.username)
      .eq('password', credentials.password) // Note: In production, use proper password hashing
      .single();

    if (error || !data) {
      throw new Error('Invalid username or password');
    }

    // Check if account is active
    if (data.status !== 'active') {
      throw new Error('Your account has been deactivated. Please contact an administrator.');
    }

    // Set login timestamp
    localStorage.setItem(this.LOGIN_TIME_KEY, Date.now().toString());

    return {
      id: data.id,
      username: data.username,
      role: data.role
    };
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    const userId = localStorage.getItem('userId');
    const loginTime = localStorage.getItem(this.LOGIN_TIME_KEY);
    
    if (!userId || !loginTime) {
      this.logout();
      return null;
    }

    // Check if session has expired (10 minutes = 600000 ms)
    const sessionAge = Date.now() - parseInt(loginTime);
    const tenMinutesInMs = 10 * 60 * 1000; // 10 minutes
    
    if (sessionAge > tenMinutesInMs) {
      this.logout();
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, role, status')
        .eq('id', userId)
        .single();

      if (error || !data) {
        this.logout();
        return null;
      }

      // Check if account is still active
      if (data.status !== 'active') {
        this.logout();
        return null;
      }

      return {
        id: data.id,
        username: data.username,
        role: data.role
      };
    } catch (error) {
      console.error('Failed to validate user session:', error);
      this.logout();
      return null;
    }
  }

  logout(): void {
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    localStorage.removeItem('userRole');
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem(this.LOGIN_TIME_KEY);
    localStorage.removeItem(this.SESSION_TIMEOUT_KEY);
  }

  saveAuthData(user: AuthUser): void {
    const now = Date.now().toString();
    localStorage.setItem('userId', user.id);
    localStorage.setItem('username', user.username);
    localStorage.setItem('userRole', user.role);
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem(this.LOGIN_TIME_KEY, now);
  }

  isSessionValid(): boolean {
    const loginTime = localStorage.getItem(this.LOGIN_TIME_KEY);
    const isAuthenticated = localStorage.getItem('isAuthenticated');
    
    if (!loginTime || !isAuthenticated) {
      return false;
    }

    const sessionAge = Date.now() - parseInt(loginTime);
    const tenMinutesInMs = 10 * 60 * 1000; // 10 minutes

    return sessionAge <= tenMinutesInMs;
  }

  getSessionTimeRemaining(): number {
    const loginTime = localStorage.getItem(this.LOGIN_TIME_KEY);
    if (!loginTime) return 0;
    
    const sessionAge = Date.now() - parseInt(loginTime);
    const tenMinutesInMs = 10 * 60 * 1000; // 10 minutes

    return Math.max(0, tenMinutesInMs - sessionAge);
  }
}

export const authService = new AuthService();