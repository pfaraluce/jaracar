import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { hasAccess } from '../utils/permissions';
import { Logo } from './Logo';
import { UserAvatar } from './UserAvatar';
import { ProfileModal } from './ProfileModal';
import { WelcomeModal } from './WelcomeModal';
import { TutorialOverlay } from './TutorialOverlay';
import { HomeView } from './HomeView';
import { VehiclesView } from './VehiclesView';
import { MealsView } from './MealsView';
import { MaintenanceView } from './MaintenanceView';
import { CalendarView } from './CalendarView';

import {
  LogOut,
  LayoutDashboard,
  Car,
  UtensilsCrossed,
  Wrench,
  Calendar,
  Menu,
  X
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

type DashboardView = 'HOME' | 'VEHICLES' | 'MEALS' | 'MAINTENANCE' | 'CALENDAR';

interface DashboardProps {
  user: User;
  onLogout: () => void;
  onUserUpdate: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onLogout, onUserUpdate }) => {
  // Determine if user is "Restricted" (has permissions object AND is not ADMIN)
  const isRestricted = user.role !== 'ADMIN' && !!user.permissions && Object.keys(user.permissions).length > 0;

  // Determine standard start view
  const getInitialView = (): DashboardView => {
    if (!isRestricted) return 'HOME'; // Standard / Admin users start at Home

    if (hasAccess(user, 'vehicles')) return 'VEHICLES';
    if (hasAccess(user, 'meals')) return 'MEALS';
    if (hasAccess(user, 'maintenance')) return 'MAINTENANCE';
    if (hasAccess(user, 'calendar')) return 'CALENDAR';

    return 'HOME';
  };

  const [currentView, setCurrentView] = useState<DashboardView>(getInitialView);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  // Force redirect if user is on HOME but shouldn't be
  useEffect(() => {
    if (isRestricted && currentView === 'HOME') {
      const newView = getInitialView();
      if (newView !== 'HOME') {
        setCurrentView(newView);
      }
    }
  }, [user, isRestricted, currentView]);

  // Check if user is new (first time login)
  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('jaracar_welcome_seen');
    if (!hasSeenWelcome) {
      setShowWelcome(true);
    }
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
      onClick={() => {
        setCurrentView(view);
        setIsSidebarOpen(false);
      }}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentView === view
        ? 'bg-zinc-900 dark:bg-white text-white dark:text-black'
        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
        }`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black transition-colors duration-300 flex">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 transform transition-transform duration-300 md:transform-none ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          }`}
      >
        <div className="h-full flex flex-col">
          {/* Sidebar Header */}
          <div className="h-16 px-6 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800">
            <Logo size="sm" />
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation Links */}
          <div className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {!isRestricted && (
              <NavItem view="HOME" icon={LayoutDashboard} label="Inicio" />
            )}

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
              <button onClick={() => setIsProfileModalOpen(true)} className="flex items-center gap-3 flex-1 text-left">
                <UserAvatar name={user.name} imageUrl={user.avatarUrl} size="sm" />
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
      <div className="flex-1 flex flex-col min-w-0 h-full min-h-screen lg:h-screen lg:overflow-hidden">
        {/* Mobile Header */}
        <header className="h-16 md:hidden flex items-center justify-between px-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 -ml-2 text-zinc-600 dark:text-zinc-400"
          >
            <Menu size={24} />
          </button>
          <Logo size="sm" />
          <div className="w-10" /> {/* Spacer for centering */}
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 lg:overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto">
            {!isRestricted && currentView === 'HOME' && (
              <HomeView user={user} onNavigate={(view) => setCurrentView(view)} />
            )}

            {currentView === 'VEHICLES' && <VehiclesView user={user} />}

            {currentView === 'MEALS' && <MealsView user={user} />}

            {currentView === 'MAINTENANCE' && <MaintenanceView user={user} />}

            {currentView === 'CALENDAR' && <CalendarView user={user} />}
          </div>
        </main>
      </div>

      {/* Global Modals */}
      <ProfileModal
        user={user}
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onUpdate={onUserUpdate}
        onRestartTutorial={handleStartTutorial}
      />

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
