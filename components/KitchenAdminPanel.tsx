import React, { useState, useEffect } from 'react';
import { kitchenService, KitchenConfig, MealGuest, DailyLock } from '../services/kitchen';
import { Settings, Users, Trash2, Save, Clock, Lock, Unlock } from 'lucide-react';
import { format, isAfter, startOfToday, isSameDay } from 'date-fns';

interface KitchenAdminPanelProps {
    selectedDate: Date;
    onUpdate?: () => void;
}

const WEEKDAYS = [
    { key: '1', label: 'Lunes' },
    { key: '2', label: 'Martes' },
    { key: '3', label: 'Miércoles' },
    { key: '4', label: 'Jueves' },
    { key: '5', label: 'Viernes' },
    { key: '6', label: 'Sábado' },
    { key: '0', label: 'Domingo' },
];

export const KitchenAdminPanel: React.FC<KitchenAdminPanelProps> = ({ selectedDate, onUpdate }) => {
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
    const dayKey = selectedDate.getDay().toString(); // 0-6

    // Security: Only allow locking if today (or past, though past usually stays locked)
    // Actually, user said "prevent closing future days".
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

            // Auto-lock Logic: If not locked, today, and past cutoff -> Lock it
            let effectiveLocked = locked;
            const now = new Date();
            if (!locked && isSameDay(selectedDate, now)) {
                const sKey = selectedDate.getDay().toString();
                const scheduleTime = cfg.weekly_schedule?.[sKey];

                if (scheduleTime) {
                    const [h, m] = scheduleTime.split(':').map(Number);
                    const cutoff = new Date(now);
                    cutoff.setHours(h, m, 0, 0);

                    if (now > cutoff) {
                        effectiveLocked = true;
                        // Fire and forget update to persist the lock
                        kitchenService.setDayLock(dateStr, true).catch(e => console.error("Auto-lock update failed", e));
                    }
                }
            }

            setConfig(cfg);
            setIsLocked(effectiveLocked);
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
                weekly_schedule: config.weekly_schedule
            });
            setShowConfig(false);
        } catch (error) {
            console.error(error);
            alert('Error');
        } finally {
            setSavingConfig(false);
        }
    };

    const handleScheduleChange = (key: string, value: string) => {
        if (!config) return;
        setConfig({
            ...config,
            weekly_schedule: {
                ...config.weekly_schedule,
                [key]: value
            }
        });
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

    const currentDaySchedule = config?.weekly_schedule?.[dayKey];

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
                    <span>Envío automático:</span>
                    {currentDaySchedule ? (
                        <span className="font-mono bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">{currentDaySchedule}</span>
                    ) : (
                        <span className="italic">Manual</span>
                    )}
                    <button onClick={() => setShowConfig(!showConfig)} className="text-indigo-600 hover:underline ml-1">
                        Editar
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
                <div className="mt-4 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700">
                    <p className="text-[10px] text-zinc-400 uppercase font-bold mb-2">Horario Semanal de Envíos</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                        {WEEKDAYS.map(day => (
                            <div key={day.key}>
                                <label className={`text-[10px] uppercase font-bold mb-1 block ${day.key === dayKey ? 'text-indigo-600' : 'text-zinc-400'}`}>
                                    {day.label}
                                </label>
                                <input
                                    type="time"
                                    value={config?.weekly_schedule?.[day.key] || ''}
                                    onChange={e => handleScheduleChange(day.key, e.target.value)}
                                    className={`w-full px-2 py-1 rounded border text-xs text-center ${day.key === dayKey ? 'border-indigo-300 bg-white' : 'border-zinc-200 bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-700'}`}
                                />
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-end mt-3">
                        <button
                            onClick={handleSaveConfig}
                            disabled={savingConfig}
                            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-black rounded text-xs font-medium"
                        >
                            <Save size={12} /> Guardar
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
