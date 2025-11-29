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

interface CarDetailProps {
  car: Car;
  reservations: Reservation[];
  activity: ActivityLog[];
  currentUser: User;
  onClose: () => void;
  onUpdate: () => void;
}

export const CarDetail: React.FC<CarDetailProps> = ({ car, reservations, activity = [], currentUser, onClose, onUpdate }) => {
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

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const notification = document.createElement('div');
    const colors = type === 'success' ? 'bg-emerald-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';
    notification.className = `fixed top-4 right-4 ${colors} text-white px-4 py-3 rounded-lg shadow-lg z-[9999] flex items-center gap-2 animate-in fade-in slide-in-from-top-2`;

    let icon = '';
    if (type === 'success') icon = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>';
    else if (type === 'error') icon = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
    else icon = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';

    notification.innerHTML = `${icon}<span>${message}</span>`;
    document.body.appendChild(notification);
    setTimeout(() => {
      notification.classList.add('animate-out', 'fade-out', 'slide-out-to-top-2');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
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

      await reservationService.createReservation({
        carId: car.id,
        userId: currentUser.id,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        notes: ''
      });

      showToast('Reserva creada correctamente', 'success');

      onUpdate();
      onClose();
    } catch (e) {
      showToast('Error al crear reserva: ' + (e as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCar = async () => {
    setConfirmation({
      isOpen: true,
      title: 'Eliminar coche',
      message: '¿Estás seguro de que quieres eliminar este coche? Esta acción no se puede deshacer.',
      confirmText: 'Eliminar definitivamente',
      isDangerous: true,
      onConfirm: async () => {
        try {
          setLoading(true);
          await carService.deleteCar(car.id);
          showToast('Coche eliminado correctamente', 'success');
          onUpdate(); // This will likely trigger a refresh in Dashboard
          onClose(); // Close the modal
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
      <span className="text-xs font-medium text-rose-700 flex items-center gap-1 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-200">
        <Wrench size={12} /> En Taller
      </span>
    );
    if (car.status === CarStatus.WORKSHOP) return (
      <span className="text-xs font-medium text-rose-600 flex items-center gap-1 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
        <Wrench size={12} /> Taller
      </span>
    );
    if (car.status === CarStatus.MAINTENANCE) return (
      <span className="text-xs font-medium text-amber-600 flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
        <AlertTriangle size={12} /> Revisión
      </span>
    );
    if (currentReservation) return (
      <span className="text-xs font-medium text-blue-600 flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
        <CarIcon size={12} /> Reservado
      </span>
    );
    return (
      <span className="text-xs font-medium text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
        <CheckCircle size={12} /> Disponible
      </span>
    );
  };

  return (
    <>
      <motion.div
        layoutId={`card-${car.id}`}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      >
        <motion.div
          className="absolute inset-0 bg-black/20 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />

        <motion.div
          className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Section */}
          <div className="p-6 border-b border-zinc-100 bg-white z-10 sticky top-0">
            <div className="flex justify-between items-start">
              <div className="flex gap-4 items-center">
                {currentView !== 'DETAILS' && (
                  <button
                    onClick={() => setCurrentView('DETAILS')}
                    className="p-2 -ml-2 hover:bg-zinc-100 rounded-full text-zinc-500 hover:text-zinc-900 transition-colors"
                  >
                    <ArrowLeft size={20} />
                  </button>
                )}

                {currentView === 'DETAILS' && (
                  <motion.img
                    layoutId={`image-${car.id}`}
                    src={car.imageUrl}
                    alt={car.name}
                    className="w-24 h-16 object-cover rounded-lg"
                  />
                )}

                <div>
                  <motion.h2 layoutId={`title-${car.id}`} className="text-xl font-semibold text-zinc-900 flex items-center gap-2">
                    {currentView === 'EDIT' ? 'Editar Coche' : currentView === 'ACTIVITY' ? 'Historial de Actividad' : car.name}

                    {/* Edit Button - Only visible in DETAILS view for admins */}
                    {currentView === 'DETAILS' && currentUser.role === 'ADMIN' && (
                      <button
                        onClick={() => setCurrentView('EDIT')}
                        className="p-1.5 hover:bg-zinc-100 rounded-full text-zinc-400 hover:text-zinc-600 transition-colors"
                        title="Editar detalles"
                      >
                        <Pencil size={16} />
                      </button>
                    )}
                  </motion.h2>

                  {currentView === 'DETAILS' && (
                    <>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-zinc-500 font-mono">{car.plate}</span>
                        <StatusIndicator />
                      </div>
                      {/* Service Warning */}
                      {isServiceDueSoon && !car.inWorkshop && (
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600 font-medium">
                          <AlertTriangle size={12} />
                          <span>Revisión próxima: {format(parseISO(car.nextServiceDate!), 'd MMM', { locale: es })}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-full text-zinc-400 hover:text-zinc-900 transition-colors">
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
                {car.inWorkshop ? (
                  <section className="bg-zinc-50 border border-zinc-200 rounded-lg p-6">
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-zinc-100 mb-3">
                        <Wrench size={24} className="text-zinc-500" />
                      </div>
                      <h3 className="text-sm font-semibold text-zinc-900 mb-1">Coche en el taller</h3>
                      <p className="text-xs text-zinc-500 max-w-xs mx-auto mb-4">
                        Este coche no se puede reservar hasta que salga del taller.
                      </p>
                      {currentUser.role === 'ADMIN' && (
                        <p className="text-xs text-zinc-400">
                          Edita el coche y desmarca la casilla "En taller" para volver a habilitarlo.
                        </p>
                      )}
                    </div>
                  </section>
                ) : currentUser.role === 'ADMIN' && (
                  <section>
                    <h3 className="text-sm font-semibold text-zinc-900 mb-4">Reservar Vehículo</h3>
                    {/* ... Booking Form ... */}
                    <div className="space-y-4">
                      {/* Booking Mode Selection */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => setBookingMode('NOW')}
                          className={`flex-1 py-2 px-3 rounded-lg border transition-all ${bookingMode === 'NOW' ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 hover:bg-zinc-50'}`}
                        >
                          <div className="flex items-center justify-center gap-2">
                            <Play size={14} />
                            <span className="text-sm font-medium">Ahora</span>
                          </div>
                        </button>
                        <button
                          onClick={() => setBookingMode('LATER')}
                          className={`flex-1 py-2 px-3 rounded-lg border transition-all ${bookingMode === 'LATER' ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 hover:bg-zinc-50'}`}
                        >
                          <div className="flex items-center justify-center gap-2">
                            <Calendar size={14} />
                            <span className="text-sm font-medium">Programar</span>
                          </div>
                        </button>
                      </div>

                      {/* Start Time Selection (Only visible if LATER or Forced) */}
                      {bookingMode === 'LATER' && (
                        <div className="space-y-1">
                          <DateTimeSelector
                            label="Hora de inicio"
                            value={startDate}
                            onChange={setStartDate}
                            minDate={new Date()}
                          />
                          {nextReservation && isWithinInterval(startDate, { start: now, end: parseISO(nextReservation.startTime) }) && (
                            <p className="text-[10px] text-amber-600 flex items-center gap-1 mt-1">
                              <AlertTriangle size={10} /> La próxima reserva comienza a las {format(parseISO(nextReservation.startTime), 'HH:mm', { locale: es })}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Quick Duration Options */}
                      <div className="space-y-1">
                        <label className="text-xs text-zinc-500">Hasta cuándo</label>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => handleQuickDuration('LUNCH')}
                            className={`text-xs py-1.5 px-2 border rounded-lg transition-all ${selectedDuration === 'LUNCH'
                              ? 'border-zinc-900 bg-zinc-900 text-white'
                              : 'border-zinc-200 hover:bg-zinc-50'
                              }`}
                          >
                            Hasta la comida
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickDuration('DINNER')}
                            className={`text-xs py-1.5 px-2 border rounded-lg transition-all ${selectedDuration === 'DINNER'
                              ? 'border-zinc-900 bg-zinc-900 text-white'
                              : 'border-zinc-200 hover:bg-zinc-50'
                              }`}
                          >
                            Hasta la cena
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickDuration('CUSTOM')}
                            className={`text-xs py-1.5 px-2 border rounded-lg transition-all ${selectedDuration === 'CUSTOM'
                              ? 'border-zinc-900 bg-zinc-900 text-white'
                              : 'border-zinc-200 hover:bg-zinc-50'
                              }`}
                          >
                            Otro
                          </button>
                        </div>
                      </div>

                      {/* Custom End Time (Only visible when CUSTOM is selected) */}
                      {showCustomTime && (
                        <div className="space-y-1">
                          <DateTimeSelector
                            label="Hora de fin"
                            value={endDate}
                            onChange={setEndDate}
                            minDate={startDate}
                          />
                        </div>
                      )}

                      <Button
                        className="w-full"
                        onClick={handleBook}
                        isLoading={loading}
                      >
                        {bookingMode === 'NOW' ? 'Empezar viaje ahora' : 'Programar viaje'}
                      </Button>
                    </div>
                  </section>
                )}

                {/* Current & Upcoming Reservations */}
                {activeReservations.length > 0 && (
                  <section>
                    <h3 className="text-sm font-semibold text-zinc-900 mb-4">Reservas Activas</h3>
                    <div className="space-y-2">
                      {activeReservations.slice(0, 3).map(res => (
                        <div key={res.id} className="p-3 bg-zinc-50 rounded-lg border border-zinc-100">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <UserAvatar name={res.userName} size="sm" className="w-5 h-5 text-[10px]" />
                                <p className="text-xs font-medium text-zinc-900">{res.userName}</p>
                              </div>
                              <p className="text-[10px] text-zinc-500 mt-0.5 ml-7">
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
                                      className="text-xs border rounded px-2 py-1 w-full bg-white"
                                      placeholder="Añadir nota..."
                                      autoFocus
                                    />
                                    <button onClick={() => handleSaveNote(res.id)} className="text-emerald-600 p-1 hover:bg-emerald-50 rounded"><Save size={14} /></button>
                                    <button onClick={() => setEditingNoteId(null)} className="text-zinc-400 p-1 hover:bg-zinc-100 rounded"><X size={14} /></button>
                                  </div>
                                ) : (
                                  <div className="group flex items-center gap-2 min-h-[20px]">
                                    <p className="text-[10px] text-zinc-600 italic">
                                      {res.notes || 'Añadir nota...'}
                                    </p>
                                    {(currentUser.id === res.userId || currentUser.role === 'ADMIN') && (
                                      <button
                                        onClick={() => handleEditNote(res)}
                                        className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-zinc-600 transition-opacity p-1"
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
                              <button
                                onClick={() => handleFinishReservation(res.id)}
                                className="text-[10px] text-blue-600 hover:text-blue-700 px-2 py-1 hover:bg-blue-50 rounded transition-colors flex items-center gap-1 ml-2"
                              >
                                <CheckCircle size={10} /> Finalizar
                              </button>
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
                    <h3 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
                      <History size={16} /> Historial Reciente
                    </h3>
                    <button
                      onClick={() => setCurrentView('ACTIVITY')}
                      className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors"
                    >
                      Ver todo
                    </button>
                  </div>
                  <div className="space-y-0 relative border-l border-zinc-100 ml-2">
                    {pastReservations && pastReservations.length > 0 ? (
                      pastReservations.slice(0, 3).map((res) => (
                        <div key={res.id} className="relative pl-6 pb-6 last:pb-0">
                          <div className="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm bg-zinc-300"></div>
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="text-xs font-medium text-zinc-900">{res.userName}</p>
                              <p className="text-[10px] text-zinc-500">
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
                                      className="text-xs border rounded px-2 py-1 w-full"
                                      autoFocus
                                    />
                                    <button onClick={() => handleSaveNote(res.id)} className="text-emerald-600"><Save size={14} /></button>
                                    <button onClick={() => setEditingNoteId(null)} className="text-zinc-400"><X size={14} /></button>
                                  </div>
                                ) : (
                                  <div className="group flex items-center gap-2 min-h-[16px]">
                                    <p className="text-[10px] text-zinc-600 italic">
                                      {res.notes || 'Sin notas'}
                                    </p>
                                    {(currentUser.id === res.userId || currentUser.role === 'ADMIN') && (
                                      <button
                                        onClick={() => handleEditNote(res)}
                                        className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-zinc-600 transition-opacity p-0.5"
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
                      <p className="text-xs text-zinc-400 pl-6">No hay historial reciente</p>
                    )}
                  </div>
                </section>
              </>
            )}

            {/* EDIT VIEW */}
            {currentView === 'EDIT' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-medium text-zinc-500 mb-1">Nombre</label>
                  <input
                    type="text"
                    className="w-full text-xs py-1.5 px-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900/10 outline-none"
                    value={editFormData.name}
                    onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                  />
                </div>

                {/* Image Upload in Edit */}
                <div>
                  <label className="block text-[10px] font-medium text-zinc-500 mb-1">Imagen</label>
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
                        className="flex-1 flex items-center justify-center gap-2 py-1 px-2 text-[10px] border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors disabled:opacity-50"
                      >
                        <Upload size={12} />
                        {uploading ? 'Subiendo...' : 'Subir imagen'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowUrlInput(!showUrlInput)}
                        className="flex-1 flex items-center justify-center gap-2 py-1 px-2 text-[10px] border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
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
                          className="flex-1 text-xs py-1.5 px-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900/10 outline-none"
                          value={urlInput}
                          onChange={e => setUrlInput(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={handleUrlSubmit}
                          className="px-3 py-1.5 text-xs bg-zinc-900 text-white rounded-lg hover:bg-zinc-800"
                        >
                          OK
                        </button>
                      </div>
                    )}
                    {editFormData.imageUrl && (
                      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-zinc-100">
                        <img src={editFormData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-zinc-500 mb-1">Próxima Revisión</label>
                  <input
                    type="date"
                    className={`w-full text-xs py-1.5 px-2 border rounded-lg focus:ring-2 focus:ring-zinc-900/10 outline-none ${isServiceDueSoon ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-zinc-200'
                      }`}
                    value={editFormData.nextServiceDate}
                    onChange={e => setEditFormData({ ...editFormData, nextServiceDate: e.target.value })}
                  />
                  {isServiceDueSoon && (
                    <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-1">
                      <AlertTriangle size={10} /> Revisión próxima (menos de 1 semana)
                    </p>
                  )}
                </div>

                <div className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${editFormData.inWorkshop ? 'bg-rose-50 border-rose-200' : 'bg-zinc-50 border-zinc-200'}`}>
                  <input
                    type="checkbox"
                    id="inWorkshop"
                    checked={editFormData.inWorkshop}
                    onChange={e => setEditFormData({ ...editFormData, inWorkshop: e.target.checked })}
                    className="w-4 h-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                  />
                  <label htmlFor="inWorkshop" className={`text-xs cursor-pointer ${editFormData.inWorkshop ? 'text-rose-700 font-medium' : 'text-zinc-700'}`}>
                    {editFormData.inWorkshop ? 'En taller - reservas deshabilitadas' : 'En el taller'}
                  </label>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleSaveEdit}
                    disabled={loading}
                    className="flex-1 px-4 py-2 text-xs bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Save size={14} />
                    Guardar
                  </button>
                </div>

                {/* Delete Button inside Edit View */}
                <div className="pt-4 mt-4 border-t border-zinc-100">
                  <button
                    onClick={handleDeleteCar}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 p-3 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
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
                <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-zinc-50 rounded-lg">
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1">Desde</label>
                    <input
                      type="date"
                      className="w-full text-xs p-2 border border-zinc-200 rounded-lg"
                      value={activityFilter.startDate}
                      onChange={e => setActivityFilter(prev => ({ ...prev, startDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1">Hasta</label>
                    <input
                      type="date"
                      className="w-full text-xs p-2 border border-zinc-200 rounded-lg"
                      value={activityFilter.endDate}
                      onChange={e => setActivityFilter(prev => ({ ...prev, endDate: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-zinc-900">Historial de Reservas</h3>
                  <div className="space-y-0 relative border-l border-zinc-100 ml-2">
                    {historyReservations.length > 0 ? (
                      historyReservations.map((res) => (
                        <div key={res.id} className="relative pl-6 pb-6 last:pb-0">
                          <div className={`absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm ${res.status === 'CANCELLED' ? 'bg-red-400' :
                            res.status === 'ACTIVE' && isAfter(parseISO(res.endTime), new Date()) ? 'bg-blue-400' :
                              'bg-zinc-300'
                            }`}></div>
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <UserAvatar name={res.userName} size="sm" className="w-5 h-5 text-[10px]" />
                                <p className="text-sm font-medium text-zinc-900">{res.userName}</p>
                                {res.status === 'CANCELLED' && (
                                  <span className="text-[10px] px-1.5 py-0.5 bg-red-50 text-red-600 rounded border border-red-100">Cancelada</span>
                                )}
                                {res.status === 'ACTIVE' && isAfter(parseISO(res.endTime), new Date()) && (
                                  <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded border border-blue-100">Activa</span>
                                )}
                              </div>
                              <p className="text-xs text-zinc-500">
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
                                      className="text-xs border rounded px-2 py-1 w-full"
                                      autoFocus
                                    />
                                    <button onClick={() => handleSaveNote(res.id)} className="text-emerald-600"><Save size={14} /></button>
                                    <button onClick={() => setEditingNoteId(null)} className="text-zinc-400"><X size={14} /></button>
                                  </div>
                                ) : (
                                  <div className="group flex items-center gap-2 min-h-[16px]">
                                    <p className="text-xs text-zinc-600 italic">
                                      {res.notes || 'Sin notas'}
                                    </p>
                                    {(currentUser.id === res.userId || currentUser.role === 'ADMIN') && (
                                      <button
                                        onClick={() => handleEditNote(res)}
                                        className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-zinc-600 transition-opacity p-0.5"
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
                      <p className="text-sm text-zinc-400 pl-6 py-4 text-center">No hay reservas pasadas</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>

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
                className="relative w-full max-w-sm bg-white rounded-xl shadow-2xl p-6 overflow-hidden"
              >
                <div className={`absolute top-0 left-0 w-full h-1 ${confirmation.isDangerous ? 'bg-red-500' : 'bg-zinc-900'}`} />

                <h3 className="text-lg font-semibold text-zinc-900 mb-2">{confirmation.title}</h3>
                <p className="text-sm text-zinc-600 mb-6 leading-relaxed">
                  {confirmation.message}
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => setConfirmation(null)}
                    className="flex-1 px-4 py-2 text-sm font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors"
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
                      : 'bg-zinc-900 hover:bg-zinc-800'
                      }`}
                  >
                    {confirmation.confirmText || 'Confirmar'}
                  </button>
                </div>
              </motion.div>
            </div>
          )
        }
      </AnimatePresence>
    </>
  );
};