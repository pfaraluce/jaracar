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
        <div className="flex flex-col">
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
        "group relative bg-white rounded-xl border p-3 cursor-pointer transition-all hover:shadow-md",
        statusColor()
      )}
      onClick={onClick}
      whileHover={{ y: -2 }}
    >
      <div className="aspect-[16/10] w-full overflow-hidden rounded-lg bg-zinc-100 mb-3 relative">
        <motion.img
          layoutId={`image-${car.id}`}
          src={car.imageUrl}
          alt={car.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {/* Overlay Warning for Soon Reservation */}
        {soonReservation && !currentReservation && (
          <div className="absolute bottom-0 left-0 right-0 bg-zinc-900/80 backdrop-blur-sm text-white text-[10px] py-1 px-2 text-center">
            Reservado en {differenceInMinutes(parseISO(soonReservation.startTime), now)} mins
          </div>
        )}
        {/* Favorite Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(e);
          }}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white transition-colors shadow-sm z-10"
        >
          <Star
            size={14}
            className={isFavorite ? "fill-amber-400 text-amber-400" : "text-zinc-400"}
          />
        </button>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between items-start">
          <motion.h3 layoutId={`title-${car.id}`} className="font-semibold text-zinc-900 text-sm">{car.name}</motion.h3>
          <StatusIndicator />
        </div>
        <p className="text-xs text-zinc-400 font-mono">{car.plate}</p>

        {/* Helper Action Text */}
        <div className="pt-2 opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-3 right-3">
          <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider bg-white/90 px-1.5 py-0.5 rounded border border-zinc-100">
            {currentReservation ? 'Ver Detalles' : 'Reservar'}
          </span>
        </div>
      </div>
    </motion.div>
  );
};