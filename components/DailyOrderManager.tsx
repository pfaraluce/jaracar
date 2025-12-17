import React, { useState, useEffect } from 'react';
import { MealOrder, MealTemplate } from '../types';
import { mealService } from '../services/meals';
import { kitchenService, DailyLock, KitchenConfig } from '../services/kitchen';
import { ChevronLeft, ChevronRight, AlertCircle, X, Clock } from 'lucide-react';
import { format, subDays, addDays } from 'date-fns';
import { es } from 'date-fns/locale';

interface DailyOrderManagerProps {
    userId: string;
    currentDate: Date;
    onDateChange: (date: Date) => void;
}

const MEALS = [
    { id: 'breakfast', name: 'Desayuno', short: 'D' },
    { id: 'lunch', name: 'Comida', short: 'C' },
    { id: 'dinner', name: 'Cena', short: 'Ce' }
];

// Option configurations with colors
const OPTION_CONFIG: Record<string, { label: string; color: string; textColor: string }> = {
    skip: { label: 'NO', color: 'bg-rose-500', textColor: 'text-white' },
    standard: { label: 'SÍ', color: 'bg-emerald-500', textColor: 'text-white' },
    early: { label: '1T', color: 'bg-yellow-400', textColor: 'text-zinc-900' },
    late: { label: '2T', color: 'bg-emerald-700', textColor: 'text-white' },
    tupper: { label: 'TP', color: 'bg-amber-800', textColor: 'text-white' },
    bag: { label: 'B', color: 'bg-blue-600', textColor: 'text-white' },
};

