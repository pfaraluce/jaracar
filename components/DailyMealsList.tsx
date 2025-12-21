import React, { useState, useEffect } from 'react';
import { format, addDays, subDays, startOfToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { mealService } from '../services/meals';
import { kitchenService, MealGuest } from '../services/kitchen';
import { profileService } from '../services/profiles';
import { ChevronLeft, ChevronRight, Lock, Users, Utensils, X, Check } from 'lucide-react';
import { MealOrder, User } from '../types';
import { KitchenAdminPanel } from './KitchenAdminPanel';
import { UserAvatar } from './UserAvatar';

interface DailyMealsListProps {
    user: User;
    selectedDate: Date;
    onDateChange: (date: Date) => void;
    mode?: 'standard' | 'kitchen';
}

// Color configuration matching DailyOrderManager
const OPTION_CONFIG: Record<string, { label: string; color: string; textColor: string }> = {
    skip: { label: 'NO', color: 'bg-rose-500', textColor: 'text-white' },
    no: { label: 'NO', color: 'bg-rose-500', textColor: 'text-white' },
    standard: { label: 'SÍ', color: 'bg-emerald-500', textColor: 'text-white' },
    early: { label: '1T', color: 'bg-yellow-400', textColor: 'text-zinc-900' },
    late: { label: '2T', color: 'bg-emerald-700', textColor: 'text-white' },
    tupper: { label: 'TP', color: 'bg-amber-800', textColor: 'text-white' },
    bag: { label: 'B', color: 'bg-blue-600', textColor: 'text-white' },
};

const MEAL_NAMES: Record<string, string> = {
    breakfast: 'Desayuno',
    lunch: 'Comida',
    dinner: 'Cena'
};

interface ResidentEntry {
    name: string;
    userId?: string;
    avatarUrl?: string;
    hasDiet?: boolean;
    dietNumber?: number;
    option: string;
    isBag: boolean;
    isFromTemplate: boolean;
    isGuest: boolean;
    guestCount?: number;
    guestNotes?: string;
    initials?: string;
    // Context for editing
    originalDate: string;
    mealType: string;
    guestId?: string;
}


export const DailyMealsList: React.FC<DailyMealsListProps> = ({ user, selectedDate, onDateChange, mode = 'standard' }) => {
    const [orders, setOrders] = useState<(MealOrder & { userName: string })[]>([]);
    const [nextDayOrders, setNextDayOrders] = useState<(MealOrder & { userName: string })[]>([]);
    const [guests, setGuests] = useState<MealGuest[]>([]);
    const [nextGuests, setNextGuests] = useState<MealGuest[]>([]);
    const [isLocked, setIsLocked] = useState(false);
    const [loading, setLoading] = useState(true);
    const [userProfiles, setUserProfiles] = useState<Map<string, User>>(new Map());

    // Admin Editing State
    const [editingResident, setEditingResident] = useState<{
        userId: string;
        userName: string;
        mealType: string;
        date: string; // yyyy-MM-dd
        currentOption: string;
    } | null>(null);

    // Guest Editing State
    const [editingGuest, setEditingGuest] = useState<{
        id: string;
        mealType: string;
        date: string;
        option: string;
        count: number;
        notes: string;
        isBag: boolean;
    } | null>(null);

    useEffect(() => {
        loadOrders();
    }, [selectedDate]);

    const loadOrders = async () => {
        setLoading(true);
        try {
            const dateStr = format(selectedDate, 'yyyy-MM-dd');
            const nextDateStr = format(addDays(selectedDate, 1), 'yyyy-MM-dd');

            const cacheKey = `daily-list-${dateStr}`;

            // 1. Try Cache
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                try {
                    const data = JSON.parse(cached);
                    // Validate if data structure is fresh enough or valid
                    if (data.date === dateStr) {
                        setOrders(data.orders);
                        setNextDayOrders(data.nextOrders);
                        setGuests(data.guests);
                        setNextGuests(data.nextGuests);
                        setIsLocked(data.isLocked);
                    }
                } catch (e) {
                    // Ignore cache error
                }
            }

            // 2. Optimized batch fetching
            const [plansMap, todayGuests, nextGuestsData, locked, profiles] = await Promise.all([
                mealService.getEffectiveDailyPlans([dateStr, nextDateStr]),
                kitchenService.getGuests(dateStr),
                kitchenService.getGuests(nextDateStr),
                kitchenService.getDailyLockStatus(dateStr),
                profileService.getAllProfiles() // Still needed for avatars/diets metadata
            ]);

            // Create a map of user profiles for quick lookup
            const profileMap = new Map<string, User>();
            profiles.forEach(profile => {
                profileMap.set(profile.id, profile);
            });

            const todayOrders = plansMap[dateStr] || [];
            const nextOrders = plansMap[nextDateStr] || [];

            setOrders(todayOrders);
            setNextDayOrders(nextOrders);
            setGuests(todayGuests);
            setNextGuests(nextGuestsData);
            setIsLocked(locked);
            setUserProfiles(profileMap);

            // 3. Update Cache
            localStorage.setItem(cacheKey, JSON.stringify({
                date: dateStr,
                orders: todayOrders,
                nextOrders: nextOrders,
                guests: todayGuests,
                nextGuests: nextGuestsData,
                isLocked: locked,
                timestamp: Date.now()
            }));

        } catch (error) {
            console.error('Error loading orders:', error);
        } finally {
            setLoading(false);
        }
    };

    // Group residents by meal type and option
    const groupByMealAndOption = (
        ordersList: typeof orders,
        guestsList: typeof guests,
        mealType: string,
        dateStr: string
    ): Record<string, ResidentEntry[]> => {
        const grouped: Record<string, ResidentEntry[]> = {
            no: [] // Ensure 'no' group exists
        };

        const getTargetKey = (option: string, isBag: boolean, mType: string): string => {
            if (option === 'skip' || option === 'no') return 'no';
            if (isBag || option === 'bag') return 'no';
            if (option === 'tupper') return 'no';
            if (mType === 'breakfast' && option === 'early') return 'no';
            return option;
        };

        // Add regular orders
        ordersList
            .filter(o => o.mealType === mealType)
            .forEach(o => {
                const key = getTargetKey(o.option || 'standard', o.isBag || false, mealType);
                if (!grouped[key]) grouped[key] = [];
                const userProfile = userProfiles.get(o.userId);
                grouped[key].push({
                    name: o.userName,
                    userId: o.userId,
                    avatarUrl: userProfile?.avatarUrl,
                    hasDiet: userProfile?.hasDiet,
                    dietNumber: userProfile?.dietNumber,
                    option: o.option,
                    isBag: o.isBag || false,
                    isFromTemplate: o.status === 'template',
                    isGuest: false,
                    initials: userProfile?.initials,
                    originalDate: dateStr,
                    mealType: mealType
                });
            });

        // Add guests
        guestsList
            .filter(g => g.mealType === mealType)
            .forEach(g => {
                const key = getTargetKey(g.option || 'standard', g.isBag || false, mealType);
                if (!grouped[key]) grouped[key] = [];
                grouped[key].push({
                    name: 'Invitados',
                    option: g.option,
                    isBag: g.isBag,
                    isFromTemplate: false,
                    isGuest: true,
                    guestId: g.id,
                    guestCount: g.count,
                    guestNotes: g.notes,
                    originalDate: dateStr,
                    mealType: mealType
                });
            });

        return grouped;
    };

    // Get subdivisions for tomorrow's prep
    const getTomorrowPrep = () => {
        const nextDateStr = format(addDays(selectedDate, 1), 'yyyy-MM-dd');
        const prep: Record<string, ResidentEntry[]> = {
            earlyBreakfast: [],
            tupper: [],
            bag: []
        };

        // Early breakfast
        nextDayOrders
            .filter(o => o.mealType === 'breakfast' && o.option === 'early')
            .forEach(o => {
                const userProfile = userProfiles.get(o.userId);
                prep.earlyBreakfast.push({
                    name: o.userName,
                    userId: o.userId,
                    avatarUrl: userProfile?.avatarUrl,
                    hasDiet: userProfile?.hasDiet,
                    dietNumber: userProfile?.dietNumber,
                    option: o.option,
                    isBag: false,
                    isFromTemplate: o.status === 'template',
                    isGuest: false,
                    initials: userProfile?.initials,
                    originalDate: nextDateStr,
                    mealType: 'breakfast'
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
                    guestId: g.id,
                    guestCount: g.count,
                    guestNotes: g.notes,
                    originalDate: nextDateStr,
                    mealType: 'breakfast'
                });
            });

        // Tuppers
        nextDayOrders
            .filter(o => o.option === 'tupper' && !o.isBag)
            .forEach(o => {
                const userProfile = userProfiles.get(o.userId);
                prep.tupper.push({
                    name: o.userName,
                    userId: o.userId,
                    avatarUrl: userProfile?.avatarUrl,
                    hasDiet: userProfile?.hasDiet,
                    dietNumber: userProfile?.dietNumber,
                    option: o.option,
                    isBag: false,
                    isFromTemplate: o.status === 'template',
                    isGuest: false,
                    initials: userProfile?.initials,
                    originalDate: nextDateStr,
                    mealType: o.mealType
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
                    guestId: g.id,
                    guestCount: g.count,
                    guestNotes: g.notes,
                    originalDate: nextDateStr,
                    mealType: g.mealType
                });
            });

        // Bags
        nextDayOrders
            .filter(o => o.isBag || o.option === 'bag')
            .forEach(o => {
                const userProfile = userProfiles.get(o.userId);
                prep.bag.push({
                    name: o.userName,
                    userId: o.userId,
                    avatarUrl: userProfile?.avatarUrl,
                    hasDiet: userProfile?.hasDiet,
                    dietNumber: userProfile?.dietNumber,
                    option: o.option,
                    isBag: true,
                    isFromTemplate: o.status === 'template',
                    isGuest: false,
                    initials: userProfile?.initials,
                    originalDate: nextDateStr,
                    mealType: o.mealType
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
                    guestId: g.id,
                    guestCount: g.count,
                    guestNotes: g.notes,
                    originalDate: nextDateStr,
                    mealType: g.mealType
                });
            });

        return prep;
    };

    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const breakfastGroups = groupByMealAndOption(orders, guests, 'breakfast', dateStr);
    const lunchGroups = groupByMealAndOption(orders, guests, 'lunch', dateStr);
    const dinnerGroups = groupByMealAndOption(orders, guests, 'dinner', dateStr);
    const tomorrowPrep = getTomorrowPrep();

    const handleResidentClick = (resident: ResidentEntry) => {
        // Allow admin edit if conditions met
        if (user.role !== 'ADMIN' || isLocked) return;

        if (resident.isGuest && resident.guestId) {
            setEditingGuest({
                id: resident.guestId,
                mealType: resident.mealType,
                date: resident.originalDate,
                option: resident.option,
                count: resident.guestCount || 1,
                notes: resident.guestNotes || '',
                isBag: resident.isBag
            });
        } else if (!resident.isGuest && resident.userId) {
            setEditingResident({
                userId: resident.userId,
                userName: resident.name,
                mealType: resident.mealType,
                date: resident.originalDate,
                currentOption: resident.option
            });
        }
    };

    const handleOptionSelect = async (option: string) => {
        if (!editingResident) return;

        const { userId, date, mealType } = editingResident;
        const isBag = option === 'bag';

        const finalIsBag = option === 'bag' ? true : (option === 'tupper' ? false : isBag);

        try {
            await mealService.upsertOrder(userId, date, mealType, option, finalIsBag);
            loadOrders(); // Reload to reflect changes
            setEditingResident(null);
        } catch (error) {
            console.error("Failed to update meal for user", error);
            alert("Error al actualizar el pedido.");
        }
    };

    const handleUpdateGuest = async () => {
        if (!editingGuest) return;
        try {
            // Delete and Re-add as a simple update mechanism
            await kitchenService.deleteGuest(editingGuest.id);
            await kitchenService.addGuest(
                editingGuest.date,
                editingGuest.mealType,
                editingGuest.count,
                editingGuest.option,
                editingGuest.isBag,
                editingGuest.notes
            );
            loadOrders();
            setEditingGuest(null);
        } catch (error) {
            console.error("Failed to update guest", error);
            alert("Error al actualizar invitados.");
        }
    };

    const handleDeleteGuest = async () => {
        if (!editingGuest) return;
        if (!confirm('¿Eliminar esta entrada de invitados?')) return;
        try {
            await kitchenService.deleteGuest(editingGuest.id);
            loadOrders();
            setEditingGuest(null);
        } catch (error) {
            console.error(error);
        }
    };

    const getAvailableOptions = (mealType: string) => {
        if (mealType === 'breakfast') {
            return ['standard', 'early', 'skip'];
        } else if (mealType === 'lunch') {
            return ['standard', 'early', 'late', 'tupper', 'bag', 'skip'];
        } else {
            return ['standard', 'late', 'skip'];
        }
    };

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
                    {residents.map((resident, idx) => {
                        const canEdit = user.role === 'ADMIN' && !isLocked && (resident.userId || resident.isGuest);

                        return (
                            <div
                                key={idx}
                                onClick={() => canEdit && handleResidentClick(resident)}
                                className={`flex items-center justify-between p-2 rounded-lg transition-colors ${canEdit
                                    ? 'cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800'
                                    : 'cursor-default hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    {resident.isGuest ? (
                                        <>
                                            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold">
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
                                        <>
                                            {mode === 'standard' && (
                                                <UserAvatar
                                                    name={resident.name}
                                                    imageUrl={resident.avatarUrl}
                                                    size="sm"
                                                />
                                            )}
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-zinc-900 dark:text-white">
                                                    {mode === 'kitchen' ? (
                                                        // Get Initials - prefer stored initials, fallback to generated
                                                        resident.initials || resident.name
                                                            .split(' ')
                                                            .map(p => p[0])
                                                            .join('')
                                                            .substring(0, 3)
                                                            .toUpperCase()
                                                    ) : (
                                                        resident.name
                                                    )}
                                                </span>
                                                {resident.hasDiet && resident.dietNumber && (
                                                    <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full">
                                                        <Utensils size={12} />
                                                        <span className="text-xs font-bold">D{resident.dietNumber}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}

                                </div>
                                <div className="flex items-center gap-2">
                                    {/* Special Status Label for 'NO' group */}
                                    {optionKey === 'no' && (resident.option !== 'skip' && resident.option !== 'no') && (
                                        <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 bg-zinc-100 dark:bg-zinc-700 dark:text-zinc-400 px-1.5 py-0.5 rounded">
                                            {resident.isBag || resident.option === 'bag' ? 'Bolsa' :
                                                resident.option === 'tupper' ? 'Tupper' :
                                                    resident.option === 'early' ? 'Pronto' :
                                                        resident.option === 'standard' ? 'Normal' :
                                                            resident.option === 'late' ? 'Tarde' :
                                                                resident.option}
                                        </span>
                                    )}

                                </div>
                            </div>
                        );
                    })}
                </div>
            </div >
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
                                { key: 'standard', label: 'Normal' },
                                { key: 'no', label: 'No' }
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
                                { key: 'bag', label: 'Bolsa' },
                                { key: 'no', label: 'No' }
                            ]}
                        />

                        <MealSection
                            title="Cena"
                            groups={dinnerGroups}
                            subdivisions={[
                                { key: 'standard', label: 'Normal' },
                                { key: 'late', label: 'Tarde' },
                                { key: 'no', label: 'No' }
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
                            <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[10px] font-bold">
                                +N
                            </div>
                            <span>Invitados</span>
                        </div>
                    </div>
                </>
            )}

            {/* Admin Edit Modal */}
            {editingResident && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 min-h-[100dvh]">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-md w-full border border-zinc-200 dark:border-zinc-800 animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                                    Cambiar Pedido: {editingResident.userName}
                                </h3>
                                <button
                                    onClick={() => setEditingResident(null)}
                                    className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                                >
                                    <X size={20} className="text-zinc-500" />
                                </button>
                            </div>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                {MEAL_NAMES[editingResident.mealType]} • {format(new Date(editingResident.date), "EEEE, d 'de' MMMM", { locale: es })}
                            </p>
                        </div>

                        {/* Options */}
                        <div className="p-6 space-y-2">
                            {getAvailableOptions(editingResident.mealType).map(opt => {
                                const config = OPTION_CONFIG[opt];
                                const isSelected = editingResident.currentOption === opt;

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
                                            {opt === 'skip' ? 'No' : opt === 'standard' ? 'Normal' : opt === 'early' ? 'Temprano' : opt === 'late' ? 'Tarde' : opt === 'tupper' ? 'Tupper' : 'Bolsa'}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Guest Edit Modal */}
            {editingGuest && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 min-h-[100dvh]">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-md w-full border border-zinc-200 dark:border-zinc-800 animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                                    Editar Invitados
                                </h3>
                                <button
                                    onClick={() => setEditingGuest(null)}
                                    className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                                >
                                    <X size={20} className="text-zinc-500" />
                                </button>
                            </div>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400 capitalize">
                                {MEAL_NAMES[editingGuest.mealType]} • {format(new Date(editingGuest.date), "EEEE, d 'de' MMMM", { locale: es })}
                            </p>
                        </div>

                        {/* Form */}
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-sm font-medium mb-1 block text-zinc-700 dark:text-zinc-300">Opción</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {getAvailableOptions(editingGuest.mealType).filter(o => o !== 'skip').map(opt => (
                                        <button
                                            key={opt}
                                            onClick={() => setEditingGuest({ ...editingGuest, option: opt, isBag: opt === 'bag' })}
                                            className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-2 ${editingGuest.option === opt
                                                ? 'bg-zinc-900 text-white dark:bg-white dark:text-black border-zinc-900 dark:border-white'
                                                : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 text-zinc-600 dark:text-zinc-400'
                                                }`}
                                        >
                                            <span className={`w-2 h-2 rounded-full ${OPTION_CONFIG[opt]?.color || 'bg-gray-400'}`}></span>
                                            {opt === 'standard' ? 'Normal' : opt === 'early' ? 'Temprano' : opt === 'late' ? 'Tarde' : opt === 'tupper' ? 'Tupper' : 'Bolsa'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium mb-1 block text-zinc-700 dark:text-zinc-300">Cantidad</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={editingGuest.count}
                                        onChange={e => setEditingGuest({ ...editingGuest, count: parseInt(e.target.value) || 1 })}
                                        className="w-full p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-transparent text-zinc-900 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-1 block text-zinc-700 dark:text-zinc-300">Notas</label>
                                    <input
                                        type="text"
                                        value={editingGuest.notes}
                                        onChange={e => setEditingGuest({ ...editingGuest, notes: e.target.value })}
                                        className="w-full p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-transparent text-zinc-900 dark:text-white"
                                        placeholder="(Opcional)"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3 border-t border-zinc-100 dark:border-zinc-800 mt-4">
                                <button
                                    onClick={handleDeleteGuest}
                                    className="flex-1 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 py-2.5 rounded-xl font-semibold text-sm hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                                >
                                    Eliminar
                                </button>
                                <button
                                    onClick={handleUpdateGuest}
                                    className="flex-[2] bg-indigo-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-colors"
                                >
                                    Guardar Cambios
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
