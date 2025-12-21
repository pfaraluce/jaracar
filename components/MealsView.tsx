import React, { useState, useRef } from 'react';
import { User } from '../types';
import { WeeklyTemplateEditor } from './WeeklyTemplateEditor';
import { DailyOrderManager } from './DailyOrderManager';
import { DailyMealsList } from './DailyMealsList';
import { CalendarDays, ListChecks, ClipboardList, Save, Loader2, ChevronLeft, ChevronRight, AlertTriangle, Check } from 'lucide-react';
import { format, startOfWeek, addDays } from 'date-fns';
import { es } from 'date-fns/locale';

interface MealsViewProps {
    user: User;
}

export const MealsView: React.FC<MealsViewProps> = ({ user }) => {
    const [activeTab, setActiveTab] = useState<'daily' | 'template' | 'list'>('daily');
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [showUnsavedModal, setShowUnsavedModal] = useState(false);
    const [pendingTab, setPendingTab] = useState<'daily' | 'template' | 'list' | null>(null);

    // Use ref to store the save handler to avoid useState function issues
    const saveHandlerRef = useRef<(() => Promise<void>) | null>(null);

    // Date state for daily and list views
    const [currentWeekDate, setCurrentWeekDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());

    const handleTabChange = (newTab: 'daily' | 'template' | 'list') => {
        if (hasUnsavedChanges && activeTab === 'template') {
            setPendingTab(newTab);
            setShowUnsavedModal(true);
            return;
        }
        setActiveTab(newTab);
    };

    const confirmTabChange = () => {
        if (pendingTab) {
            setActiveTab(pendingTab);
            setHasUnsavedChanges(false);
        }
        setShowUnsavedModal(false);
        setPendingTab(null);
    };

    const cancelTabChange = () => {
        setShowUnsavedModal(false);
        setPendingTab(null);
    };

    const getTitleForTab = () => {
        switch (activeTab) {
            case 'daily': return 'Pedidos Diarios';
            case 'template': return 'Plantilla Semanal';
            case 'list': return 'Lista de Pedidos';
            default: return 'Gestión de Comidas';
        }
    };

    const handleSave = async () => {
        if (saveHandlerRef.current) {
            setIsSaving(true);
            setSaveSuccess(false);
            try {
                await saveHandlerRef.current();
                setHasUnsavedChanges(false);
                setSaveSuccess(true);
                setTimeout(() => setSaveSuccess(false), 2000);
            } catch (error) {
                console.error('Error saving template:', error);
            } finally {
                setIsSaving(false);
            }
        }
    };

    const setSaveHandler = (handler: () => Promise<void>) => {
        saveHandlerRef.current = handler;
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">{getTitleForTab()}</h2>
                    <p className="hidden sm:block text-zinc-500 dark:text-zinc-400">Planifica tus menús y pedidos.</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg border border-zinc-200 dark:border-zinc-800">
                        <button
                            onClick={() => handleTabChange('daily')}
                            className={`p-1.5 rounded-md transition-all ${activeTab === 'daily'
                                ? 'bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-white'
                                : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                            title="Pedidos Diarios"
                        >
                            <CalendarDays size={16} />
                        </button>
                        <button
                            onClick={() => handleTabChange('template')}
                            className={`p-1.5 rounded-md transition-all ${activeTab === 'template'
                                ? 'bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-white'
                                : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                            title="Plantilla Semanal"
                        >
                            <ListChecks size={16} />
                        </button>
                        <button
                            onClick={() => handleTabChange('list')}
                            className={`p-1.5 rounded-md transition-all ${activeTab === 'list'
                                ? 'bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-white'
                                : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                            title="Lista de Pedidos"
                        >
                            <ClipboardList size={16} />
                        </button>
                    </div>

                    {activeTab === 'template' && (
                        <>
                            <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800 mx-1" />
                            <button
                                onClick={handleSave}
                                disabled={isSaving || (!hasUnsavedChanges && !saveSuccess)}
                                className={`group h-9 px-4 flex items-center gap-2 rounded-lg transition-all duration-300 text-sm font-medium disabled:opacity-70 disabled:cursor-not-allowed
                                    ${saveSuccess
                                        ? 'bg-emerald-500 text-white'
                                        : hasUnsavedChanges
                                            ? 'bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200'
                                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500'
                                    }`}
                                title="Guardar Plantilla"
                            >
                                {isSaving ? (
                                    <Loader2 className="animate-spin" size={16} />
                                ) : saveSuccess ? (
                                    <Check className="animate-in zoom-in duration-300" size={16} />
                                ) : (
                                    <Save size={16} />
                                )}
                                <span className="hidden sm:inline">
                                    {isSaving ? 'Guardando...' : saveSuccess ? 'Guardado' : 'Guardar'}
                                </span>
                            </button>
                        </>
                    )}

                    {activeTab === 'daily' && (
                        <>
                            <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800 mx-1" />
                            <div className="h-9 flex items-center gap-3">
                                <button
                                    onClick={() => setCurrentWeekDate(new Date(currentWeekDate.setDate(currentWeekDate.getDate() - 7)))}
                                    className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                                >
                                    <ChevronLeft size={20} className="text-zinc-600 dark:text-zinc-400" />
                                </button>
                                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 min-w-[140px] text-center">
                                    {format(currentWeekDate, "d 'de' MMM", { locale: es })} - {format(addDays(currentWeekDate, 6), "d 'de' MMM", { locale: es })}
                                </span>
                                <button
                                    onClick={() => setCurrentWeekDate(new Date(currentWeekDate.setDate(currentWeekDate.getDate() + 7)))}
                                    className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                                >
                                    <ChevronRight size={20} className="text-zinc-600 dark:text-zinc-400" />
                                </button>
                            </div>
                        </>
                    )}

                    {activeTab === 'list' && (
                        <>
                            <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800 mx-1" />
                            <div className="h-9 flex items-center gap-3">
                                <button
                                    onClick={() => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() - 1)))}
                                    className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                                >
                                    <ChevronLeft size={20} className="text-zinc-600 dark:text-zinc-400" />
                                </button>
                                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 min-w-[140px] text-center">
                                    {format(selectedDate, "d 'de' MMMM", { locale: es })}
                                </span>
                                <button
                                    onClick={() => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() + 1)))}
                                    className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                                >
                                    <ChevronRight size={20} className="text-zinc-600 dark:text-zinc-400" />
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {activeTab === 'daily' && <DailyOrderManager userId={user.id} currentDate={currentWeekDate} onDateChange={setCurrentWeekDate} />}
            {activeTab === 'template' && <WeeklyTemplateEditor userId={user.id} onUnsavedChanges={setHasUnsavedChanges} onSave={setSaveHandler} />}
            {activeTab === 'list' && <DailyMealsList user={user} selectedDate={selectedDate} onDateChange={setSelectedDate} />}

            {/* Unsaved Changes Modal */}
            {showUnsavedModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                                <AlertTriangle className="text-amber-600 dark:text-amber-400" size={24} />
                            </div>
                            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Cambios sin guardar</h3>
                        </div>
                        <p className="text-zinc-600 dark:text-zinc-400">
                            Tienes cambios sin guardar en la plantilla semanal. ¿Quieres salir de todas formas?
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={cancelTabChange}
                                className="px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors font-medium"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmTabChange}
                                className="px-4 py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition-colors font-medium"
                            >
                                Salir sin guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
