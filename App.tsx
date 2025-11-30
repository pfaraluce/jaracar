import React, { useState, useEffect } from 'react';
import { ViewState, User } from './types';
import { AuthLayout } from './components/AuthLayout';
import { Dashboard } from './components/Dashboard';
import { PendingApproval } from './components/PendingApproval';
import { authService } from './services/auth';
import { supabase } from './services/supabase';
import { ThemeProvider } from './contexts/ThemeContext';

export default function App() {
  // Simple state-based router for SPA feel without heavy routing libraries yet
  const [viewState, setViewState] = useState<ViewState>('LOGIN');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check initial session
    const initAuth = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          setViewState('DASHBOARD');
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes (login, logout, invite link, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event);

      if (event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY') {
        // Reload user data to get profile/roles
        const currentUser = await authService.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          setViewState(event === 'PASSWORD_RECOVERY' ? 'FORGOT_PASSWORD' : 'DASHBOARD');
          // If password recovery, we might want to show a specific "Reset Password" view, 
          // but for now AuthLayout handles 'FORGOT_PASSWORD' as "send link". 
          // Actually, if they are here via recovery link, they are logged in and should probably go to Dashboard 
          // or a "Change Password" modal. 
          // For the invite flow, event is SIGNED_IN.
          if (event === 'PASSWORD_RECOVERY') {
            // Ideally show a "Reset Password" modal. For now, let's go to Dashboard where they can change it?
            // Or maybe we need a RESET_PASSWORD view. 
            // Let's stick to Dashboard for now, assuming they can change password in profile.
            setViewState('DASHBOARD');
          }
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setViewState('LOGIN');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = () => {
    authService.logout();
    // State update will happen via onAuthStateChange
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900 dark:border-white"></div>
      </div>
    );
  }

  return (
    <ThemeProvider defaultTheme="system" storageKey="jaracar-theme">
      {user && viewState === 'DASHBOARD' ? (
        user.status === 'PENDING' ? (
          <PendingApproval user={user} onLogout={handleLogout} />
        ) : (
          <Dashboard user={user} onLogout={handleLogout} />
        )
      ) : (
        <AuthLayout
          currentView={viewState}
          setViewState={setViewState}
          setUser={setUser}
        />
      )}
    </ThemeProvider>
  );
}