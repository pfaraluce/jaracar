import React, { useState, useEffect } from 'react';
import { User, Car, Reservation, CarStatus, ActivityLog } from '../types';
import { carService } from '../services/cars';
import { reservationService } from '../services/reservations';
import { AddCarModal } from './AddCarModal';
import { CarCard } from './CarCard';
import { CarDetail } from './CarDetail';
import { CarListView } from './CarListView';
import { CarTimelineView } from './CarTimelineView';
import { UserAvatar } from './UserAvatar';
import { ProfileModal } from './ProfileModal';
import { WelcomeModal } from './WelcomeModal';
import { TutorialOverlay } from './TutorialOverlay';
import { AnimatePresence } from 'framer-motion';
import { Plus, LogOut, LayoutGrid, List, CalendarRange } from 'lucide-react';

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const [cars, setCars] = useState<Car[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST' | 'TIMELINE'>(() => {
    const saved = localStorage.getItem('jaracar_view_mode');
    return (saved as 'GRID' | 'LIST' | 'TIMELINE') || 'GRID';
  });

  useEffect(() => {
    localStorage.setItem('jaracar_view_mode', viewMode);
  }, [viewMode]);

  // Check if user is new (first time login)
  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('jaracar_welcome_seen');
    if (!hasSeenWelcome) {
      setShowWelcome(true);
    }
  }, []);

  const fetchData = async () => {
    try {
      const [c, r] = await Promise.all([
        carService.getCars(),
        reservationService.getReservations()
      ]);
      setCars(c);
      setReservations(r);

      // Try to fetch favorites, but don't crash if table doesn't exist
      try {
        const f = await carService.getFavorites(user.id);
        setFavorites(f);
      } catch (favError) {
        console.warn('Favorites not available:', favError);
        setFavorites([]);
      }
    } catch (e) {
      console.error("Failed to load data", e);
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000); // Auto refresh every minute
    return () => clearInterval(interval);
  }, []);

  const handleAddCar = async () => {
    setIsAddModalOpen(true);
  }

  const handleToggleFavorite = async (carId: string) => {
    try {
      // Optimistic update
      const isFav = favorites.includes(carId);
      const newFavorites = isFav
        ? favorites.filter(id => id !== carId)
        : [...favorites, carId];

      setFavorites(newFavorites);

      await carService.toggleFavorite(carId, user.id);
    } catch (e) {
      // Revert on error
      console.error("Error toggling favorite", e);
      fetchData(); // Reload to be safe
    }
  };

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

  const sortedCars = [...cars].sort((a, b) => {
    const aFav = favorites.includes(a.id);
    const bFav = favorites.includes(b.id);
    if (aFav && !bFav) return -1;
    if (!aFav && bFav) return 1;
    return 0;
  });

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black p-6 transition-colors duration-300">
      {/* Header */}
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-30 transition-colors duration-300">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 bg-zinc-900 dark:bg-white rounded-md flex items-center justify-center">
              <span className="text-white dark:text-black text-xs font-bold">J</span>
            </div>
            <h1 className="font-semibold text-zinc-900 dark:text-white tracking-tight">JaraCar</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2" data-tutorial="user-avatar">
              <div className="flex items-center gap-2">
                <button onClick={() => setIsProfileModalOpen(true)} className="hover:opacity-80 transition-opacity">
                  <UserAvatar name={user.name} imageUrl={user.avatarUrl} size="md" />
                </button>
                <div className="hidden sm:block text-right">
                  <p className="text-xs font-medium text-zinc-900 dark:text-white">{user.name}</p>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400">{user.email}</p>
                </div>
              </div>
              <button
                onClick={onLogout}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-rose-500 transition-colors"
                title="Cerrar sesión"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Todos los vehículos</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Reserva y gestiona tus viajes. Recuerda consultar.</p>
          </div>

          <div className="flex items-center gap-3">
            {/* View Switcher */}
            <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg border border-zinc-200 dark:border-zinc-800" data-tutorial="view-switcher">
              <button
                onClick={() => setViewMode('GRID')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'GRID'
                  ? 'bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-white'
                  : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                title="Vista Cuadrícula"
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => setViewMode('LIST')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'LIST'
                  ? 'bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-white'
                  : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                title="Vista Lista"
              >
                <List size={16} />
              </button>
              <button
                onClick={() => setViewMode('TIMELINE')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'TIMELINE'
                  ? 'bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-white'
                  : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                title="Vista Cronograma"
              >
                <CalendarRange size={16} />
              </button>
            </div>

            <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800 mx-1" />

            <button
              onClick={handleAddCar}
              className="group h-8 px-3 flex items-center gap-1.5 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors text-xs font-medium"
              title="Añadir Vehículo"
            >
              <Plus size={14} />
              <span className="hidden sm:inline">Añadir</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6">
            <p className="font-medium">Error cargando datos:</p>
            <p className="text-sm">{error}</p>
            <button
              onClick={fetchData}
              className="mt-2 text-sm font-medium underline hover:text-red-800 dark:hover:text-red-300"
            >
              Reintentar
            </button>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-64 bg-zinc-200/50 dark:bg-zinc-800/50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {viewMode === 'GRID' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {sortedCars.map((car, index) => (
                  <div key={car.id} data-tutorial={index === 0 ? "car-card" : undefined}>
                    <CarCard
                      car={car}
                      reservations={reservations.filter(r => r.carId === car.id)}
                      isFavorite={favorites.includes(car.id)}
                      onToggleFavorite={() => handleToggleFavorite(car.id)}
                      onClick={() => setSelectedCar(car)}
                    />
                  </div>
                ))}
              </div>
            )}

            {viewMode === 'LIST' && (
              <CarListView
                cars={sortedCars}
                reservations={reservations}
                favorites={favorites}
                onToggleFavorite={handleToggleFavorite}
                onSelectCar={setSelectedCar}
              />
            )}

            {viewMode === 'TIMELINE' && (
              <CarTimelineView
                cars={sortedCars}
                reservations={reservations}
                onSelectCar={setSelectedCar}
              />
            )}
          </>
        )}
      </main>

      {/* Detail Overlay */}
      <AnimatePresence>
        {selectedCar && (
          <CarDetail
            car={selectedCar}
            reservations={reservations.filter(r => r.carId === selectedCar.id)}
            activity={[]}
            currentUser={user}
            onClose={() => setSelectedCar(null)}
            onUpdate={fetchData}
          />
        )}
      </AnimatePresence>

      <AddCarModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={fetchData}
      />

      {/* Profile Modal */}
      <ProfileModal
        user={user}
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onUpdate={fetchData}
        onRestartTutorial={handleStartTutorial}
      />

      {/* Welcome Modal */}
      {showWelcome && (
        <WelcomeModal
          userName={user.name}
          onStartTutorial={handleStartTutorial}
          onSkip={handleWelcomeComplete}
        />
      )}

      {/* Tutorial Overlay */}
      {showTutorial && (
        <TutorialOverlay
          onComplete={handleTutorialComplete}
          onSkip={handleTutorialComplete}
        />
      )}
    </div>
  );
};