import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { hasAccess } from '../utils/permissions';
import { Logo } from './Logo';
import { UserAvatar } from './UserAvatar';
import { WelcomeModal } from './WelcomeModal';
import { TutorialOverlay } from './TutorialOverlay';
import { HomeView } from './HomeView';
import { VehiclesView } from './VehiclesView';
import { MealsView } from './MealsView';
import { MaintenanceView } from './MaintenanceView';
import { CalendarView } from './CalendarView';
import { MessagingView } from './MessagingView';
import { ProfileView } from './ProfileView';
import { AdminUserList } from './AdminUserList';
import { RoomsManagementView } from './RoomsManagementView';
import { initializeNotifications, onMessageListener } from '../services/notifications';

import {
  LogOut,
  LayoutDashboard,
  Car,
  UtensilsCrossed,
  Wrench,
  Calendar,
  Mail,
  User as UserIcon,
  Shield,
  Hotel,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

import { UserRole } from '../types';

type DashboardView = 'HOME' | 'VEHICLES' | 'MEALS' | 'MAINTENANCE' | 'CALENDAR' | 'MESSAGES' | 'PROFILE' | 'ADMIN_USERS' | 'ADMIN_ROOMS';

interface DashboardProps {
  user: User;
  onLogout: () => void;
  onUserUpdate: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onLogout, onUserUpdate }) => {
  const isRestricted = user.role !== 'ADMIN' && !!user.permissions && Object.keys(user.permissions).length > 0;

  const getInitialView = (): DashboardView => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');

    if (tab === 'cars') return 'VEHICLES';
    if (tab === 'meals') return 'MEALS';

    return 'HOME';
  };

  const [currentView, setCurrentView] = useState<DashboardView>(getInitialView);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  // Main scroll container ref
  const mainScrollRef = React.useRef<HTMLDivElement>(null);

  const scrollToTop = () => {
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNavigate = (view: DashboardView) => {
    setCurrentView(view);
    scrollToTop();
  };

  useEffect(() => {
    scrollToTop();
  }, [currentView]);

  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('jaracar_welcome_seen');
    if (!hasSeenWelcome) {
      setShowWelcome(true);
    }
  }, []);

  // Initialize FCM notifications
  useEffect(() => {
    const initFCM = async () => {
      try {
        await initializeNotifications();
      } catch (error) {
        console.error('Error initializing notifications:', error);
      }
    };

    initFCM();

    // Listen for foreground messages
    const unsubscribe = onMessageListener((payload) => {
      // Show browser notification if permission is granted
      if (Notification.permission === 'granted') {
        new Notification(payload.notification?.title || 'Nueva notificación', {
          body: payload.notification?.body || '',
          icon: '/icon-192x192.png',
          badge: '/icon-192x192.png'
        });
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  const handleWelcomeComplete = () => {
    localStorage.setItem('jaracar_welcome_seen', 'true');
    setShowWelcome(false);
  };

  const handleStartTutorial = () => {
    handleWelcomeComplete();
    setShowTutorial(true);
  };

  const handleTutorialComplete = () => {
    localStorage.setItem('jaracar_tutorial_seen', 'true');
    setShowTutorial(false);
  };

  const NavItem = ({ view, icon: Icon, label }: { view: DashboardView; icon: any; label: string }) => (
    <button
      onClick={() => handleNavigate(view)}
      data-tutorial={`nav-${view.toLowerCase()}`}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentView === view
        ? 'bg-zinc-900 dark:bg-white text-white dark:text-black'
        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
        }`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </button>
  );

  const MobileNavItem = ({ view, icon: Icon, label, isActive }: { view?: DashboardView; icon: any; label: string; isActive: boolean }) => (
    <button
      onClick={() => view && handleNavigate(view)}
      data-tutorial={`nav-${view?.toLowerCase()}`}
      className={`flex items-center justify-center p-2 transition-colors ${isActive
        ? 'text-zinc-900 dark:text-white'
        : 'text-zinc-400 dark:text-zinc-500'
        }`}
      aria-label={label}
    >
      <div className={`p-2 rounded-xl transition-all ${isActive ? 'bg-zinc-100 dark:bg-zinc-800' : ''}`}>
        <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
      </div>
    </button>
  );

  return (
    <div className="min-h-[100dvh] bg-zinc-50 dark:bg-black transition-colors duration-300 flex flex-col lg:flex-row">

      {/* Desktop Sidebar Navigation (Hidden on Mobile) */}
      <aside className="hidden lg:flex flex-col w-64 h-screen sticky top-0 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800">
        <div className="h-full flex flex-col">
          {/* Sidebar Header */}
          <div className="h-16 px-6 flex items-center border-b border-zinc-200 dark:border-zinc-800">
            <div onClick={() => handleNavigate('HOME')} className="cursor-pointer hover:opacity-80 transition-opacity">
              <Logo size="lg" />
            </div>
          </div>

          {/* Navigation Links */}
          <div className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            <NavItem view="HOME" icon={LayoutDashboard} label="Inicio" />

            <div className="pt-4 pb-2">
              <p className="px-4 text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                Módulos
              </p>
            </div>

            {hasAccess(user, 'vehicles') && (
              <NavItem view="VEHICLES" icon={Car} label="Vehículos" />
            )}
            {hasAccess(user, 'meals') && (
              <NavItem view="MEALS" icon={UtensilsCrossed} label="Comidas" />
            )}
            {hasAccess(user, 'maintenance') && (
              <NavItem view="MAINTENANCE" icon={Wrench} label="Mantenimiento" />
            )}
            {hasAccess(user, 'calendar') && (
              <NavItem view="CALENDAR" icon={Calendar} label="Calendario" />
            )}
          </div>

          {/* User Profile Footer */}
          <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              <button onClick={() => setCurrentView('PROFILE')} data-tutorial="nav-profile" className="flex items-center gap-3 flex-1 text-left">
                <div data-tutorial="user-avatar">
                  <UserAvatar name={user.name} imageUrl={user.avatarUrl} size="sm" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{user.name}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{user.email}</p>
                </div>
              </button>
              <button
                onClick={onLogout}
                className="p-1.5 text-zinc-400 hover:text-rose-500 transition-colors"
                title="Cerrar sesión"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="h-16 lg:hidden flex items-center justify-center px-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shrink-0 sticky top-0 z-20">
          <div onClick={() => handleNavigate('HOME')} className="cursor-pointer active:scale-95 transition-transform">
            <Logo size="lg" />
          </div>
        </header>

        {/* Scrollable Content */}
        <main
          ref={mainScrollRef}
          className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-20 lg:pb-8"
        >
          <div className="max-w-6xl mx-auto">
            {currentView === 'HOME' && (
              <HomeView user={user} onNavigate={(view) => handleNavigate(view)} />
            )}
            {currentView === 'VEHICLES' && <VehiclesView user={user} />}
            {currentView === 'MEALS' && <MealsView user={user} />}
            {currentView === 'MAINTENANCE' && <MaintenanceView user={user} />}
            {currentView === 'CALENDAR' && <CalendarView user={user} />}
            {currentView === 'PROFILE' && (
              <ProfileView
                user={user}
                onUpdate={onUserUpdate}
                onLogout={onLogout}
                onRestartTutorial={handleStartTutorial}
              />
            )}
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-lg border-t border-zinc-200 dark:border-zinc-800 pb-[calc(env(safe-area-inset-bottom)+1rem)] lg:hidden z-30">
          <div className="flex items-center justify-around py-3">
            {hasAccess(user, 'vehicles') && (
              <MobileNavItem view="VEHICLES" icon={Car} label="Coches" isActive={currentView === 'VEHICLES'} />
            )}
            {hasAccess(user, 'meals') && (
              <MobileNavItem view="MEALS" icon={UtensilsCrossed} label="Comidas" isActive={currentView === 'MEALS'} />
            )}
            {hasAccess(user, 'maintenance') && (
              <MobileNavItem view="MAINTENANCE" icon={Wrench} label="Reparar" isActive={currentView === 'MAINTENANCE'} />
            )}
            {hasAccess(user, 'calendar') && (
              <MobileNavItem view="CALENDAR" icon={Calendar} label="Agenda" isActive={currentView === 'CALENDAR'} />
            )}

            <button
              onClick={() => setCurrentView('PROFILE')}
              className="flex items-center justify-center p-2"
              aria-label="Perfil"
            >
              <div className={`p-0.5 rounded-full border-2 ${currentView === 'PROFILE' ? 'border-zinc-900 dark:border-white' : 'border-transparent'}`}>
                <UserAvatar name={user.name} imageUrl={user.avatarUrl} size="sm" className="w-5 h-5" />
              </div>
            </button>
          </div>
        </nav>
      </div>

      {/* ProfileModal removed */}

      {showWelcome && (
        <WelcomeModal
          userName={user.name}
          onStartTutorial={handleStartTutorial}
          onSkip={handleWelcomeComplete}
        />
      )}

      {showTutorial && (
        <TutorialOverlay
          onComplete={handleTutorialComplete}
          onSkip={handleTutorialComplete}
        />
      )}

    </div>
  );
};
