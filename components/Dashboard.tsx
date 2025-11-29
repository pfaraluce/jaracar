import React, { useState, useEffect } from 'react';
import { User, Car, Reservation, CarStatus, ActivityLog } from '../types';
import { carService } from '../services/cars';
import { reservationService } from '../services/reservations';
import { AddCarModal } from './AddCarModal';
import { CarCard } from './CarCard';
import { CarDetail } from './CarDetail';
import { UserAvatar } from './UserAvatar';
import { ProfileModal } from './ProfileModal';
import { WelcomeModal } from './WelcomeModal';
import { TutorialOverlay } from './TutorialOverlay';
import { AnimatePresence } from 'framer-motion';
import { Plus, LogOut } from 'lucide-react';

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
    <div className="min-h-screen bg-zinc-50 p-6">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 bg-zinc-900 rounded-md flex items-center justify-center">
              <span className="text-white text-xs font-bold">J</span>
            </div>
            <h1 className="font-semibold text-zinc-900 tracking-tight">JaraCar</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2" data-tutorial="user-avatar">
              <div className="flex items-center gap-2">
                <button onClick={() => setIsProfileModalOpen(true)} className="hover:opacity-80 transition-opacity">
                  <UserAvatar name={user.name} imageUrl={user.avatarUrl} size="md" />
                </button>
                <div className="hidden sm:block text-right">
                  <p className="text-xs font-medium text-zinc-900">{user.name}</p>
                  <p className="text-[10px] text-zinc-500">{user.email}</p>
                </div>
              </div>
              <button
                onClick={onLogout}
                className="p-2 hover:bg-zinc-100 rounded-full text-zinc-400 hover:text-rose-500 transition-colors"
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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Panel de Flota</h2>
            <p className="text-sm text-zinc-500">Gestiona las reservas y el estado de los vehículos.</p>
          </div>
          <button
            onClick={handleAddCar}
            className="group h-7 px-3 flex items-center gap-1.5 text-zinc-400 hover:text-zinc-900 transition-colors text-xs"
            title="Añadir Vehículo"
          >
            <Plus size={14} className="opacity-50 group-hover:opacity-100 transition-opacity" />
            <span className="hidden sm:inline opacity-0 group-hover:opacity-100 transition-opacity">Añadir</span>
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            <p className="font-medium">Error cargando datos:</p>
            <p className="text-sm">{error}</p>
            <button
              onClick={fetchData}
              className="mt-2 text-sm font-medium underline hover:text-red-800"
            >
              Reintentar
            </button>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-64 bg-zinc-200/50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
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