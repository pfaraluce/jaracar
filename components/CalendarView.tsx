import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { calendarService, CalendarSource } from '../services/calendar';
import { Plus, Trash2, Calendar as CalendarIcon, Info, RefreshCw, AlertTriangle, CheckSquare, Square, EyeOff, Eye } from 'lucide-react';
import { CalendarGrid } from './CalendarGrid';
import { parseICS, CalendarEvent } from '../services/icalParser';

interface CalendarViewProps {
    user: User;
}

// Predefined palette for calendars
const CALENDAR_COLORS = [
    '#3b82f6', // Blue
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#06b6d4', // Cyan
    '#84cc16', // Lime
];

export const CalendarView: React.FC<CalendarViewProps> = ({ user }) => {
    const [calendars, setCalendars] = useState<CalendarSource[]>([]);
    const [loading, setLoading] = useState(true);

    // Add Calendar State
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newCalendar, setNewCalendar] = useState({ name: '', url: '', isEpacta: false });
    const [isAdding, setIsAdding] = useState(false);
    const [addError, setAddError] = useState<string | null>(null);

    // Unified View State
    const [activeCalendarIds, setActiveCalendarIds] = useState<Set<string>>(new Set());
    const [allEvents, setAllEvents] = useState<CalendarEvent[]>([]);
    const [loadingEvents, setLoadingEvents] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    // Load list of calendars on mount
    useEffect(() => {
        loadCalendars();
    }, []);

    // Fetch cached events whenever calendars or active selections change
    useEffect(() => {
        if (calendars.length > 0) {
            fetchCachedEvents();
        } else {
            setAllEvents([]);
        }
    }, [calendars, activeCalendarIds]);

    const loadCalendars = async () => {
        try {
            const data = await calendarService.getCalendars();
            setCalendars(data);

            // By default, activate all calendars IF it's the first load
            if (activeCalendarIds.size === 0 && data.length > 0) {
                setActiveCalendarIds(new Set(data.map(c => c.id)));
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCachedEvents = async (overrideIds?: string[]) => {
        setLoadingEvents(true);
        const targetIds = overrideIds || Array.from(activeCalendarIds);
        if (targetIds.length === 0) {
            setAllEvents([]);
            setLoadingEvents(false);
            return;
        }

        try {
            const cached = await calendarService.getCachedEvents(targetIds);

            // Assign colors based on calendar index
            const valid = cached.map(ev => {
                const calIndex = calendars.findIndex(c => c.id === ev.calendarId);
                // If not found (calIndex -1), use Gray. Otherwise use the palette.
                const color = calIndex >= 0
                    ? CALENDAR_COLORS[calIndex % CALENDAR_COLORS.length]
                    : '#71717a';
                return { ...ev, color };
            });

            setAllEvents(valid);
        } catch (error) {
            console.error("Cache fetch failed", error);
        } finally {
            setLoadingEvents(false);
        }
    };

    // Proxy fetcher - Updated Priority
    const fetchWithProxy = async (url: string) => {
        const proxies = [
            'https://corsproxy.io/?', // Try this first
            'https://api.allorigins.win/raw?url='
        ];

        let lastError;
        for (const proxy of proxies) {
            try {
                const target = proxy + encodeURIComponent(url);
                const response = await fetch(target);
                if (response.ok) return await response.text();
            } catch (e) {
                lastError = e;
                continue;
            }
        }
        throw lastError || new Error('All proxies failed');
    };

    const handleForceSync = async () => {
        setIsSyncing(true);
        // Sync active calendars
        const targetCalendars = calendars.filter(c => activeCalendarIds.has(c.id));

        await Promise.all(targetCalendars.map(async (cal) => {
            if (!cal.url) return;
            try {
                let icsText = '';
                if (cal.url.includes('calendar.google.com') && cal.url.endsWith('.ics')) {
                    icsText = await fetchWithProxy(cal.url);
                } else {
                    try {
                        const res = await fetch(cal.url);
                        if (!res.ok) throw new Error('Direct fetch failed');
                        icsText = await res.text();
                    } catch {
                        icsText = await fetchWithProxy(cal.url);
                    }
                }

                // Pass isEpacta flag to parser!
                const parsed = parseICS(icsText, cal.is_epacta);

                // Save to DB
                await calendarService.syncEvents(cal.id, parsed);

            } catch (error) {
                console.error(`Failed to sync calendar ${cal.name}`, error);
            }
        }));

        // After sync, reload cache
        await fetchCachedEvents();
        setIsSyncing(false);
    };

    const toggleCalendar = (id: string) => {
        const next = new Set(activeCalendarIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setActiveCalendarIds(next);
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsAdding(true);
        setAddError(null);
        try {
            if (!newCalendar.url.startsWith('http')) {
                throw new Error("URL inválida");
            }
            if (!newCalendar.url.includes('.ics')) {
                setAddError("Advertencia: Asegúrate de que termina en .ics");
            }

            // Save with isEpacta flag
            const newCal = await calendarService.addCalendar(newCalendar.name, newCalendar.url, newCalendar.isEpacta);

            // Trigger optimistic add to list
            setCalendars(prev => [...prev, newCal]);
            setActiveCalendarIds(prev => new Set(prev).add(newCal.id));
            setIsAddOpen(false);
            setNewCalendar({ name: '', url: '', isEpacta: false });

            // Try background sync for this new one immediately
            fetchWithProxy(newCal.url)
                .then(text => parseICS(text, newCal.is_epacta))
                .then(events => calendarService.syncEvents(newCal.id, events))
                .then(() => {
                    // Use optional param to force refresh with new ID included, 
                    // since activeCalendarIds state update might not be reflected in closure yet
                    const updatedIds = Array.from(new Set(activeCalendarIds).add(newCal.id));
                    fetchCachedEvents(updatedIds);
                })
                .catch(err => console.error("Auto-sync failed for new calendar", err));

        } catch (error) {
            console.error(error);
            setAddError("Error al guardar.");
        } finally {
            setIsAdding(false);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('¿Seguro que quieres eliminar este calendario?')) return;
        try {
            await calendarService.deleteCalendar(id);
            const remaining = calendars.filter(c => c.id !== id);
            setCalendars(remaining);
            const next = new Set(activeCalendarIds);
            next.delete(id);
            setActiveCalendarIds(next);
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="h-auto lg:h-[calc(100vh-140px)] flex flex-col gap-6">
            <div className="flex justify-between items-center shrink-0">
                <div>
                    <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Calendario Unificado</h2>
                    <p className="text-zinc-500 dark:text-zinc-400">Datos cacheados. Sincroniza si faltan eventos.</p>
                </div>

                {user.role === 'ADMIN' && (
                    <button
                        onClick={() => setIsAddOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-lg hover:opacity-90 transition-all font-medium text-sm"
                    >
                        <Plus size={16} />
                        <span className="hidden sm:inline">Añadir</span>
                    </button>
                )}
            </div>

            {/* Modal Añadir */}
            {isAddOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-zinc-900 rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
                        <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Añadir Calendario (iCal)</h3>

                        <div className="bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 p-3 rounded-lg text-xs flex items-start gap-2">
                            <Info size={16} className="shrink-0 mt-0.5" />
                            <p>
                                Pega la <strong>Dirección pública en formato iCal</strong> (.ics).<br />
                                <span className="opacity-75">Ej: https://calendar.google.com/.../basic.ics</span>
                            </p>
                        </div>

                        {addError && (
                            <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg text-xs flex items-center gap-2">
                                <AlertTriangle size={16} />
                                {addError}
                            </div>
                        )}

                        <form onSubmit={handleAdd} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-400 mb-1">Nombre</label>
                                <input
                                    required
                                    placeholder="Ej. Liturgia"
                                    value={newCalendar.name}
                                    onChange={e => setNewCalendar({ ...newCalendar, name: e.target.value })}
                                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-400 mb-1">URL (.ics)</label>
                                <input
                                    required
                                    placeholder="https://..."
                                    value={newCalendar.url}
                                    onChange={e => setNewCalendar({ ...newCalendar, url: e.target.value })}
                                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm font-mono text-xs"
                                />
                            </div>

                            {/* Checkbox Epacta */}
                            <label className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg cursor-pointer border border-zinc-100 dark:border-zinc-700">
                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${newCalendar.isEpacta ? 'bg-zinc-900 border-zinc-900 dark:bg-white dark:border-white' : 'border-zinc-300 dark:border-zinc-600'}`}>
                                    {newCalendar.isEpacta && <CheckSquare size={14} className="text-white dark:text-black" />}
                                </div>
                                <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={newCalendar.isEpacta}
                                    onChange={e => setNewCalendar({ ...newCalendar, isEpacta: e.target.checked })}
                                />
                                <div className="text-sm">
                                    <span className="font-medium text-zinc-900 dark:text-white">Formato Epacta</span>
                                    <p className="text-xs text-zinc-500">Activa el desglose litúrgico (Color/Misal/Prefacio...)</p>
                                </div>
                            </label>

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    disabled={isAdding}
                                    onClick={() => setIsAddOpen(false)}
                                    className="px-4 py-2 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isAdding}
                                    className="px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50"
                                >
                                    {isAdding && <RefreshCw size={14} className="animate-spin" />}
                                    {isAdding ? 'Guardando...' : 'Guardar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-visible lg:overflow-hidden">
                {/* Main Content Grid */}
                <div className="h-[65vh] lg:h-auto flex-1 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col relative order-first">
                    <CalendarGrid events={allEvents} />

                    {/* Loading Overlay */}
                    {(loadingEvents || isSyncing) && (
                        <div className="absolute inset-0 bg-white/60 dark:bg-zinc-900/60 z-10 flex items-center justify-center backdrop-blur-[1px]">
                            <div className="bg-white dark:bg-zinc-800 px-4 py-2 rounded-full shadow-lg border border-zinc-100 dark:border-zinc-700 flex items-center gap-3">
                                <RefreshCw size={14} className="animate-spin text-blue-600" />
                                <span className="text-xs font-medium">
                                    {isSyncing ? 'Sincronizando con Google (puede tardar)...' : 'Cargando caché...'}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar Controls */}
                <div className="w-full lg:w-64 flex flex-col gap-4 overflow-y-auto shrink-0 pl-2 pb-4 border-l border-zinc-100 dark:border-zinc-800 order-last">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-zinc-900 dark:text-white text-sm">Mis Calendarios</h3>
                        <button
                            onClick={handleForceSync}
                            disabled={isSyncing}
                            className={`p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ${isSyncing ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : ''}`}
                            title="Sincronizar ahora (Proxy Fetch)"
                        >
                            <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                        </button>
                    </div>

                    {calendars.length === 0 ? (
                        <div className="text-zinc-400 text-xs italic">
                            No hay calendarios añadidos.
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {calendars.map((cal, index) => {
                                const isActive = activeCalendarIds.has(cal.id);
                                const color = CALENDAR_COLORS[index % CALENDAR_COLORS.length];

                                return (
                                    <div
                                        key={cal.id}
                                        onClick={() => toggleCalendar(cal.id)}
                                        className={`group w-full flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all select-none
                                            ${isActive ? 'bg-zinc-50 dark:bg-zinc-800' : 'opacity-60 hover:opacity-100'}
                                        `}
                                    >
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div
                                                className={`w-3 h-3 rounded-full shrink-0 transition-colors ${isActive ? '' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                                                style={{ backgroundColor: isActive ? color : undefined }}
                                            />
                                            <span className={`text-sm truncate ${isActive ? 'font-medium text-zinc-900 dark:text-white' : 'text-zinc-500'}`}>
                                                {cal.name}
                                            </span>
                                        </div>

                                        {user.role === 'ADMIN' && (
                                            <button
                                                onClick={(e) => handleDelete(cal.id, e)}
                                                className="text-zinc-400 hover:text-red-500 p-1"
                                                title="Eliminar calendario"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <div className="mt-auto pt-4 border-t border-zinc-100 dark:border-zinc-800">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-[10px] text-blue-800 dark:text-blue-200 leading-relaxed">
                            <strong>Sistema Caché:</strong> Los eventos cargan rápido desde nuestra BD. Si ves que faltan datos, dale al botón 🔄 para descargar los nuevos desde la fuente.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
