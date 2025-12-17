import React, { useState } from 'react';
import { DailyMealsList } from './DailyMealsList';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { User } from '../types';

export const KitchenOrdersView = ({ user }: { user: User }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const handlePrevDay = () => setCurrentDate(prev => subDays(prev, 1));
    const handleNextDay = () => setCurrentDate(prev => addDays(prev, 1));

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Pedidos de Comida</h2>

                <div className="flex items-center justify-between bg-white dark:bg-zinc-900 rounded-xl p-1 border border-zinc-200 dark:border-zinc-800 shadow-sm">
                    <button
                        onClick={handlePrevDay}
                        className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-400 transition-colors"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div className="flex items-center gap-2 px-4 font-medium text-zinc-900 dark:text-white capitalize">
                        <Calendar size={18} className="text-zinc-400" />
                        {format(currentDate, "EEEE, d 'de' MMMM", { locale: es })}
                    </div>
                    <button
                        onClick={handleNextDay}
                        className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-400 transition-colors"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            <DailyMealsList
                user={user}
                selectedDate={currentDate}
                onDateChange={setCurrentDate}
                mode="kitchen"
            />
        </div>
    );
};
