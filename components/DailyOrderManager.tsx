import React, { useState, useEffect } from 'react';
import { MealOrder, MealTemplate } from '../types';
import { mealService } from '../services/meals';
import { kitchenService, DailyLock, KitchenConfig } from '../services/kitchen';
import { ChevronLeft, ChevronRight, ShoppingBag, AlertCircle } from 'lucide-react';
import { format, subDays, addDays } from 'date-fns';

interface DailyOrderManagerProps {
    userId: string;
}

const MEALS = [
    { id: 'breakfast', name: 'Desayuno' },
    { id: 'lunch', name: 'Comida' },
    { id: 'dinner', name: 'Cena' }
];

export const DailyOrderManager: React.FC<DailyOrderManagerProps> = ({ userId }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [orders, setOrders] = useState<MealOrder[]>([]);
    const [templates, setTemplates] = useState<MealTemplate[]>([]);
    const [locks, setLocks] = useState<DailyLock[]>([]);
    const [kitchenConfig, setKitchenConfig] = useState<KitchenConfig | null>(null);
    const [loading, setLoading] = useState(true);

    // Prep change confirmation modal
    const [showPrepWarning, setShowPrepWarning] = useState(false);
    const [pendingMealChange, setPendingMealChange] = useState<{
        date: Date;
        mealType: string;
        option: string;
        isBag: boolean;
        currentOption: string;
    } | null>(null);

    // Helper to get today (normalized)
    const getToday = () => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    };

    const getStartOfWeek = (date: Date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(d.setDate(diff));
    };

    useEffect(() => {
        loadData();
    }, [currentDate]);

    const loadData = async () => {
        setLoading(true);
        try {
            const startOfWeek = getStartOfWeek(currentDate);
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(endOfWeek.getDate() + 6);

            // Fetch Locks for the week AND the previous day (for prep check on Monday)
            // Ideally we need locks for [startOfWeek-1 to endOfWeek]
            // For now, simpler: we fetch locks for this range.
            // If user navigates, we re-fetch.

            // To properly check "Yesterday's Lock" for Monday, we need Sunday's lock status.
            // The `kitchenService.getLocks(date)` fetches for a single day usually?
            // Actually `getLocks` in implementation returns `DailyLock[]` for ONE day.
            // We need a range fetch or loop.
            // Let's implement a batch fetch or just simpler logic: 
            // Fetch locks for every day of the week + previous day.
            // Optimization: `kitchenService` doesn't have a range fetch yet. 
            // Ideally we add `getLocksRange(start, end)`. 
            // For now, I'll parallel fetch 8 days (dumb but works for small scale).

            const daysToFetch = [];
            const d = new Date(startOfWeek);
            d.setDate(d.getDate() - 1); // Start from day before
            for (let i = 0; i < 8; i++) {
                daysToFetch.push(new Date(d));
                d.setDate(d.getDate() + 1);
            }

            const locksPromises = daysToFetch.map(day =>
                kitchenService.getDailyLockStatus(format(day, 'yyyy-MM-dd'))
                    .then(isLocked => ({ date: format(day, 'yyyy-MM-dd'), isLocked }))
            );

            const [ordersData, templatesData, locksData, configData] = await Promise.all([
                mealService.getMyOrders(startOfWeek.toISOString().split('T')[0], endOfWeek.toISOString().split('T')[0]),
                mealService.getMyTemplates(),
                Promise.all(locksPromises),
                kitchenService.getConfig()
            ]);

            setOrders(ordersData);
            setTemplates(templatesData);
            setLocks(locksData as any);
            setKitchenConfig(configData);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const getMealForDate = (date: Date, mealType: string) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const existingOrder = orders.find(o => o.date === dateStr && o.mealType === mealType);

        if (existingOrder) return { ...existingOrder, source: 'order' };

        let dayOfWeek = date.getDay();
        if (dayOfWeek === 0) dayOfWeek = 7;

        const template = templates.find(t => t.dayOfWeek === dayOfWeek && t.mealType === mealType);
        return template ? { ...template, source: 'template', date: dateStr, status: 'pending' } : null;
    };

    const isDayTimeLocked = (targetDate: Date) => {
        if (!kitchenConfig || !kitchenConfig.weekly_schedule) return false;

        const now = new Date();
        const dateStr = format(targetDate, 'yyyy-MM-dd');
        const todayStr = format(now, 'yyyy-MM-dd');

        // Past dates are ALWAYS locked
        if (dateStr < todayStr) return true;

        // Future dates are not time-locked (only DB locks apply)
        if (dateStr > todayStr) return false;

        // For TODAY: check if cutoff time has passed
        const dayOfWeek = targetDate.getDay().toString();
        const cutoffTime = kitchenConfig.weekly_schedule[dayOfWeek];
        if (!cutoffTime) return false;

        const [h, m] = cutoffTime.split(':').map(Number);
        const deadline = new Date(now);
        deadline.setHours(h, m, 0, 0);

        return now >= deadline;
    };

    const isLocked = (date: Date, mealType: string, intendedOption?: string, currentOption?: string): boolean => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const prevDay = new Date(date);
        prevDay.setDate(prevDay.getDate() - 1);
        const prevDateStr = format(prevDay, 'yyyy-MM-dd');

        // EXCEPTION: Allow changing FROM tupper/bag TO standard options (with confirmation in handleUpdateOrder)
        const isChangingFromPrep = (currentOption === 'tupper' || currentOption === 'bag') &&
            (intendedOption !== 'tupper' && intendedOption !== 'bag');
        if (isChangingFromPrep) return false;

        // 1. Check if Yesterday is Locked (Prep Cutoff)
        // Locked if explicit DB lock OR if Time passed on that day (if it's today)
        const isPrevDbLocked = locks.find(l => l.date === prevDateStr)?.isLocked || false;
        const isPrevTimeLocked = isDayTimeLocked(prevDay);
        const isPrevLocked = isPrevDbLocked || isPrevTimeLocked;

        // 2. Check if Today is Locked (Service Cutoff)
        const isTodayDbLocked = locks.find(l => l.date === dateStr)?.isLocked || false;
        const isTodayTimeLocked = isDayTimeLocked(date);
        const isTodayLocked = isTodayDbLocked || isTodayTimeLocked;

        // --- RULES ---

        // RULE A: Breakfast is ALWAYS Prep. Controlled by Yesterday.
        if (mealType === 'breakfast') {
            if (isPrevLocked) return true;
        }

        // RULE B: Lunch/Dinner Tuppers/Bags are Prep. Controlled by Yesterday.
        if (intendedOption === 'tupper' || intendedOption === 'bag') {
            if (isPrevLocked) return true;
        }

        // RULE C: If switching TO Tupper/Bag, we need Yesterday Open.
        // We handle this in UI (disable specific options).
        // Here we return general lock status for the meal row.

        // RULE D: Regular Lunch/Dinner (Standard, Early, Late) controlled by Today.
        if (mealType !== 'breakfast') {
            if (isTodayLocked) return true;
        }

        // Safety: Cannot edit past days
        if (date < getToday()) return true;

        return false;
    };

    // New helper to detect if specific options should be disabled
    const isOptionDisabled = (date: Date, mealType: string, optionValue: string) => {
        // If it's a Prep option (Tupper/Bag), needs YESTERDAY open.
        if (optionValue === 'tupper' || optionValue === 'bag') {
            const prevDay = subDays(date, 1);
            const prevDateStr = format(prevDay, 'yyyy-MM-dd');
            const isPrevDbLocked = locks.find(l => l.date === prevDateStr)?.isLocked;
            const isPrevTimeLocked = isDayTimeLocked(prevDay);
            if (isPrevDbLocked || isPrevTimeLocked) return true;
        }
        return false;
    };

    const handleUpdateOrder = async (date: Date, mealType: string, option: string, isBag: boolean) => {
        // Check if we're changing FROM a prep item (tupper/bag) to a standard option
        const dateStr = format(date, 'yyyy-MM-dd');
        const currentMeal = getMealForDate(date, mealType);
        const currentOption = currentMeal?.option;

        if (isLocked(date, mealType, option, currentOption)) {
            alert("El pedido está cerrado para esta opción (requiere antelación).");
            return;
        }

        const isChangingFromPrep = (currentOption === 'tupper' || currentOption === 'bag') &&
            (option !== 'tupper' && option !== 'bag');

        if (isChangingFromPrep) {
            // Show modal instead of window.confirm
            setPendingMealChange({ date, mealType, option, isBag, currentOption: currentOption! });
            setShowPrepWarning(true);
            return;
        }

        // Force isBag if option is 'bag'
        const finalIsBag = option === 'bag' ? true : (option === 'tupper' ? false : isBag);

        await mealService.upsertOrder(userId, dateStr, mealType, option, finalIsBag);
        loadData();
    };

    const confirmPrepChange = async () => {
        if (!pendingMealChange) return;

        const { date, mealType, option, isBag } = pendingMealChange;
        const dateStr = format(date, 'yyyy-MM-dd');
        const finalIsBag = option === 'bag' ? true : (option === 'tupper' ? false : isBag);

        try {
            await mealService.upsertOrder(userId, dateStr, mealType, option, finalIsBag);
            loadData();
        } catch (error) {
            console.error("Failed to update meal", error);
        } finally {
            setShowPrepWarning(false);
            setPendingMealChange(null);
        }
    };

    const weekDays = [];
    const start = getStartOfWeek(currentDate);
    for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        weekDays.push(d);
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-zinc-900 dark:text-white">Pedidos Diarios</h3>
                <div className="flex items-center gap-4">
                    <button onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() - 7)))} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full">
                        <ChevronLeft size={20} className="text-zinc-600 dark:text-zinc-400" />
                    </button>
                    <span className="text-sm font-medium text-zinc-900 dark:text-white">
                        Semana del {start.toLocaleDateString()}
                    </span>
                    <button onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() + 7)))} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full">
                        <ChevronRight size={20} className="text-zinc-600 dark:text-zinc-400" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {weekDays.map(day => (
                    <div key={day.toISOString()} className={`p-4 rounded-xl border ${format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                        ? 'bg-zinc-50 dark:bg-zinc-800/80 border-zinc-300 dark:border-zinc-700 ring-1 ring-zinc-300 dark:ring-zinc-700'
                        : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
                        }`}>
                        <h4 className="font-medium text-zinc-900 dark:text-white mb-4 capitalize">
                            {day.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric' })}
                        </h4>

                        <div className="space-y-4">
                            {MEALS.map(meal => {
                                const data = getMealForDate(day, meal.id);
                                const currentValue = data?.option || 'skip';
                                // Check generic lock (for displaying "Locked" badge)
                                const completelyLocked = isLocked(day, meal.id, undefined, currentValue);

                                let options: { value: string; label: string }[] = [];
                                if (meal.id === 'breakfast') {
                                    options = [
                                        { value: 'standard', label: 'Normal' },
                                        { value: 'early', label: 'Pronto' },
                                        { value: 'skip', label: 'No Desayuno' }
                                    ];
                                } else if (meal.id === 'lunch') {
                                    options = [
                                        { value: 'standard', label: 'Normal' },
                                        { value: 'early', label: 'Pronto' },
                                        { value: 'late', label: 'Tarde' },
                                        { value: 'tupper', label: 'Tupper' },
                                        { value: 'bag', label: 'Bolsa' },
                                        { value: 'skip', label: 'No Como' }
                                    ];
                                } else if (meal.id === 'dinner') {
                                    options = [
                                        { value: 'standard', label: 'Normal' },
                                        { value: 'late', label: 'Tarde' },
                                        { value: 'skip', label: 'No Ceno' }
                                    ];
                                }

                                return (
                                    <div key={meal.id} className="space-y-1">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="font-medium text-zinc-500 dark:text-zinc-400">{meal.name}</span>
                                            {completelyLocked && <span className="text-amber-600 text-[10px] font-bold">Cerrado</span>}
                                        </div>

                                        <div className="flex gap-2">
                                            <select

                                                value={currentValue}
                                                onChange={(e) => handleUpdateOrder(day, meal.id, e.target.value, false)}
                                                className={`w-full px-2 py-1.5 text-sm rounded-md border ${data?.source === 'template'
                                                    ? 'border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-600 bg-transparent'
                                                    : 'border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white'
                                                    } focus:outline-none focus:ring-1 focus:ring-zinc-900`}
                                            >
                                                {options.map(opt => {
                                                    // Individual option disabling
                                                    // If main meal is closed (e.g. today lunch locked), everything disabled? 
                                                    // OR specific options disabled?
                                                    // If completelyLocked, everything is disabled via logic in handleUpdateOrder, 
                                                    // but for UX let's mark/disable items.

                                                    const disabled = isOptionDisabled(day, meal.id, opt.value) || (completelyLocked && opt.value !== currentValue); // Can't change to others if locked, but can keep current? Actually if locked, cant change period.

                                                    // If completely Locked, the whole SELECT should be disabled?
                                                    // YES.

                                                    return <option key={opt.value} value={opt.value} disabled={disabled}>{opt.label} {disabled ? '(Cerrado)' : ''}</option>
                                                })}
                                            </select>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

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
