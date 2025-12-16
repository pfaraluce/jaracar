import React, { useState, useEffect } from 'react';
import { hasAdminAccess } from '../utils/permissions';

// ... (existing imports, but wait, look at the file content)
// I need to add the import at the top.
// And replace line 134.

// I will do two replacements in one go if I can? replace_file_content only does one contiguous block.
// I will start with the Import.
import { User, Car, Reservation } from '../types';
import { carService } from '../services/cars';
import { reservationService } from '../services/reservations';
import { AddCarModal } from './AddCarModal';
import { CarCard } from './CarCard';
import { CarDetail } from './CarDetail';
import { CarListView } from './CarListView';
import { CarTimelineView } from './CarTimelineView';
import { AnimatePresence } from 'framer-motion';
import { Plus, LayoutGrid, List, CalendarRange } from 'lucide-react';

interface VehiclesViewProps {
    user: User;
}

export const VehiclesView: React.FC<VehiclesViewProps> = ({ user }) => {
    const [cars, setCars] = useState<Car[]>([]);
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [favorites, setFavorites] = useState<string[]>([]);
    const [selectedCar, setSelectedCar] = useState<Car | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'GRID' | 'LIST' | 'TIMELINE'>(() => {
        const saved = localStorage.getItem('jaracar_view_mode');
        return (saved as 'GRID' | 'LIST' | 'TIMELINE') || 'GRID';
    });

    useEffect(() => {
        localStorage.setItem('jaracar_view_mode', viewMode);
    }, [viewMode]);

    const fetchData = async () => {
        try {
            const [c, r] = await Promise.all([
                carService.getCars(),
                reservationService.getReservations()
            ]);
            setCars(c);
            setReservations(r);

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

    const sortedCars = [...cars].sort((a, b) => {
        const aFav = favorites.includes(a.id);
        const bFav = favorites.includes(b.id);
        if (aFav && !bFav) return -1;
        if (!aFav && bFav) return 1;
        return 0;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Vehículos</h2>
                    <p className="text-zinc-500 dark:text-zinc-400">Reserva y gestiona la flota de la residencia.</p>
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

                    {hasAdminAccess(user, 'vehicles') && (
                        <>
                            <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800 mx-1" />

                            <button
                                onClick={handleAddCar}
                                className="group h-9 px-4 flex items-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors text-sm font-medium"
                                title="Añadir Vehículo"
                            >
                                <Plus size={16} />
                                <span>Añadir</span>
                            </button>
                        </>
                    )}
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
        </div>
    );
};
