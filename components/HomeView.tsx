import React, { useState, useEffect } from 'react';
import { User, Car, Reservation, MealTemplate, MealOrder } from '../types';
import { hasAccess } from '../utils/permissions';
import { carService } from '../services/cars';
import { reservationService } from '../services/reservations';
import { mealService } from '../services/meals';
import { useCalendarEvents } from '../hooks/useCalendarEvents';
import { SugarPacket } from './SugarPacket';
import {
    Car as CarIcon,
    Utensils,
    Wrench,
    Calendar as CalendarIcon,
    ChevronRight,
    PlusCircle,
    CheckCircle2,
    Clock,
    AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface HomeViewProps {
    user: User;
    onNavigate: (view: 'HOME' | 'VEHICLES' | 'MEALS' | 'MAINTENANCE' | 'CALENDAR') => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ user, onNavigate }) => {
    // Data State
    const [stats, setStats] = useState({ availableCars: 0, totalCars: 0 });
    const [nextMeal, setNextMeal] = useState<{ ordered: boolean, type: string, description: string, optionLabel: string } | null>(null);
    const { events, loading: eventsLoading } = useCalendarEvents();

    // Quick Fleet State
    const [quickCars, setQuickCars] = useState<Car[]>([]);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            // 1. Fleet Stats
            const cars = await carService.getCars();
            const reservations = await reservationService.getReservations();
            const now = new Date();

            const activeReservations = reservations.filter(r =>
                r.status === 'ACTIVE' &&
                new Date(r.startTime) <= now &&
                new Date(r.endTime) >= now
            );

            const availableCount = cars.length - activeReservations.length;
            setStats({ availableCars: availableCount, totalCars: cars.length });
            setQuickCars(cars.slice(0, 3)); // Show top 3 cars

            // 2. Meal Status (Today)
            const todayStr = format(now, 'yyyy-MM-dd');
            const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon...

            const [templates, orders] = await Promise.all([
                mealService.getMyTemplates(),
                mealService.getMyOrders(todayStr, todayStr)
            ]);

            // Determine relevant meal (Lunch vs Dinner based on time)
            const currentHour = now.getHours();
            const relevantType = currentHour < 15 ? 'lunch' : 'dinner';

            const order = orders.find(o => o.mealType === relevantType);
            const template = templates.find(t => t.dayOfWeek === dayOfWeek && t.mealType === relevantType);

            const getOptionLabel = (opt: string) => {
                const map: Record<string, string> = {
                    'standard': 'Estándar',
                    'early': 'Pronto',
                    'late': 'Tarde',
                    'tupper': 'Tupper',
                    'bag': 'Bolsa',
                    'skip': 'No Asisto'
                };
                return map[opt] || opt;
            };

            // Readable Titles
            const typeLabel = relevantType === 'lunch' ? 'Comida' : 'Cena';

            if (order) {
                setNextMeal({
                    ordered: true,
                    type: typeLabel,
                    description: order.option === 'skip' ? 'No asistirás' : 'Pedido Confirmado',
                    optionLabel: getOptionLabel(order.option)
                });
            } else if (template) {
                setNextMeal({
                    ordered: false,
                    type: typeLabel,
                    description: 'Planificado (Plantilla)',
                    optionLabel: `Predeterminado: ${getOptionLabel(template.option)}`
                });
            } else {
                setNextMeal(null); // No service today/active
            }

        } catch (error) {
            console.error("Dashboard load failed", error);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <header>
                <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
                    Hola, {user.name.split(' ')[0]} 👋
                </h1>
                <p className="text-zinc-500 dark:text-zinc-400 mt-1">
                    Aquí tienes el resumen de hoy, {format(new Date(), "d 'de' MMMM", { locale: es })}.
                </p>
            </header>




            {/* Quick Widgets Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {/* 1. Fleet Availability Widget */}
                {hasAccess(user, 'vehicles') && (
                    <div
                        onClick={() => onNavigate('VEHICLES')}
                        className="group bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 hover:shadow-lg transition-all cursor-pointer relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <CarIcon size={64} />
                        </div>

                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
                                <CarIcon size={20} />
                            </div>
                            <h3 className="font-semibold text-zinc-900 dark:text-white">Flota</h3>
                        </div>

                        <div className="space-y-1 z-10 relative">
                            <div className="text-3xl font-bold text-zinc-900 dark:text-white">
                                {stats.availableCars} <span className="text-sm font-normal text-zinc-500">libres</span>
                            </div>
                            <p className="text-xs text-zinc-500">de {stats.totalCars} vehículos en total</p>
                        </div>

                        <div className="mt-6 flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400">
                            Reservar ahora <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                        </div>
                    </div>
                )}

                {/* 2. Meals Widget */}
                {hasAccess(user, 'meals') && (
                    <div
                        onClick={() => onNavigate('MEALS')}
                        className="group bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 hover:shadow-lg transition-all cursor-pointer relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Utensils size={64} />
                        </div>

                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-600 dark:text-emerald-400">
                                <Utensils size={20} />
                            </div>
                            <h3 className="font-semibold text-zinc-900 dark:text-white">Próxima Comida</h3>
                        </div>

                        <div className="z-10 relative">
                            {nextMeal ? (
                                <div className="space-y-2">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="text-xl font-bold text-zinc-900 dark:text-white capitalize">
                                                {nextMeal.type}
                                            </div>
                                            <div className="text-xs font-medium text-zinc-500 mt-1 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md inline-block">
                                                {nextMeal.optionLabel}
                                            </div>
                                        </div>
                                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${nextMeal.ordered
                                                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                                                : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                                            }`}>
                                            {nextMeal.ordered ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                                            {nextMeal.ordered ? 'Confirmado' : 'Pendiente'}
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-zinc-500 py-2">
                                    <p className="font-medium text-zinc-900 dark:text-white">Sin servicio</p>
                                    <p className="text-xs">No hay comidas programadas ahora.</p>
                                </div>
                            )}
                        </div>

                        <div className="mt-6 flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                            Ver menú <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                        </div>
                    </div>
                )}

                {/* 3. Maintenance Shortcut */}
                {hasAccess(user, 'maintenance') && (
                    <div
                        onClick={() => onNavigate('MAINTENANCE')}
                        className="group bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 hover:shadow-lg transition-all cursor-pointer relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Wrench size={64} />
                        </div>

                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-amber-600 dark:text-amber-400">
                                <Wrench size={20} />
                            </div>
                            <h3 className="font-semibold text-zinc-900 dark:text-white">Mantenimiento</h3>
                        </div>

                        <div className="space-y-2 z-10 relative">
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                ¿Algo no funciona? Reporta incidencias en el hogar o vehículos.
                            </p>
                            <div className="flex items-center gap-2 text-xs text-zinc-500 pt-2">
                                <AlertCircle size={14} />
                                <span>Respuesta media: 24h</span>
                            </div>
                        </div>

                        <div className="mt-6 flex items-center gap-2 text-sm font-medium text-amber-600 dark:text-amber-400">
                            Crear Ticket <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                        </div>
                    </div>
                )}

            </div>


            {/* Today's Agenda Section */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-violet-50 dark:bg-violet-900/20 rounded-lg text-violet-600 dark:text-violet-400">
                            <CalendarIcon size={20} />
                        </div>
                        <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Agenda de Hoy</h2>
                    </div>
                    <button
                        onClick={() => onNavigate('CALENDAR')}
                        className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
                    >
                        Ver todo
                    </button>
                </div>

                {/* Events List */}
                <div className="space-y-3">
                    {eventsLoading ? (
                        <div className="animate-pulse space-y-3">
                            <div className="h-16 bg-zinc-100 dark:bg-zinc-800 rounded-xl w-full" />
                            <div className="h-16 bg-zinc-100 dark:bg-zinc-800 rounded-xl w-full" />
                        </div>
                    ) : events.length === 0 ? (
                        <div className="text-center py-8 text-zinc-400">
                            <CalendarIcon size={32} className="mx-auto mb-2 opacity-50" />
                            <p>No tienes eventos hoy.</p>
                        </div>
                    ) : (
                        events.filter(e => {
                            // Filter only "Today" events
                            const today = new Date();
                            return e.start.getDate() === today.getDate() &&
                                e.start.getMonth() === today.getMonth() &&
                                e.start.getFullYear() === today.getFullYear();
                        }).length === 0 ? (
                            <div className="text-center py-8 text-zinc-400">
                                <p>No tienes eventos hoy.</p>
                            </div>
                        ) : (
                            events.filter(e => {
                                const today = new Date();
                                return e.start.getDate() === today.getDate() &&
                                    e.start.getMonth() === today.getMonth() &&
                                    e.start.getFullYear() === today.getFullYear();
                            }).map(event => (
                                <div key={event.id} className="flex items-start gap-4 p-4 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors border border-transparent hover:border-zinc-100 dark:hover:border-zinc-800 group">
                                    <div className="flex flex-col items-center min-w-[3rem]">
                                        <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                                            {event.allDay ? 'TODO' : format(event.start, 'HH:mm')}
                                        </span>
                                        {!event.allDay && event.end && (
                                            <span className="text-[10px] text-zinc-400">
                                                {format(event.end, 'HH:mm')}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0 border-l-2 border-zinc-200 dark:border-zinc-700 pl-4" style={{ borderLeftColor: event.color }}>
                                        <h4 className="font-medium text-zinc-900 dark:text-white truncate">
                                            {event.title}
                                        </h4>
                                        {event.location && (
                                            <p className="text-xs text-zinc-500 truncate mt-0.5">📍 {event.location}</p>
                                        )}
                                        {event.description && (
                                            <p className="text-xs text-zinc-400 mt-1 line-clamp-1">{event.description}</p>
                                        )}
                                    </div>
                                </div>
                            ))
                        )
                    )}
                </div>
            </div>

            {/* Sugar Packet Quote Widget (Moved to bottom) */}
            <div className="w-full pb-8">
                <SugarPacket />
            </div>
        </div>
    );
};
