import React, { useState, useEffect } from 'react';
import { MealOrder, MealTemplate } from '../types';
import { mealService } from '../services/meals';
import { ChevronLeft, ChevronRight, ShoppingBag } from 'lucide-react';

interface DailyOrderManagerProps {
    userId: string;
}

const MEALS = [
    { id: 'breakfast', name: 'Desayuno', cutoffHour: 10 }, // Example cutoff: 10AM (actually user said night before, simplifying for now)
    { id: 'lunch', name: 'Comida', cutoffHour: 10 },    // User said: 10am same day?? Need to clarify but will implement basic check
    { id: 'dinner', name: 'Cena', cutoffHour: 17 }      // User said: send to kitchen at X.
];

export const DailyOrderManager: React.FC<DailyOrderManagerProps> = ({ userId }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [orders, setOrders] = useState<MealOrder[]>([]);
    const [templates, setTemplates] = useState<MealTemplate[]>([]);
    const [loading, setLoading] = useState(true);

    // Helper to get start of week
    const getStartOfWeek = (date: Date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
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

            const [ordersData, templatesData] = await Promise.all([
                mealService.getMyOrders(startOfWeek.toISOString().split('T')[0], endOfWeek.toISOString().split('T')[0]),
                mealService.getMyTemplates()
            ]);
            setOrders(ordersData);
            setTemplates(templatesData);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const getMealForDate = (date: Date, mealType: string) => {
        const dateStr = date.toISOString().split('T')[0];
        const existingOrder = orders.find(o => o.date === dateStr && o.mealType === mealType);

        if (existingOrder) return { ...existingOrder, source: 'order' };

        // Fallback to template
        // JS getDay(): 0=Sun, 1=Mon. DB: 1=Mon, 7=Sun
        let dayOfWeek = date.getDay();
        if (dayOfWeek === 0) dayOfWeek = 7;

        const template = templates.find(t => t.dayOfWeek === dayOfWeek && t.mealType === mealType);
        return template ? { ...template, source: 'template', date: dateStr, status: 'pending' } : null;
    };

    const isLocked = (date: Date, mealType: string) => {
        const now = new Date();
        const mealDate = new Date(date);

        // Simple logic based on User Request:
        // "after update time... cannot modify today's lunch/dinner, nor tomorrow breakfast"
        // Let's assume Cutoff is 10:00 AM for Lunch/Dinner of TODAY
        // And 20:00 PM for Breakfast of TOMORROW
        // This is a Placeholder logic to be refined.

        // If day is in past, locked.
        const todayStr = now.toISOString().split('T')[0];
        const targetStr = mealDate.toISOString().split('T')[0];

        if (targetStr < todayStr) return true;

        // TODO: Implement precise hour checks
        return false;
    };

    const handleUpdateOrder = async (date: Date, mealType: string, option: string, isBag: boolean) => {
        if (isLocked(date, mealType)) {
            alert("El periodo de modificación ha cerrado para esta comida.");
            return;
        }

        const dateStr = date.toISOString().split('T')[0];

        // Optimistic UI could go here

        await mealService.upsertOrder(userId, dateStr, mealType, option, isBag);
        loadData(); // Refresh to confirm
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
                    <div key={day.toISOString()} className={`p-4 rounded-xl border ${day.toISOString().split('T')[0] === new Date().toISOString().split('T')[0]
                        ? 'bg-zinc-50 dark:bg-zinc-800/80 border-zinc-300 dark:border-zinc-700 ring-1 ring-zinc-300 dark:ring-zinc-700'
                        : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
                        }`}>
                        <h4 className="font-medium text-zinc-900 dark:text-white mb-4 capitalize">
                            {day.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric' })}
                        </h4>

                        <div className="space-y-4">
                            {MEALS.map(meal => {
                                const data = getMealForDate(day, meal.id);
                                const locked = isLocked(day, meal.id);

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

                                const currentValue = data?.option || 'standard';

                                return (
                                    <div key={meal.id} className="space-y-1">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="font-medium text-zinc-500 dark:text-zinc-400">{meal.name}</span>
                                            {locked && <span className="text-amber-600 text-[10px]">Cerrado</span>}
                                        </div>

                                        <div className="flex gap-2">
                                            <select
                                                disabled={locked}
                                                value={currentValue}
                                                onChange={(e) => handleUpdateOrder(day, meal.id, e.target.value, false)}
                                                className={`w-full px-2 py-1.5 text-sm rounded-md border ${data?.source === 'template'
                                                    ? 'border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-600 bg-transparent'
                                                    : 'border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white'
                                                    } focus:outline-none focus:ring-1 focus:ring-zinc-900`}
                                            >
                                                {options.map(opt => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
