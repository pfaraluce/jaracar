import React, { useState, useEffect, useCallback } from 'react';
import { MealTemplate } from '../types';
import { mealService } from '../services/meals';
import { Save, Loader2, X, Copy } from 'lucide-react';
import { es } from 'date-fns/locale';

interface WeeklyTemplateEditorProps {
    userId: string;
    onUnsavedChanges?: (hasChanges: boolean) => void;
    onSave?: (saveHandler: () => Promise<void>) => void;
}

const DAYS = [
    { id: 1, name: 'Lunes', short: 'L' },
    { id: 2, name: 'Martes', short: 'M' },
    { id: 3, name: 'Miércoles', short: 'X' },
    { id: 4, name: 'Jueves', short: 'J' },
    { id: 5, name: 'Viernes', short: 'V' },
    { id: 6, name: 'Sábado', short: 'S' },
    { id: 7, name: 'Domingo', short: 'D' }
];

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

export const WeeklyTemplateEditor: React.FC<WeeklyTemplateEditorProps> = ({ userId, onUnsavedChanges, onSave }) => {
    const [templates, setTemplates] = useState<MealTemplate[]>([]);
    const [originalTemplates, setOriginalTemplates] = useState<MealTemplate[]>([]); // Track original state
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Edit modal state
    const [editingMeal, setEditingMeal] = useState<{
        dayId: number;
        mealType: string;
        currentOption: string;
    } | null>(null);

    // Apply to all modal - now opens selector
    const [applyToAllMeal, setApplyToAllMeal] = useState<{
        mealType: string;
    } | null>(null);

    // Track if there are unsaved changes
    const hasUnsavedChanges = JSON.stringify(templates) !== JSON.stringify(originalTemplates);

    useEffect(() => {
        loadTemplates();
    }, []);

    // Warn before leaving with unsaved changes
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasUnsavedChanges]);

    // Notify parent component of unsaved changes
    useEffect(() => {
        onUnsavedChanges?.(hasUnsavedChanges);
    }, [hasUnsavedChanges, onUnsavedChanges]);

    const loadTemplates = async () => {
        const cacheKey = `weekly-templates-${userId}`;

        // Try to load from cache first
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            try {
                const cachedData = JSON.parse(cached);
                setTemplates(cachedData);
                setOriginalTemplates(cachedData);
                setLoading(false); // Show cached data immediately
            } catch (e) {
                console.error('Cache parse error:', e);
            }
        }

        // Fetch fresh data in background
        try {
            const data = await mealService.getMyTemplates();
            setTemplates(data);
            setOriginalTemplates(data);

            // Cache the fresh data
            localStorage.setItem(cacheKey, JSON.stringify(data));
        } catch (error) {
            console.error('Error loading templates:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCellClick = (dayId: number, mealType: string) => {
        const current = templates.find(t => t.dayOfWeek === dayId && t.mealType === mealType);
        const currentOption = current?.option || 'skip';

        setEditingMeal({
            dayId,
            mealType,
            currentOption
        });
    };

    const handleOptionSelect = async (option: string) => {
        if (!editingMeal) return;

        const { dayId, mealType } = editingMeal;

        // Update local state
        setTemplates(prev => {
            const existingIndex = prev.findIndex(t => t.dayOfWeek === dayId && t.mealType === mealType);
            const newTemplates = [...prev];

            if (existingIndex >= 0) {
                newTemplates[existingIndex] = { ...newTemplates[existingIndex], option };
            } else {
                newTemplates.push({
                    id: 'temp-' + Date.now(),
                    userId,
                    dayOfWeek: dayId,
                    mealType: mealType as any,
                    option,
                    isBag: option === 'bag'
                });
            }
            return newTemplates;
        });

        setEditingMeal(null);
    };

    const handleApplyToAll = (mealType: string) => {
        // Open selector modal for this meal type
        setApplyToAllMeal({ mealType });
    };

    const confirmApplyToAll = (option: string) => {
        if (!applyToAllMeal) return;

        const { mealType } = applyToAllMeal;

        setTemplates(prev => {
            const newTemplates = [...prev];

            // Update or create template for each day
            DAYS.forEach(day => {
                const existingIndex = newTemplates.findIndex(t => t.dayOfWeek === day.id && t.mealType === mealType);

                if (existingIndex >= 0) {
                    newTemplates[existingIndex] = { ...newTemplates[existingIndex], option };
                } else {
                    newTemplates.push({
                        id: 'temp-' + Date.now() + '-' + day.id,
                        userId,
                        dayOfWeek: day.id,
                        mealType: mealType as any,
                        option,
                        isBag: option === 'bag'
                    });
                }
            });

            return newTemplates;
        });

        setApplyToAllMeal(null);
    };

    const handleSave = useCallback(async () => {
        setSaving(true);
        try {
            const promises = templates.map(t =>
                mealService.upsertTemplate(userId, t.dayOfWeek, t.mealType, t.option, t.isBag)
            );
            await Promise.all(promises);
            const freshData = await mealService.getMyTemplates();
            setTemplates(freshData);
            setOriginalTemplates(freshData); // Reset original after save
        } catch (error) {
            console.error('Error saving templates:', error);
        } finally {
            setSaving(false);
        }
    }, [templates, userId]);

    // Pass save handler to parent when it changes
    useEffect(() => {
        if (onSave) {
            onSave(handleSave);
        }
    }, [handleSave, onSave]);

    const getAvailableOptions = (mealType: string) => {
        if (mealType === 'breakfast') {
            return ['standard', 'early', 'skip'];
        } else if (mealType === 'lunch') {
            return ['standard', 'early', 'late', 'tupper', 'bag', 'skip'];
        } else {
            return ['standard', 'late', 'skip'];
        }
    };

    if (loading) return <div className="p-8 text-center text-zinc-500">Cargando plantilla...</div>;

    return (
        <div className="space-y-6">
            {/* Save button passed to parent - will be rendered in header */}
            <div className="hidden" data-save-button>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-100 disabled:opacity-50 transition-all font-medium text-sm shadow-sm"
                >
                    {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                    <span className="hidden sm:inline">Guardar</span>
                </button>
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
                                    <th key={meal.id} className="p-4 bg-zinc-50 dark:bg-zinc-900/50">
                                        <div className="flex items-center justify-center gap-2">
                                            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                                {meal.name}
                                            </span>
                                            <button
                                                onClick={() => handleApplyToAll(meal.id)}
                                                className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors group"
                                                title="Aplicar a toda la semana"
                                            >
                                                <Copy size={14} className="text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300" />
                                            </button>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {DAYS.map(day => (
                                <tr
                                    key={day.id}
                                    className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors"
                                >
                                    <td className="p-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-zinc-900 dark:text-white">
                                                {day.name}
                                            </span>
                                        </div>
                                    </td>
                                    {MEALS.map(meal => {
                                        const current = templates.find(t => t.dayOfWeek === day.id && t.mealType === meal.id);
                                        const option = current?.option || 'skip';
                                        const config = OPTION_CONFIG[option];

                                        return (
                                            <td key={meal.id} className="p-4">
                                                <button
                                                    onClick={() => handleCellClick(day.id, meal.id)}
                                                    className={`
                                                        w-full px-4 py-2.5 rounded-xl font-semibold text-sm
                                                        ${config.color} ${config.textColor}
                                                        hover:scale-105 cursor-pointer shadow-sm hover:shadow-md
                                                        transition-all duration-200
                                                    `}
                                                >
                                                    {config.label}
                                                </button>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
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
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                {DAYS.find(d => d.id === editingMeal.dayId)?.name}
                            </p>
                        </div>

                        {/* Options */}
                        <div className="p-6 space-y-2">
                            {getAvailableOptions(editingMeal.mealType).map(opt => {
                                const config = OPTION_CONFIG[opt];
                                const isSelected = editingMeal.currentOption === opt;

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

            {/* Apply to All Modal - Option Selector */}
            {applyToAllMeal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 min-h-[100dvh]">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-md w-full border border-zinc-200 dark:border-zinc-800 animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                                    Aplicar a toda la semana
                                </h3>
                                <button
                                    onClick={() => setApplyToAllMeal(null)}
                                    className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                                >
                                    <X size={20} className="text-zinc-500" />
                                </button>
                            </div>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                {MEALS.find(m => m.id === applyToAllMeal.mealType)?.name} - Todos los días
                            </p>
                        </div>

                        {/* Options */}
                        <div className="p-6 space-y-2">
                            {getAvailableOptions(applyToAllMeal.mealType).map(opt => {
                                const config = OPTION_CONFIG[opt];

                                return (
                                    <button
                                        key={opt}
                                        onClick={() => confirmApplyToAll(opt)}
                                        className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 transition-all cursor-pointer"
                                    >
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
        </div>
    );
};
