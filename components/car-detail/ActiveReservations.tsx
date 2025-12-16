import React from 'react';
import { format, parseISO, isAfter } from 'date-fns';
import { es } from 'date-fns/locale';
import { CheckCircle, X, Pencil } from 'lucide-react';
import { Reservation, User } from '../../types';
import { UserAvatar } from '../UserAvatar';
import { NoteEditor } from './NoteEditor';
import { reservationService } from '../../services/reservations';

interface ActiveReservationsProps {
    reservations: Reservation[];
    currentUser: User;
    onUpdate: () => void;
    onEditReservation: (res: Reservation) => void;
    onCancelReservation: (id: string) => void;
    onFinishReservation: (id: string) => void;
    onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const ActiveReservations: React.FC<ActiveReservationsProps> = ({
    reservations,
    currentUser,
    onUpdate,
    onEditReservation,
    onCancelReservation,
    onFinishReservation,
    onShowToast
}) => {
    const now = new Date();

    const handleSaveNote = async (reservationId: string, note: string) => {
        try {
            await reservationService.updateReservationNote(reservationId, note);
            onShowToast('Nota actualizada', 'success');
            onUpdate();
        } catch (e) {
            onShowToast('Error al guardar nota', 'error');
            throw e; // Let NoteEditor handle error if needed, but we showed toast
        }
    };

    return (
        <section>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-4">Reservas Activas</h3>
            <div className="space-y-2">
                {reservations.map(res => (
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

                                {/* Note Editor */}
                                <div className="mt-2 ml-7">
                                    <NoteEditor
                                        initialNote={res.notes || ''}
                                        onSave={(note) => handleSaveNote(res.id, note)}
                                        canEdit={currentUser.id === res.userId}
                                        placeholder="Añadir nota..."
                                    />
                                </div>
                            </div>

                            {/* Actions */}
                            {currentUser.role === 'ADMIN' && res.status === 'ACTIVE' && (
                                <div className="flex items-center gap-2 ml-2">
                                    {isAfter(now, parseISO(res.startTime)) ? (
                                        // Ongoing Reservation: Finish or Cancel
                                        <>
                                            <button
                                                onClick={() => onFinishReservation(res.id)}
                                                className="text-[10px] text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 px-2 py-1 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors flex items-center gap-1"
                                                title="Finalizar reserva ahora"
                                            >
                                                <CheckCircle size={12} /> Finalizar
                                            </button>
                                            <button
                                                onClick={() => onCancelReservation(res.id)}
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
                                                onClick={() => onEditReservation(res)}
                                                className="text-[10px] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors flex items-center gap-1"
                                                title="Editar horario"
                                            >
                                                <Pencil size={12} /> Editar
                                            </button>
                                            <button
                                                onClick={() => onCancelReservation(res.id)}
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
    );
};
