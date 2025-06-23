import { useState } from 'react';
import { motion } from 'framer-motion';
import { authService } from '../services/authService';
import type { UserRole } from '../App';

interface LoginProps {
  onLogin: (role: UserRole) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const user = await authService.login({ username, password });
      authService.saveAuthData(user);
      onLogin(user.role);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-slate-900 dark:to-slate-800 transition-colors duration-300 px-3 sm:px-4 md:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-xs xs:max-w-sm sm:max-w-md w-full space-y-6 sm:space-y-8 p-4 sm:p-6 md:p-8 bg-white dark:bg-slate-800 rounded-xl shadow-lg transition-colors duration-300"
      >
        <div className="text-center">
          <img 
            src="/logo-pln-plus (1).png" 
            alt="PLN Icon Plus Logo" 
            className="h-12 sm:h-14 md:h-16 w-auto mx-auto mb-3 sm:mb-4"
          />
          <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-slate-100">
            PLN Icon Plus Warehouse
          </h2>
          <p className="mt-2 text-center text-xs sm:text-sm text-gray-600 dark:text-slate-400">
            Sign in to your account
          </p>
        </div>
        
        <form className="mt-6 sm:mt-8 space-y-4 sm:space-y-6" onSubmit={handleLogin}>
          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-3 rounded-md text-xs sm:text-sm border border-red-200 dark:border-red-800"
            >
              {error}
            </motion.div>
          )}
          
          <div className="space-y-3 sm:space-y-4">
            <div>
              <label htmlFor="username" className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                autoFocus
                className="mt-1 appearance-none relative block w-full px-3 py-2 sm:py-2.5 border border-gray-300 dark:border-slate-600 placeholder-gray-500 dark:placeholder-slate-400 text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-700 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 focus:z-10 text-sm sm:text-base transition-colors duration-300"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 sm:py-2.5 border border-gray-300 dark:border-slate-600 placeholder-gray-500 dark:placeholder-slate-400 text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-700 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 focus:z-10 text-sm sm:text-base transition-colors duration-300"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <motion.button
              type="submit"
              disabled={loading}
              whileTap={{ scale: 0.98 }}
              className="group relative w-full flex justify-center py-2 sm:py-2.5 px-4 border border-transparent text-sm sm:text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Signing in...</span>
                </div>
              ) : (
                'Sign in'
              )}
            </motion.button>
          </div>
        </form>

        {/* Session Info - Updated to reflect 10 minutes */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <p className="text-xs text-blue-800 dark:text-blue-300 text-center leading-relaxed">
            🔒 <strong>Security Notice:</strong> Your session will automatically expire after 10 minutes of inactivity for security purposes.
          </p>
        </div>
      </motion.div>
    </div>
  );
}