import React, { useState, useEffect } from 'react';
import { User, Car, Reservation, MealTemplate, MealOrder, MaintenanceTicket } from '../types';
import { kitchenService, KitchenConfig } from '../services/kitchen';
import { hasAccess } from '../utils/permissions';
import { maintenanceService } from '../services/maintenance';
import { carService } from '../services/cars';
import { reservationService } from '../services/reservations';
import { mealService } from '../services/meals';
import { gospelService, GospelData } from '../services/gospel';
import { useCalendarEvents } from '../hooks/useCalendarEvents';
import { EpactaEvent } from './EpactaEvent';
import { SugarPacket } from './SugarPacket';
import { CarDetail } from './CarDetail'; // Import CarDetail
import {
    Car as CarIcon,
    Utensils,
    Wrench,
    Calendar as CalendarIcon,
    ChevronRight,
    CheckCircle2,
    Clock,
    AlertCircle,
    ShoppingBag,
    Lock,
    BookOpen,
    Plus
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';

interface HomeViewProps {
    user: User;
    onNavigate: (view: 'HOME' | 'VEHICLES' | 'MEALS' | 'MAINTENANCE' | 'CALENDAR') => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ user, onNavigate }) => {
    // Data State
    const [stats, setStats] = useState({ availableCars: 0, totalCars: 0 });
    const [reservations, setReservations] = useState<Reservation[]>([]); // Store reservations
    const [selectedCar, setSelectedCar] = useState<Car | null>(null); // For modal

    // Meal State
    const [dailyMeals, setDailyMeals] = useState<{
        breakfast?: MealOrder | { status: 'template'; option: string; isBag: boolean };
        lunch?: MealOrder | { status: 'template'; option: string; isBag: boolean };
        dinner?: MealOrder | { status: 'template'; option: string; isBag: boolean };
    }>({});

    const [kitchenConfig, setKitchenConfig] = useState<KitchenConfig | null>(null);
    const [timeLeft, setTimeLeft] = useState<string | null>(null);
    const [isClosingSoon, setIsClosingSoon] = useState(false);

    // Agenda & Gospel State
    const [viewDate, setViewDate] = useState(new Date());
    const [gospel, setGospel] = useState<GospelData | null>(null);
    const { events, loading: eventsLoading } = useCalendarEvents();

    // Quick Fleet State
    const [quickCars, setQuickCars] = useState<Car[]>([]);

    // Maintenance State
    const [activeTickets, setActiveTickets] = useState<MaintenanceTicket[]>([]);

    // UI Logic
    const [expandedMeal, setExpandedMeal] = useState<string | null>(null);

    // Prep change confirmation modal
    const [showPrepWarning, setShowPrepWarning] = useState(false);
    const [pendingMealChange, setPendingMealChange] = useState<{
        type: 'breakfast' | 'lunch' | 'dinner';
        option: string;
        isBag: boolean;
        currentOption: string;
    } | null>(null);

    useEffect(() => {
        loadDashboardData();
    }, []);

    useEffect(() => {
        updateCountdown(); // Initial run
        const timer = setInterval(updateCountdown, 1000);
        return () => clearInterval(timer);
    }, [kitchenConfig]);

    const updateCountdown = () => {
        if (!kitchenConfig || !kitchenConfig.weekly_schedule) return;

        const now = new Date();
        const startDay = now.getDay().toString();
        const cutoffTime = kitchenConfig.weekly_schedule[startDay];

        if (!cutoffTime) {
            setTimeLeft(null);
            return;
        }

        const [h, m] = cutoffTime.split(':').map(Number);
        const deadline = new Date(now);
        deadline.setHours(h, m, 0, 0);

        if (deadline <= now) {
            setTimeLeft(null); // Deadline passed
            return;
        }

        const diff = deadline.getTime() - now.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
        setIsClosingSoon(diff < 3600000); // < 1 hour
    };

    const loadDashboardData = async () => {
        const cacheKey = `dashboard-${user.id}-${format(new Date(), 'yyyy-MM-dd')}`;

        // Try to load from cache first
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            try {
                const cachedData = JSON.parse(cached);
                setStats(cachedData.stats);
                setQuickCars(cachedData.quickCars);
                setDailyMeals(cachedData.dailyMeals);
                setKitchenConfig(cachedData.kitchenConfig);
                setViewDate(new Date(cachedData.viewDate));
                setReservations(cachedData.reservations || []);
                if (cachedData.activeTickets) setActiveTickets(cachedData.activeTickets);
                // Don't cache gospel - always fetch fresh
            } catch (e) {
                console.error('Cache parse error:', e);
            }
        }

        // Fetch fresh data in background
        try {
            // 1. Fleet Stats
            const cars = await carService.getCars();
            const res = await reservationService.getReservations();
            setReservations(res); // Store all reservations

            const now = new Date();

            const activeReservations = res.filter(r =>
                r.status === 'ACTIVE' &&
                new Date(r.startTime) <= now &&
                new Date(r.endTime) >= now
            );

            const availableCount = cars.length - activeReservations.length;
            const statsData = { availableCars: availableCount, totalCars: cars.length };
            setStats(statsData);

            // Filter for available cars to show in widget
            // Cars that are NOT in activeReservations and NOT in Workshop
            const availableCarsList = cars.filter(c =>
                !c.inWorkshop &&
                !activeReservations.some(r => r.carId === c.id)
            );

            // Prioritize available cars, fill with others if needed, but for "Available list" purely available is better.
            // User asked for "lista de coches disponibles".
            const quickCarsData = availableCarsList.slice(0, 5);
            setQuickCars(quickCarsData); // Show top 5 available

            // 2. Meal Status (Today)
            const todayStr = format(now, 'yyyy-MM-dd');
            const dayOfWeek = now.getDay(); // 0=Sun

            const [templates, orders, config] = await Promise.all([
                mealService.getMyTemplates(),
                mealService.getMyOrders(todayStr, todayStr),
                kitchenService.getConfig()
            ]);

            setKitchenConfig(config);

            // Helper to resolve meal status
            const resolveMeal = (type: string) => {
                const order = orders.find(o => o.mealType === type);
                if (order) return order; // Explicit order/skip

                const template = templates.find(t => t.dayOfWeek === dayOfWeek && t.mealType === type);
                if (template) return { status: 'template' as const, option: template.option, isBag: template.isBag };

                return undefined; // No service/plan
            };

            const mealsData = {
                breakfast: resolveMeal('breakfast'),
                lunch: resolveMeal('lunch'),
                dinner: resolveMeal('dinner')
            };
            setDailyMeals(mealsData);

            // 3. Determine View Date (Today vs Tomorrow)
            // If it's 18:00 or later, show tomorrow's agenda
            const shouldShowTomorrow = now.getHours() >= 18;
            const agendaDate = shouldShowTomorrow ? addDays(now, 1) : now;
            setViewDate(agendaDate);

            // 4. Gospel - ALWAYS Today's Gospel
            gospelService.getGospel(now).then(setGospel);

            // 5. Maintenance Stats
            let ticketsData = [];
            if (hasAccess(user, 'maintenance')) {
                const tickets = await maintenanceService.getTickets();
                const active = tickets.filter(t => t.status === 'open' || t.status === 'in_progress');
                ticketsData = active;
                setActiveTickets(active);
            }

            // Cache the fresh data (except gospel which is always fresh)
            localStorage.setItem(cacheKey, JSON.stringify({
                stats: statsData,
                quickCars: quickCarsData,
                dailyMeals: mealsData,
                kitchenConfig: config,
                viewDate: agendaDate,
                reservations: res,
                activeTickets: ticketsData
            }));

        } catch (error) {
            console.error("Dashboard load failed", error);
        }
    };

    const handleMealUpdate = async (type: 'breakfast' | 'lunch' | 'dinner', option: string, isBag: boolean) => {
        const todayStr = format(new Date(), 'yyyy-MM-dd');

        // Check if we're changing FROM a prep item (tupper/bag) to a standard option
        const currentItem = dailyMeals[type];
        const currentOption = currentItem?.option;
        const isChangingFromPrep = (currentOption === 'tupper' || currentOption === 'bag') &&
            (option !== 'tupper' && option !== 'bag');

        if (isChangingFromPrep) {
            // Show modal instead of window.confirm
            setPendingMealChange({ type, option, isBag, currentOption: currentOption! });
            setShowPrepWarning(true);
            return;
        }

        // Execute the change
        try {
            // Optimistic update
            setDailyMeals(prev => ({
                ...prev,
                [type]: { ...currentItem, option, isBag, status: 'confirmed' }
            }));

            await mealService.upsertOrder(user.id, todayStr, type, option, isBag);
        } catch (error) {
            console.error("Failed to update meal", error);
            loadDashboardData(); // Revert on error
        }
    };

    const confirmPrepChange = async () => {
        if (!pendingMealChange) return;

        const { type, option, isBag } = pendingMealChange;
        const todayStr = format(new Date(), 'yyyy-MM-dd');

        try {
            const currentItem = dailyMeals[type];
            setDailyMeals(prev => ({
                ...prev,
                [type]: { ...currentItem, option, isBag, status: 'confirmed' }
            }));

            await mealService.upsertOrder(user.id, todayStr, type, option, isBag);
        } catch (error) {
            console.error("Failed to update meal", error);
            loadDashboardData();
        } finally {
            setShowPrepWarning(false);
            setPendingMealChange(null);
        }
    };

    // Helper for labels
    const getOptionLabel = (opt: string) => {
        const map: Record<string, string> = {
            'standard': 'Normal',
            'early': 'Pronto',
            'late': 'Tarde',
            'tupper': 'Tupper',
            'bag': 'Bolsa',
            'skip': 'No'
        };
        return map[opt] || opt;
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

                {/* 1. Fleet Availability Widget - CONDENSED LIST */}
                {hasAccess(user, 'vehicles') && (
                    <div className="group bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 hover:shadow-lg transition-all relative overflow-hidden flex flex-col h-full">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
                                    <CarIcon size={20} />
                                </div>
                                <h3 className="font-semibold text-zinc-900 dark:text-white">Coches Disponibles</h3>
                            </div>
                            <button
                                onClick={() => onNavigate('VEHICLES')}
                                className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
                            >
                                Ver todos
                            </button>
                        </div>

                        {/* List of Available Cars */}
                        <div className="flex-1 space-y-2">
                            {quickCars.length > 0 ? (
                                quickCars.map(car => (
                                    <button
                                        key={car.id}
                                        onClick={() => setSelectedCar(car)}
                                        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors text-left group/car"
                                    >
                                        <div className="relative w-10 h-10 rounded-md overflow-hidden bg-zinc-100 dark:bg-zinc-800 shrink-0">
                                            <img src={car.imageUrl} alt={car.name} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-sm text-zinc-900 dark:text-white truncate">
                                                {car.name}
                                            </div>
                                            <div className="text-xs text-zinc-500 dark:text-zinc-400 font-mono truncate">
                                                {car.plate}
                                            </div>
                                        </div>
                                        <div className="text-xs font-medium text-blue-600 dark:text-blue-400 opacity-0 group-hover/car:opacity-100 transition-opacity">
                                            Reservar
                                        </div>
                                    </button>
                                ))
                            ) : (
                                <div className="text-center py-6 text-zinc-400 text-sm">
                                    No hay coches disponibles ahora mismo.
                                </div>
                            )}
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
                            <h3 className="font-semibold text-zinc-900 dark:text-white">Menú de Hoy</h3>
                        </div>

                        <div className="z-10 relative space-y-4">
                            {/* Timer Section */}
                            {timeLeft ? (
                                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${isClosingSoon
                                    ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-900/50 text-rose-600 dark:text-rose-400'
                                    : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-100 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                                    }`}>
                                    <Clock size={16} className={isClosingSoon ? "animate-pulse" : ""} />
                                    <div className="flex flex-col">
                                        <span className="text-[10px] uppercase font-bold tracking-wider opacity-70">Cierre de pedidos</span>
                                        <span className="font-mono font-bold leading-none">{timeLeft}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 text-zinc-400">
                                    <Lock size={16} />
                                    <span className="text-xs font-medium">Pedidos cerrados para hoy</span>
                                </div>
                            )}

                            {/* Meals List */}
                            <div className="space-y-2">
                                {[
                                    { key: 'breakfast', label: 'Desayuno', options: ['standard', 'early', 'skip'], data: dailyMeals.breakfast },
                                    { key: 'lunch', label: 'Comida', options: ['standard', 'early', 'late', 'tupper', 'bag', 'skip'], data: dailyMeals.lunch },
                                    { key: 'dinner', label: 'Cena', options: ['standard', 'late', 'skip'], data: dailyMeals.dinner }
                                ].map((meal) => {
                                    if (!meal.data) return null;

                                    const isConfirmed = (meal.data as any).status !== 'template';
                                    const currentOption = meal.data.option;
                                    const isLocked = !timeLeft;
                                    const isExpanded = expandedMeal === meal.key;

                                    // Prep items (breakfast, tupper, bag) are locked after midnight (yesterday's cutoff passed)
                                    const isPrepLocked = meal.key === 'breakfast'; // Breakfast is ALWAYS prep

                                    const getLabel = (opt: string) => {
                                        const map: Record<string, string> = {
                                            standard: 'Sí',
                                            skip: 'No',
                                            early: 'Pronto',
                                            late: 'Tarde',
                                            tupper: 'Tupper',
                                            bag: 'Bolsa',
                                            diet: 'Dieta'
                                        };
                                        return map[opt] || opt;
                                    };

                                    const isOptionDisabled = (opt: string) => {
                                        // Tupper and Bag are prep items - locked after yesterday's cutoff (always locked after midnight)
                                        if (opt === 'tupper' || opt === 'bag') return true;
                                        return false;
                                    };

                                    return (
                                        <div key={meal.key} className="relative">
                                            <div
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (!isLocked && !isPrepLocked) setExpandedMeal(isExpanded ? null : meal.key);
                                                }}
                                                className={`flex items-center justify-between p-3 rounded-xl transition-all ${isPrepLocked || isLocked ? 'opacity-60' : 'cursor-pointer'} ${isExpanded ? 'bg-zinc-100 dark:bg-zinc-800' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-2 h-2 rounded-full ${currentOption === 'skip' ? 'bg-zinc-300 dark:bg-zinc-600' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]'}`} />
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-zinc-900 dark:text-white">{meal.label}</span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <span className={`text-sm font-medium ${currentOption === 'skip' ? 'text-zinc-400' : 'text-zinc-900 dark:text-white'
                                                        }`}>
                                                        {getLabel(currentOption)}
                                                    </span>
                                                    {!isLocked && !isPrepLocked && (
                                                        <ChevronRight size={14} className={`text-zinc-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                                    )}
                                                </div>
                                            </div>

                                            {/* Expanded Options */}
                                            {isExpanded && !isLocked && !isPrepLocked && (
                                                <div className="grid grid-cols-3 gap-2 p-3 pt-0 bg-zinc-100 dark:bg-zinc-800 rounded-b-xl mb-2 animate-in slide-in-from-top-2 duration-200">
                                                    {meal.options.map((opt) => {
                                                        const disabled = isOptionDisabled(opt);
                                                        return (
                                                            <button
                                                                key={opt}
                                                                disabled={disabled}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleMealUpdate(meal.key as any, opt, false);
                                                                    setExpandedMeal(null);
                                                                }}
                                                                className={`px-2 py-2 rounded-lg text-xs font-medium transition-colors ${disabled
                                                                    ? 'opacity-40 cursor-not-allowed bg-zinc-200 dark:bg-zinc-700/50 text-zinc-400'
                                                                    : currentOption === opt
                                                                        ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                                                                        : 'text-zinc-500 dark:text-zinc-400 hover:bg-white/50 dark:hover:bg-zinc-700/50 hover:text-zinc-900 dark:hover:text-zinc-200'
                                                                    }`}
                                                            >
                                                                {getLabel(opt)}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                {!dailyMeals.breakfast && !dailyMeals.lunch && !dailyMeals.dinner && (
                                    <div className="text-center py-2 text-zinc-400 text-xs">
                                        No hay comidas planificadas para hoy.
                                    </div>
                                )}
                            </div>
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
                        className="group bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 hover:shadow-xl hover:border-zinc-300 dark:hover:border-zinc-700 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between min-h-[180px]"
                    >
                        {/* Background Pattern/Icon */}
                        <div className="absolute -bottom-4 -right-4 text-zinc-100 dark:text-zinc-800/50 transition-transform group-hover:scale-110 duration-500">
                            <Wrench size={120} strokeWidth={1} />
                        </div>

                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full text-zinc-900 dark:text-white">
                                    <Wrench size={18} />
                                </div>
                                <h3 className="font-semibold text-zinc-900 dark:text-white">Mantenimiento</h3>
                            </div>

                            <div className="mt-4">
                                <span className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">
                                    {activeTickets.length}
                                </span>
                                <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">
                                    Incidencias activas
                                </p>
                            </div>
                        </div>

                        <div className="mt-4 relative z-10">
                            <span className="inline-flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-white group-hover:gap-3 transition-all">
                                Reportar nueva <ChevronRight size={16} />
                            </span>
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
                        <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                            Agenda de {viewDate.getDate() === new Date().getDate() ? 'Hoy' : 'Mañana'}
                        </h2>
                    </div>
                    <button
                        onClick={() => onNavigate('CALENDAR')}
                        className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
                    >
                        Ver todo
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Gospel Section */}
                    <div>
                        <div className="flex items-center gap-2 mb-4 text-zinc-900 dark:text-white font-medium">
                            <BookOpen size={18} className="text-rose-500" />
                            <h3>Evangelio de {format(new Date(), "EEEE d", { locale: es })}</h3>
                        </div>

                        {gospel ? (
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                                <h4 className="text-lg font-bold leading-tight mb-3 text-zinc-900 dark:text-zinc-100">
                                    <a href={gospel.link} target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-rose-600 transition-colors">
                                        {gospel.title}
                                    </a>
                                </h4>
                                <p className="text-zinc-700 dark:text-zinc-300 text-sm leading-relaxed whitespace-pre-line">
                                    {gospel.description}
                                </p>
                                <a href={gospel.link} target="_blank" rel="noopener noreferrer" className="text-xs text-rose-500 hover:text-rose-600 mt-3 inline-flex items-center gap-1 font-medium">
                                    Leer completo en Opus Dei <ChevronRight size={12} />
                                </a>
                            </div>
                        ) : (
                            <div className="animate-pulse space-y-3">
                                <div className="h-6 bg-zinc-100 dark:bg-zinc-800 rounded w-3/4" />
                                <div className="h-20 bg-zinc-100 dark:bg-zinc-800 rounded w-full" />
                            </div>
                        )}
                    </div>

                    {/* Events List */}
                    <div className="space-y-3 lg:border-l border-zinc-200 dark:border-zinc-800 lg:pl-8">
                        {eventsLoading ? (
                            <div className="animate-pulse space-y-3">
                                <div className="h-16 bg-zinc-100 dark:bg-zinc-800 rounded-xl w-full" />
                                <div className="h-16 bg-zinc-100 dark:bg-zinc-800 rounded-xl w-full" />
                            </div>
                        ) : (
                            (() => {
                                const targetEvents = events.filter(e => {
                                    return e.start.getDate() === viewDate.getDate() &&
                                        e.start.getMonth() === viewDate.getMonth() &&
                                        e.start.getFullYear() === viewDate.getFullYear();
                                });

                                if (targetEvents.length === 0) {
                                    return (
                                        <div className="text-center py-8 text-zinc-400">
                                            <CalendarIcon size={32} className="mx-auto mb-2 opacity-50" />
                                            <p>No hay eventos para {viewDate.getDate() === new Date().getDate() ? 'hoy' : 'mañana'}.</p>
                                        </div>
                                    );
                                }

                                return targetEvents.map(event => (
                                    <EpactaEvent key={event.id} event={event} compact={false} />
                                ));
                            })()
                        )}
                    </div>
                </div>
            </div>

            {/* Sugar Packet Quote Widget (Moved to bottom) */}
            <div className="w-full pb-8">
                <SugarPacket />
            </div>

            {/* Car Modal */}
            {selectedCar && (
                <CarDetail
                    car={selectedCar}
                    reservations={reservations.filter(r => r.carId === selectedCar.id)}
                    activity={[]}
                    currentUser={user}
                    onClose={() => setSelectedCar(null)}
                    onUpdate={loadDashboardData}
                />
            )}

            {/* Prep Change Warning Modal */}
            {showPrepWarning && pendingMealChange && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-zinc-200 dark:border-zinc-800">
                        <div className="flex items-start gap-4 mb-4">
                            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                                <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-500" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-1">
                                    Cambiar pedido preparado
                                </h3>
                                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                    Ya tienes {pendingMealChange.currentOption === 'tupper' ? 'preparado un' : 'preparada una'} <span className="font-medium text-zinc-900 dark:text-white">{pendingMealChange.currentOption === 'tupper' ? 'tupper' : 'bolsa'}</span>. ¿Quieres cambiarlo de todas formas?
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => {
                                    setShowPrepWarning(false);
                                    setPendingMealChange(null);
                                }}
                                className="flex-1 px-4 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-medium text-sm transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmPrepChange}
                                className="flex-1 px-4 py-2.5 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 font-medium text-sm transition-colors shadow-sm"
                            >
                                Confirmar cambio
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
