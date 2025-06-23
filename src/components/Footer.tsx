import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { 
  HomeIcon, 
  PlusIcon, 
  ClipboardDocumentListIcon,
  UserPlusIcon,
  UsersIcon
} from '@heroicons/react/24/outline';
import type { UserRole } from '../App';

interface FooterProps {
  userRole: UserRole;
}

export default function Footer({ userRole }: FooterProps) {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  // Update year in real-time
  useEffect(() => {
    const updateYear = () => {
      setCurrentYear(new Date().getFullYear());
    };

    // Update immediately
    updateYear();

    // Set up interval to check for year change every minute
    const interval = setInterval(updateYear, 60000);

    // Also listen for visibility change to update when user returns to tab
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        updateYear();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const adminNavItems = [
    { to: '/', label: 'Dashboard', icon: HomeIcon },
    { to: '/items/add', label: 'Add Item', icon: PlusIcon },
    { to: '/items', label: 'Item List', icon: ClipboardDocumentListIcon },
  ];

  const managerNavItems = [
    { to: '/', label: 'Dashboard', icon: HomeIcon },
    { to: '/create-account', label: 'Create Account', icon: UserPlusIcon },
    { to: '/user-management', label: 'Manage Users', icon: UsersIcon },
    { to: '/items', label: 'Item List', icon: ClipboardDocumentListIcon },
  ];

  const employeeNavItems = [
    { to: '/items', label: 'Item List', icon: ClipboardDocumentListIcon },
  ];

  const navItems = userRole === 'admin' ? adminNavItems : 
                   userRole === 'manager' ? managerNavItems : 
                   employeeNavItems;

  const socialMediaLinks = [
    {
      name: 'LinkedIn',
      url: 'https://linkedin.com/company/pln',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>
      )
    },
    {
      name: 'Instagram',
      url: 'https://instagram.com/pln',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12.017 0C8.396 0 7.989.013 7.041.048 6.094.082 5.52.204 5.036.388a5.918 5.918 0 0 0-2.14 1.393A5.918 5.918 0 0 0 .388 4.036C.204 4.52.082 5.094.048 6.041.013 6.989 0 7.396 0 11.017c0 3.621.013 4.028.048 4.976.034.947.156 1.521.34 2.005a5.918 5.918 0 0 0 1.393 2.14 5.918 5.918 0 0 0 2.14 1.393c.484.184 1.058.306 2.005.34.948.035 1.355.048 4.976.048 3.621 0 4.028-.013 4.976-.048.947-.034 1.521-.156 2.005-.34a5.918 5.918 0 0 0 2.14-1.393 5.918 5.918 0 0 0 1.393-2.14c.184-.484.306-1.058.34-2.005.035-.948.048-1.355.048-4.976 0-3.621-.013-4.028-.048-4.976-.034-.947-.156-1.521-.34-2.005a5.918 5.918 0 0 0-1.393-2.14A5.918 5.918 0 0 0 19.036.388C18.552.204 17.978.082 17.031.048 16.083.013 15.676 0 12.017 0zm0 2.162c3.557 0 3.98.013 5.385.048.947.034 1.462.156 1.805.26.454.176.778.387 1.12.73.343.343.554.667.73 1.12.104.343.226.858.26 1.805.035 1.405.048 1.828.048 5.385 0 3.557-.013 3.98-.048 5.385-.034.947-.156 1.462-.26 1.805-.176.454-.387.778-.73 1.12-.343.343-.667.554-1.12.73-.343.104-.858.226-1.805.26-1.405.035-1.828.048-5.385.048-3.557 0-3.98-.013-5.385-.048-.947-.034-1.462-.156-1.805-.26-.454-.176-.778-.387-1.12-.73-.343-.343-.554-.667-.73-1.12-.104-.343-.226-.858-.26-1.805-.035-1.405-.048-1.828-.048-5.385 0-3.557.013-3.98.048-5.385.034-.947.156-1.462.26-1.805.176-.454.387-.778.73-1.12.343-.343.667-.554 1.12-.73.343-.104.858-.226 1.805-.26 1.405-.035 1.828-.048 5.385-.048z"/>
          <path d="M12.017 5.838a6.179 6.179 0 1 0 0 12.358 6.179 6.179 0 0 0 0-12.358zm0 10.196a4.017 4.017 0 1 1 0-8.034 4.017 4.017 0 0 1 0 8.034z"/>
          <circle cx="18.406" cy="5.594" r="1.44"/>
        </svg>
      )
    },
    {
      name: 'Twitter',
      url: 'https://twitter.com/pln',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
        </svg>
      )
    },
    {
      name: 'Facebook',
      url: 'https://facebook.com/pln',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      )
    }
  ];

  return (
    <footer className="bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 mt-auto transition-colors duration-300">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Logo and Company Info */}
          <div className="lg:col-span-1">
            <div className="flex items-center mb-4">
              <img 
                src="/logo-pln-plus (1).png" 
                alt="PLN Icon Plus Logo" 
                className="h-10 w-auto"
              />
            </div>
            <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">
              Professional warehouse management system for efficient inventory control and material tracking.
            </p>
          </div>

          {/* Navigation Links */}
          <div className="lg:col-span-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
              Navigation
            </h3>
            <ul className="space-y-3">
              {navItems.map((item) => {
                const IconComponent = item.icon;
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className="flex items-center space-x-2 text-gray-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-200"
                    >
                      <IconComponent className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Quick Info */}
          <div className="lg:col-span-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
              Quick Info
            </h3>
            <ul className="space-y-3 text-sm text-gray-600 dark:text-slate-400">
              <li>
                <span className="font-medium">Role:</span> {userRole === 'admin' ? 'Administrator' : userRole === 'manager' ? 'Manager' : 'Employee'}
              </li>
              <li>
                <span className="font-medium">Session:</span> Auto-logout in 10 minutes
              </li>
              <li>
                <span className="font-medium">Version:</span> 1.0.0
              </li>
              <li>
                <span className="font-medium">Status:</span> 
                <span className="ml-1 inline-flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                  Online
                </span>
              </li>
            </ul>
          </div>

          {/* Social Media & Contact */}
          <div className="lg:col-span-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
              Connect With Us
            </h3>
            <div className="flex space-x-4 mb-6">
              {socialMediaLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-200"
                  title={social.name}
                >
                  {social.icon}
                </a>
              ))}
            </div>
            <div className="text-sm text-gray-600 dark:text-slate-400">
              <p className="mb-1">
                <span className="font-medium">Support:</span> support@pln.co.id
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-200 dark:border-slate-700 mt-8 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-sm text-gray-600 dark:text-slate-400">
              <p>
                © {currentYear} PLN Icon Plus Warehouse Management System. All rights reserved.
              </p>
            </div>
            
            <div className="flex items-center space-x-1 text-sm text-gray-600 dark:text-slate-400">
              <span>Created by</span>
              <a
                href="https://www.linkedin.com/in/adam-aditya-nafil-b5b707312/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-200 transition-colors duration-200"
              >
                Adam
              </a>
              <span>&</span>
              <a
                href="https://www.linkedin.com/in/imam-syahrohim/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-200 transition-colors duration-200"
              >
                Imam
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}