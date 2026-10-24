import React, { useState, useEffect } from 'react';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { User } from './types';
import { authApi } from './services/api';

export const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

  useEffect(() => {
    // Check if user is already logged in or query param has login state
    const checkAuth = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const emailFromParam = params.get('email');
        const savedEmail = emailFromParam || localStorage.getItem('reachinbox_user_email') || undefined;

        if (emailFromParam) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }

        if (!savedEmail) {
          setUser(null);
          setIsInitializing(false);
          return;
        }

        const currentUser = await authApi.getMe(savedEmail);
        setUser(currentUser);
        localStorage.setItem('reachinbox_user_email', currentUser.email);
      } catch (err) {
        setUser(null);
        localStorage.removeItem('reachinbox_user_email');
      } finally {
        setIsInitializing(false);
      }
    };

    checkAuth();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('reachinbox_user_email');
    setUser(null);
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-[#fcfdfd] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-gray-400 font-medium tracking-wide">
            Loading ReachInbox...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLoginSuccess={(u) => setUser(u)} />;
  }

  return <DashboardPage user={user} onLogout={handleLogout} />;
};

export default App;
