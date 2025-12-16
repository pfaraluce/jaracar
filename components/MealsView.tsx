import React, { useState } from 'react';
import { User } from '../types';
import { WeeklyTemplateEditor } from './WeeklyTemplateEditor';
import { DailyOrderManager } from './DailyOrderManager';
import { CalendarDays, ListChecks } from 'lucide-react';

interface MealsViewProps {
    user: User;
}

export const MealsView: React.FC<MealsViewProps> = ({ user }) => {
    const [activeTab, setActiveTab] = useState<'daily' | 'template'>('daily');

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Gestión de Comidas</h2>
                    <p className="text-zinc-500 dark:text-zinc-400">Planifica tus menús y pedidos.</p>
                </div>

                <div className="flex p-1 bg-zinc-100 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                    <button
                        onClick={() => setActiveTab('daily')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'daily'
                                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                            }`}
                    >
                        <CalendarDays size={16} />
                        Pedidos Diarios
                    </button>
                    <button
                        onClick={() => setActiveTab('template')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'template'
                                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                            }`}
                    >
                        <ListChecks size={16} />
                        Plantilla Semanal
                    </button>
                </div>
            </div>

            {activeTab === 'template' ? (
                <WeeklyTemplateEditor userId={user.id} />
            ) : (
                <DailyOrderManager userId={user.id} />
            )}
        </div>
    );
};
