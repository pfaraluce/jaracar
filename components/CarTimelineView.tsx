import React, { useState, useRef, useEffect } from 'react';
import { Car, Reservation } from '../types';
import { format, addDays, subDays, isSameDay, startOfDay, endOfDay, isWithinInterval, parseISO, getHours, getMinutes, differenceInMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

interface CarTimelineViewProps {
    cars: Car[];
    reservations: Reservation[];
    onSelectCar: (car: Car) => void;
}

export const CarTimelineView: React.FC<CarTimelineViewProps> = ({
    cars,
    reservations,
    onSelectCar,
}) => {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Scroll to current time on mount (or 8am if early)
    useEffect(() => {
        if (scrollContainerRef.current) {
            const hour = new Date().getHours();
            const scrollHour = Math.max(0, hour - 2); // Start a bit earlier
            const pixelPerHeader = 60; // Approximate width of an hour column
            scrollContainerRef.current.scrollLeft = scrollHour * pixelPerHeader;
        }
    }, []);

    const hours = Array.from({ length: 24 }, (_, i) => i);

    const getReservationStyle = (reservation: Reservation) => {
        const start = parseISO(reservation.startTime);
        const end = parseISO(reservation.endTime);
        const dayStart = startOfDay(selectedDate);
        const dayEnd = endOfDay(selectedDate);

        // Check if reservation overlaps with selected date
        if (!isWithinInterval(start, { start: dayStart, end: dayEnd }) &&
            !isWithinInterval(end, { start: dayStart, end: dayEnd }) &&
            !(start < dayStart && end > dayEnd)) {
            return null;
        }

        // Calculate position and width
        // If start is before today, start at 0
        const effectiveStart = start < dayStart ? dayStart : start;
        // If end is after today, end at 24:00
        const effectiveEnd = end > dayEnd ? dayEnd : end;

        const startMinutes = getHours(effectiveStart) * 60 + getMinutes(effectiveStart);
        const durationMinutes = differenceInMinutes(effectiveEnd, effectiveStart);

        // 1 hour = 64px (min-w-16)
        // 1 minute = 64/60 pixels
        const pixelsPerMinute = 64 / 60;

        return {
            left: `${startMinutes * pixelsPerMinute}px`,
            width: `${Math.max(4, durationMinutes * pixelsPerMinute)}px`, // Min width for visibility
        };
    };

    return (
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-sm flex flex-col h-[600px]">
            {/* Header Controls */}
            <div className="p-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
                <div className="flex items-center gap-4">
                    <h3 className="font-semibold text-zinc-900 flex items-center gap-2">
                        <CalendarIcon size={18} className="text-zinc-500" />
                        Cronograma
                    </h3>
                    <div className="flex items-center bg-white rounded-lg border border-zinc-200 p-1 shadow-sm">
                        <button
                            onClick={() => setSelectedDate(subDays(selectedDate, 1))}
                            className="p-1 hover:bg-zinc-100 rounded text-zinc-600"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <span className="px-3 text-sm font-medium min-w-[140px] text-center">
                            {format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}
                        </span>
                        <button
                            onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                            className="p-1 hover:bg-zinc-100 rounded text-zinc-600"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                    <button
                        onClick={() => setSelectedDate(new Date())}
                        className="text-xs font-medium text-zinc-500 hover:text-zinc-900 underline"
                    >
                        Hoy
                    </button>
                </div>
            </div>

            {/* Timeline Grid */}
            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar (Car Names) */}
                <div className="w-48 shrink-0 border-r border-zinc-200 bg-white z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
                    <div className="h-10 border-b border-zinc-100 bg-zinc-50/50" /> {/* Header spacer */}
                    <div className="overflow-hidden">
                        {cars.map(car => (
                            <div
                                key={car.id}
                                className="h-16 px-4 flex items-center gap-3 border-b border-zinc-100 hover:bg-zinc-50 transition-colors cursor-pointer"
                                onClick={() => onSelectCar(car)}
                            >
                                <img src={car.imageUrl} alt="" className="w-8 h-8 rounded-full object-cover bg-zinc-100" />
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-zinc-900 truncate">{car.name}</p>
                                    <p className="text-[10px] text-zinc-500 truncate">{car.plate}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Scrollable Timeline Area */}
                <div className="flex-1 overflow-x-auto overflow-y-auto" ref={scrollContainerRef}>
                    <div className="min-w-max">
                        {/* Time Header */}
                        <div className="flex h-10 border-b border-zinc-100 bg-zinc-50/50 sticky top-0 z-10">
                            {hours.map(hour => (
                                <div key={hour} className="w-16 shrink-0 border-r border-zinc-100 text-[10px] text-zinc-400 flex items-center justify-center font-medium">
                                    {hour}:00
                                </div>
                            ))}
                        </div>

                        {/* Grid Body */}
                        <div>
                            {cars.map(car => (
                                <div key={car.id} className="h-16 flex border-b border-zinc-100 relative group">
                                    {/* Grid Lines */}
                                    {hours.map(hour => (
                                        <div key={hour} className="w-16 shrink-0 border-r border-zinc-50 h-full" />
                                    ))}

                                    {/* Reservations */}
                                    {reservations
                                        .filter(r => r.carId === car.id && r.status !== 'CANCELLED')
                                        .map(reservation => {
                                            const style = getReservationStyle(reservation);
                                            if (!style) return null;

                                            const isActive = reservation.status === 'ACTIVE';

                                            return (
                                                <div
                                                    key={reservation.id}
                                                    className={`absolute top-2 bottom-2 rounded-md border text-[10px] flex items-center px-2 overflow-hidden whitespace-nowrap shadow-sm cursor-pointer hover:brightness-95 transition-all z-10
                            ${isActive
                                                            ? 'bg-emerald-100 border-emerald-200 text-emerald-800'
                                                            : 'bg-blue-50 border-blue-200 text-blue-700'
                                                        }`}
                                                    style={style}
                                                    title={`${reservation.userName} (${format(parseISO(reservation.startTime), 'HH:mm')} - ${format(parseISO(reservation.endTime), 'HH:mm')})`}
                                                    onClick={() => onSelectCar(car)}
                                                >
                                                    <span className="font-medium truncate">{reservation.userName}</span>
                                                </div>
                                            );
                                        })}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
