import React, { useState } from 'react';
import { ViewState, User } from './types';
import { AuthLayout } from './components/AuthLayout';
import { Dashboard } from './components/Dashboard';
import { PendingApproval } from './components/PendingApproval';

export default function App() {
  // Simple state-based router for SPA feel without heavy routing libraries yet
  const [viewState, setViewState] = useState<ViewState>('LOGIN');
  const [user, setUser] = useState<User | null>(null);

  const handleLogout = () => {
    setUser(null);
    setViewState('LOGIN');
  }

  if (user && viewState === 'DASHBOARD') {
    if (user.status === 'PENDING') {
      return <PendingApproval user={user} onLogout={handleLogout} />;
    }
    return <Dashboard user={user} onLogout={handleLogout} />;
  }

  return (
    <AuthLayout
      currentView={viewState}
      setViewState={setViewState}
      setUser={setUser}
    />
  );
}