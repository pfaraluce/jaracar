import React from 'react';
import { format, addDays, startOfToday, isBefore, isSameDay, addMinutes, setHours, setMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { Button } from './ui/Button';
import clsx from 'clsx';

interface DateTimeSelectorProps {
    label: string;
    value: Date;
    onChange: (date: Date) => void;
    minDate?: Date;
    maxDate?: Date;
    error?: string;
}

export const DateTimeSelector: React.FC<DateTimeSelectorProps> = ({
    label,
    value,
    onChange,
    minDate = new Date(),
    error
}) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [view, setView] = React.useState<'DATE' | 'TIME'>('DATE');
    const [currentMonth, setCurrentMonth] = React.useState(startOfToday());

    // Calendar Logic
    const daysInMonth = () => {
        const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
        const days = [];
        for (let d = start; d <= end; d.setDate(d.getDate() + 1)) {
            days.push(new Date(d));
        }
        return days;
    };

    const handleDateSelect = (date: Date) => {
        const newDate = new Date(value);
        newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
        onChange(newDate);
        setView('TIME');
    };

    const handleTimeSelect = (hours: number, minutes: number) => {
        const newDate = new Date(value);
        newDate.setHours(hours);
        newDate.setMinutes(minutes);
        onChange(newDate);
        setIsOpen(false);
        setView('DATE'); // Reset for next open
    };

    const timeSlots = () => {
        const slots = [];
        for (let h = 7; h < 22; h++) {
            slots.push({ h, m: 0 });
            slots.push({ h, m: 30 });
        }
        return slots;
    };

    return (
        <div className="relative">
            <label className="block text-xs font-medium text-zinc-500 mb-1">{label}</label>

            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={clsx(
                    "w-full flex items-center justify-between p-2.5 bg-white border rounded-lg text-sm transition-all",
                    error ? "border-rose-300 ring-1 ring-rose-100" : "border-zinc-200 hover:border-zinc-300 focus:ring-2 focus:ring-zinc-900/10",
                    isOpen && "border-zinc-900 ring-1 ring-zinc-900/10"
                )}
            >
                <span className="flex items-center gap-2 text-zinc-900">
                    <CalendarIcon size={16} className="text-zinc-400" />
                    {format(value, "d 'de' MMMM, HH:mm", { locale: es })}
                </span>
                <span className="text-xs text-zinc-400">Cambiar</span>
            </button>

            {error && <p className="text-[10px] text-rose-500 mt-1">{error}</p>}

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-zinc-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                        {/* Header */}
                        <div className="flex items-center justify-between p-3 border-b border-zinc-100 bg-zinc-50/50">
                            <span className="text-xs font-semibold text-zinc-900">
                                {view === 'DATE' ? 'Selecciona fecha' : 'Selecciona hora'}
                            </span>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => setView('DATE')}
                                    className={clsx("p-1 rounded hover:bg-zinc-200 transition-colors", view === 'DATE' && "bg-white shadow-sm text-zinc-900")}
                                >
                                    <CalendarIcon size={14} />
                                </button>
                                <button
                                    onClick={() => setView('TIME')}
                                    className={clsx("p-1 rounded hover:bg-zinc-200 transition-colors", view === 'TIME' && "bg-white shadow-sm text-zinc-900")}
                                >
                                    <Clock size={14} />
                                </button>
                            </div>
                        </div>

                        {view === 'DATE' && (
                            <div className="p-3">
                                <div className="flex items-center justify-between mb-3">
                                    <button onClick={() => setCurrentMonth(d => addDays(d, -30))} className="p-1 hover:bg-zinc-100 rounded-full"><ChevronLeft size={16} /></button>
                                    <span className="text-sm font-medium capitalize">{format(currentMonth, 'MMMM yyyy', { locale: es })}</span>
                                    <button onClick={() => setCurrentMonth(d => addDays(d, 30))} className="p-1 hover:bg-zinc-100 rounded-full"><ChevronRight size={16} /></button>
                                </div>
                                <div className="grid grid-cols-7 gap-1 text-center mb-2">
                                    {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
                                        <span key={d} className="text-[10px] font-medium text-zinc-400">{d}</span>
                                    ))}
                                </div>
                                <div className="grid grid-cols-7 gap-1">
                                    {/* Placeholder for empty start days - simplified for now */}
                                    {Array.from({ length: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay() - 1 }).map((_, i) => (
                                        <div key={`empty-${i}`} />
                                    ))}
                                    {daysInMonth().map(date => {
                                        const isSelected = isSameDay(date, value);
                                        const isDisabled = isBefore(date, startOfToday());
                                        return (
                                            <button
                                                key={date.toISOString()}
                                                disabled={isDisabled}
                                                onClick={() => handleDateSelect(date)}
                                                className={clsx(
                                                    "h-8 w-8 rounded-full text-xs flex items-center justify-center transition-all",
                                                    isSelected ? "bg-zinc-900 text-white font-medium" : "hover:bg-zinc-100 text-zinc-700",
                                                    isDisabled && "opacity-30 cursor-not-allowed hover:bg-transparent"
                                                )}
                                            >
                                                {date.getDate()}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {view === 'TIME' && (
                            <div className="p-3 max-h-64 overflow-y-auto">
                                <div className="grid grid-cols-3 gap-2">
                                    {timeSlots().map(({ h, m }) => {
                                        const timeDate = setMinutes(setHours(value, h), m);
                                        const isSelected = value.getHours() === h && value.getMinutes() === m;
                                        // Disable past times if today
                                        const isDisabled = isSameDay(value, new Date()) && isBefore(timeDate, new Date());

                                        return (
                                            <button
                                                key={`${h}:${m}`}
                                                disabled={isDisabled}
                                                onClick={() => handleTimeSelect(h, m)}
                                                className={clsx(
                                                    "py-2 px-1 rounded-md text-xs border transition-all",
                                                    isSelected ? "bg-zinc-900 text-white border-zinc-900" : "border-zinc-200 hover:border-zinc-300 text-zinc-700",
                                                    isDisabled && "opacity-30 bg-zinc-50 cursor-not-allowed"
                                                )}
                                            >
                                                {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};
