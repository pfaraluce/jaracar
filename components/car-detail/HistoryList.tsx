import React from 'react';
import { format, parseISO, isAfter } from 'date-fns';
import { es } from 'date-fns/locale';
import { Reservation, User } from '../../types';
import { UserAvatar } from '../UserAvatar';
import { NoteEditor } from './NoteEditor';
import { reservationService } from '../../services/reservations';

interface HistoryListProps {
    reservations: Reservation[];
    currentUser: User;
    onUpdate: () => void;
    onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
    compact?: boolean;
    emptyMessage?: string;
}

export const HistoryList: React.FC<HistoryListProps> = ({
    reservations,
    currentUser,
    onUpdate,
    onShowToast,
    compact = false,
    emptyMessage = 'No hay historial'
}) => {
    const handleSaveNote = async (reservationId: string, note: string) => {
        try {
            await reservationService.updateReservationNote(reservationId, note);
            onShowToast('Nota actualizada', 'success');
            onUpdate();
        } catch (e) {
            onShowToast('Error al guardar nota', 'error');
            throw e;
        }
    };

    if (reservations.length === 0) {
        return <p className={`text-xs text-zinc-400 dark:text-zinc-500 ${compact ? 'pl-6' : 'pl-6 py-4 text-center'}`}>{emptyMessage}</p>;
    }

    return (
        <div className="space-y-0 relative border-l border-zinc-100 dark:border-zinc-800 ml-2">
            {reservations.map((res) => (
                <div key={res.id} className="relative pl-6 pb-6 last:pb-0">
                    <div className={`absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-zinc-900 shadow-sm ${res.status === 'CANCELLED' ? 'bg-red-400' :
                        res.status === 'ACTIVE' && isAfter(parseISO(res.endTime), new Date()) ? 'bg-blue-400' :
                            'bg-zinc-300 dark:bg-zinc-600'
                        }`}></div>
                    <div className="flex justify-between items-start">
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                {(!compact) && (
                                    <UserAvatar name={res.userName} imageUrl={res.userAvatar} size="sm" className="w-5 h-5 text-[10px]" />
                                )}
                                <p className={`${compact ? 'text-xs' : 'text-sm'} font-medium text-zinc-900 dark:text-white`}>{res.userName}</p>
                                {(!compact) && res.status === 'CANCELLED' && (
                                    <span className="text-[10px] px-1.5 py-0.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded border border-red-100 dark:border-red-800">Cancelada</span>
                                )}
                                {(!compact) && res.status === 'ACTIVE' && isAfter(parseISO(res.endTime), new Date()) && (
                                    <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded border border-blue-100 dark:border-blue-800">Activa</span>
                                )}
                            </div>
                            <p className={`${compact ? 'text-[10px]' : 'text-xs'} text-zinc-500 dark:text-zinc-400`}>
                                {format(parseISO(res.startTime), compact ? 'd MMM HH:mm' : 'd MMM yyyy, HH:mm', { locale: es })} — {format(parseISO(res.endTime), 'HH:mm', { locale: es })}
                            </p>

                            {/* Note Editor */}
                            <div className="mt-1">
                                <NoteEditor
                                    initialNote={res.notes || ''}
                                    onSave={(note) => handleSaveNote(res.id, note)}
                                    canEdit={currentUser.id === res.userId}
                                    placeholder={compact ? "Sin notas" : "Escribe una nota..."}
                                    className={compact ? "" : "mt-1"}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};
