import React from 'react';
import { Car, Reservation, CarStatus } from '../types';
import { Heart, Calendar, Wrench, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface CarListViewProps {
    cars: Car[];
    reservations: Reservation[];
    favorites: string[];
    onToggleFavorite: (carId: string) => void;
    onSelectCar: (car: Car) => void;
}

export const CarListView: React.FC<CarListViewProps> = ({
    cars,
    reservations,
    favorites,
    onToggleFavorite,
    onSelectCar,
}) => {
    const getStatusColor = (status: CarStatus) => {
        switch (status) {
            case CarStatus.AVAILABLE: return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case CarStatus.BOOKED: return 'bg-blue-100 text-blue-700 border-blue-200';
            case CarStatus.MAINTENANCE: return 'bg-amber-100 text-amber-700 border-amber-200';
            case CarStatus.WORKSHOP: return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-zinc-100 text-zinc-700 border-zinc-200';
        }
    };

    const getStatusLabel = (status: CarStatus) => {
        switch (status) {
            case CarStatus.AVAILABLE: return 'Disponible';
            case CarStatus.BOOKED: return 'Reservado';
            case CarStatus.MAINTENANCE: return 'Mantenimiento';
            case CarStatus.WORKSHOP: return 'Taller';
            default: return status;
        }
    };

    return (
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-zinc-50 text-zinc-500 font-medium border-b border-zinc-200">
                        <tr>
                            <th className="px-6 py-4">Vehículo</th>
                            <th className="px-6 py-4">Matrícula</th>
                            <th className="px-6 py-4">Estado</th>
                            <th className="px-6 py-4">Próxima Revisión</th>
                            <th className="px-6 py-4 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                        {cars.map((car) => {
                            const isFavorite = favorites.includes(car.id);
                            return (
                                <tr
                                    key={car.id}
                                    className="hover:bg-zinc-50/50 transition-colors cursor-pointer group"
                                    onClick={() => onSelectCar(car)}
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-4">
                                            <div className="relative h-12 w-20 rounded-lg overflow-hidden bg-zinc-100 shrink-0">
                                                <img
                                                    src={car.imageUrl}
                                                    alt={car.name}
                                                    className="h-full w-full object-cover"
                                                />
                                            </div>
                                            <div>
                                                <p className="font-medium text-zinc-900">{car.name}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${car.fuelType === 'electric' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                                            'bg-zinc-100 text-zinc-600 border-zinc-200'
                                                        }`}>
                                                        {car.fuelType === 'electric' ? 'Eléctrico' : car.fuelType === 'diesel' ? 'Diésel' : 'Gasolina'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="font-mono text-zinc-600 bg-zinc-100 px-2 py-1 rounded text-xs">
                                            {car.plate}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(car.status)}`}>
                                            {getStatusLabel(car.status)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {car.nextServiceDate ? (
                                            <div className="flex items-center gap-2 text-zinc-600">
                                                <Calendar size={14} />
                                                <span>{format(new Date(car.nextServiceDate), 'd MMM yyyy', { locale: es })}</span>
                                            </div>
                                        ) : (
                                            <span className="text-zinc-400">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onToggleFavorite(car.id);
                                            }}
                                            className={`p-2 rounded-full transition-all ${isFavorite
                                                    ? 'text-rose-500 bg-rose-50 hover:bg-rose-100'
                                                    : 'text-zinc-400 hover:text-rose-500 hover:bg-zinc-100'
                                                }`}
                                            title={isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"}
                                        >
                                            <Heart size={18} fill={isFavorite ? "currentColor" : "none"} />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
