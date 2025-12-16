import React, { useState, useEffect } from 'react';
import { MealTemplate } from '../types';
import { mealService } from '../services/meals';
import { Save, Loader2, Utensils } from 'lucide-react';

interface WeeklyTemplateEditorProps {
    userId: string;
}

const DAYS = [
    { id: 1, name: 'Lunes' },
    { id: 2, name: 'Martes' },
    { id: 3, name: 'Miércoles' },
    { id: 4, name: 'Jueves' },
    { id: 5, name: 'Viernes' },
    { id: 6, name: 'Sábado' },
    { id: 7, name: 'Domingo' }
];

const MEALS = [
    { id: 'breakfast', name: 'Desayuno' },
    { id: 'lunch', name: 'Comida' },
    { id: 'dinner', name: 'Cena' }
];

export const WeeklyTemplateEditor: React.FC<WeeklyTemplateEditorProps> = ({ userId }) => {
    const [templates, setTemplates] = useState<MealTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        try {
            const data = await mealService.getMyTemplates();
            setTemplates(data);
        } catch (error) {
            console.error('Error loading templates:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (dayId: number, mealType: string, field: 'option' | 'isBag', value: any) => {
        // Optimistic update in local state
        setTemplates(prev => {
            const existingIndex = prev.findIndex(t => t.dayOfWeek === dayId && t.mealType === mealType);
            const newTemplates = [...prev];

            if (existingIndex >= 0) {
                newTemplates[existingIndex] = { ...newTemplates[existingIndex], [field]: value };
            } else {
                newTemplates.push({
                    id: 'temp-' + Date.now(),
                    userId,
                    dayOfWeek: dayId,
                    mealType: mealType as any,
                    option: field === 'option' ? value : '',
                    isBag: field === 'isBag' ? value : false
                });
            }
            return newTemplates;
        });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Save all current templates
            const promises = templates.map(t =>
                mealService.upsertTemplate(userId, t.dayOfWeek, t.mealType, t.option, t.isBag)
            );
            await Promise.all(promises);
            await loadTemplates(); // Reload to get real IDs
        } catch (error) {
            console.error('Error saving templates:', error);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-zinc-500">Cargando plantilla...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-medium text-zinc-900 dark:text-white">Plantilla Semanal</h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">Define tus preferencias habituales. Se usarán por defecto si no haces un pedido específico.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-lg hover:opacity-90 disabled:opacity-50 transition-all font-medium text-sm"
                >
                    {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                    Guardar Cambios
                </button>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-zinc-500 dark:text-zinc-400 uppercase bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
                            <tr>
                                <th className="px-6 py-3 font-medium">Día</th>
                                {MEALS.map(meal => (
                                    <th key={meal.id} className="px-6 py-3 font-medium min-w-[200px]">{meal.name}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                            {DAYS.map(day => (
                                <tr key={day.id} className="bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-zinc-900 dark:text-white whitespace-nowrap">
                                        {day.name}
                                    </td>
                                    {MEALS.map(meal => {
                                        const current = templates.find(t => t.dayOfWeek === day.id && t.mealType === meal.id);

                                        let options: { value: string; label: string }[] = [];
                                        if (meal.id === 'breakfast') {
                                            options = [
                                                { value: 'standard', label: 'Sí' },
                                                { value: 'early', label: 'Pronto' },
                                                { value: 'skip', label: 'No' }
                                            ];
                                        } else if (meal.id === 'lunch') {
                                            options = [
                                                { value: 'standard', label: 'Sí' },
                                                { value: 'early', label: 'Pronto' },
                                                { value: 'late', label: 'Tarde' },
                                                { value: 'tupper', label: 'Tupper' },
                                                { value: 'bag', label: 'Bolsa' },
                                                { value: 'skip', label: 'No' }
                                            ];
                                        } else if (meal.id === 'dinner') {
                                            options = [
                                                { value: 'standard', label: 'Sí' },
                                                { value: 'late', label: 'Tarde' },
                                                { value: 'skip', label: 'No' }
                                            ];
                                        }

                                        return (
                                            <td key={meal.id} className="px-6 py-4">
                                                <div className="space-y-2">
                                                    <select
                                                        value={current?.option || 'skip'}
                                                        onChange={(e) => handleChange(day.id, meal.id, 'option', e.target.value)}
                                                        className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white appearance-none"
                                                    >
                                                        <option value="" disabled>Seleccionar...</option>
                                                        {options.map(opt => (
                                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
