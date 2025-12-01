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
  const [inviteEmail, setInviteEmail] = useState<string | undefined>(undefined);

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

    // Listen for auth changes (login, logout, password recovery, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event, 'Session:', session);

      if (event === 'SIGNED_IN') {
        // Reload user data to get profile/roles
        const currentUser = await authService.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);

          // Verificar si es un usuario invitado (viene del enlace de invitación)
          // Los usuarios invitados tienen el tipo 'invite' en el session
          const { data: { user: authUser } } = await supabase.auth.getUser();

          if (authUser?.app_metadata?.provider === 'email' && authUser?.user_metadata?.invited === true) {
            // Usuario invitado - mostrar formulario de completar registro
            setInviteEmail(authUser.email || '');
            setViewState('INVITE_SIGNUP');
          } else {
            // Login normal
            setViewState('DASHBOARD');
          }
        }
      } else if (event === 'PASSWORD_RECOVERY') {
        // Reload user data
        const currentUser = await authService.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          setViewState('RESET_PASSWORD');
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setInviteEmail(undefined);
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

  const refreshUser = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  };

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
          <Dashboard user={user} onLogout={handleLogout} onUserUpdate={refreshUser} />
        )
      ) : (
        <AuthLayout
          currentView={viewState}
          setViewState={setViewState}
          setUser={setUser}
          inviteEmail={inviteEmail}
        />
      )}
    </ThemeProvider>
  );
}