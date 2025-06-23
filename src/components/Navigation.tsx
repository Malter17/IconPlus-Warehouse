import { Link } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import {
  HomeIcon,
  PlusIcon,
  ClipboardDocumentListIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  UserCircleIcon,
  ChevronDownIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import type { UserRole } from '../App';

interface NavigationProps {
  userRole: UserRole;
  onLogout: () => void;
}

export default function Navigation({ userRole, onLogout }: NavigationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get user info from localStorage
  const username = localStorage.getItem('username') || 'Unknown User';
  const userRoleDisplay = userRole === 'admin' ? 'Administrator' : userRole === 'manager' ? 'Manager' : 'Employee';

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleProfileClick = () => {
    setShowProfileDropdown(!showProfileDropdown);
  };

  const handleLogout = () => {
    setShowProfileDropdown(false);
    onLogout();
  };

  // Get user avatar/icon color based on role
  const getUserIconColor = () => {
    if (userRole === 'admin') return 'text-purple-600 dark:text-purple-400';
    if (userRole === 'manager') return 'text-orange-600 dark:text-orange-400';
    return 'text-blue-600 dark:text-blue-400';
  };

  return (
    <nav className="glass-effect shadow-glow relative z-40 transition-colors duration-300">
      <div className="container mx-auto px-2 sm:px-4 lg:px-6">
        <div className="relative flex justify-between items-center h-14 sm:h-16">
          {/* Logo */}
          <div className="flex items-center flex-shrink-0">
            <img 
              src="/logo-pln-plus (1).png" 
              alt="PLN Icon Plus Logo" 
              className="h-6 w-auto sm:h-8 md:h-10"
            />
          </div>

          {/* Mobile menu button and profile for admin and manager */}
          {(userRole === 'admin' || userRole === 'manager') && (
            <div className="flex items-center md:hidden">
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-200 transition-colors duration-300 z-50 relative p-2"
              >
                {isOpen ? (
                  <XMarkIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                ) : (
                  <Bars3Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                )}
              </button>
            </div>
          )}

          {/* employee Profile - Mobile & Desktop */}
          {userRole === 'employee' && (
            <div className="flex items-center">
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={handleProfileClick}
                  className="flex items-center space-x-1 sm:space-x-2 text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-200 transition-colors duration-300 bg-white dark:bg-slate-800 rounded-lg px-2 py-1.5 sm:px-3 sm:py-2 border border-gray-200 dark:border-slate-600 shadow-sm hover:shadow-md"
                >
                  <UserCircleIcon className={`h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 ${getUserIconColor()}`} />
                  <div className="text-left hidden xs:block">
                    <div className="text-xs sm:text-sm font-medium truncate max-w-20 sm:max-w-none">{username}</div>
                    <div className="text-xs text-gray-500 dark:text-slate-400 hidden sm:block">{userRoleDisplay}</div>
                  </div>
                  <ChevronDownIcon className={`h-3 w-3 sm:h-4 sm:w-4 transition-transform duration-200 ${showProfileDropdown ? 'rotate-180' : ''}`} />
                </button>

                {/* employee Profile Dropdown */}
                {showProfileDropdown && (
                  <div className="absolute right-0 mt-2 w-48 sm:w-64 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-600 py-1 z-50">
                    <div className="px-3 sm:px-4 py-2 sm:py-3 border-b border-gray-200 dark:border-slate-600">
                      <div className="flex items-center space-x-2 sm:space-x-3">
                        <UserCircleIcon className={`h-8 w-8 sm:h-10 sm:w-10 ${getUserIconColor()}`} />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm sm:text-base font-medium text-gray-900 dark:text-slate-100 truncate">{username}</div>
                          <div className="text-xs sm:text-sm text-gray-500 dark:text-slate-400">{userRoleDisplay}</div>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-3 sm:px-4 py-2 sm:py-3 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors flex items-center space-x-2"
                    >
                      <ArrowRightOnRectangleIcon className="h-4 w-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Desktop navigation - Show for admin and manager */}
          {(userRole === 'admin' || userRole === 'manager') && (
            <div className="hidden md:flex md:space-x-4 lg:space-x-8 items-center">
              <Link
                to="/"
                className="flex items-center space-x-1 lg:space-x-2 text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-200 transition-colors duration-300 px-2 py-1 rounded-md"
              >
                <HomeIcon className="h-5 w-5 lg:h-6 lg:w-6" />
                <span className="font-medium text-sm lg:text-base">Dashboard</span>
              </Link>
              
              {/* Admin-only navigation items */}
              {userRole === 'admin' && (
                <Link
                  to="/items/add"
                  className="flex items-center space-x-1 lg:space-x-2 text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-200 transition-colors duration-300 px-2 py-1 rounded-md"
                >
                  <PlusIcon className="h-5 w-5 lg:h-6 lg:w-6" />
                  <span className="font-medium text-sm lg:text-base">Add Item</span>
                </Link>
              )}

              {/* Manager-only navigation items */}
              {userRole === 'manager' && (
                <Link
                  to="/user-management"
                  className="flex items-center space-x-1 lg:space-x-2 text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-200 transition-colors duration-300 px-2 py-1 rounded-md"
                >
                  <UsersIcon className="h-5 w-5 lg:h-6 lg:w-6" />
                  <span className="font-medium text-sm lg:text-base">Manage Users</span>
                </Link>
              )}
              
              <Link
                to="/items"
                className="flex items-center space-x-1 lg:space-x-2 text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-200 transition-colors duration-300 px-2 py-1 rounded-md"
              >
                <ClipboardDocumentListIcon className="h-5 w-5 lg:h-6 lg:w-6" />
                <span className="font-medium text-sm lg:text-base">Item List</span>
              </Link>
            </div>
          )}

          {/* Desktop profile dropdown - Show for admin and manager */}
          {(userRole === 'admin' || userRole === 'manager') && (
            <div className="hidden md:flex items-center">
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={handleProfileClick}
                  className="flex items-center space-x-2 text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-200 transition-colors duration-300 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 border border-gray-200 dark:border-slate-600 shadow-sm hover:shadow-md"
                >
                  <UserCircleIcon className={`h-5 w-5 lg:h-6 lg:w-6 ${getUserIconColor()}`} />
                  <div className="text-left">
                    <div className="text-sm font-medium truncate max-w-24 lg:max-w-none">{username}</div>
                    <div className="text-xs text-gray-500 dark:text-slate-400">{userRoleDisplay}</div>
                  </div>
                  <ChevronDownIcon className={`h-4 w-4 transition-transform duration-200 ${showProfileDropdown ? 'rotate-180' : ''}`} />
                </button>

                {/* Admin/Manager Dropdown Menu */}
                {showProfileDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-600 py-1 z-50">
                    <div className="px-4 py-2 border-b border-gray-200 dark:border-slate-600">
                      <div className="flex items-center space-x-2">
                        <UserCircleIcon className={`h-8 w-8 ${getUserIconColor()}`} />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">{username}</div>
                          <div className="text-xs text-gray-500 dark:text-slate-400">{userRoleDisplay}</div>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors flex items-center space-x-2"
                    >
                      <ArrowRightOnRectangleIcon className="h-4 w-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile menu overlay - For admin and manager */}
      {isOpen && (userRole === 'admin' || userRole === 'manager') && (
        <div className="fixed inset-0 z-40 md:hidden">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-25"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu panel */}
          <div className="fixed top-14 sm:top-16 left-0 right-0 bg-white dark:bg-slate-800 shadow-lg rounded-b-lg z-50 border-t border-gray-200 dark:border-slate-700 transition-colors duration-300 mx-2 sm:mx-4">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {/* Mobile Profile Section */}
              <div className="px-3 py-3 border-b border-gray-200 dark:border-slate-700 mb-2">
                <div className="flex items-center space-x-3">
                  <UserCircleIcon className={`h-8 w-8 sm:h-10 sm:w-10 ${getUserIconColor()}`} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm sm:text-base font-medium text-gray-900 dark:text-slate-100 truncate">{username}</div>
                    <div className="text-xs sm:text-sm text-gray-500 dark:text-slate-400">{userRoleDisplay}</div>
                  </div>
                </div>
              </div>

              <Link
                to="/"
                className="flex items-center space-x-2 px-3 py-2 rounded-md text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors duration-300"
                onClick={() => setIsOpen(false)}
              >
                <HomeIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                <span className="text-sm sm:text-base">Dashboard</span>
              </Link>
              
              {/* Admin-only mobile navigation items */}
              {userRole === 'admin' && (
                <Link
                  to="/items/add"
                  className="flex items-center space-x-2 px-3 py-2 rounded-md text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors duration-300"
                  onClick={() => setIsOpen(false)}
                >
                  <PlusIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                  <span className="text-sm sm:text-base">Add Item</span>
                </Link>
              )}

              {/* Manager-only mobile navigation items */}
              {userRole === 'manager' && (
                <Link
                  to="/user-management"
                  className="flex items-center space-x-2 px-3 py-2 rounded-md text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors duration-300"
                  onClick={() => setIsOpen(false)}
                >
                  <UsersIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                  <span className="text-sm sm:text-base">Manage Users</span>
                </Link>
              )}
              
              <Link
                to="/items"
                className="flex items-center space-x-2 px-3 py-2 rounded-md text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors duration-300"
                onClick={() => setIsOpen(false)}
              >
                <ClipboardDocumentListIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                <span className="text-sm sm:text-base">Item List</span>
              </Link>
              
              {/* Mobile Logout Button */}
              <div className="border-t border-gray-200 dark:border-slate-700 pt-2 mt-2">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onLogout();
                  }}
                  className="flex items-center space-x-2 px-3 py-2 rounded-md text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 hover:bg-red-50 dark:hover:bg-red-900/20 w-full transition-colors duration-300"
                >
                  <ArrowRightOnRectangleIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                  <span className="text-sm sm:text-base">Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}