export const DailyOrderManager: React.FC<DailyOrderManagerProps> = ({ userId, currentDate, onDateChange }) => {
    const [orders, setOrders] = useState<MealOrder[]>([]);
    const [templates, setTemplates] = useState<MealTemplate[]>([]);
    const [locks, setLocks] = useState<DailyLock[]>([]);
    const [kitchenConfig, setKitchenConfig] = useState<KitchenConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [timeLeft, setTimeLeft] = useState<string | null>(null);
    const [isClosingSoon, setIsClosingSoon] = useState(false);

    // Edit modal state
    const [editingMeal, setEditingMeal] = useState<{
        date: Date;
        mealType: string;
        currentOption: string;
        isFromTemplate: boolean;
    } | null>(null);

    // Prep change confirmation modal
    const [showPrepWarning, setShowPrepWarning] = useState(false);
    const [pendingMealChange, setPendingMealChange] = useState<{
        date: Date;
        mealType: string;
        option: string;
        isBag: boolean;
        currentOption: string;
    } | null>(null);

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

    useEffect(() => {
        updateCountdown();
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
            setTimeLeft(null);
            return;
        }

        const diff = deadline.getTime() - now.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
        setIsClosingSoon(diff < 3600000); // < 1 hour
    };

    const loadData = async () => {
        try {
            const startOfWeek = getStartOfWeek(currentDate);
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(endOfWeek.getDate() + 6);

            const cacheKey = `daily-orders-${userId}-${format(startOfWeek, 'yyyy-MM-dd')}`;

            // Try to load from cache first
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                try {
                    const { orders: cachedOrders, templates: cachedTemplates, locks: cachedLocks, config: cachedConfig } = JSON.parse(cached);
                    setOrders(cachedOrders);
                    setTemplates(cachedTemplates);
                    setLocks(cachedLocks);
                    setKitchenConfig(cachedConfig);
                    setLoading(false); // Show cached data immediately
                } catch (e) {
                    console.error('Cache parse error:', e);
                }
            }

            // Fetch fresh data in background
            const daysToFetch = [];
            const d = new Date(startOfWeek);
            d.setDate(d.getDate() - 1);
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

            // Update with fresh data
            setOrders(ordersData);
            setTemplates(templatesData);
            setLocks(locksData as any);
            setKitchenConfig(configData);

            // Cache the fresh data
            localStorage.setItem(cacheKey, JSON.stringify({
                orders: ordersData,
                templates: templatesData,
                locks: locksData,
                config: configData
            }));
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

        if (dateStr < todayStr) return true;
        if (dateStr > todayStr) return false;

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

        // Check if the date itself is locked (past or deadline passed)
        const isDateLocked = isDayTimeLocked(date);

        // Allow changing from prep items even if date is locked, but only if not in the past
        const isChangingFromPrep = (currentOption === 'tupper' || currentOption === 'bag') &&
            (intendedOption !== 'tupper' && intendedOption !== 'bag');
        if (isChangingFromPrep) {
            // Still check if date is in the past (not just deadline passed today)
            const now = new Date();
            const todayStr = format(now, 'yyyy-MM-dd');
            if (dateStr < todayStr) return true; // Can't change past dates
            return false; // Allow change with warning for today
        }

        const isPrevDbLocked = locks.find(l => l.date === prevDateStr)?.isLocked || false;
        const isPrevTimeLocked = isDayTimeLocked(prevDay);
        const isPrevLocked = isPrevDbLocked || isPrevTimeLocked;

        const isTodayDbLocked = locks.find(l => l.date === dateStr)?.isLocked || false;
        const isTodayLocked = isTodayDbLocked || isDateLocked;

        if (mealType === 'breakfast') {
            if (isPrevLocked) return true;
        }

        if (intendedOption === 'tupper' || intendedOption === 'bag') {
            if (isPrevLocked) return true;
        }

        if (mealType !== 'breakfast') {
            if (isTodayLocked) return true;
        }

        return false;
    };

    const handleCellClick = (date: Date, mealType: string) => {
        const meal = getMealForDate(date, mealType);
        const currentOption = meal?.option || 'skip';

        if (isLocked(date, mealType, undefined, currentOption)) {
            return; // Don't open modal if locked
        }

        setEditingMeal({
            date,
            mealType,
            currentOption,
            isFromTemplate: meal?.source === 'template'
        });
    };

    const handleOptionSelect = async (option: string) => {
        if (!editingMeal) return;

        const { date, mealType, currentOption } = editingMeal;
        const isBag = option === 'bag';

        if (isLocked(date, mealType, option, currentOption)) {
            alert("El pedido está cerrado para esta opción (requiere antelación).");
            return;
        }

        const isChangingFromPrep = (currentOption === 'tupper' || currentOption === 'bag') &&
            (option !== 'tupper' && option !== 'bag');

        if (isChangingFromPrep) {
            setPendingMealChange({ date, mealType, option, isBag, currentOption: currentOption! });
            setShowPrepWarning(true);
            setEditingMeal(null);
            return;
        }

        const dateStr = format(date, 'yyyy-MM-dd');
        const finalIsBag = option === 'bag' ? true : (option === 'tupper' ? false : isBag);

        try {
            await mealService.upsertOrder(userId, dateStr, mealType, option, finalIsBag);
            loadData();
            setEditingMeal(null);
        } catch (error) {
            console.error("Failed to update meal", error);
        }
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

    const getAvailableOptions = (mealType: string) => {
        if (mealType === 'breakfast') {
            return ['standard', 'early', 'skip'];
        } else if (mealType === 'lunch') {
            return ['standard', 'early', 'late', 'tupper', 'bag', 'skip'];
        } else {
            return ['standard', 'late', 'skip'];
        }
    };

    return (
        <div className="space-y-6">
            {/* Header with Countdown and Date Navigation */}
            <div className="flex items-center justify-between">
                {/* Countdown Timer */}
                {timeLeft && (
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${isClosingSoon
                        ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-900/50 text-rose-600 dark:text-rose-400'
                        : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-100 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                        }`}>
                        <Clock size={14} className={isClosingSoon ? "animate-pulse" : ""} />
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-bold tracking-wider opacity-70">Tiempo para pedidos de hoy</span>
                            <span className="text-xs font-mono font-bold leading-none">{timeLeft}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Matrix Table */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-zinc-200 dark:border-zinc-800">
                                <th className="text-left p-4 text-sm font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900/50">
                                    Día
                                </th>
                                {MEALS.map(meal => (
                                    <th key={meal.id} className="p-4 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-900/50">
                                        {meal.name}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {weekDays.map(day => {
                                const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                                return (
                                    <tr
                                        key={day.toISOString()}
                                        className={`border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors ${isToday ? 'bg-zinc-50 dark:bg-zinc-800/50' : ''
                                            }`}
                                    >
                                        <td className="p-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-zinc-900 dark:text-white capitalize">
                                                    {format(day, 'EEEE', { locale: es })}
                                                </span>
                                                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                                    {format(day, 'd MMM', { locale: es })}
                                                </span>
                                                {kitchenConfig?.weekly_schedule?.[day.getDay().toString()] && (
                                                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 flex items-center gap-1">
                                                        <Clock size={10} />
                                                        {kitchenConfig.weekly_schedule[day.getDay().toString()]}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        {MEALS.map(meal => {
                                            const data = getMealForDate(day, meal.id);
                                            const option = data?.option || 'skip';
                                            const config = OPTION_CONFIG[option];
                                            const locked = isLocked(day, meal.id, undefined, option);
                                            const isFromTemplate = data?.source === 'template';

                                            return (
                                                <td key={meal.id} className="p-4">
                                                    <button
                                                        onClick={() => handleCellClick(day, meal.id)}
                                                        disabled={locked}
                                                        className={`
                                                            w-full px-4 py-2.5 rounded-xl font-semibold text-sm
                                                            ${config.color} ${config.textColor}
                                                            ${locked ? 'opacity-40 cursor-not-allowed' : 'hover:scale-105 cursor-pointer shadow-sm hover:shadow-md'}
                                                            ${isFromTemplate ? 'ring-2 ring-zinc-300 dark:ring-zinc-600 ring-offset-2 dark:ring-offset-zinc-900' : ''}
                                                            transition-all duration-200
                                                        `}
                                                    >
                                                        {config.label}
                                                    </button>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 text-xs text-zinc-600 dark:text-zinc-400">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded border-2 border-zinc-300 dark:border-zinc-600"></div>
                    <span>Desde plantilla</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-zinc-200 dark:bg-zinc-700 opacity-40"></div>
                    <span>Cerrado</span>
                </div>
            </div>

            {/* Edit Modal */}
            {
                editingMeal && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 min-h-[100dvh]">
                        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-md w-full border border-zinc-200 dark:border-zinc-800 animate-in zoom-in-95 duration-200">
                            {/* Header */}
                            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                                        {MEALS.find(m => m.id === editingMeal.mealType)?.name}
                                    </h3>
                                    <button
                                        onClick={() => setEditingMeal(null)}
                                        className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                                    >
                                        <X size={20} className="text-zinc-500" />
                                    </button>
                                </div>
                                <p className="text-sm text-zinc-600 dark:text-zinc-400 capitalize">
                                    {format(editingMeal.date, "EEEE, d 'de' MMMM", { locale: es })}
                                </p>
                            </div>

                            {/* Options */}
                            <div className="p-6 space-y-2">
                                {getAvailableOptions(editingMeal.mealType).map(opt => {
                                    const config = OPTION_CONFIG[opt];
                                    const isSelected = editingMeal.currentOption === opt;
                                    const optionLocked = isLocked(editingMeal.date, editingMeal.mealType, opt, editingMeal.currentOption);

                                    return (
                                        <button
                                            key={opt}
                                            onClick={() => handleOptionSelect(opt)}
                                            disabled={optionLocked}
                                            className={`
                                            w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all
                                            ${isSelected
                                                    ? 'border-zinc-900 dark:border-white bg-zinc-50 dark:bg-zinc-800'
                                                    : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                                                }
                                            ${optionLocked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                                        `}
                                        >
                                            <div className={`w-3 h-3 rounded-full border-2 ${isSelected
                                                ? 'border-zinc-900 dark:border-white bg-zinc-900 dark:bg-white'
                                                : 'border-zinc-300 dark:border-zinc-600'
                                                }`} />
                                            <div className={`px-3 py-1 rounded-lg ${config.color} ${config.textColor} font-semibold text-sm min-w-[48px] text-center`}>
                                                {config.label}
                                            </div>
                                            <span className="text-sm text-zinc-700 dark:text-zinc-300">
                                                {opt === 'skip' ? 'No' : opt === 'standard' ? 'Normal' : opt === 'early' ? 'Temprano' : opt === 'late' ? 'Tarde' : opt === 'tupper' ? 'Tupper' : 'Bolsa'}
                                            </span>
                                            {optionLocked && (
                                                <span className="ml-auto text-xs text-amber-600 dark:text-amber-500 font-medium">Cerrado</span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Prep Change Warning Modal */}
            {
                showPrepWarning && pendingMealChange && (
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
                )
            }
        </div >
    );
};
