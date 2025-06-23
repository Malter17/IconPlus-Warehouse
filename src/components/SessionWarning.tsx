import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { authService } from '../services/authService';

interface SessionWarningProps {
  onExtendSession: () => void;
  onLogout: () => void;
}

export function SessionWarning({ onExtendSession, onLogout }: SessionWarningProps) {
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);

  useEffect(() => {
    const checkSessionTime = () => {
      const remaining = authService.getSessionTimeRemaining();
      setTimeRemaining(remaining);
      
      // Show warning when 2 minutes or less remaining (for 10-minute session)
      const twoMinutesInMs = 2 * 60 * 1000;
      setShowWarning(remaining > 0 && remaining <= twoMinutesInMs);
      
      // Auto logout when time expires
      if (remaining <= 0) {
        onLogout();
      }
    };

    // Check immediately
    checkSessionTime();
    
    // Check every 15 seconds for more responsive warning
    const interval = setInterval(checkSessionTime, 15000);
    
    return () => clearInterval(interval);
  }, [onLogout]);

  const formatTimeRemaining = (ms: number) => {
    const minutes = Math.floor(ms / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleExtendSession = () => {
    onExtendSession();
    setShowWarning(false);
  };

  return (
    <AnimatePresence>
      {showWarning && (
        <>
          {/* Backdrop for mobile */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-25 z-40 md:hidden"
            onClick={() => setShowWarning(false)}
          />
          
          {/* Warning Modal */}
          <motion.div
            initial={{ opacity: 0, y: -100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -100, scale: 0.9 }}
            className="fixed z-50 inset-4 md:top-4 md:left-1/2 md:transform md:-translate-x-1/2 md:inset-auto md:max-w-md md:w-full md:mx-4 flex items-center justify-center md:block"
          >
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg shadow-xl p-4 sm:p-6 w-full max-w-sm md:max-w-none mx-auto">
              <div className="flex items-start space-x-3">
                <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm sm:text-base font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                    Session Expiring Soon
                  </h3>
                  <p className="text-xs sm:text-sm text-yellow-700 dark:text-yellow-300 mb-3">
                    Your session will expire in{' '}
                    <span className="font-mono font-semibold">
                      {formatTimeRemaining(timeRemaining)}
                    </span>
                    . You'll be automatically logged out for security.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={handleExtendSession}
                      className="bg-yellow-600 text-white px-3 py-1.5 rounded text-xs sm:text-sm font-medium hover:bg-yellow-700 transition-colors flex-1 sm:flex-none"
                    >
                      Stay Logged In
                    </button>
                    <button
                      onClick={onLogout}
                      className="bg-gray-600 text-white px-3 py-1.5 rounded text-xs sm:text-sm font-medium hover:bg-gray-700 transition-colors flex-1 sm:flex-none"
                    >
                      Logout Now
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => setShowWarning(false)}
                  className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-200 transition-colors text-lg leading-none flex-shrink-0"
                >
                  <span className="sr-only">Dismiss</span>
                  ×
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}