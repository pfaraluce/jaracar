import React from 'react';
import { motion } from 'framer-motion';
import { Car, CarStatus, Reservation } from '../types';
import { Clock, AlertCircle, Wrench, Star } from 'lucide-react';
import { differenceInHours, differenceInMinutes, parseISO, isWithinInterval, addDays, isBefore, isAfter } from 'date-fns';
import clsx from 'clsx';
import { UserAvatar } from './UserAvatar';

interface CarCardProps {
  car: Car;
  reservations: Reservation[];
  isFavorite: boolean;
  onToggleFavorite: (e: React.MouseEvent) => void;
  onClick: () => void;
}

export const CarCard: React.FC<CarCardProps> = ({ car, reservations, isFavorite, onToggleFavorite, onClick }) => {
  const now = new Date();

  // Find if reserved NOW
  const currentReservation = reservations.find(r =>
    r.status === 'ACTIVE' &&
    isWithinInterval(now, { start: parseISO(r.startTime), end: parseISO(r.endTime) })
  );

  // Find if reserved SOON (within 3 hours)
  const soonReservation = reservations.find(r =>
    r.status === 'ACTIVE' &&
    differenceInHours(parseISO(r.startTime), now) > 0 &&
    differenceInHours(parseISO(r.startTime), now) < 3
  );

  // Check if service is due soon (within 7 days)
  const isServiceDueSoon = React.useMemo(() => {
    if (!car.nextServiceDate) return false;
    const serviceDate = new Date(car.nextServiceDate);
    const oneWeekFromNow = addDays(new Date(), 7);
    return isBefore(serviceDate, oneWeekFromNow) && isAfter(serviceDate, new Date());
  }, [car.nextServiceDate]);

  // Dismissed messages state
  const [dismissedIds, setDismissedIds] = React.useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('dismissed_messages');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const handleDismiss = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newIds = [...dismissedIds, id];
    setDismissedIds(newIds);
    localStorage.setItem('dismissed_messages', JSON.stringify(newIds));
  };

  // Find priority message
  const messageReservation = React.useMemo(() => {
    // 1. Active with notes (Always show, cannot be dismissed permanently effectively, or maybe yes? Let's allow dismiss too)
    const active = reservations.find(r =>
      r.status === 'ACTIVE' &&
      r.notes &&
      !dismissedIds.includes(r.id) &&
      isWithinInterval(now, { start: parseISO(r.startTime), end: parseISO(r.endTime) })
    );
    if (active) return active;

    // 2. Last finished with notes (Show until next reservation starts)
    // Sort past reservations by end time descending
    const lastPast = reservations
      .filter(r => {
        if (!r.notes || dismissedIds.includes(r.id)) return false;
        const end = parseISO(r.endTime);
        // Include if it ended in the past (regardless of status ACTIVE/COMPLETED)
        return isBefore(end, now);
      })
      .sort((a, b) => parseISO(b.endTime).getTime() - parseISO(a.endTime).getTime());

    if (lastPast.length > 0) {
      return lastPast[0];
    }

    // 3. Future (next 24h) with notes
    const future = reservations.find(r => {
      if (r.status !== 'ACTIVE' || !r.notes || dismissedIds.includes(r.id)) return false;
      const start = parseISO(r.startTime);
      const diff = differenceInHours(start, now);
      return diff > 0 && diff < 24;
    });
    if (future) return future;

    return null;
  }, [reservations, now, dismissedIds]);

  const statusColor = () => {
    if (car.inWorkshop) return 'border-rose-500 shadow-rose-100 bg-rose-50/30'; // Workshop - Red Alert
    if (car.status === CarStatus.WORKSHOP) return 'border-rose-500 shadow-rose-100 bg-rose-50/30';
    if (isServiceDueSoon || car.status === CarStatus.MAINTENANCE) return 'border-amber-500 shadow-amber-100'; // Maintenance/Due - Orange
    if (currentReservation) return 'border-blue-400/50 shadow-blue-100';
    return 'border-emerald-400/50 shadow-emerald-50'; // Available
  };

  const StatusIndicator = () => {
    if (car.inWorkshop) return (
      <span className="text-xs font-medium text-rose-600 flex items-center gap-1">
        <div className="w-1.5 h-1.5 rounded-full bg-rose-500" /> En Taller
      </span>
    );
    if (car.status === CarStatus.WORKSHOP) return (
      <span className="text-xs font-medium text-rose-600 flex items-center gap-1">
        <div className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Taller
      </span>
    );
    if (car.status === CarStatus.MAINTENANCE) return (
      <span className="text-xs font-medium text-amber-600 flex items-center gap-1">
        <AlertCircle size={12} /> Revisión
      </span>
    );
    if (currentReservation) {
      const remaining = differenceInMinutes(parseISO(currentReservation.endTime), now);
      const hours = Math.floor(remaining / 60);
      const mins = remaining % 60;
      return (
        <div className="flex flex-col items-end">
          <span className="text-xs font-medium text-blue-600 flex items-center gap-1">
            <UserAvatar name={currentReservation.userName} size="sm" className="w-4 h-4 text-[8px]" />
            {currentReservation.userName}
          </span>
          <span className="text-[10px] text-blue-400">
            Libre en {hours > 0 ? `${hours}h ` : ''}{mins}m
          </span>
        </div>
      );
    }
    return (
      <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Disponible
      </span>
    );
  }

  return (
    <motion.div
      layoutId={`card-${car.id}`}
      className={clsx(
        "group relative bg-white rounded-xl border p-3 cursor-pointer transition-all hover:shadow-md flex flex-col h-full",
        statusColor()
      )}
      onClick={onClick}
      whileHover={{ y: -2 }}
    >
      <div className="aspect-[16/10] w-full overflow-hidden rounded-lg bg-zinc-100 mb-3 relative shrink-0">
        <motion.img
          layoutId={`image-${car.id}`}
          src={car.imageUrl}
          alt={car.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {/* Overlay Warning for Soon Reservation */}
        {soonReservation && !currentReservation && (
          <div className="absolute bottom-0 left-0 right-0 bg-zinc-900/80 backdrop-blur-sm text-white text-[10px] py-1 px-2 text-center">
            Reservado en {(() => {
              const diff = differenceInMinutes(parseISO(soonReservation.startTime), now);
              const h = Math.floor(diff / 60);
              const m = diff % 60;
              return h > 0 ? `${h}h ${m}m` : `${m} mins`;
            })()}
          </div>
        )}
        {/* Favorite Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(e);
          }}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white transition-colors shadow-sm z-10"
          data-tutorial="favorite-star"
        >
          <Star
            size={14}
            className={isFavorite ? "fill-amber-400 text-amber-400" : "text-zinc-400"}
          />
        </button>
      </div>

      <div className="space-y-2 flex-1 flex flex-col">
        <div className="flex justify-between items-start">
          <div>
            <motion.h3 layoutId={`title-${car.id}`} className="font-semibold text-zinc-900 text-sm">{car.name}</motion.h3>
            <p className="text-xs text-zinc-400 font-mono">{car.plate}</p>
          </div>
          <StatusIndicator />
        </div>

        {/* Dashboard Message */}
        {messageReservation && (
          <div className="mt-auto pt-2 relative group/msg">
            <div className={`text-[10px] p-2 rounded-lg border flex gap-2 items-start pr-6 ${messageReservation.status === 'COMPLETED' ? 'bg-zinc-50 border-zinc-100 text-zinc-500' : 'bg-blue-50 border-blue-100 text-blue-700'
              }`}>
              <div className="shrink-0 mt-0.5">
                <UserAvatar name={messageReservation.userName} size="sm" className="w-4 h-4 text-[8px]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{messageReservation.userName}</p>
                <p className="line-clamp-2 leading-tight opacity-90">"{messageReservation.notes}"</p>
                {messageReservation.status === 'COMPLETED' && (
                  <p className="text-[9px] opacity-70 mt-1">Hace {differenceInHours(now, parseISO(messageReservation.endTime))}h</p>
                )}
              </div>
            </div>
            {/* Dismiss Button */}
            <button
              onClick={(e) => handleDismiss(e, messageReservation.id)}
              className="absolute top-3 right-1 p-1 text-zinc-400 hover:text-zinc-600 hover:bg-black/5 rounded-full opacity-0 group-hover/msg:opacity-100 transition-all"
              title="Ocultar aviso"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        )}

        {/* Helper Action Text */}
        <div className="pt-2 opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-3 right-3 pointer-events-none">
          <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider bg-white/90 px-1.5 py-0.5 rounded border border-zinc-100 shadow-sm">
            {currentReservation ? 'Ver Detalles' : 'Reservar'}
          </span>
        </div>
      </div>
    </motion.div>
  );
};