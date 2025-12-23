import React, { useState, useEffect } from 'react';
import { format, addDays, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { MealOrder, MealTemplate, UserAbsence, KitchenConfig, Holiday, User } from '../types';
import { mealService } from '../services/meals';
import { kitchenService, DailyLock } from '../services/kitchen';
import { absencesService } from '../services/absences';
import { X, Clock, AlertCircle, Cake, CalendarDays, Rocket } from 'lucide-react';
import { calendarService } from '../services/calendar';
import { CalendarEvent } from '../services/icalParser';
import { profileService } from '../services/profiles';
import { UserAvatar } from './UserAvatar';

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
    const [absences, setAbsences] = useState<UserAbsence[]>([]);
    const [locks, setLocks] = useState<DailyLock[]>([]);
    const [config, setConfig] = useState<KitchenConfig | null>(null);
    const [holidays, setHolidays] = useState<Holiday[]>([]);
    const [familyFeasts, setFamilyFeasts] = useState<CalendarEvent[]>([]);
    const [userProfiles, setUserProfiles] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingMeal, setEditingMeal] = useState<{
        date: Date;
        mealType: string;
        currentOption: string;
        isFromTemplate: boolean;
        bagTime?: string; // Add bagTime state
    } | null>(null);

    // Initial Bag time state for the modal
    const [selectedBagTime, setSelectedBagTime] = useState<string>('14:00');

    // Prep change confirmation modal
    const [showPrepWarning, setShowPrepWarning] = useState(false);
    const [pendingMealChange, setPendingMealChange] = useState<{
        date: Date;
        mealType: string;
        option: string;
        isBag: boolean;
        currentOption: string;
    } | null>(null);

    useEffect(() => {
        loadData();
    }, [currentDate]);



    const loadData = async () => {
        try {
            // Rolling week view: Start from currentDate, show 7 days
            const startOfView = new Date(currentDate);
            const endOfView = addDays(startOfView, 6);

            const cacheKey = `daily-orders-${userId}-${format(startOfView, 'yyyy-MM-dd')}`;

            // Try to load from cache first
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                try {
                    const { orders: cachedOrders, templates: cachedTemplates, absences: cachedAbsences, locks: cachedLocks, config: cachedConfig, holidays: cachedHolidays, profiles: cachedProfiles, familyFeasts: cachedFeasts } = JSON.parse(cached);
                    setOrders(cachedOrders);
                    setTemplates(cachedTemplates);
                    setAbsences(cachedAbsences || []);
                    setLocks(cachedLocks);
                    setConfig(cachedConfig);
                    setHolidays(cachedHolidays || []);
                    setUserProfiles(cachedProfiles || []);
                    setFamilyFeasts(cachedFeasts || []);
                    setLoading(false);
                } catch (e) {
                    console.error('Cache parse error:', e);
                }
            }

            // Fetch fresh data in background
            const daysToFetch = [];
            let d = new Date(startOfView);
            for (let i = 0; i < 7; i++) {
                daysToFetch.push(new Date(d));
                d = addDays(d, 1);
            }

            const locksPromises = daysToFetch.map(day =>
                kitchenService.getDailyLockStatus(format(day, 'yyyy-MM-dd'))
                    .then(isLocked => ({ date: format(day, 'yyyy-MM-dd'), isLocked }))
            );

            const [ordersData, templatesData, absencesData, locksData, configData, holidaysData, profilesData, familyFeastsData] = await Promise.all([
                mealService.getMyOrders(format(startOfView, 'yyyy-MM-dd'), format(endOfView, 'yyyy-MM-dd')),
                mealService.getMyTemplates(),
                absencesService.getAbsencesInRange(format(startOfView, 'yyyy-MM-dd'), format(endOfView, 'yyyy-MM-dd')),
                Promise.all(locksPromises),
                kitchenService.getConfig(),
                kitchenService.getHolidays(),
                profileService.getAllProfiles(),
                calendarService.getCalendars().then(async cals => {
                    const epactaCals = cals.filter(c => c.is_epacta);
                    if (epactaCals.length === 0) return [];
                    const events = await calendarService.getCachedEvents(epactaCals.map(c => c.id));
                    // Return all as we need to filter per day later in the loop/render
                    return events;
                }) as Promise<CalendarEvent[]>
            ]);

            setOrders(ordersData);
            setTemplates(templatesData);
            setAbsences(absencesData);
            setLocks(locksData as any);
            setConfig(configData);
            setHolidays(holidaysData);
            setUserProfiles(profilesData);
            setFamilyFeasts(familyFeastsData);

            localStorage.setItem(cacheKey, JSON.stringify({
                orders: ordersData,
                templates: templatesData,
                absences: absencesData,
                locks: locksData,
                config: configData,
                holidays: holidaysData,
                profiles: profilesData,
                familyFeasts: familyFeastsData
            }));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const isUserAbsent = (date: Date): boolean => {
        const dateStr = format(date, 'yyyy-MM-dd');
        return absences.some(a => a.startDate <= dateStr && a.endDate >= dateStr);
    };

    const getMealForDate = (date: Date, mealType: string) => {
        const dateStr = format(date, 'yyyy-MM-dd');

        // 1. Explicit Order (Highest Priority)
        const existingOrder = orders.find(o => o.date === dateStr && o.mealType === mealType);
        if (existingOrder) return { ...existingOrder, source: 'order' };

        // 2. Absence Check
        if (isUserAbsent(date)) {
            return { option: 'skip', source: 'absence', date: dateStr, status: 'pending', mealType, isBag: false, bagTime: undefined };
        }

        // 3. Template
        let dayOfWeek = date.getDay(); // 0=Sun
        if (dayOfWeek === 0) dayOfWeek = 7; // Convert to 1-7 (Mon-Sun)

        const template = templates.find(t => t.dayOfWeek === dayOfWeek && t.mealType === mealType);
        return template ? { ...template, source: 'template', date: dateStr, status: 'pending', bagTime: undefined } : null;
    };

    const isDayTimeLocked = (targetDate: Date) => {
        if (!config) return false;

        const now = new Date();
        const dateStr = format(targetDate, 'yyyy-MM-dd');
        const todayStr = format(now, 'yyyy-MM-dd');

        if (dateStr < todayStr) return true; // Past is always locked
        if (dateStr > todayStr) return false; // Future is initially open (unless specific override?) 

        // Current Logic for Today: Check Cutoff Time based on Hierarchy
        // Hierarchy: Override > Holiday/Sunday > Saturday > Weekday
        
        let cutoffTime = '';
        const dayOfWeek = targetDate.getDay(); // 0 (Sun) - 6 (Sat)
        const isHoliday = holidays.some(h => h.date === dateStr);

        // 1. Override
        if (config.overrides && config.overrides[dateStr]) {
            cutoffTime = config.overrides[dateStr];
        }
        // 2. Sunday or Holiday
        else if (dayOfWeek === 0 || isHoliday) {
            cutoffTime = config.schedule_sunday_holiday || '';
        }
        // 3. Saturday
        else if (dayOfWeek === 6) {
            cutoffTime = config.schedule_saturday || '';
        }
        // 4. Weekday
        else {
            cutoffTime = config.schedule_weekdays || '';
        }

        // If no time set, it's open (or should it be closed? Assuming open if unset, but usually set)
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

        const isDateLocked = isDayTimeLocked(date);

        const isChangingFromPrep = (currentOption === 'tupper' || currentOption === 'bag') &&
            (intendedOption !== 'tupper' && intendedOption !== 'bag');
        if (isChangingFromPrep) {
            const now = new Date();
            const todayStr = format(now, 'yyyy-MM-dd');
            if (dateStr < todayStr) return true;
            return false;
        }

        const isPrevDbLocked = locks.find(l => l.date === prevDateStr)?.isLocked || false;
        const isPrevTimeLocked = isDayTimeLocked(prevDay);
        const isPrevLocked = isPrevDbLocked || isPrevTimeLocked;

        const isTodayDbLocked = locks.find(l => l.date === dateStr)?.isLocked || false;
        const isTodayLocked = isTodayDbLocked || isDateLocked;

        // Special Locking Rules for Bags
        if (intendedOption === 'bag' || intendedOption === 'tupper') {
             // Breakfast Bag/Tupper: Treated like Early Breakfast (Must be done day before)
             if (mealType === 'breakfast') {
                 if (isPrevLocked) return true;
             } 
             // Lunch/Dinner Bag: Treated like Standard (Can be done same day if not too late)
             else {
                 if (isTodayLocked) return true;
             }
             return false;
        }

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
            return;
        }

        setEditingMeal({
            date,
            mealType,
            currentOption,
            isFromTemplate: meal?.source === 'template',
            bagTime: meal?.bagTime
        });
        
        // precise init time
        if (meal?.bagTime) setSelectedBagTime(meal.bagTime);
        else setSelectedBagTime(mealType === 'lunch' ? '14:00' : '21:00');
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

        // Only show warning if we are actually past some deadline or already "locked" for this day
        // We use isLocked(..., option, option) to check if a "standard" change would be blocked
        const isNormallyLocked = isLocked(date, mealType, option, option);

        if (isChangingFromPrep && isNormallyLocked) {
            setPendingMealChange({ date, mealType, option, isBag, currentOption: currentOption! });
            setShowPrepWarning(true);
            setEditingMeal(null);
            return;
        }

        const dateStr = format(date, 'yyyy-MM-dd');
        const finalIsBag = option === 'bag' ? true : (option === 'tupper' ? false : isBag);
        
        // Determine if it is today
        const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

        // Use selectedBagTime ONLY if it's a bag AND it is today
        const timeToSave = (finalIsBag && option === 'bag' && isToday) ? selectedBagTime : null;

        try {
            await mealService.upsertOrder(userId, dateStr, mealType, option, finalIsBag, timeToSave);
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
    const start = new Date(currentDate);
    for (let i = 0; i < 7; i++) {
        weekDays.push(addDays(start, i));
    }

    const getAvailableOptions = (mealType: string) => {
        if (mealType === 'breakfast') {
            return ['standard', 'early', 'bag', 'skip']; 
        } else if (mealType === 'lunch') {
            return ['standard', 'early', 'late', 'tupper', 'bag', 'skip'];
        } else {
            return ['standard', 'late', 'skip'];
        }
    };

    return (
        <div className="space-y-6">
            {/* Matrix Table */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-zinc-200 dark:border-zinc-800">
                                <th className="text-left p-1.5 sm:p-4 text-[11px] sm:text-sm font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900/50">
                                    Día
                                </th>
                                {MEALS.map(meal => (
                                    <th key={meal.id} className="p-1 px-1.5 sm:p-4 text-[11px] sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-900/50">
                                        {meal.name}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {weekDays.map(day => {
                                const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                                const isAbsentDay = isUserAbsent(day);

                                return (
                                    <tr
                                        key={day.toISOString()}
                                        className={`border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors ${isToday ? 'bg-zinc-50 dark:bg-zinc-800/50' : ''
                                            }`}
                                    >
                                        <td className="p-1.5 sm:p-4">
                                            <div className="flex flex-col">
                                                <span className="text-[12px] sm:text-sm font-medium text-zinc-900 dark:text-white capitalize">
                                                    {format(day, 'EEEE', { locale: es })}
                                                </span>
                                                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                                    {format(day, 'd MMM', { locale: es })}
                                                </span>

                                                {/* Compact Indicators */}
                                                <div className="flex gap-1 mt-1">
                                                    {holidays.some(h => h.date === format(day, 'yyyy-MM-dd')) && (
                                                        <div className="w-1.5 h-1.5 rounded-full bg-fuchsia-500" title="Festivo" />
                                                    )}
                                                    {userProfiles.some(u => {
                                                        if (!u.birthday) return false;
                                                        const b = new Date(u.birthday);
                                                        return b.getDate() === day.getDate() && b.getMonth() === day.getMonth();
                                                    }) && (
                                                        <div className="w-1.5 h-1.5 rounded-full bg-pink-500" title="Cumpleaños" />
                                                    )}
                                                    {familyFeasts.some(ev => {
                                                        const evDate = format(ev.start, 'yyyy-MM-dd');
                                                        const isFamilyFeast = ev.metadata?.familyFeast;
                                                        const validFamily = isFamilyFeast === 'A' || isFamilyFeast === 'B';
                                                        return evDate === format(day, 'yyyy-MM-dd') && validFamily;
                                                    }) && (
                                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" title="Fiesta Familia" />
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        {MEALS.map(meal => {
                                            const data = getMealForDate(day, meal.id);
                                            const option = data?.option || 'skip';
                                            const config = OPTION_CONFIG[option];
                                            const locked = isLocked(day, meal.id, undefined, option);
                                            const isFromTemplate = data?.source === 'template';
                                            const isDefaultAbsence = data?.source === 'absence';

                                            // Visual override for absence default
                                            const buttonClass = isDefaultAbsence && option === 'skip'
                                                ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 border border-zinc-200 dark:border-zinc-700'
                                                : `${config.color} ${config.textColor}`;

                                            return (
                                                <td key={meal.id} className="p-1 sm:p-4">
                                                    <button
                                                        onClick={() => handleCellClick(day, meal.id)}
                                                        disabled={locked}
                                                        className={`
                                                            w-full px-1.5 sm:px-4 py-2.5 rounded-xl font-bold sm:font-semibold text-[13px] sm:text-sm
                                                            ${buttonClass}
                                                            ${locked ? 'opacity-40 cursor-not-allowed' : 'hover:scale-105 cursor-pointer shadow-sm hover:shadow-md'}
                                                            ${isFromTemplate ? 'ring-2 ring-zinc-300 dark:ring-zinc-600 ring-offset-2 dark:ring-offset-zinc-900' : ''}
                                                            transition-all duration-200
                                                        `}
                                                    >
                                                        {option === 'skip' && isDefaultAbsence ? 'AUS' : config.label}
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
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"></div>
                    <span>Ausente</span>
                </div>
            </div>

            {/* Edit Modal */}
            {editingMeal && (
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

                            {/* Detailed Day Info in Modal */}
                            <div className="mt-2 space-y-1">
                                {(() => {
                                    const dateStr = format(editingMeal.date, 'yyyy-MM-dd');
                                    const holiday = holidays.find(h => h.date === dateStr);
                                    const birthdayUsers = userProfiles.filter(u => {
                                        if (!u.birthday) return false;
                                        const b = new Date(u.birthday);
                                        return b.getDate() === editingMeal.date.getDate() && b.getMonth() === editingMeal.date.getMonth();
                                    });
                                    const dayFeasts = familyFeasts.filter(ev => {
                                        const evDate = format(ev.start, 'yyyy-MM-dd');
                                        const isFamilyFeast = ev.metadata?.familyFeast;
                                        const validFamily = isFamilyFeast === 'A' || isFamilyFeast === 'B';
                                        return evDate === dateStr && validFamily;
                                    });

                                    return (
                                        <>
                                            {holiday && (
                                                <div className="flex items-center gap-2 text-xs font-bold text-fuchsia-600 dark:text-fuchsia-400">
                                                    <CalendarDays size={14} />
                                                    <span>Festivo: {holiday.name}</span>
                                                </div>
                                            )}
                                            {birthdayUsers.map(u => (
                                                <div key={u.id} className="flex items-center gap-2 text-xs font-bold text-pink-600 dark:text-pink-400">
                                                    <Cake size={14} />
                                                    <span>Cumple de {u.name}</span>
                                                </div>
                                            ))}
                                            {dayFeasts.map(ev => (
                                                <div key={ev.id} className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                                    <Rocket size={14} />
                                                    <span>Fiesta de Familia {ev.metadata?.familyFeast}</span>
                                                </div>
                                            ))}
                                        </>
                                    );
                                })()}
                            </div>
                        </div>

                        {/* Options */}
                        <div className="p-6 space-y-2">
                            {getAvailableOptions(editingMeal.mealType).map(opt => {
                                const config = OPTION_CONFIG[opt];
                                const isSelected = editingMeal.currentOption === opt;
                                const optionLocked = isLocked(editingMeal.date, editingMeal.mealType, opt, editingMeal.currentOption);

                                // Special UI for Bag Time Selection - ONLY FOR TODAY
                                if (opt === 'bag' && !optionLocked) {
                                     const isToday = format(editingMeal.date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                                     
                                     // If not today, render standard button (no time selection)
                                     if (!isToday) {
                                         return (
                                            <button
                                                key={opt}
                                                onClick={() => handleOptionSelect(opt)}
                                                className={`
                                                    w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all
                                                    ${isSelected
                                                        ? 'border-zinc-900 dark:border-white bg-zinc-50 dark:bg-zinc-800'
                                                        : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                                                    }
                                                    cursor-pointer
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
                                                    Bolsa
                                                </span>
                                            </button>
                                         );
                                     }

                                     // If today, show time picker
                                     return (
                                         <div key={opt} className="space-y-2">
                                             <button
                                                onClick={() => handleOptionSelect(opt)}
                                                className={`
                                                    w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all
                                                    ${isSelected
                                                        ? 'border-zinc-900 dark:border-white bg-zinc-50 dark:bg-zinc-800'
                                                        : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                                                    }
                                                    cursor-pointer
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
                                                    Bolsa
                                                </span>
                                             </button>
                                             
                                             {/* Inline Time Selector if Bag selected or user wants to pick it */}
                                             <div className="pl-4 pr-1 flex items-center gap-3 animate-in fade-in slide-in-from-top-1">
                                                 <Clock size={16} className="text-zinc-400" />
                                                 <input 
                                                    type="time" 
                                                    value={selectedBagTime}
                                                    onChange={(e) => setSelectedBagTime(e.target.value)}
                                                    className="flex-1 p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm"
                                                 />
                                                 <button
                                                    onClick={() => handleOptionSelect('bag')} // Confirm with time
                                                    className="px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-bold rounded-lg"
                                                 >
                                                     CONFIRMAR
                                                 </button>
                                             </div>
                                         </div>
                                     );
                                }

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
