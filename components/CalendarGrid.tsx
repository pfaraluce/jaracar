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
    isToday,
    addDays,
    subDays
} from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, MapPin, Clock } from 'lucide-react';
import { CalendarEvent } from '../services/icalParser';
import { EpactaEvent } from './EpactaEvent';

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

    const handlePrev = () => {
        // Mobile behavior: if date selected, navigate days
        // Desktop behavior: always navigate months
        const isMobile = window.matchMedia('(max-width: 768px)').matches;

        if (selectedDate && isMobile) {
            const newDate = subDays(selectedDate, 1);
            setSelectedDate(newDate);
            if (!isSameMonth(newDate, currentMonth)) {
                setCurrentMonth(newDate);
            }
        } else {
            setCurrentMonth(subMonths(currentMonth, 1));
        }
    };

    const handleNext = () => {
        const isMobile = window.matchMedia('(max-width: 768px)').matches;

        if (selectedDate && isMobile) {
            const newDate = addDays(selectedDate, 1);
            setSelectedDate(newDate);
            if (!isSameMonth(newDate, currentMonth)) {
                setCurrentMonth(newDate);
            }
        } else {
            setCurrentMonth(addMonths(currentMonth, 1));
        }
    };

    const getEventsForDay = (day: Date) => {
        return events.filter(e => isSameDay(e.start, day));
    };

    const dayEvents = selectedDate ? getEventsForDay(selectedDate) : [];

    return (
        <div className="flex flex-col h-full bg-white dark:bg-zinc-900 rounded-xl overflow-hidden text-sm">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white capitalize">
                    {format(currentMonth, 'MMMM yyyy', { locale: es })}
                </h3>
                <div className="flex items-center gap-2">
                    <button onClick={handlePrev} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full">
                        <ChevronLeft size={20} className="text-zinc-600 dark:text-zinc-400" />
                    </button>
                    <button onClick={() => { setCurrentMonth(new Date()); setSelectedDate(null); }} className="px-3 py-1 text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-md">
                        Hoy
                    </button>
                    <button onClick={handleNext} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full">
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

                                            {/* RENDER EPACTA COMPONENT */}
                                            <EpactaEvent event={ev} compact={true} />
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
