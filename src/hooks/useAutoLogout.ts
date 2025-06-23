import { useEffect, useRef, useCallback } from 'react';
import { authService } from '../services/authService';

interface UseAutoLogoutProps {
  onLogout: () => void;
  timeoutMinutes?: number;
  onWarn?: () => void; // notifikasi peringatan sebelum logout
}

export function useAutoLogout({
  onLogout,
  timeoutMinutes = 10,
  onWarn,
}: UseAutoLogoutProps) {
  const logoutTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const resetTimeout = useCallback(() => {
    // Bersihkan timeout sebelumnya
    if (logoutTimeoutRef.current) {
      clearTimeout(logoutTimeoutRef.current);
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }

    lastActivityRef.current = Date.now();

    const timeoutMs = timeoutMinutes * 60 * 1000;
    const warningMs = timeoutMs - 60 * 1000; // 1 menit sebelum logout

    // Set timeout notifikasi peringatan
    warningTimeoutRef.current = setTimeout(() => {
      if (onWarn) onWarn();
    }, warningMs);

    // Set timeout logout otomatis
    logoutTimeoutRef.current = setTimeout(() => {
      authService.logout();
      onLogout();
    }, timeoutMs);
  }, [onLogout, timeoutMinutes, onWarn]);

  const handleActivity = useCallback(() => {
    resetTimeout();
  }, [resetTimeout]);

  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    resetTimeout();

    return () => {
      if (logoutTimeoutRef.current) clearTimeout(logoutTimeoutRef.current);
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);

      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
    };
  }, [handleActivity, resetTimeout]);

  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (!document.hidden) {
        const timeSinceLastActivity = Date.now() - lastActivityRef.current;
        const timeoutMs = timeoutMinutes * 60 * 1000;

        if (timeSinceLastActivity >= timeoutMs) {
          authService.logout();
          onLogout();
        } else {
          try {
            const user = await authService.getCurrentUser();
            if (!user) {
              onLogout();
            }
          } catch (error) {
            console.error('Session validation failed:', error);
            onLogout();
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [onLogout, timeoutMinutes]);
}
