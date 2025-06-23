import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import ItemList from './pages/ItemList';
import AddItem from './pages/AddItem';
import EditItem from './pages/EditItem';
import MaterialHistory from './pages/MaterialHistory';
import UserManagement from './pages/UserManagement';
import Navigation from './components/Navigation';
import Footer from './components/Footer';
import Login from './pages/Login';
import { SessionWarning } from './components/SessionWarning';
import { authService } from './services/authService';
import { useAutoLogout } from './hooks/useAutoLogout';

export type UserRole = 'admin' | 'manager' | 'employee' | null;

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  const handleLogout = () => {
    authService.logout();
    setIsAuthenticated(false);
    setUserRole(null);
  };

  const handleExtendSession = () => {
    // Reset the login time to extend the session
    const currentUser = {
      id: localStorage.getItem('userId') || '',
      username: localStorage.getItem('username') || '',
      role: (localStorage.getItem('userRole') as 'admin' | 'manager' | 'employee') || 'employee'
    };
    authService.saveAuthData(currentUser);
  };

  // Set up auto-logout functionality - changed to 10 minutes
  useAutoLogout({
    onLogout: handleLogout,
    timeoutMinutes: 10
  });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // First check if session is still valid based on time
        if (!authService.isSessionValid()) {
          authService.logout();
          setLoading(false);
          return;
        }

        const user = await authService.getCurrentUser();
        if (user) {
          setUserRole(user.role);
          setIsAuthenticated(true);
        } else {
          // Session expired or user not found
          authService.logout();
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        authService.logout();
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLogin = (role: UserRole) => {
    setUserRole(role);
    setIsAuthenticated(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-slate-900 dark:to-slate-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-slate-900 dark:to-slate-800 transition-colors duration-300 flex flex-col">
        <Navigation userRole={userRole} onLogout={handleLogout} />
        
        {/* Session Warning Component */}
        <SessionWarning 
          onExtendSession={handleExtendSession}
          onLogout={handleLogout}
        />
        
        <main className="container mx-auto px-4 py-8 flex-1">
          <Routes>
            {/* Dashboard route for admin and manager */}
            <Route
              path="/"
              element={
                userRole === 'admin' || userRole === 'manager' ? (
                  <Dashboard userRole={userRole} />
                ) : (
                  <Navigate to="/items" replace />
                )
              }
            />

            {/* Admin-only routes */}
            {userRole === 'admin' && (
              <>
                <Route path="/items/add" element={<AddItem />} />
                <Route path="/items/edit/:id" element={<EditItem />} />
                <Route path="/items/history/:id" element={<MaterialHistory />} />
              </>
            )}

            {/* Manager-only routes */}
            {userRole === 'manager' && (
              <>
                <Route path="/items/history/:id" element={<MaterialHistory />} />
                <Route path="/user-management" element={<UserManagement />} />
              </>
            )}

            {/* Routes for all users */}
            <Route path="/items" element={<ItemList userRole={userRole} />} />

            {/* Catch-all fallback route */}
            <Route
              path="*"
              element={<Navigate to={userRole === 'admin' || userRole === 'manager' ? '/' : '/items'} replace />}
            />
          </Routes>
        </main>

        <Footer userRole={userRole} />
      </div>
    </Router>
  );
}

export default App;