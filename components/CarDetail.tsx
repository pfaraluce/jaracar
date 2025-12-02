import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Car, CarStatus, Reservation, User, ActivityLog } from '../types';
import { X, Calendar, Clock, MapPin, AlertTriangle, Play, CircleDot, History, Trash2, MessageSquare, Pencil, Save, CheckCircle, Upload, Image as ImageIcon, Link as LinkIcon, Filter, Search, ChevronLeft, ArrowLeft, Wrench, Car as CarIcon } from 'lucide-react';
import { format, isBefore, isAfter, addMinutes, isWithinInterval, addDays, startOfDay, endOfDay, setHours, setMinutes, differenceInHours, differenceInMinutes, parseISO, areIntervalsOverlapping } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from './ui/Button';
import { UserAvatar } from './UserAvatar';
import { reservationService } from '../services/reservations';
import { carService } from '../services/cars';
import { DateTimeSelector } from './DateTimeSelector';

import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

interface CarDetailProps {
  car: Car;
  reservations: Reservation[];
  activity: ActivityLog[];
  currentUser: User;
  onClose: () => void;
  onUpdate: () => void;
}

export const CarDetail: React.FC<CarDetailProps> = ({ car, reservations, activity = [], currentUser, onClose, onUpdate }) => {
  useBodyScrollLock(true);
  const [bookingMode, setBookingMode] = useState<'NOW' | 'LATER'>('NOW');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(addMinutes(new Date(), 120));
  const [loading, setLoading] = useState(false);

  const [showCustomTime, setShowCustomTime] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<'LUNCH' | 'DINNER' | 'CUSTOM' | null>(null);

  // View State
  const [currentView, setCurrentView] = useState<'DETAILS' | 'EDIT' | 'ACTIVITY'>('DETAILS');

  // Edit Form State
  const [editFormData, setEditFormData] = useState({
    name: car.name,
    inWorkshop: car.inWorkshop,
    nextServiceDate: car.nextServiceDate || '',
    imageUrl: car.imageUrl
  });

  // Confirmation State
  const [confirmation, setConfirmation] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => Promise<void>;
    confirmText?: string;
    isDangerous?: boolean;
  } | null>(null);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Activity Filter State
  const [activityFilter, setActivityFilter] = useState({
    startDate: '',
    endDate: ''
  });

  // Check if next service is within 1 week
  const isServiceDueSoon = useMemo(() => {
    if (!car.nextServiceDate) return false;
    const serviceDate = new Date(car.nextServiceDate);
    const oneWeekFromNow = addDays(new Date(), 7);
    return isBefore(serviceDate, oneWeekFromNow) && isAfter(serviceDate, new Date());
  }, [car.nextServiceDate]);

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
        showToast('Programado para mañana (la hora ya pasó hoy)', 'info');
      }
    } else if (type === 'DINNER') {
      end = setMinutes(setHours(start, 21), 0); // 21:00
      if (isBefore(end, start)) {
        end = addDays(end, 1);
        showToast('Programado para mañana (la hora ya pasó hoy)', 'info');
      }
    }
    setEndDate(end);
    setShowCustomTime(false);
  };

  const [editingReservationId, setEditingReservationId] = useState<string | null>(null);

  const handleCancelReservation = async (reservationId: string) => {
    setConfirmation({
      isOpen: true,
      title: 'Cancelar reserva',
      message: '¿Estás seguro de que quieres cancelar esta reserva?',
      confirmText: 'Sí, cancelar',
      isDangerous: true,
      onConfirm: async () => {
        try {
          await reservationService.cancelReservation(reservationId, currentUser.id);
          showToast('Reserva cancelada', 'success');
          onUpdate();
        } catch (e) {
          showToast('Error al cancelar: ' + (e as Error).message, 'error');
        }
      }
    });
  };

  const handleEditReservation = (res: Reservation) => {
    setStartDate(parseISO(res.startTime));
    setEndDate(parseISO(res.endTime));
    setEditingReservationId(res.id);
    setBookingMode('LATER');
    // Scroll to top to see the form
    const formElement = document.getElementById('booking-form');
    if (formElement) formElement.scrollIntoView({ behavior: 'smooth' });
  };

  const handleBook = async () => {
    setLoading(true);
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isBefore(end, start) || end.getTime() === start.getTime()) {
        showToast('La hora de fin debe ser posterior a la de inicio', 'error');
        setLoading(false);
        return;
      }

      // Check for conflicts using robust interval check
      const hasConflict = reservations.some(res => {
        if (res.status === 'CANCELLED') return false; // Ignore cancelled
        if (editingReservationId && res.id === editingReservationId) return false; // Ignore self when editing

        // Parse dates safely
        const resStart = parseISO(res.startTime);
        const resEnd = parseISO(res.endTime);

        return areIntervalsOverlapping(
          { start, end },
          { start: resStart, end: resEnd }
        );
      });

      if (hasConflict) {
        showToast('Ya existe una reserva en ese horario', 'error');
        setLoading(false);
        return;
      }

      if (editingReservationId) {
        await reservationService.updateReservation(editingReservationId, {
          startTime: start.toISOString(),
          endTime: end.toISOString()
        });
        showToast('Reserva actualizada', 'success');
        setEditingReservationId(null);
      } else {
        await reservationService.createReservation({
          carId: car.id,
          userId: currentUser.id,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          notes: ''
        });
        showToast('Reserva creada con éxito', 'success');
      }

      onUpdate();
      if (!editingReservationId) onClose(); // Only close on create, maybe keep open on edit? User preference. Let's close.
      else onClose();

    } catch (e) {
      showToast('Error al guardar reserva: ' + (e as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCar = async () => {
    setConfirmation({
      isOpen: true,
      title: 'Eliminar vehículo',
      message: '¿Estás seguro de que quieres eliminar este vehículo? Esta acción no se puede deshacer y se perderá todo el historial.',
      confirmText: 'Sí, eliminar',
      isDangerous: true,
      onConfirm: async () => {
        try {
          setLoading(true);
          await carService.deleteCar(car.id);
          showToast('Vehículo eliminado', 'success');
          onUpdate(); // Refresh list
          onClose(); // Close modal
        } catch (error) {
          console.error('Error deleting car:', error);
          showToast('Error al eliminar el coche', 'error');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleSaveEdit = async () => {
    setLoading(true);
    try {
      await carService.updateCar(car.id, {
        name: editFormData.name,
        inWorkshop: editFormData.inWorkshop,
        nextServiceDate: editFormData.nextServiceDate || undefined,
        imageUrl: editFormData.imageUrl
      });

      showToast('Cambios guardados correctamente', 'success');

      setCurrentView('DETAILS');
      onUpdate();
    } catch (e) {
      showToast('Error al guardar cambios: ' + (e as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const url = await carService.uploadImage(file);
      setEditFormData(prev => ({ ...prev, imageUrl: url }));
    } catch (error) {
      console.error(error);
      alert('Error al subir la imagen: ' + (error as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      setEditFormData(prev => ({ ...prev, imageUrl: urlInput.trim() }));
      setUrlInput('');
      setShowUrlInput(false);
    }
  };

  const handleFinishReservation = async (reservationId: string) => {
    setConfirmation({
      isOpen: true,
      title: 'Finalizar reserva',
      message: '¿Finalizar reserva ahora? Esto actualizará la hora de fin al momento actual.',
      confirmText: 'Sí, finalizar',
      onConfirm: async () => {
        try {
          await reservationService.finishReservation(reservationId);
          showToast('Reserva finalizada', 'success');
          onUpdate();
        } catch (e) {
          showToast('Error al finalizar: ' + (e as Error).message, 'error');
        }
      }
    });
  };

  const now = new Date();
  const currentReservation = useMemo(() => {
    return reservations.find(r =>
      r.status === 'ACTIVE' &&
      isBefore(now, parseISO(r.endTime)) &&
      isWithinInterval(now, { start: parseISO(r.startTime), end: parseISO(r.endTime) })
    );
  }, [reservations]);

  const nextReservation = useMemo(() => {
    return reservations
      .filter(res => isAfter(parseISO(res.startTime), now))
      .sort((a, b) => parseISO(a.startTime).getTime() - parseISO(b.startTime).getTime())[0];
  }, [reservations]);

  const soonReservation = useMemo(() => {
    if (!nextReservation) return null;
    const minutesUntil = differenceInMinutes(parseISO(nextReservation.startTime), now);
    return minutesUntil <= 60 ? nextReservation : null;
  }, [nextReservation]);

  const activeReservations = useMemo(() => {
    // Ensure we are comparing correctly. Using new Date() directly might have ms differences.
    // We want reservations where endTime is strictly in the future.
    const nowTime = new Date().getTime();
    return reservations
      .filter(res => {
        const endTime = parseISO(res.endTime).getTime();
        return endTime > nowTime && res.status !== 'CANCELLED';
      })
      .sort((a, b) => parseISO(a.startTime).getTime() - parseISO(b.startTime).getTime());
  }, [reservations]);

  const pastReservations = useMemo(() => {
    const nowTime = new Date().getTime();
    return reservations
      .filter(res => {
        const endTime = parseISO(res.endTime).getTime();
        return endTime < nowTime || res.status === 'CANCELLED';
      })
      .sort((a, b) => parseISO(b.startTime).getTime() - parseISO(a.startTime).getTime());
  }, [reservations]);

  // Filter reservations for Activity View
  const historyReservations = useMemo(() => {
    let filtered = [...reservations];

    // Filter by date range if set
    if (activityFilter.startDate) {
      filtered = filtered.filter(res => isAfter(parseISO(res.startTime), startOfDay(parseISO(activityFilter.startDate))));
    }
    if (activityFilter.endDate) {
      filtered = filtered.filter(res => isBefore(parseISO(res.startTime), endOfDay(parseISO(activityFilter.endDate))));
    }

    // Sort by date desc
    return filtered.sort((a, b) => parseISO(b.startTime).getTime() - parseISO(a.startTime).getTime());
  }, [reservations, activityFilter]);

  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState('');

  const handleEditNote = (reservation: Reservation) => {
    setEditingNoteId(reservation.id);
    setNoteContent(reservation.notes || '');
  };

  const handleSaveNote = async (reservationId: string) => {
    try {
      await reservationService.updateReservationNote(reservationId, noteContent);
      setEditingNoteId(null);
      showToast('Nota actualizada', 'success');
      onUpdate();
    } catch (e) {
      showToast('Error al guardar nota', 'error');
    }
  };

  const StatusIndicator = () => {
    if (car.inWorkshop) return (
      <span className="text-xs font-medium text-rose-700 dark:text-rose-400 flex items-center gap-1 bg-rose-100 dark:bg-rose-900/30 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">
        <Wrench size={12} /> En Taller
      </span>
    );
    if (car.status === CarStatus.WORKSHOP) return (
      <span className="text-xs font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1 bg-rose-50 dark:bg-rose-900/20 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">
        <Wrench size={12} /> Taller
      </span>
    );
    if (car.status === CarStatus.MAINTENANCE) return (
      <span className="text-xs font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
        <AlertTriangle size={12} /> Revisión
      </span>
    );
    if (currentReservation) return (
      <span className="text-xs font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
        <CarIcon size={12} /> Reservado
      </span>
    );
    return (
      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
        <CheckCircle size={12} /> Disponible
      </span>
    );
  };

  return (
    <>
      <motion.div
        layoutId={`card-${car.id}`}
        className="fixed inset-0 z-50 flex items-center justify-center sm:p-6"
      >
        <motion.div
          className="absolute inset-0 bg-black/20 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />

        <motion.div
          className="relative w-full h-full sm:h-auto max-w-2xl bg-white dark:bg-zinc-900 sm:rounded-2xl shadow-xl overflow-hidden flex flex-col sm:max-h-[90vh] border border-zinc-200 dark:border-zinc-800"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Section */}
          <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 z-10 sticky top-0">
            <div className="flex justify-between items-start">
              <div className="flex gap-4 items-center">
                {currentView !== 'DETAILS' && (
                  <button
                    onClick={() => setCurrentView('DETAILS')}
                    className="p-2 -ml-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                  >
                    <ArrowLeft size={20} />
                  </button>
                )}

                {currentView === 'DETAILS' && (
                  <div
                    className={`relative group ${currentUser.role === 'ADMIN' ? 'cursor-pointer' : ''}`}
                    onClick={() => {
                      if (currentUser.role === 'ADMIN') setCurrentView('EDIT');
                    }}
                  >
                    <motion.img
                      layoutId={`image-${car.id}`}
                      src={car.imageUrl}
                      alt={car.name}
                      className="w-24 h-16 object-cover rounded-lg"
                    />
                    {currentUser.role === 'ADMIN' && (
                      <div className="absolute inset-0 bg-black/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Pencil className="text-white" size={16} />
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <motion.h2 layoutId={`title-${car.id}`} className="text-xl font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                    {currentView === 'EDIT' ? 'Editar Coche' : currentView === 'ACTIVITY' ? 'Historial de Actividad' : car.name}
                  </motion.h2>

                  {currentView === 'DETAILS' && (
                    <>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-zinc-500 dark:text-zinc-400 font-mono">{car.plate}</span>
                        <StatusIndicator />
                      </div>
                      {/* Service Warning */}
                      {isServiceDueSoon && !car.inWorkshop && (
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
                          <AlertTriangle size={12} />
                          <span>Revisión próxima: {format(parseISO(car.nextServiceDate!), 'd MMM', { locale: es })}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">

            {/* DETAILS VIEW */}
            {currentView === 'DETAILS' && (
              <>
                {/* Booking Section - Disabled if in workshop */}
                {car.inWorkshop && (
                  <section className="bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg p-6">
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-700 mb-3">
                        <Wrench size={24} className="text-zinc-500 dark:text-zinc-400" />
                      </div>
                      <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-1">Coche en el taller</h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto mb-4">
                        Este coche no se puede reservar hasta que salga del taller.
                      </p>
                      {currentUser.role === 'ADMIN' && (
                        <p className="text-xs text-zinc-400 dark:text-zinc-500">
                          Edita el coche y desmarca la casilla "En taller" para volver a habilitarlo.
                        </p>
                      )}
                    </div>
                  </section>
                )}

                {/* Booking Form - Visible if NOT in workshop */}
                {!car.inWorkshop && (
                  <section id="booking-form">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
                        {editingReservationId ? 'Editar Reserva' : 'Reservar Vehículo'}
                      </h3>
                      {editingReservationId && (
                        <button
                          onClick={() => {
                            setEditingReservationId(null);
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
                          disabled={!!editingReservationId}
                          className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${bookingMode === 'NOW'
                            ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                            : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 disabled:opacity-50'
                            }`}
                        >
                          Ahora
                        </button>
                        <button
                          onClick={() => setBookingMode('LATER')}
                          disabled={!!editingReservationId}
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

                      <button
                        onClick={handleBook}
                        disabled={loading}
                        className="w-full py-3 bg-zinc-900 dark:bg-white text-white dark:text-black text-sm font-medium rounded-xl hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-zinc-900/10 dark:shadow-white/5"
                      >
                        {loading ? (
                          <span className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/30 dark:border-black/30 border-t-white dark:border-t-black rounded-full animate-spin" />
                            {editingReservationId ? 'Actualizando...' : 'Procesando...'}
                          </span>
                        ) : (
                          editingReservationId ? 'Actualizar Reserva' : 'Confirmar Reserva'
                        )}
                      </button>
                    </div>
                  </section>
                )}

                {/* Current & Upcoming Reservations */}
                {activeReservations.length > 0 && (
                  <section>
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-4">Reservas Activas</h3>
                    <div className="space-y-2">
                      {activeReservations.slice(0, 3).map(res => (
                        <div key={res.id} className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-100 dark:border-zinc-800">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <UserAvatar name={res.userName} imageUrl={res.userAvatar} size="sm" className="w-5 h-5 text-[10px]" />
                                <p className="text-xs font-medium text-zinc-900 dark:text-white">{res.userName}</p>
                              </div>
                              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 ml-7">
                                {format(parseISO(res.startTime), 'd MMM, HH:mm', { locale: es })} → {format(parseISO(res.endTime), 'HH:mm', { locale: es })}
                              </p>

                              {/* Editable Note for Active Reservation */}
                              <div className="mt-2">
                                {editingNoteId === res.id ? (
                                  <div className="flex gap-2">
                                    <input
                                      type="text"
                                      value={noteContent}
                                      onChange={(e) => setNoteContent(e.target.value)}
                                      className="text-xs border border-zinc-200 dark:border-zinc-700 rounded px-2 py-1 w-full bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-500"
                                      placeholder="Añadir nota..."
                                      autoFocus
                                    />
                                    <button onClick={() => handleSaveNote(res.id)} className="text-emerald-600 dark:text-emerald-400 p-1 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded"><Save size={14} /></button>
                                    <button onClick={() => setEditingNoteId(null)} className="text-zinc-400 dark:text-zinc-500 p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded"><X size={14} /></button>
                                  </div>
                                ) : (
                                  <div className="group flex items-center gap-2 min-h-[20px]">
                                    <p className="text-[10px] text-zinc-600 dark:text-zinc-400 italic">
                                      {res.notes || 'Añadir nota...'}
                                    </p>
                                    {currentUser.id === res.userId && (
                                      <button
                                        onClick={() => handleEditNote(res)}
                                        className="opacity-0 group-hover:opacity-100 text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-opacity p-1"
                                        title="Editar nota"
                                      >
                                        <Pencil size={10} />
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                            {currentUser.role === 'ADMIN' && res.status === 'ACTIVE' && (
                              <div className="flex items-center gap-2 ml-2">
                                {isAfter(now, parseISO(res.startTime)) ? (
                                  // Ongoing Reservation: Finish or Cancel
                                  <>
                                    <button
                                      onClick={() => handleFinishReservation(res.id)}
                                      className="text-[10px] text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 px-2 py-1 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors flex items-center gap-1"
                                      title="Finalizar reserva ahora"
                                    >
                                      <CheckCircle size={12} /> Finalizar
                                    </button>
                                    <button
                                      onClick={() => handleCancelReservation(res.id)}
                                      className="text-[10px] text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 px-2 py-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors flex items-center gap-1"
                                      title="Cancelar reserva"
                                    >
                                      <X size={12} />
                                    </button>
                                  </>
                                ) : (
                                  // Future Reservation: Edit or Cancel
                                  <>
                                    <button
                                      onClick={() => handleEditReservation(res)}
                                      className="text-[10px] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors flex items-center gap-1"
                                      title="Editar horario"
                                    >
                                      <Pencil size={12} /> Editar
                                    </button>
                                    <button
                                      onClick={() => handleCancelReservation(res.id)}
                                      className="text-[10px] text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 px-2 py-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors flex items-center gap-1"
                                      title="Cancelar reserva"
                                    >
                                      <X size={12} /> Cancelar
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Past Reservations (History) */}
                <section>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                      <History size={16} /> Historial Reciente
                    </h3>
                    <button
                      onClick={() => setCurrentView('ACTIVITY')}
                      className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                    >
                      Ver todo
                    </button>
                  </div>
                  <div className="space-y-0 relative border-l border-zinc-100 dark:border-zinc-800 ml-2">
                    {pastReservations && pastReservations.length > 0 ? (
                      pastReservations.slice(0, 3).map((res) => (
                        <div key={res.id} className="relative pl-6 pb-6 last:pb-0">
                          <div className="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-zinc-900 shadow-sm bg-zinc-300 dark:bg-zinc-600"></div>
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="text-xs font-medium text-zinc-900 dark:text-white">{res.userName}</p>
                              <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                                {format(parseISO(res.startTime), 'd MMM HH:mm', { locale: es })} — {format(parseISO(res.endTime), 'HH:mm', { locale: es })}
                              </p>

                              {/* Editable Note for Past Reservation */}
                              <div className="mt-1">
                                {editingNoteId === res.id ? (
                                  <div className="flex gap-2 mt-1">
                                    <input
                                      type="text"
                                      value={noteContent}
                                      onChange={(e) => setNoteContent(e.target.value)}
                                      className="text-xs border border-zinc-200 dark:border-zinc-700 rounded px-2 py-1 w-full bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-500"
                                      autoFocus
                                    />
                                    <button onClick={() => handleSaveNote(res.id)} className="text-emerald-600 dark:text-emerald-400"><Save size={14} /></button>
                                    <button onClick={() => setEditingNoteId(null)} className="text-zinc-400 dark:text-zinc-500"><X size={14} /></button>
                                  </div>
                                ) : (
                                  <div className="group flex items-center gap-2 min-h-[16px]">
                                    <p className="text-[10px] text-zinc-600 dark:text-zinc-400 italic">
                                      {res.notes || 'Sin notas'}
                                    </p>
                                    {currentUser.id === res.userId && (
                                      <button
                                        onClick={() => handleEditNote(res)}
                                        className="opacity-0 group-hover:opacity-100 text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-opacity p-0.5"
                                      >
                                        <Pencil size={10} />
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-zinc-400 dark:text-zinc-500 pl-6">No hay historial reciente</p>
                    )}
                  </div>
                </section>
              </>
            )}

            {/* EDIT VIEW */}
            {currentView === 'EDIT' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">Nombre</label>
                  <input
                    type="text"
                    className="w-full text-xs py-1.5 px-2 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-lg focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 outline-none"
                    value={editFormData.name}
                    onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                  />
                </div>

                {/* Image Upload in Edit */}
                <div>
                  <label className="block text-[10px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">Imagen</label>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="flex-1 flex items-center justify-center gap-2 py-1 px-2 text-[10px] border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50"
                      >
                        <Upload size={12} />
                        {uploading ? 'Subiendo...' : 'Subir imagen'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowUrlInput(!showUrlInput)}
                        className="flex-1 flex items-center justify-center gap-2 py-1 px-2 text-[10px] border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                      >
                        <LinkIcon size={12} />
                        URL
                      </button>
                    </div>
                    {showUrlInput && (
                      <div className="flex gap-2">
                        <input
                          type="url"
                          placeholder="https://..."
                          className="flex-1 text-xs py-1.5 px-2 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-lg focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 outline-none"
                          value={urlInput}
                          onChange={e => setUrlInput(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={handleUrlSubmit}
                          className="px-3 py-1.5 text-xs bg-zinc-900 dark:bg-white text-white dark:text-black rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200"
                        >
                          OK
                        </button>
                      </div>
                    )}
                    {editFormData.imageUrl && (
                      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
                        <img src={editFormData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">Próxima Revisión</label>
                  <input
                    type="date"
                    className={`w-full text-xs py-1.5 px-2 border rounded-lg focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 outline-none bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white [color-scheme:light] dark:[color-scheme:dark] ${isServiceDueSoon ? 'border-amber-300 bg-amber-50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-100' : 'border-zinc-200 dark:border-zinc-700'
                      }`}
                    value={editFormData.nextServiceDate}
                    onChange={e => setEditFormData({ ...editFormData, nextServiceDate: e.target.value })}
                  />
                  {isServiceDueSoon && (
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                      <AlertTriangle size={10} /> Revisión próxima (menos de 1 semana)
                    </p>
                  )}
                </div>

                <div className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${editFormData.inWorkshop ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800' : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700'}`}>
                  <input
                    type="checkbox"
                    id="inWorkshop"
                    checked={editFormData.inWorkshop}
                    onChange={e => setEditFormData({ ...editFormData, inWorkshop: e.target.checked })}
                    className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-600 text-zinc-900 dark:text-white focus:ring-zinc-900 dark:focus:ring-white bg-white dark:bg-zinc-700"
                  />
                  <label htmlFor="inWorkshop" className={`text-xs cursor-pointer ${editFormData.inWorkshop ? 'text-rose-700 dark:text-rose-400 font-medium' : 'text-zinc-700 dark:text-zinc-300'}`}>
                    {editFormData.inWorkshop ? 'En taller - reservas deshabilitadas' : 'En el taller'}
                  </label>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleSaveEdit}
                    disabled={loading}
                    className="flex-1 px-4 py-2 text-xs bg-zinc-900 dark:bg-white text-white dark:text-black rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Save size={14} />
                    Guardar
                  </button>
                </div>

                {/* Delete Button inside Edit View */}
                <div className="pt-4 mt-4 border-t border-zinc-100 dark:border-zinc-800">
                  <button
                    onClick={handleDeleteCar}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 p-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Trash2 size={16} />
                    Eliminar coche
                  </button>
                </div>
              </div>
            )}

            {/* ACTIVITY VIEW */}
            {currentView === 'ACTIVITY' && (
              <div className="space-y-4">
                {/* Filters */}
                <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Desde</label>
                    <input
                      type="date"
                      className="w-full text-xs p-2 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-lg [color-scheme:light] dark:[color-scheme:dark]"
                      value={activityFilter.startDate}
                      onChange={e => setActivityFilter(prev => ({ ...prev, startDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Hasta</label>
                    <input
                      type="date"
                      className="w-full text-xs p-2 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-lg [color-scheme:light] dark:[color-scheme:dark]"
                      value={activityFilter.endDate}
                      onChange={e => setActivityFilter(prev => ({ ...prev, endDate: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Historial de Reservas</h3>
                  <div className="space-y-0 relative border-l border-zinc-100 dark:border-zinc-800 ml-2">
                    {historyReservations.length > 0 ? (
                      historyReservations.map((res) => (
                        <div key={res.id} className="relative pl-6 pb-6 last:pb-0">
                          <div className={`absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-zinc-900 shadow-sm ${res.status === 'CANCELLED' ? 'bg-red-400' :
                            res.status === 'ACTIVE' && isAfter(parseISO(res.endTime), new Date()) ? 'bg-blue-400' :
                              'bg-zinc-300 dark:bg-zinc-600'
                            }`}></div>
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <UserAvatar name={res.userName} imageUrl={res.userAvatar} size="sm" className="w-5 h-5 text-[10px]" />
                                <p className="text-sm font-medium text-zinc-900 dark:text-white">{res.userName}</p>
                                {res.status === 'CANCELLED' && (
                                  <span className="text-[10px] px-1.5 py-0.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded border border-red-100 dark:border-red-800">Cancelada</span>
                                )}
                                {res.status === 'ACTIVE' && isAfter(parseISO(res.endTime), new Date()) && (
                                  <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded border border-blue-100 dark:border-blue-800">Activa</span>
                                )}
                              </div>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                {format(parseISO(res.startTime), 'd MMM yyyy, HH:mm', { locale: es })} — {format(parseISO(res.endTime), 'HH:mm', { locale: es })}
                              </p>

                              {/* Editable Note for History Item */}
                              <div className="mt-1">
                                {editingNoteId === res.id ? (
                                  <div className="flex gap-2 mt-1">
                                    <input
                                      type="text"
                                      value={noteContent}
                                      onChange={(e) => setNoteContent(e.target.value)}
                                      className="text-base sm:text-xs border border-zinc-200 dark:border-zinc-700 rounded px-2 py-1 w-full bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 outline-none"
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveNote(res.id);
                                        if (e.key === 'Escape') setEditingNoteId(null);
                                      }}
                                      placeholder="Escribe una nota..."
                                    />
                                    <button onClick={() => handleSaveNote(res.id)} className="text-emerald-600 dark:text-emerald-400 p-1 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded" title="Guardar"><Save size={16} /></button>
                                    <button
                                      onClick={async () => {
                                        setNoteContent('');
                                        await reservationService.updateReservationNote(res.id, '');
                                        setEditingNoteId(null);
                                        showToast('Nota eliminada', 'success');
                                        onUpdate();
                                      }}
                                      className="text-red-600 dark:text-red-400 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                      title="Eliminar nota"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                    <button onClick={() => setEditingNoteId(null)} className="text-zinc-400 dark:text-zinc-500 p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded" title="Cancelar"><X size={16} /></button>
                                  </div>
                                ) : (
                                  <div
                                    className={`group flex items-center gap-2 min-h-[20px] ${(currentUser.id === res.userId || currentUser.role === 'ADMIN') ? 'cursor-pointer' : ''
                                      }`}
                                    onClick={() => {
                                      if (currentUser.id === res.userId || currentUser.role === 'ADMIN') {
                                        handleEditNote(res);
                                      }
                                    }}
                                  >
                                    <p className={`text-xs ${(currentUser.id === res.userId || currentUser.role === 'ADMIN')
                                      ? 'underline decoration-zinc-300 dark:decoration-zinc-600 hover:decoration-zinc-500 dark:hover:decoration-zinc-400 underline-offset-2'
                                      : ''
                                      } ${res.notes ? 'text-zinc-600 dark:text-zinc-400 italic' : 'text-zinc-400 dark:text-zinc-600'}`}>
                                      {res.notes || 'Añadir nota...'}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-zinc-400 dark:text-zinc-500 pl-6 py-4 text-center">No hay reservas pasadas</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Toast Notification */}
          <AnimatePresence>
            {toast && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className={`absolute bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-xs font-medium text-white ${toast.type === 'success' ? 'bg-emerald-600' :
                  toast.type === 'error' ? 'bg-red-600' : 'bg-zinc-900 dark:bg-zinc-700'
                  }`}
              >
                {toast.type === 'success' && <CheckCircle size={14} />}
                {toast.type === 'error' && <AlertTriangle size={14} />}
                {toast.type === 'info' && <MessageSquare size={14} />}
                {toast.message}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div >

      {/* Confirmation Overlay */}
      <AnimatePresence>
        {
          confirmation && confirmation.isOpen && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => setConfirmation(null)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-xl shadow-2xl p-6 overflow-hidden border border-zinc-200 dark:border-zinc-800"
              >
                <div className={`absolute top-0 left-0 w-full h-1 ${confirmation.isDangerous ? 'bg-red-500' : 'bg-zinc-900 dark:bg-white'}`} />

                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">{confirmation.title}</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6 leading-relaxed">
                  {confirmation.message}
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => setConfirmation(null)}
                    className="flex-1 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      confirmation.onConfirm();
                      setConfirmation(null);
                    }}
                    className={`flex-1 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors shadow-sm ${confirmation.isDangerous
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200'
                      }`}
                  >
                    {confirmation.confirmText || 'Confirmar'}
                  </button>
                </div>
              </motion.div>
            </div>
          )
        }
      </AnimatePresence >
    </>
  );
};