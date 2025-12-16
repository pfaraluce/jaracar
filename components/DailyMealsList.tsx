import React, { useState, useEffect } from 'react';
import { format, addDays, subDays, startOfToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { mealService } from '../services/meals';
import { kitchenService, MealGuest } from '../services/kitchen';
import { ChevronLeft, ChevronRight, ShoppingBag, Utensils, Lock, Circle, Users } from 'lucide-react';
import { MealOrder, User } from '../types';
import { KitchenAdminPanel } from './KitchenAdminPanel';

interface DailyMealsListProps {
    user: User;
}

export const DailyMealsList: React.FC<DailyMealsListProps> = ({ user }) => {
    const [selectedDate, setSelectedDate] = useState(startOfToday());
    const [orders, setOrders] = useState<(MealOrder & { userName: string })[]>([]);
    const [nextDayOrders, setNextDayOrders] = useState<(MealOrder & { userName: string })[]>([]);
    const [guests, setGuests] = useState<MealGuest[]>([]);
    const [nextGuests, setNextGuests] = useState<MealGuest[]>([]);
    const [isLocked, setIsLocked] = useState(false);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'breakfast' | 'lunch' | 'dinner'>('all');

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

    // --- Stats Breakdown Logic ---
    type CountBreakdown = {
        total: number;
        subtypes: Record<string, number>;
    };

    const getBreakdown = (
        relevantOrders: typeof orders,
        relevantGuests: typeof guests,
        typeFilter: (t: string) => boolean,
        optionFilter?: (o: string, isBag: boolean) => boolean
    ): CountBreakdown => {
        let total = 0;
        const subtypes: Record<string, number> = {};

        const processItem = (option: string, isBag: boolean, count: number) => {
            if (optionFilter && !optionFilter(option, isBag)) return;

            total += count;
            let label = 'Normal';
            if (isBag || option === 'bag') label = 'Bolsa';
            else if (option === 'tupper') label = 'Tupper';
            else if (option === 'early') label = 'Pronto';
            else if (option === 'late') label = 'Tarde';
            else label = 'Normal';

            subtypes[label] = (subtypes[label] || 0) + count;
        };

        relevantOrders.forEach(o => {
            if (!typeFilter(o.mealType)) return;
            if (!o.option || o.option === 'skip' || o.option === 'no') return;
            processItem(o.option, o.isBag || false, 1);
        });

        relevantGuests.forEach(g => {
            if (!typeFilter(g.mealType)) return;
            processItem(g.option, g.isBag, g.count);
        });

        return { total, subtypes };
    };

    // Calculate Stats
    const breakfastStats = getBreakdown(orders, guests, t => t === 'breakfast');
    const lunchStats = getBreakdown(orders, guests, t => t === 'lunch');
    const dinnerStats = getBreakdown(orders, guests, t => t === 'dinner');

    const nextBreakfastStats = getBreakdown(nextDayOrders, nextGuests, t => t === 'breakfast');
    const nextTupperStats = getBreakdown(
        nextDayOrders, nextGuests, t => true, (opt, isBag) => opt === 'tupper' && !isBag
    );
    const nextBagStats = getBreakdown(
        nextDayOrders, nextGuests, t => true, (opt, isBag) => isBag || opt === 'bag'
    );

    // --- Render ---

    const DetailedWidget = ({ title, stats, colorClass, icon: Icon }: any) => (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-sm h-full">
            <div className={`flex items-center justify-between mb-3 ${colorClass}`}>
                <div className="flex items-center gap-2 font-bold uppercase text-xs tracking-wider">
                    <Icon size={14} />
                    {title}
                </div>
                <span className="text-xl font-bold">{stats.total}</span>
            </div>
            <div className="space-y-1.5 pl-1">
                {Object.entries(stats.subtypes).map(([label, count]) => {
                    if ((count as number) === 0) return null;
                    return (
                        <div key={label} className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400 border-b border-zinc-50 dark:border-zinc-800/50 pb-1 last:border-0 last:pb-0">
                            <div className="flex items-center gap-2">
                                <Circle size={4} className="fill-current opacity-50" />
                                <span>{label}</span>
                            </div>
                            <span className="font-medium text-zinc-800 dark:text-zinc-200">{count as number}</span>
                        </div>
                    );
                })}
                {stats.total === 0 && <span className="text-xs text-zinc-400 italic">Ninguno</span>}
            </div>
        </div>
    );

    const OrderRow = ({ order }: { order: MealOrder & { userName: string } }) => {
        let optionLabel = order.option;
        let optionClass = 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600';

        if (order.option === 'early') { optionLabel = 'Pronto'; optionClass = 'bg-amber-100 text-amber-700 font-medium'; }
        else if (order.option === 'late') { optionLabel = 'Tarde'; optionClass = 'bg-purple-100 text-purple-700 font-medium'; }
        else if (order.option === 'tupper') { optionLabel = 'Tupper'; optionClass = 'bg-blue-100 text-blue-700 font-medium'; }
        else if (order.isBag || order.option === 'bag') { optionLabel = 'Bolsa'; optionClass = 'bg-emerald-100 text-emerald-700 font-medium'; }
        else if (order.option === 'standard') { optionLabel = 'Normal'; }

        return (
            <div className="flex items-center justify-between p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-lg transition-colors border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                <div className="flex items-center gap-3">
                    <div className={`w-1.5 h-8 rounded-full ${order.mealType === 'breakfast' ? 'bg-amber-400' : order.mealType === 'lunch' ? 'bg-orange-500' : 'bg-indigo-500'}`} />
                    <div>
                        <div className="font-medium text-sm text-zinc-900 dark:text-white">{order.userName}</div>
                        <div className="text-[10px] text-zinc-500 uppercase tracking-wide">{order.mealType === 'breakfast' ? 'Desayuno' : order.mealType === 'lunch' ? 'Comida' : 'Cena'}</div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 text-[10px] uppercase tracking-wide rounded-md ${optionClass}`}>
                        {optionLabel}
                    </span>
                </div>
            </div>
        );
    };

    const GuestRow = ({ guest }: { guest: MealGuest }) => (
        <div className="flex items-center justify-between p-3 bg-zinc-50/50 dark:bg-zinc-800/20 rounded-lg border-b border-zinc-100 dark:border-zinc-800 last:border-0">
            <div className="flex items-center gap-3">
                <div className="w-1.5 h-8 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                        +{guest.count}
                    </div>
                    <div>
                        <div className="font-medium text-sm text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                            Invitados
                            <span className="text-[10px] bg-zinc-200 dark:bg-zinc-700 px-1.5 rounded uppercase">Extra</span>
                        </div>
                        <div className="text-[10px] text-zinc-400 uppercase tracking-wide flex items-center gap-1">
                            {guest.mealType === 'breakfast' ? 'Desayuno' : guest.mealType === 'lunch' ? 'Comida' : 'Cena'}
                            {guest.notes && <span>• {guest.notes}</span>}
                        </div>
                    </div>
                </div>
            </div>
            <span className="px-2 py-0.5 text-[10px] uppercase tracking-wide rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                {guest.option === 'standard' ? 'Normal' : guest.option}
            </span>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header / Date / Lock Status */}
            <div className="flex items-center justify-between bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <button onClick={handlePrevDay} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"><ChevronLeft size={20} className="text-zinc-500" /></button>
                <div className="text-center">
                    <h2 className="text-lg font-bold text-zinc-900 dark:text-white capitalize">
                        {format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}
                    </h2>
                    {isLocked && (
                        <div className="flex justify-center items-center gap-1 mt-1 text-red-500 text-xs font-bold uppercase tracking-wider">
                            <Lock size={12} /> Pedidos Cerrados
                        </div>
                    )}
                </div>
                <button onClick={handleNextDay} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"><ChevronRight size={20} className="text-zinc-500" /></button>
            </div>

            {/* Admin Panel */}
            {user.role === 'ADMIN' && (
                <KitchenAdminPanel selectedDate={selectedDate} onUpdate={loadOrders} />
            )}

            {/* Main List */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
                <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-800/50">
                    <h3 className="font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                        <Users size={18} className="text-zinc-400" /> Listado de Asistentes
                    </h3>
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value as any)}
                        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                        <option value="all">Todo el día</option>
                        <option value="breakfast">Desayuno</option>
                        <option value="lunch">Comida</option>
                        <option value="dinner">Cena</option>
                    </select>
                </div>
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800 max-h-[500px] overflow-y-auto">
                    {loading && <p className="p-8 text-center text-zinc-400 text-sm">Cargando...</p>}

                    {!loading && orders.length === 0 && guests.length === 0 && (
                        <div className="p-12 text-center text-zinc-400">
                            <Utensils size={32} className="mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No hay servicios para este día</p>
                        </div>
                    )}

                    {!loading && (
                        <>
                            {/* Regular Orders */}
                            {orders
                                .filter(o => o.option && o.option !== 'skip' && o.option !== 'no')
                                .filter(o => filter === 'all' || o.mealType === filter)
                                .map(o => <OrderRow key={o.id} order={o} />)
                            }
                            {/* Guest Rows - Injected into list */}
                            {guests
                                .filter(g => filter === 'all' || g.mealType === filter)
                                .map(g => <GuestRow key={g.id} guest={g} />)
                            }
                        </>
                    )}
                </div>
            </div>

            {/* Summary Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Today Column */}
                <div className="space-y-4">
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider pl-1">Servicio de Hoy</h3>
                    <div className="space-y-3">
                        <DetailedWidget title="Desayunos" icon={Utensils} stats={breakfastStats} colorClass="text-amber-600 dark:text-amber-400" />
                        <DetailedWidget title="Comidas" icon={Utensils} stats={lunchStats} colorClass="text-orange-600 dark:text-orange-400" />
                        <DetailedWidget title="Cenas" icon={Utensils} stats={dinnerStats} colorClass="text-indigo-600 dark:text-indigo-400" />
                    </div>
                </div>

                {/* Tomorrow Column */}
                <div className="space-y-4">
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider pl-1">Preparación para Mañana</h3>
                    <div className="space-y-3">
                        <DetailedWidget title="Desayunos" icon={ShoppingBag} stats={nextBreakfastStats} colorClass="text-amber-600 dark:text-amber-400" />
                        <DetailedWidget title="Tuppers" icon={Utensils} stats={nextTupperStats} colorClass="text-blue-600 dark:text-blue-400" />
                        <DetailedWidget title="Bolsas" icon={ShoppingBag} stats={nextBagStats} colorClass="text-emerald-600 dark:text-emerald-400" />
                    </div>
                </div>
            </div>
        </div>
    );
};
