import React, { useState } from 'react';
import { User } from '../types';
import { UtensilsCrossed, FileText, LogOut, Receipt } from 'lucide-react';
import { Logo } from './Logo';
import { KitchenOrdersView } from './KitchenOrdersView';
import { KitchenDietsView } from './KitchenDietsView';
import { AnimatePresence, motion } from 'framer-motion';

interface KitchenDashboardProps {
    user: User;
    onLogout: () => void;
}

export const KitchenDashboard: React.FC<KitchenDashboardProps> = ({ user, onLogout }) => {
    const [view, setView] = useState<'ORDERS' | 'DIETS'>('ORDERS');

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-black flex flex-col transition-colors duration-300">
            {/* Top Navigation Bar */}
            <header className="h-16 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-50">
                <div className="h-full max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        <Logo size="lg" />

                        {/* Navigation Tabs */}
                        <nav className="hidden sm:flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg">
                            <button
                                onClick={() => setView('ORDERS')}
                                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${view === 'ORDERS'
                                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                                    }`}
                            >
                                <Receipt size={16} />
                                Pedidos
                            </button>
                            <button
                                onClick={() => setView('DIETS')}
                                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${view === 'DIETS'
                                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                                    }`}
                            >
                                <FileText size={16} />
                                Dietas
                            </button>
                        </nav>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-semibold text-zinc-900 dark:text-white">Cocina</p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">Personal</p>
                        </div>
                        <div className="h-8 w-px bg-zinc-200 dark:bg-zinc-800 hidden sm:block"></div>
                        <button
                            onClick={onLogout}
                            className="p-2 text-zinc-500 hover:text-rose-500 transition-colors rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            title="Cerrar sesión"
                        >
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Mobile Navigation Tabs */}
            <div className="sm:hidden bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 p-2 sticky top-16 z-40">
                <nav className="flex gap-2">
                    <button
                        onClick={() => setView('ORDERS')}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${view === 'ORDERS'
                            ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white'
                            : 'text-zinc-600 dark:text-zinc-400'
                            }`}
                    >
                        <Receipt size={18} />
                        Pedidos
                    </button>
                    <button
                        onClick={() => setView('DIETS')}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${view === 'DIETS'
                            ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white'
                            : 'text-zinc-600 dark:text-zinc-400'
                            }`}
                    >
                        <FileText size={18} />
                        Dietas
                    </button>
                </nav>
            </div>

            {/* Main Content */}
            <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={view}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="w-full"
                    >
                        {view === 'ORDERS' ? (
                            <KitchenOrdersView user={user} />
                        ) : (
                            <KitchenDietsView />
                        )}
                    </motion.div>
                </AnimatePresence>
            </main>
        </div>
    );
};
