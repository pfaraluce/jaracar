import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isBefore, addMinutes, setHours, setMinutes, addDays, parseISO, areIntervalsOverlapping } from 'date-fns';
import { es } from 'date-fns/locale';
import { Car, Reservation, User } from '../../types';
import { reservationService } from '../../services/reservations';
import { DateTimeSelector } from '../DateTimeSelector';

interface BookingFormProps {
    car: Car;
    currentUser: User;
    reservations: Reservation[];
    onUpdate: () => void;
    onClose: () => void;
    editingReservation: Reservation | null;
    onCancelEdit: () => void;
    onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const BookingForm: React.FC<BookingFormProps> = ({
    car,
    currentUser,
    reservations,
    onUpdate,
    onClose,
    editingReservation,
    onCancelEdit,
    onShowToast
}) => {
    const [bookingMode, setBookingMode] = useState<'NOW' | 'LATER'>('NOW');
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(addMinutes(new Date(), 120));
    const [loading, setLoading] = useState(false);

    const [showCustomTime, setShowCustomTime] = useState(false);
    const [selectedDuration, setSelectedDuration] = useState<'LUNCH' | 'DINNER' | 'CUSTOM' | null>(null);

    // Guest Reservation State
    const [isForGuest, setIsForGuest] = useState(false);
    const [guestName, setGuestName] = useState('');
    const [guestSuggestions, setGuestSuggestions] = useState<string[]>([]);
    const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
    const guestInputRef = useRef<HTMLInputElement>(null);

    // Load guest name suggestions on mount
    useEffect(() => {
        const loadSuggestions = async () => {
            try {
                const suggestions = await reservationService.getGuestNameSuggestions();
                setGuestSuggestions(suggestions);
            } catch (error) {
                console.error('Failed to load guest suggestions:', error);
            }
        };
        loadSuggestions();
    }, []);

    // Sync with editingReservation
    useEffect(() => {
        if (editingReservation) {
            setBookingMode('LATER');
            setStartDate(parseISO(editingReservation.startTime));
            setEndDate(parseISO(editingReservation.endTime));
            // Scroll to form
            const formElement = document.getElementById('booking-form');
            if (formElement) formElement.scrollIntoView({ behavior: 'smooth' });
        } else {
            // Reset defaults if not editing (optional, or keep last state?)
            // Let's reset to defaults when clearing edit to avoid confusion
            // But only if we were editing before? 
            // Actually, let's just leave it, or reset if needed.
        }
    }, [editingReservation]);

    // Filter suggestions based on input
    useEffect(() => {
        if (guestName.trim().length > 0) {
            const filtered = guestSuggestions.filter(name =>
                name.toLowerCase().includes(guestName.toLowerCase())
            );
            setFilteredSuggestions(filtered);
            setShowSuggestions(filtered.length > 0);
        } else {
            setFilteredSuggestions([]);
            setShowSuggestions(false);
        }
        setSelectedSuggestionIndex(-1);
    }, [guestName, guestSuggestions]);

    const handleQuickDuration = (type: 'LUNCH' | 'DINNER' | 'CUSTOM') => {
        setSelectedDuration(type);
        if (type === 'CUSTOM') {
            setShowCustomTime(true);
            return;
        }

        const start = new Date(startDate);
        let end = new Date(start);

        if (type === 'LUNCH') {
            end = setMinutes(setHours(start, 14), 30); // 14:30
            if (isBefore(end, start)) {
                end = addDays(end, 1);
                onShowToast('Programado para mañana (la hora ya pasó hoy)', 'info');
            }
        } else if (type === 'DINNER') {
            end = setMinutes(setHours(start, 21), 0); // 21:00
            if (isBefore(end, start)) {
                end = addDays(end, 1);
                onShowToast('Programado para mañana (la hora ya pasó hoy)', 'info');
            }
        }
        setEndDate(end);
        setShowCustomTime(false);
    };

    const handleBook = async () => {
        setLoading(true);
        try {
            const start = new Date(startDate);
            const end = new Date(endDate);

            if (isBefore(end, start) || end.getTime() === start.getTime()) {
                onShowToast('La hora de fin debe ser posterior a la de inicio', 'error');
                setLoading(false);
                return;
            }

            // Check for conflicts using robust interval check
            const hasConflict = reservations.some(res => {
                if (res.status === 'CANCELLED') return false; // Ignore cancelled
                if (editingReservation && res.id === editingReservation.id) return false; // Ignore self when editing

                // Parse dates safely
                const resStart = parseISO(res.startTime);
                const resEnd = parseISO(res.endTime);

                return areIntervalsOverlapping(
                    { start, end },
                    { start: resStart, end: resEnd }
                );
            });

            if (hasConflict) {
                onShowToast('Ya existe una reserva en ese horario', 'error');
                setLoading(false);
                return;
            }

            if (editingReservation) {
                await reservationService.updateReservation(editingReservation.id, {
                    startTime: start.toISOString(),
                    endTime: end.toISOString()
                });
                onShowToast('Reserva actualizada', 'success');
                onCancelEdit(); // Clear edit mode
            } else {
                await reservationService.createReservation({
                    carId: car.id,
                    userId: currentUser.id,
                    startTime: start.toISOString(),
                    endTime: end.toISOString(),
                    notes: '',
                    isForGuest,
                    guestName: isForGuest ? guestName : undefined
                });
                onShowToast('Reserva creada con éxito', 'success');
            }

            onUpdate();
            if (!editingReservation) onClose();
            else onClose(); // Also close on edit? Yes, usually.
        } catch (e) {
            onShowToast('Error al guardar reserva: ' + (e as Error).message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <section id="booking-form">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
                    {editingReservation ? 'Editar Reserva' : 'Reservar Vehículo'}
                </h3>
                {editingReservation && (
                    <button
                        onClick={() => {
                            onCancelEdit();
                            setBookingMode('NOW');
                            setStartDate(new Date());
                            setEndDate(addMinutes(new Date(), 120));
                        }}
                        className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    >
                        Cancelar edición
                    </button>
                )}
            </div>
            <div className="space-y-4">
                {/* Booking Mode Selector */}
                <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                    <button
                        onClick={() => setBookingMode('NOW')}
                        disabled={!!editingReservation}
                        className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${bookingMode === 'NOW'
                            ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                            : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 disabled:opacity-50'
                            }`}
                    >
                        Ahora
                    </button>
                    <button
                        onClick={() => setBookingMode('LATER')}
                        disabled={!!editingReservation}
                        className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${bookingMode === 'LATER'
                            ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                            : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 disabled:opacity-50'
                            }`}
                    >
                        Programar
                    </button>
                </div>

                {bookingMode === 'NOW' ? (
                    <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-2">
                            <button
                                onClick={() => handleQuickDuration('LUNCH')}
                                className={`p-2 rounded-lg border text-left transition-all ${selectedDuration === 'LUNCH'
                                    ? 'border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-black'
                                    : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-600 text-zinc-900 dark:text-white'
                                    }`}
                            >
                                <span className="block text-[10px] opacity-70 mb-0.5">Hasta la</span>
                                <span className="block text-xs font-medium">Comida</span>
                            </button>
                            <button
                                onClick={() => handleQuickDuration('DINNER')}
                                className={`p-2 rounded-lg border text-left transition-all ${selectedDuration === 'DINNER'
                                    ? 'border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-black'
                                    : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-600 text-zinc-900 dark:text-white'
                                    }`}
                            >
                                <span className="block text-[10px] opacity-70 mb-0.5">Hasta la</span>
                                <span className="block text-xs font-medium">Cena</span>
                            </button>
                            <button
                                onClick={() => handleQuickDuration('CUSTOM')}
                                className={`p-2 rounded-lg border text-left transition-all ${selectedDuration === 'CUSTOM'
                                    ? 'border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-black'
                                    : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-600 text-zinc-900 dark:text-white'
                                    }`}
                            >
                                <span className="block text-[10px] opacity-70 mb-0.5">Elegir</span>
                                <span className="block text-xs font-medium">Otro</span>
                            </button>
                        </div>

                        <AnimatePresence>
                            {showCustomTime && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="pt-2">
                                        <label className="block text-[10px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">Hora de fin</label>
                                        <input
                                            type="time"
                                            className="w-full text-xs py-1.5 px-2 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-lg focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 outline-none [color-scheme:light] dark:[color-scheme:dark]"
                                            value={format(endDate, 'HH:mm')}
                                            onChange={(e) => {
                                                const [hours, minutes] = e.target.value.split(':').map(Number);
                                                setEndDate(setMinutes(setHours(endDate, hours), minutes));
                                            }}
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <DateTimeSelector
                            label="Inicio"
                            value={startDate}
                            onChange={setStartDate}
                            minDate={new Date()}
                        />
                        <DateTimeSelector
                            label="Fin"
                            value={endDate}
                            onChange={setEndDate}
                            minDate={startDate}
                        />
                    </div>
                )}

                {/* Guest Reservation Toggle */}
                <div className="flex items-center gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    <input
                        type="checkbox"
                        id="isForGuest"
                        checked={isForGuest}
                        onChange={(e) => {
                            setIsForGuest(e.target.checked);
                            if (!e.target.checked) setGuestName('');
                        }}
                        className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-600 text-zinc-900 dark:text-white focus:ring-zinc-900 dark:focus:ring-white bg-white dark:bg-zinc-700"
                    />
                    <label htmlFor="isForGuest" className="text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer select-none">
                        ¿Reserva para otra persona?
                    </label>
                </div>

                {/* Guest Name Input with Autocomplete */}
                <AnimatePresence>
                    {isForGuest && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="pt-2 relative">
                                <label className="block text-[10px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                                    Nombre del conductor invitado
                                </label>
                                <div className="relative">
                                    <input
                                        ref={guestInputRef}
                                        type="text"
                                        value={guestName}
                                        onChange={(e) => setGuestName(e.target.value)}
                                        onFocus={() => {
                                            if (guestName.trim().length > 0) setShowSuggestions(true);
                                        }}
                                        onBlur={() => {
                                            // Delay hiding suggestions to allow clicking on them
                                            setTimeout(() => setShowSuggestions(false), 200);
                                        }}
                                        className="w-full text-xs py-1.5 px-2 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-lg focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 outline-none"
                                        placeholder="Nombre completo del invitado"
                                    />

                                    {/* Autocomplete Suggestions */}
                                    <AnimatePresence>
                                        {showSuggestions && filteredSuggestions.length > 0 && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                className="absolute z-50 w-full mt-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg max-h-40 overflow-y-auto"
                                            >
                                                {filteredSuggestions.map((suggestion, index) => (
                                                    <button
                                                        key={index}
                                                        className={`w-full text-left px-3 py-2 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors ${index === selectedSuggestionIndex ? 'bg-zinc-100 dark:bg-zinc-700' : ''
                                                            }`}
                                                        onClick={() => {
                                                            setGuestName(suggestion);
                                                            setShowSuggestions(false);
                                                        }}
                                                    >
                                                        {suggestion}
                                                    </button>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                <button
                    onClick={handleBook}
                    disabled={loading}
                    className="w-full py-3 bg-zinc-900 dark:bg-white text-white dark:text-black text-sm font-medium rounded-xl hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-zinc-900/10 dark:shadow-white/5"
                >
                    {loading ? (
                        <span className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/30 dark:border-black/30 border-t-white dark:border-t-black rounded-full animate-spin" />
                            {editingReservation ? 'Actualizando...' : 'Procesando...'}
                        </span>
                    ) : (
                        editingReservation ? 'Actualizar Reserva' : 'Confirmar Reserva'
                    )}
                </button>
            </div>
        </section>
    );
};
