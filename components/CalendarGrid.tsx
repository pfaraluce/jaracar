import React, { useState } from 'react';
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    addMonths,
    subMonths,
    isToday
} from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, MapPin, Clock, BookOpen, MessageCircle, FileText, Palette, Scroll, Flower2, Sun, ExternalLink, AlertCircle } from 'lucide-react';
import { CalendarEvent, EpactaMetadata } from '../services/icalParser';

interface CalendarGridProps {
    events: CalendarEvent[];
}

export const CalendarGrid: React.FC<CalendarGridProps> = ({ events }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday start
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const dateFormat = "d";
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    const weekDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

    const getEventsForDay = (day: Date) => {
        return events.filter(e => isSameDay(e.start, day));
    };

    const dayEvents = selectedDate ? getEventsForDay(selectedDate) : [];

    // Helper component to render simplified HTML tags
    const FormattedText: React.FC<{ text: string }> = ({ text }) => {
        // Simple parser for <b>, <i>, <br>
        if (!text) return null;

        // Split by tags: <b>, </b>, <i>, </i>, <br>, <br/>
        const parts = text.split(/(<\/?(?:b|i|br)\s*\/?>)/gi);

        let isBold = false;
        let isItalic = false;

        return (
            <span>
                {parts.map((part, index) => {
                    const low = part.toLowerCase();
                    if (low === '<b>') { isBold = true; return null; }
                    if (low === '</b>') { isBold = false; return null; }
                    if (low === '<i>') { isItalic = true; return null; }
                    if (low === '</i>') { isItalic = false; return null; }
                    if (low.startsWith('<br')) return <br key={index} />;

                    if (!part) return null;

                    return (
                        <span key={index} className={`${isBold ? 'font-bold' : ''} ${isItalic ? 'italic' : ''}`}>
                            {part}
                        </span>
                    );
                })}
            </span>
        );
    };

    // Helper to render Epacta Metadata cleanly
    const renderEpactaDetails = (meta: EpactaMetadata) => {
        const getLiturgicalColorStyles = (code?: string) => {
            if (!code) return null;
            const c = code.toLowerCase().trim();
            if (c.includes('mo')) return 'bg-purple-100 text-purple-800 border-purple-200'; // Morado
            if (c.includes('bl')) return 'bg-slate-100 text-slate-800 border-slate-200';   // Blanco (o gris claro)
            if (c.includes('ro')) return 'bg-red-100 text-red-800 border-red-200';         // Rojo
            if (c.includes('ve')) return 'bg-green-100 text-green-800 border-green-200';   // Verde
            if (c.includes('az')) return 'bg-blue-100 text-blue-800 border-blue-200';      // Azul
            return 'bg-zinc-100 text-zinc-800 border-zinc-200';
        };
        const colorStyle = getLiturgicalColorStyles(meta.color);

        return (
            <div className="space-y-3 mt-3 pt-3 border-t border-dashed border-zinc-200 dark:border-zinc-700">
                {/* Header Badges (Color, Flores, Expo) */}
                <div className="flex flex-wrap gap-2 mb-2">
                    {meta.color && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${colorStyle || 'bg-zinc-100'}`}>
                            {meta.color}
                        </span>
                    )}

                    {meta.flores && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-pink-50 text-pink-700 border-pink-200 flex items-center gap-1">
                            <Flower2 size={10} /> Flores
                        </span>
                    )}

                    {meta.exposicion && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-yellow-50 text-yellow-700 border-yellow-200 flex items-center gap-1">
                            <Sun size={10} /> {meta.exposicion === 'Solemne' ? 'Exp. Solemne' : 'Exp. Simple'}
                        </span>
                    )}
                </div>

                {/* Alerts [Bracketed Text & Consagrar Viril] */}
                {meta.alerts && meta.alerts.length > 0 && (
                    <div className="flex flex-col gap-2">
                        {meta.alerts.map((alert, i) => (
                            <div key={i} className="flex gap-2 text-xs bg-orange-50 dark:bg-orange-900/20 text-orange-800 dark:text-orange-200 p-2 rounded border border-orange-100 dark:border-orange-900/30">
                                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                                <span className="font-medium"><FormattedText text={alert} /></span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Misal */}
                {meta.misal && (
                    <div className="flex gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                        <BookOpen size={14} className="shrink-0 mt-0.5 text-zinc-400" />
                        <span className="leading-relaxed"><FormattedText text={meta.misal} /></span>
                    </div>
                )}

                {/* Leccionario */}
                {meta.leccionario && (
                    <div className="flex gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                        <Scroll size={14} className="shrink-0 mt-0.5 text-zinc-400" />
                        <span className="leading-relaxed"><FormattedText text={meta.leccionario} /></span>
                    </div>
                )}

                {/* Prefacio & Plegaria */}
                {(meta.prefacio || meta.plegaria) && (
                    <div className="grid grid-cols-2 gap-2">
                        {meta.prefacio && (
                            <div className="bg-amber-50 dark:bg-amber-900/10 p-2 rounded border border-amber-100 dark:border-amber-900/30">
                                <span className="block text-[9px] font-bold text-amber-700 dark:text-amber-500 uppercase mb-1">Prefacio</span>
                                <span className="text-xs text-amber-900 dark:text-amber-200 leading-tight block">
                                    <FormattedText text={meta.prefacio} />
                                </span>
                            </div>
                        )}
                        {meta.plegaria && (
                            <div className="bg-amber-50 dark:bg-amber-900/10 p-2 rounded border border-amber-100 dark:border-amber-900/30">
                                <span className="block text-[9px] font-bold text-amber-700 dark:text-amber-500 uppercase mb-1">Plegaria</span>
                                <span className="text-xs text-amber-900 dark:text-amber-200 leading-tight block">
                                    <FormattedText text={meta.plegaria} />
                                </span>
                            </div>
                        )}
                    </div>
                )}

                {/* External Links */}
                {meta.externalLinks && meta.externalLinks.length > 0 && (
                    <div className="flex flex-col gap-1 pt-1">
                        {meta.externalLinks.map((link, i) => (
                            <a
                                key={i}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs transition-colors group"
                            >
                                <ExternalLink size={12} className="shrink-0" />
                                <span className="truncate underline font-medium">{link.text}</span>
                            </a>
                        ))}
                    </div>
                )}

                {/* Otros */}
                {meta.otros && meta.otros.length > 0 && (
                    <div className="text-xs text-zinc-500 space-y-1 pl-5 border-l-2 border-zinc-100 dark:border-zinc-800">
                        {meta.otros.map((o, i) => (
                            <p key={i}>
                                <FormattedText text={o} />
                            </p>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-zinc-900 rounded-xl overflow-hidden text-sm">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white capitalize">
                    {format(currentMonth, 'MMMM yyyy', { locale: es })}
                </h3>
                <div className="flex items-center gap-2">
                    <button onClick={prevMonth} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full">
                        <ChevronLeft size={20} className="text-zinc-600 dark:text-zinc-400" />
                    </button>
                    <button onClick={() => setCurrentMonth(new Date())} className="px-3 py-1 text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-md">
                        Hoy
                    </button>
                    <button onClick={nextMonth} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full">
                        <ChevronRight size={20} className="text-zinc-600 dark:text-zinc-400" />
                    </button>
                </div>
            </div>

            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* Calendar Matrix */}
                <div className={`flex-1 flex-col overflow-y-auto ${selectedDate ? 'hidden md:flex' : 'flex'}`}>
                    {/* Weekday Headers */}
                    <div className="grid grid-cols-7 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                        {weekDays.map(day => (
                            <div key={day} className="py-2 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                {day.substring(0, 3)}
                            </div>
                        ))}
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 auto-rows-fr flex-1">
                        {days.map((day, i) => {
                            const dayEventsList = getEventsForDay(day);
                            const isSelected = selectedDate && isSameDay(day, selectedDate);
                            const isTodayDate = isToday(day);

                            return (
                                <div
                                    key={day.toISOString()}
                                    onClick={() => setSelectedDate(day)}
                                    className={`min-h-[80px] md:min-h-[100px] border-b border-r border-zinc-100 dark:border-zinc-800 p-1 md:p-2 cursor-pointer transition-colors
                                        ${!isSameMonth(day, monthStart) ? 'bg-zinc-50/50 dark:bg-zinc-900/50 text-zinc-400' : 'bg-white dark:bg-zinc-900'}
                                        ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800'}
                                    `}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className={`text-[10px] sm:text-xs w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full ${isTodayDate
                                            ? 'bg-red-500 text-white font-bold'
                                            : 'text-zinc-500 dark:text-zinc-400'}`}>
                                            {format(day, dateFormat)}
                                        </span>
                                        {dayEventsList.length > 0 && (
                                            <span className="text-[9px] sm:text-[10px] font-bold text-blue-600 dark:text-blue-400">
                                                {dayEventsList.length}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-0.5 sm:gap-1">
                                        {dayEventsList.slice(0, 3).map(ev => (
                                            <div key={ev.id}
                                                className="text-[9px] sm:text-[10px] truncate px-1 py-0.5 rounded text-white font-medium shadow-sm"
                                                style={{ backgroundColor: ev.color || '#3b82f6' }}
                                            >
                                                {ev.title}
                                            </div>
                                        ))}
                                        {dayEventsList.length > 3 && (
                                            <div className="text-[9px] sm:text-[10px] text-zinc-400 pl-1">
                                                + {dayEventsList.length - 3}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Selected Day Details Panel */}
                <div className={`w-full md:w-80 border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 overflow-y-auto ${selectedDate ? 'flex flex-col' : 'hidden md:flex md:flex-col md:items-center md:justify-center text-zinc-400'}`}>
                    {selectedDate ? (
                        <div className="space-y-4">
                            {/* Mobile Back Button */}
                            <button
                                onClick={() => setSelectedDate(null)}
                                className="md:hidden flex items-center gap-2 text-zinc-500 mb-2"
                            >
                                <ChevronLeft size={16} />
                                <span className="text-sm font-medium">Volver al calendario</span>
                            </button>

                            <h4 className="font-bold text-lg text-zinc-900 dark:text-white capitalize border-b pb-2 dark:border-zinc-800">
                                {format(selectedDate, 'EEEE d, MMMM', { locale: es })}
                            </h4>

                            {dayEvents.length === 0 ? (
                                <p className="text-zinc-500 text-sm italic py-4 text-center">No hay eventos para este día.</p>
                            ) : (
                                <div className="space-y-3">
                                    {dayEvents.map(ev => (
                                        <div key={ev.id}
                                            className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800 border-l-4 border-zinc-100 dark:border-zinc-700 shadow-sm"
                                            style={{ borderLeftColor: ev.color || '#3b82f6' }}
                                        >
                                            <div className="font-semibold text-zinc-900 dark:text-white mb-1">{ev.title}</div>
                                            <div className="text-xs text-zinc-500 dark:text-zinc-400 space-y-1 mb-2">
                                                <div className="flex items-center gap-1.5">
                                                    <Clock size={12} />
                                                    {ev.allDay ? 'Todo el día' : format(ev.start, 'HH:mm')}
                                                </div>
                                                {ev.location && (
                                                    <div className="flex items-center gap-1.5 line-clamp-1">
                                                        <MapPin size={12} />
                                                        {ev.location}
                                                    </div>
                                                )}
                                            </div>

                                            {/* RENDER EPACTA SPECIFIC DETAILS OR FALLBACK */}
                                            {ev.metadata && Object.keys(ev.metadata).length > 0 ? (
                                                renderEpactaDetails(ev.metadata)
                                            ) : (
                                                ev.description && (
                                                    <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-400 border-t border-zinc-200 dark:border-zinc-700 pt-2 line-clamp-4">
                                                        {ev.description}
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <>
                            <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
                                <Clock size={24} className="opacity-50" />
                            </div>
                            <p className="text-center">Selecciona un día para ver los eventos</p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
