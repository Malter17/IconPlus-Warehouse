import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { userService } from '../services/userService';
import type { UserPublicData } from '../lib/supabase';
import type { UserRole } from '../App';
import {
  UserIcon,
  CheckCircleIcon,
  XCircleIcon,
  KeyIcon,
  UserPlusIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';

interface UserManagementProps {
  userRole?: UserRole;
}

interface PasswordChangeUser {
  id: string;
  username: string;
}

interface CreateAccountFormData {
  username: string;
  password: string;
  confirmPassword: string;
  role: 'admin' | 'manager' | 'employee';
}

export default function UserManagement({ userRole }: UserManagementProps = {}) {
  const [users, setUsers] = useState<UserPublicData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [passwordChangeUser, setPasswordChangeUser] = useState<PasswordChangeUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [createAccountData, setCreateAccountData] = useState<CreateAccountFormData>({
    username: '',
    password: '',
    confirmPassword: '',
    role: 'employee'
  });
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [createAccountSuccess, setCreateAccountSuccess] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState<Set<string>>(new Set());

  // Get current user role from localStorage if not passed as prop
  const currentUserRole = userRole || localStorage.getItem('userRole') as UserRole;

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setError(null);
      const data = await userService.getAllUsers();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = (user: UserPublicData) => {
    setPasswordChangeUser({
      id: user.id,
      username: user.username
    });
    setNewPassword('');
    setConfirmPassword('');
    setShowPassword(false);
  };

  const handleSavePassword = async () => {
    if (!passwordChangeUser) return;

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setChangingPassword(true);
    try {
      await userService.updateUser(passwordChangeUser.id, {
        password: newPassword
      });

      setPasswordChangeUser(null);
      setNewPassword('');
      setConfirmPassword('');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: 'active' | 'deactive') => {
    if (togglingStatus.has(userId)) return;

    setTogglingStatus(prev => new Set(prev).add(userId));
    
    try {
      const newStatus = currentStatus === 'active' ? 'deactive' : 'active';
      await userService.toggleUserStatus(userId, newStatus);
      await loadUsers(); // Reload to get updated data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user status');
    } finally {
      setTogglingStatus(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const handleCreateAccount = async () => {
    if (createAccountData.password !== createAccountData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (createAccountData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setCreatingAccount(true);
    setError(null);
    
    try {
      await userService.createUser({
        username: createAccountData.username,
        password: createAccountData.password,
        role: createAccountData.role
      });

      setCreateAccountSuccess(true);
      setCreateAccountData({
        username: '',
        password: '',
        confirmPassword: '',
        role: 'employee'
      });
      
      // Hide success message and close modal after 2 seconds
      setTimeout(() => {
        setCreateAccountSuccess(false);
        setShowCreateAccount(false);
      }, 2000);
      
      await loadUsers(); // Reload users list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setCreatingAccount(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'manager':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      case 'employee':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const getAvailableRoles = () => {
    if (currentUserRole === 'admin') {
      return [
        { value: 'admin', label: 'Administrator' },
        { value: 'manager', label: 'Manager' },
        { value: 'employee', label: 'Employee' }
      ];
    } else if (currentUserRole === 'manager') {
      return [
        { value: 'admin', label: 'Administrator' },
        { value: 'manager', label: 'Manager' },
        { value: 'employee', label: 'Employee' }
      ];
    }
    return [];
  };

  const availableRoles = getAvailableRoles();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 sm:h-24 sm:w-24 md:h-32 md:w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 sm:space-y-6 p-2 sm:p-4 lg:p-6 max-w-7xl mx-auto"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-100">
          User Management
        </h1>
        <button
          onClick={() => setShowCreateAccount(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm sm:text-base flex items-center space-x-2"
        >
          <UserPlusIcon className="h-4 w-4" />
          <span>Create Account</span>
        </button>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-3 sm:p-4 rounded-md border border-red-200 dark:border-red-800"
        >
          <div className="flex justify-between items-start">
            <span className="text-sm sm:text-base">{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-red-800 dark:text-red-200 hover:text-red-900 dark:hover:text-red-100 font-medium ml-2 flex-shrink-0"
            >
              ✕
            </button>
          </div>
        </motion.div>
      )}

      {/* Manager Info */}
      <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3 sm:p-4">
        <p className="text-xs sm:text-sm text-orange-800 dark:text-orange-300 leading-relaxed">
          👔 <strong>Manager Privileges:</strong> You can create new accounts, change passwords, and activate/deactivate users. 
          <span className="block mt-1">
            🔐 <strong>Security Note:</strong> Use strong passwords and deactivate accounts when users no longer need access.
          </span>
        </p>
      </div>

      {/* Users Table */}
      <motion.div
        className="bg-white dark:bg-slate-800 shadow-xl rounded-xl overflow-hidden border border-gray-100 dark:border-slate-700"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full divide-y divide-gray-200 dark:divide-slate-700">
            <thead className="bg-gray-100 dark:bg-slate-700">
              <tr>
                <th className="px-4 xl:px-6 py-3 text-left text-sm font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wide">
                  User
                </th>
                <th className="px-4 xl:px-6 py-3 text-center text-sm font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wide">
                  Role
                </th>
                <th className="px-4 xl:px-6 py-3 text-center text-sm font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wide">
                  Status
                </th>
                <th className="px-4 xl:px-6 py-3 text-center text-sm font-semibold text-gray-600 dark:text-slate-300 uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-100 dark:divide-slate-700">
              <AnimatePresence>
                {users.map((user) => {
                  const isToggling = togglingStatus.has(user.id);
                  
                  return (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.2 }}
                      className="transition-colors duration-150 hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                      <td className="px-4 xl:px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <UserIcon className="h-8 w-8 text-gray-400 dark:text-slate-500" />
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-slate-100">
                              {user.username}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-slate-400">
                              ID: {user.id.slice(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => toggleUserStatus(user.id, user.status)}
                          disabled={isToggling}
                          className={`inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-medium transition-colors min-w-[80px] ${
                            user.status === 'active'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50'
                          } ${isToggling ? 'opacity-75 cursor-not-allowed' : ''}`}
                        >
                          {isToggling ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-1"></div>
                              Updating...
                            </>
                          ) : user.status === 'active' ? (
                            <>
                              <CheckCircleIcon className="h-3 w-3 mr-1" />
                              Active
                            </>
                          ) : (
                            <>
                              <XCircleIcon className="h-3 w-3 mr-1" />
                              Inactive
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex justify-center">
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handlePasswordChange(user)}
                            className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200 font-medium transition-colors text-sm p-2 rounded-md hover:bg-green-50 dark:hover:bg-green-900/20"
                            title="Change Password"
                          >
                            <KeyIcon className="h-4 w-4" />
                          </motion.button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* Mobile/Tablet Cards */}
        <div className="block lg:hidden p-4 space-y-4">
          <AnimatePresence>
            {users.map((user) => {
              const isToggling = togglingStatus.has(user.id);
              
              return (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <UserIcon className="h-8 w-8 text-gray-400 dark:text-slate-500" />
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-slate-100">
                          {user.username}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-slate-400">
                          ID: {user.id.slice(0, 8)}...
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handlePasswordChange(user)}
                      className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200"
                      title="Change Password"
                    >
                      <KeyIcon className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </span>
                    
                    <button
                      onClick={() => toggleUserStatus(user.id, user.status)}
                      disabled={isToggling}
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                        user.status === 'active'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                      } ${isToggling ? 'opacity-75 cursor-not-allowed' : ''}`}
                    >
                      {isToggling ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-1"></div>
                          Updating...
                        </>
                      ) : user.status === 'active' ? (
                        <>
                          <CheckCircleIcon className="h-3 w-3 mr-1" />
                          Active
                        </>
                      ) : (
                        <>
                          <XCircleIcon className="h-3 w-3 mr-1" />
                          Inactive
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {users.length === 0 && !loading && (
          <div className="text-center py-8 sm:py-12">
            <UserIcon className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-slate-400 text-base sm:text-lg">No users found.</p>
          </div>
        )}
      </motion.div>

      {/* Create Account Modal */}
      <AnimatePresence>
        {showCreateAccount && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-25"
                onClick={() => {
                  if (!creatingAccount && !createAccountSuccess) {
                    setShowCreateAccount(false);
                    setCreateAccountSuccess(false);
                    setError(null);
                  }
                }}
              />

              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-md relative"
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">Create New Account</h3>
                
                {/* Success notification inside modal */}
                {createAccountSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 p-3 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-md border border-green-200 dark:border-green-800"
                  >
                    <div className="flex items-center space-x-2">
                      <CheckCircleIcon className="h-4 w-4" />
                      <span className="text-sm">Account created successfully!</span>
                    </div>
                  </motion.div>
                )}

                {/* Error notification inside modal */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-md border border-red-200 dark:border-red-800"
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-sm">{error}</span>
                      <button
                        onClick={() => setError(null)}
                        className="text-red-800 dark:text-red-200 hover:text-red-900 dark:hover:text-red-100 font-medium ml-2 flex-shrink-0"
                      >
                        ✕
                      </button>
                    </div>
                  </motion.div>
                )}
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Username <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={createAccountData.username}
                      onChange={(e) => setCreateAccountData({ ...createAccountData, username: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-slate-100"
                      disabled={creatingAccount || createAccountSuccess}
                      placeholder="Enter username"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={createAccountData.password}
                        onChange={(e) => setCreateAccountData({ ...createAccountData, password: e.target.value })}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-slate-100"
                        disabled={creatingAccount || createAccountSuccess}
                        placeholder="Enter password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300"
                        disabled={creatingAccount || createAccountSuccess}
                      >
                        {showPassword ? (
                          <EyeSlashIcon className="h-4 w-4" />
                        ) : (
                          <EyeIcon className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Confirm Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={createAccountData.confirmPassword}
                      onChange={(e) => setCreateAccountData({ ...createAccountData, confirmPassword: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-slate-100"
                      disabled={creatingAccount || createAccountSuccess}
                      placeholder="Confirm password"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Role <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={createAccountData.role}
                      onChange={(e) => setCreateAccountData({ ...createAccountData, role: e.target.value as 'admin' | 'manager' | 'employee' })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-slate-100"
                      disabled={creatingAccount || createAccountSuccess}
                    >
                      {availableRoles.map(role => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="text-xs text-gray-500 dark:text-slate-400">
                    Password must be at least 6 characters long.
                  </div>
                </div>

                {!createAccountSuccess && (
                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      onClick={() => {
                        setShowCreateAccount(false);
                        setCreateAccountData({
                          username: '',
                          password: '',
                          confirmPassword: '',
                          role: 'employee'
                        });
                        setShowPassword(false);
                        setError(null);
                      }}
                      disabled={creatingAccount}
                      className="px-4 py-2 text-gray-700 dark:text-slate-300 border border-gray-300 dark:border-slate-600 rounded-md hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      Cancel
                    </button>
                    <motion.button
                      onClick={handleCreateAccount}
                      disabled={creatingAccount || !createAccountData.username || !createAccountData.password || !createAccountData.confirmPassword}
                      whileTap={{ scale: 0.98 }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                    >
                      {creatingAccount ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Creating...</span>
                        </>
                      ) : (
                        <span>Create Account</span>
                      )}
                    </motion.button>
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Password Change Modal */}
      <AnimatePresence>
        {passwordChangeUser && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-25"
                onClick={() => setPasswordChangeUser(null)}
              />

              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-md relative"
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
                  Change Password for {passwordChangeUser.username}
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-slate-100"
                        disabled={changingPassword}
                        placeholder="Enter new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300"
                      >
                        {showPassword ? (
                          <EyeSlashIcon className="h-4 w-4" />
                        ) : (
                          <EyeIcon className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Confirm Password
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-slate-100"
                      disabled={changingPassword}
                      placeholder="Confirm new password"
                    />
                  </div>

                  <div className="text-xs text-gray-500 dark:text-slate-400">
                    Password must be at least 6 characters long.
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => {
                      setPasswordChangeUser(null);
                      setNewPassword('');
                      setConfirmPassword('');
                      setShowPassword(false);
                    }}
                    disabled={changingPassword}
                    className="px-4 py-2 text-gray-700 dark:text-slate-300 border border-gray-300 dark:border-slate-600 rounded-md hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <motion.button
                    onClick={handleSavePassword}
                    disabled={changingPassword || !newPassword || !confirmPassword}
                    whileTap={{ scale: 0.98 }}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                  >
                    {changingPassword ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Changing...</span>
                      </>
                    ) : (
                      <span>Change Password</span>
                    )}
                  </motion.button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}