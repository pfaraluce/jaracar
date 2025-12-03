import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Car, CarStatus, Reservation, User, ActivityLog } from '../types';
import { X, ArrowLeft, Pencil, AlertTriangle, CheckCircle, Wrench, Car as CarIcon, MessageSquare, History } from 'lucide-react';
import { format, isBefore, isAfter, addDays, startOfDay, endOfDay, differenceInMinutes, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { reservationService } from '../services/reservations';
import { carService } from '../services/cars';

// Sub-components
import { BookingForm } from './car-detail/BookingForm';
import { ActiveReservations } from './car-detail/ActiveReservations';
import { HistoryList } from './car-detail/HistoryList';
import { EditCarForm } from './car-detail/EditCarForm';

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

  // View State
  const [currentView, setCurrentView] = useState<'DETAILS' | 'EDIT' | 'ACTIVITY'>('DETAILS');
  const [editingReservationId, setEditingReservationId] = useState<string | null>(null);

  // Activity Filter State
  const [activityFilter, setActivityFilter] = useState({
    startDate: '',
    endDate: ''
  });

  // Toast State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Confirmation State
  const [confirmation, setConfirmation] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => Promise<void>;
    confirmText?: string;
    isDangerous?: boolean;
  } | null>(null);

  // Derived State
  const now = new Date();

  const isServiceDueSoon = useMemo(() => {
    if (!car.nextServiceDate) return false;
    const serviceDate = new Date(car.nextServiceDate);
    const oneWeekFromNow = addDays(new Date(), 7);
    return isBefore(serviceDate, oneWeekFromNow) && isAfter(serviceDate, new Date());
  }, [car.nextServiceDate]);

  const currentReservation = useMemo(() => {
    return reservations.find(r =>
      r.status === 'ACTIVE' &&
      isBefore(now, parseISO(r.endTime)) &&
      isBefore(parseISO(r.startTime), now) // Should be active NOW
    );
  }, [reservations, now]);

  const activeReservations = useMemo(() => {
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

  const historyReservations = useMemo(() => {
    let filtered = [...reservations];
    if (activityFilter.startDate) {
      filtered = filtered.filter(res => isAfter(parseISO(res.startTime), startOfDay(parseISO(activityFilter.startDate))));
    }
    if (activityFilter.endDate) {
      filtered = filtered.filter(res => isBefore(parseISO(res.startTime), endOfDay(parseISO(activityFilter.endDate))));
    }
    return filtered.sort((a, b) => parseISO(b.startTime).getTime() - parseISO(a.startTime).getTime());
  }, [reservations, activityFilter]);

  // Handlers
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

  const handleDeleteCar = async () => {
    setConfirmation({
      isOpen: true,
      title: 'Eliminar vehículo',
      message: '¿Estás seguro de que quieres eliminar este vehículo? Esta acción no se puede deshacer y se perderá todo el historial.',
      confirmText: 'Sí, eliminar',
      isDangerous: true,
      onConfirm: async () => {
        try {
          await carService.deleteCar(car.id);
          showToast('Vehículo eliminado', 'success');
          onUpdate();
          onClose();
        } catch (error) {
          console.error('Error deleting car:', error);
          showToast('Error al eliminar el coche', 'error');
        }
      }
    });
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
                  <BookingForm
                    car={car}
                    currentUser={currentUser}
                    reservations={reservations}
                    onUpdate={onUpdate}
                    onClose={onClose}
                    editingReservation={reservations.find(r => r.id === editingReservationId) || null}
                    onCancelEdit={() => setEditingReservationId(null)}
                    onShowToast={showToast}
                  />
                )}

                {/* Active Reservations */}
                {activeReservations.length > 0 && (
                  <ActiveReservations
                    reservations={activeReservations}
                    currentUser={currentUser}
                    onUpdate={onUpdate}
                    onEditReservation={(res) => {
                      setEditingReservationId(res.id);
                      // Scroll to top handled in BookingForm via useEffect, but we need to ensure form is visible
                      // Actually BookingForm handles scrolling when editingReservation changes.
                    }}
                    onCancelReservation={handleCancelReservation}
                    onFinishReservation={handleFinishReservation}
                    onShowToast={showToast}
                  />
                )}

                {/* Recent History */}
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
                  <HistoryList
                    reservations={pastReservations.slice(0, 3)}
                    currentUser={currentUser}
                    onUpdate={onUpdate}
                    onShowToast={showToast}
                    compact={true}
                    emptyMessage="No hay historial reciente"
                  />
                </section>
              </>
            )}

            {/* EDIT VIEW */}
            {currentView === 'EDIT' && (
              <EditCarForm
                car={car}
                onSaveSuccess={() => {
                  setCurrentView('DETAILS');
                  onUpdate();
                }}
                onDelete={handleDeleteCar}
                onShowToast={showToast}
              />
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
                  <HistoryList
                    reservations={historyReservations}
                    currentUser={currentUser}
                    onUpdate={onUpdate}
                    onShowToast={showToast}
                    compact={false}
                    emptyMessage="No hay reservas pasadas"
                  />
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