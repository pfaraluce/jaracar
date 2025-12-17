import React, { useState, useEffect } from 'react';
import { format, addDays, subDays, startOfToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { mealService } from '../services/meals';
import { kitchenService, MealGuest } from '../services/kitchen';
import { ChevronLeft, ChevronRight, Lock, Users } from 'lucide-react';
import { MealOrder, User } from '../types';
import { KitchenAdminPanel } from './KitchenAdminPanel';

interface DailyMealsListProps {
    user: User;
}

// Color configuration matching DailyOrderManager
const OPTION_CONFIG: Record<string, { label: string; color: string; textColor: string }> = {
    skip: { label: 'NO', color: 'bg-rose-500', textColor: 'text-white' },
    standard: { label: 'SÍ', color: 'bg-emerald-500', textColor: 'text-white' },
    early: { label: '1T', color: 'bg-yellow-400', textColor: 'text-zinc-900' },
    late: { label: '2T', color: 'bg-emerald-700', textColor: 'text-white' },
    tupper: { label: 'TP', color: 'bg-amber-800', textColor: 'text-white' },
    bag: { label: 'B', color: 'bg-blue-600', textColor: 'text-white' },
};

interface ResidentEntry {
    name: string;
    option: string;
    isBag: boolean;
    isFromTemplate: boolean;
    isGuest: boolean;
    guestCount?: number;
    guestNotes?: string;
}

export const DailyMealsList: React.FC<DailyMealsListProps> = ({ user }) => {
    const [selectedDate, setSelectedDate] = useState(startOfToday());
    const [orders, setOrders] = useState<(MealOrder & { userName: string })[]>([]);
    const [nextDayOrders, setNextDayOrders] = useState<(MealOrder & { userName: string })[]>([]);
    const [guests, setGuests] = useState<MealGuest[]>([]);
    const [nextGuests, setNextGuests] = useState<MealGuest[]>([]);
    const [isLocked, setIsLocked] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadOrders();
    }, [selectedDate]);

    const loadOrders = async () => {
        setLoading(true);
        try {
            const dateStr = format(selectedDate, 'yyyy-MM-dd');
            const nextDateStr = format(addDays(selectedDate, 1), 'yyyy-MM-dd');

            const [todayData, nextData, todayGuests, nextGuestsData, locked] = await Promise.all([
                mealService.getDailyMealPlan(dateStr),
                mealService.getDailyMealPlan(nextDateStr),
                kitchenService.getGuests(dateStr),
                kitchenService.getGuests(nextDateStr),
                kitchenService.getDailyLockStatus(dateStr)
            ]);

            setOrders(todayData);
            setNextDayOrders(nextData);
            setGuests(todayGuests);
            setNextGuests(nextGuestsData);
            setIsLocked(locked);
        } catch (error) {
            console.error('Error loading orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePrevDay = () => setSelectedDate(curr => subDays(curr, 1));
    const handleNextDay = () => setSelectedDate(curr => addDays(curr, 1));

    // Group residents by meal type and option
    const groupByMealAndOption = (
        ordersList: typeof orders,
        guestsList: typeof guests,
        mealType: string
    ): Record<string, ResidentEntry[]> => {
        const grouped: Record<string, ResidentEntry[]> = {};

        // Add regular orders
        ordersList
            .filter(o => o.mealType === mealType && o.option && o.option !== 'skip' && o.option !== 'no')
            .forEach(o => {
                const key = o.option === 'bag' || o.isBag ? 'bag' : o.option;
                if (!grouped[key]) grouped[key] = [];
                grouped[key].push({
                    name: o.userName,
                    option: o.option,
                    isBag: o.isBag || false,
                    isFromTemplate: o.status === 'template',
                    isGuest: false
                });
            });

        // Add guests
        guestsList
            .filter(g => g.mealType === mealType)
            .forEach(g => {
                const key = g.option === 'bag' || g.isBag ? 'bag' : g.option;
                if (!grouped[key]) grouped[key] = [];
                grouped[key].push({
                    name: 'Invitados',
                    option: g.option,
                    isBag: g.isBag,
                    isFromTemplate: false,
                    isGuest: true,
                    guestCount: g.count,
                    guestNotes: g.notes
                });
            });

        return grouped;
    };

    // Get subdivisions for tomorrow's prep
    const getTomorrowPrep = () => {
        const prep: Record<string, ResidentEntry[]> = {
            earlyBreakfast: [],
            tupper: [],
            bag: []
        };

        // Early breakfast
        nextDayOrders
            .filter(o => o.mealType === 'breakfast' && o.option === 'early')
            .forEach(o => {
                prep.earlyBreakfast.push({
                    name: o.userName,
                    option: o.option,
                    isBag: false,
                    isFromTemplate: o.status === 'template',
                    isGuest: false
                });
            });

        nextGuests
            .filter(g => g.mealType === 'breakfast' && g.option === 'early')
            .forEach(g => {
                prep.earlyBreakfast.push({
                    name: 'Invitados',
                    option: g.option,
                    isBag: false,
                    isFromTemplate: false,
                    isGuest: true,
                    guestCount: g.count,
                    guestNotes: g.notes
                });
            });

        // Tuppers
        nextDayOrders
            .filter(o => o.option === 'tupper' && !o.isBag)
            .forEach(o => {
                prep.tupper.push({
                    name: o.userName,
                    option: o.option,
                    isBag: false,
                    isFromTemplate: o.status === 'template',
                    isGuest: false
                });
            });

        nextGuests
            .filter(g => g.option === 'tupper' && !g.isBag)
            .forEach(g => {
                prep.tupper.push({
                    name: 'Invitados',
                    option: g.option,
                    isBag: false,
                    isFromTemplate: false,
                    isGuest: true,
                    guestCount: g.count,
                    guestNotes: g.notes
                });
            });

        // Bags
        nextDayOrders
            .filter(o => o.isBag || o.option === 'bag')
            .forEach(o => {
                prep.bag.push({
                    name: o.userName,
                    option: o.option,
                    isBag: true,
                    isFromTemplate: o.status === 'template',
                    isGuest: false
                });
            });

        nextGuests
            .filter(g => g.isBag || g.option === 'bag')
            .forEach(g => {
                prep.bag.push({
                    name: 'Invitados',
                    option: g.option,
                    isBag: true,
                    isFromTemplate: false,
                    isGuest: true,
                    guestCount: g.count,
                    guestNotes: g.notes
                });
            });

        return prep;
    };

    const breakfastGroups = groupByMealAndOption(orders, guests, 'breakfast');
    const lunchGroups = groupByMealAndOption(orders, guests, 'lunch');
    const dinnerGroups = groupByMealAndOption(orders, guests, 'dinner');
    const tomorrowPrep = getTomorrowPrep();

    // Debug logging
    console.log('=== KITCHEN VIEW DEBUG ===');
    console.log('Total orders:', orders.length);
    console.log('Breakfast orders:', orders.filter(o => o.mealType === 'breakfast'));
    console.log('Breakfast groups:', breakfastGroups);
    console.log('Lunch groups:', lunchGroups);
    console.log('Dinner groups:', dinnerGroups);

    // Render a subdivision section
    const SubdivisionSection = ({
        title,
        residents,
        optionKey
    }: {
        title: string;
        residents: ResidentEntry[];
        optionKey: string;
    }) => {
        if (residents.length === 0) return null;

        const totalCount = residents.reduce((sum, r) => sum + (r.isGuest ? (r.guestCount || 0) : 1), 0);
        const config = OPTION_CONFIG[optionKey] || OPTION_CONFIG.standard;

        return (
            <div className="mb-4">
                <div className="flex items-center gap-2 mb-2 px-2">
                    <div className={`px-3 py-1 rounded-lg ${config.color} ${config.textColor} font-semibold text-xs`}>
                        {config.label}
                    </div>
                    <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                        {title}
                    </h4>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        ({totalCount})
                    </span>
                </div>
                <div className="space-y-1 pl-4">
                    {residents.map((resident, idx) => (
                        <div
                            key={idx}
                            className={`flex items-center justify-between p-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors ${resident.isFromTemplate ? 'ring-1 ring-zinc-300 dark:ring-zinc-600' : ''
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                {resident.isGuest ? (
                                    <>
                                        <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold">
                                            +{resident.guestCount}
                                        </div>
                                        <div>
                                            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                                {resident.name}
                                            </span>
                                            {resident.guestNotes && (
                                                <span className="text-xs text-zinc-500 dark:text-zinc-400 ml-2">
                                                    • {resident.guestNotes}
                                                </span>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <span className="text-sm font-medium text-zinc-900 dark:text-white">
                                        {resident.name}
                                    </span>
                                )}
                            </div>
                            {resident.isFromTemplate && (
                                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">
                                    Plantilla
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    // Render a meal section
    const MealSection = ({
        title,
        groups,
        subdivisions
    }: {
        title: string;
        groups: Record<string, ResidentEntry[]>;
        subdivisions: { key: string; label: string }[];
    }) => {
        const hasAnyResidents = subdivisions.some(sub => groups[sub.key]?.length > 0);
        if (!hasAnyResidents) return null;

        return (
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-sm">
                <h3 className="text-base font-bold text-zinc-900 dark:text-white mb-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
                    {title}
                </h3>
                {subdivisions.map(sub => (
                    <SubdivisionSection
                        key={sub.key}
                        title={sub.label}
                        residents={groups[sub.key] || []}
                        optionKey={sub.key}
                    />
                ))}
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header with Date Selector - matching DailyOrderManager style */}
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Vista de Cocina</h3>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handlePrevDay}
                        className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                        <ChevronLeft size={20} className="text-zinc-600 dark:text-zinc-400" />
                    </button>
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 min-w-[140px] text-center capitalize">
                        {format(selectedDate, "d 'de' MMMM", { locale: es })}
                    </span>
                    <button
                        onClick={handleNextDay}
                        className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                        <ChevronRight size={20} className="text-zinc-600 dark:text-zinc-400" />
                    </button>
                </div>
            </div>

            {isLocked && (
                <div className="flex justify-center items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                    <Lock size={16} className="text-red-600 dark:text-red-400" />
                    <span className="text-sm font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">
                        Pedidos Cerrados
                    </span>
                </div>
            )}

            {/* Admin Panel */}
            {user.role === 'ADMIN' && (
                <KitchenAdminPanel selectedDate={selectedDate} onUpdate={loadOrders} />
            )}

            {loading ? (
                <div className="p-12 text-center text-zinc-400">
                    <p className="text-sm">Cargando...</p>
                </div>
            ) : (
                <>
                    {/* Meal Sections */}
                    <div className="space-y-4">
                        <MealSection
                            title="Desayuno"
                            groups={breakfastGroups}
                            subdivisions={[
                                { key: 'early', label: 'Pronto' },
                                { key: 'standard', label: 'Normal' }
                            ]}
                        />

                        <MealSection
                            title="Comida"
                            groups={lunchGroups}
                            subdivisions={[
                                { key: 'early', label: 'Pronto' },
                                { key: 'standard', label: 'Normal' },
                                { key: 'late', label: 'Tarde' },
                                { key: 'tupper', label: 'Tupper' },
                                { key: 'bag', label: 'Bolsa' }
                            ]}
                        />

                        <MealSection
                            title="Cena"
                            groups={dinnerGroups}
                            subdivisions={[
                                { key: 'standard', label: 'Normal' },
                                { key: 'late', label: 'Tarde' }
                            ]}
                        />
                    </div>

                    {/* Tomorrow's Prep Section */}
                    {(tomorrowPrep.earlyBreakfast.length > 0 ||
                        tomorrowPrep.tupper.length > 0 ||
                        tomorrowPrep.bag.length > 0) && (
                            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 rounded-xl border border-indigo-200 dark:border-indigo-800 p-4 shadow-sm">
                                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-indigo-200 dark:border-indigo-800">
                                    <Users size={18} className="text-indigo-600 dark:text-indigo-400" />
                                    <h3 className="text-base font-bold text-indigo-900 dark:text-indigo-100">
                                        Preparación para Mañana
                                    </h3>
                                    <span className="text-xs text-indigo-600 dark:text-indigo-400 capitalize">
                                        {format(addDays(selectedDate, 1), "EEEE, d 'de' MMMM", { locale: es })}
                                    </span>
                                </div>

                                <SubdivisionSection
                                    title="Desayuno Pronto"
                                    residents={tomorrowPrep.earlyBreakfast}
                                    optionKey="early"
                                />

                                <SubdivisionSection
                                    title="Tuppers"
                                    residents={tomorrowPrep.tupper}
                                    optionKey="tupper"
                                />

                                <SubdivisionSection
                                    title="Bolsas"
                                    residents={tomorrowPrep.bag}
                                    optionKey="bag"
                                />
                            </div>
                        )}

                    {/* Legend */}
                    <div className="flex flex-wrap gap-3 text-xs text-zinc-600 dark:text-zinc-400 pt-2">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded border border-zinc-300 dark:border-zinc-600"></div>
                            <span>Desde plantilla</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[10px] font-bold">
                                +N
                            </div>
                            <span>Invitados</span>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
