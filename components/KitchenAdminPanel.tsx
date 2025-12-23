import React, { useState, useEffect } from 'react';
import { kitchenService } from '../services/kitchen';
import { Settings, Users, Save, Clock, Lock, Unlock, CalendarDays } from 'lucide-react';
import { format, isAfter, startOfToday, isSameDay } from 'date-fns';
import { HolidaysManager } from './HolidaysManager';
import { KitchenConfig, Holiday } from '../types';

interface KitchenAdminPanelProps {
    selectedDate: Date;
    onUpdate?: () => void;
    holidays?: Holiday[];
}

export const KitchenAdminPanel: React.FC<KitchenAdminPanelProps> = ({ selectedDate, onUpdate, holidays = [] }) => {
    const [config, setConfig] = useState<KitchenConfig | null>(null);
    const [isLocked, setIsLocked] = useState(false);
    const [loading, setLoading] = useState(true);
    const [savingConfig, setSavingConfig] = useState(false);
    const [showConfig, setShowConfig] = useState(false);

    // Guest Form
    const [showAddGuest, setShowAddGuest] = useState(false);
    const [newGuestType, setNewGuestType] = useState('lunch');
    const [newGuestOption, setNewGuestOption] = useState('standard');
    const [newGuestCount, setNewGuestCount] = useState(1);
    const [newGuestNotes, setNewGuestNotes] = useState('');

    const dateStr = selectedDate.toISOString().split('T')[0];
    
    // Security: Only allow locking if today (or past)
    const today = startOfToday();
    const isFuture = isAfter(selectedDate, today) && !isSameDay(selectedDate, today);
    const canLock = !isFuture;

    useEffect(() => {
        loadData();
    }, [selectedDate]);

    const loadData = async () => {
        try {
            const [cfg, locked] = await Promise.all([
                kitchenService.getConfig(),
                kitchenService.getDailyLockStatus(dateStr)
            ]);

            // Auto-lock Logic (Simplified for display, but server/client logic should be unified eventually)
            // Here we just accept what the DB says for isLocked, relying on the DailyOrderManager to handle the "virtual" locking for users.
            // However, for the Kitchen to SEE if it's "effectively" locked by time, we might want to check.
            // But usually Kitchen manually locks to "Close" the day.
            
            setConfig(cfg);
            setIsLocked(locked);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveConfig = async () => {
        if (!config) return;
        setSavingConfig(true);
        try {
            await kitchenService.updateConfig(config.id, {
                schedule_weekdays: config.schedule_weekdays,
                schedule_saturday: config.schedule_saturday,
                schedule_sunday_holiday: config.schedule_sunday_holiday,
                overrides: config.overrides
            });
            setShowConfig(false);
            alert('Configuración guardada');
        } catch (error) {
            console.error(error);
            alert('Error al guardar configuración');
        } finally {
            setSavingConfig(false);
        }
    };

    const handleScheduleChange = (key: keyof KitchenConfig, value: string) => {
        if (!config) return;
        setConfig({
            ...config,
            [key]: value
        });
    };

    const handleOverrideChange = (date: string, time: string) => {
        if (!config) return;
        const newOverrides = { ...config.overrides };
        if (time) {
            newOverrides[date] = time;
        } else {
            delete newOverrides[date];
        }
        setConfig({ ...config, overrides: newOverrides });
    };

    const handleToggleLock = async () => {
        if (!canLock) return;
        try {
            await kitchenService.setDayLock(dateStr, !isLocked);
            loadData();
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error(error);
        }
    };

    const handleAddGuest = async () => {
        try {
            const isBag = newGuestOption === 'bag';
            await kitchenService.addGuest(
                dateStr,
                newGuestType,
                newGuestCount,
                newGuestOption,
                isBag,
                newGuestNotes
            );

            setShowAddGuest(false);
            setNewGuestCount(1);
            setNewGuestNotes('');
            setNewGuestOption('standard');
            loadData();
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error(error);
        }
    };

    if (loading) return null;

    // Helper to determine closing time for TODAY (selectedDate) for display
    const getClosingTimeDisplay = () => {
        if (!config) return '--:--';
        const isHoliday = holidays.some(h => h.date === dateStr);

        if (config.overrides && config.overrides[dateStr]) return config.overrides[dateStr];
        
        const day = selectedDate.getDay();
        if (day === 0 || isHoliday) return config.schedule_sunday_holiday || '--:--';
        if (day === 6) return config.schedule_saturday || '--:--';
        return config.schedule_weekdays || '--:--';
    };

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 mb-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Settings size={16} className="text-zinc-400" />
                    <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-200 uppercase tracking-wider">
                        Administración ({format(selectedDate, 'dd/MM')})
                    </h3>
                </div>

                {/* Single Lock Button */}
                <div className="flex items-center gap-2">
                    {isFuture && (
                        <span className="text-[10px] text-zinc-400 italic mr-2">
                            Solo día actual
                        </span>
                    )}
                    <button
                        onClick={handleToggleLock}
                        disabled={!canLock}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-colors ${isLocked
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            } ${!canLock ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                    >
                        {isLocked ? <Lock size={12} /> : <Unlock size={12} />}
                        {isLocked ? 'Cerrado / Enviado' : 'Abierto'}
                    </button>
                </div>
            </div>

            {/* Compact Config & Guest Actions */}
            <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-2 text-zinc-500">
                    <Clock size={14} />
                    <span>Cierre programado:</span>
                    <span className="font-mono bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                        {getClosingTimeDisplay()}
                    </span>
                    <button onClick={() => setShowConfig(!showConfig)} className="text-indigo-600 hover:underline ml-1">
                        Configurar
                    </button>
                </div>
                <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-700"></div>
                <button onClick={() => setShowAddGuest(!showAddGuest)} className="flex items-center gap-1 text-indigo-600 hover:underline font-medium">
                    <Users size={14} />
                    {showAddGuest ? 'Cancelar' : 'Añadir Invitados'}
                </button>
            </div>

            {/* Expandable Config */}
            {showConfig && (
                <div className="mt-4 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700 animate-in slide-in-from-top-2">
                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Closing Times */}
                        <div className="space-y-4">
                            <h4 className="font-bold text-xs uppercase text-zinc-500 flex items-center gap-2">
                                <Clock size={14} /> Horarios de Cierre
                            </h4>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] uppercase text-zinc-400 font-bold block mb-1">Lunes - Viernes</label>
                                    <input
                                        type="time"
                                        value={config?.schedule_weekdays || ''}
                                        onChange={e => handleScheduleChange('schedule_weekdays', e.target.value)}
                                        className="w-full text-xs p-2 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase text-zinc-400 font-bold block mb-1">Sábados</label>
                                    <input
                                        type="time"
                                        value={config?.schedule_saturday || ''}
                                        onChange={e => handleScheduleChange('schedule_saturday', e.target.value)}
                                        className="w-full text-xs p-2 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase text-zinc-400 font-bold block mb-1">Domingos / Festivos</label>
                                    <input
                                        type="time"
                                        value={config?.schedule_sunday_holiday || ''}
                                        onChange={e => handleScheduleChange('schedule_sunday_holiday', e.target.value)}
                                        className="w-full text-xs p-2 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                                    />
                                </div>
                            </div>

                            {/* Overrides */}
                            <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700">
                                <label className="text-[10px] uppercase text-zinc-400 font-bold block mb-2">Override (Excepción para hoy: {dateStr})</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="time"
                                        value={config?.overrides?.[dateStr] || ''}
                                        onChange={e => handleOverrideChange(dateStr, e.target.value)}
                                        className="text-xs p-2 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                                    />
                                    <span className="text-[10px] text-zinc-400">
                                        Fija una hora específica solo para este día. Borra para usar horario estándar.
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Holidays Manager */}
                        <div className="pl-6 border-l border-zinc-200 dark:border-zinc-700">
                            <HolidaysManager />
                        </div>
                    </div>

                    <div className="flex justify-end mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
                        <button
                            onClick={handleSaveConfig}
                            disabled={savingConfig}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors"
                        >
                            <Save size={14} /> GUARDAR CONFIGURACIÓN
                        </button>
                    </div>
                </div>
            )}

            {/* Guest Form */}
            {showAddGuest && (
                <div className="mt-4 p-4 bg-white dark:bg-zinc-900 rounded-lg border border-indigo-100 dark:border-indigo-900/30 shadow-sm animate-in slide-in-from-top-2">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
                        <div>
                            <label className="text-xs mb-1 block font-medium">Servicio</label>
                            <select
                                value={newGuestType}
                                onChange={e => setNewGuestType(e.target.value)}
                                className="w-full p-1.5 rounded border border-zinc-200 dark:border-zinc-700 bg-transparent text-xs"
                            >
                                <option value="breakfast">Desayuno</option>
                                <option value="lunch">Comida</option>
                                <option value="dinner">Cena</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs mb-1 block font-medium">Opción</label>
                            <select
                                value={newGuestOption}
                                onChange={e => setNewGuestOption(e.target.value)}
                                className="w-full p-1.5 rounded border border-zinc-200 dark:border-zinc-700 bg-transparent text-xs"
                            >
                                <option value="standard">Normal</option>
                                <option value="early">Pronto</option>
                                <option value="late">Tarde</option>
                                <option value="tupper">Tupper</option>
                                <option value="bag">Bolsa</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs mb-1 block font-medium">Cantidad</label>
                            <input
                                type="number"
                                min="1"
                                value={newGuestCount}
                                onChange={e => setNewGuestCount(parseInt(e.target.value))}
                                className="w-full p-1.5 rounded border border-zinc-200 dark:border-zinc-700 bg-transparent text-xs"
                            />
                        </div>
                        <div className="col-span-2 md:col-span-1">
                            <label className="text-xs mb-1 block font-medium">Notas</label>
                            <input
                                type="text"
                                value={newGuestNotes}
                                onChange={e => setNewGuestNotes(e.target.value)}
                                className="w-full p-1.5 rounded border border-zinc-200 dark:border-zinc-700 bg-transparent text-xs"
                                placeholder="..."
                            />
                        </div>
                        <button
                            onClick={handleAddGuest}
                            className="bg-indigo-600 text-white p-1.5 rounded text-xs font-medium hover:bg-indigo-700 h-[26px]"
                        >
                            Añadir
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
