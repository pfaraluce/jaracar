import React, { useState, useEffect } from 'react';
import { X, Calendar, Plus, Trash2, Edit2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserAbsence } from '../types';
import { absencesService } from '../services/absences';

interface ManageAbsencesModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    userName: string;
    roomName: string;
    bedNumber: number;
    onUpdate: () => void;
}

export const ManageAbsencesModal: React.FC<ManageAbsencesModalProps> = ({
    isOpen,
    onClose,
    userId,
    userName,
    roomName,
    bedNumber,
    onUpdate
}) => {
    const [absences, setAbsences] = useState<UserAbsence[]>([]);
    const [loading, setLoading] = useState(false);
    const [newStart, setNewStart] = useState('');
    const [newEnd, setNewEnd] = useState('');
    const [newNotes, setNewNotes] = useState('');
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            loadAbsences();
        }
    }, [isOpen, userId]);

    const loadAbsences = async () => {
        setLoading(true);
        try {
            const data = await absencesService.getUserAbsences(userId);
            setAbsences(data);
        } catch (err) {
            console.error('Error loading absences:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!newStart || !newEnd) {
            setError('Las fechas son obligatorias');
            return;
        }

        if (new Date(newStart) > new Date(newEnd)) {
            setError('La fecha de inicio debe ser anterior a la fecha de fin');
            return;
        }

        setCreating(true);
        try {
            const hasOverlap = await absencesService.hasOverlappingAbsence(userId, newStart, newEnd);
            if (hasOverlap) {
                setError('Ya existe una ausencia registrada en estas fechas');
                setCreating(false);
                return;
            }

            await absencesService.createAbsence(userId, newStart, newEnd, newNotes || undefined);
            setNewStart('');
            setNewEnd('');
            setNewNotes('');
            await loadAbsences();
            onUpdate();
        } catch (err: any) {
            setError(err.message || 'Error al crear la ausencia');
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (absenceId: string) => {
        if (!confirm('¿Estás seguro de que quieres eliminar esta ausencia?')) {
            return;
        }

        try {
            await absencesService.deleteAbsence(absenceId);
            await loadAbsences();
            onUpdate();
        } catch (err: any) {
            setError(err.message || 'Error al eliminar la ausencia');
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    const getTodayString = () => {
        return new Date().toISOString().split('T')[0];
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white dark:bg-zinc-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-700">
                        <div>
                            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                                Gestionar Ausencias
                            </h2>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">
                                {userName} • {roomName} - Cama {bedNumber}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {/* Create Form */}
                        <form onSubmit={handleCreate} className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 space-y-3">
                            <div className="flex items-center gap-2">
                                <Plus size={16} className="text-zinc-600 dark:text-zinc-400" />
                                <h3 className="text-sm font-medium text-zinc-900 dark:text-white">Nueva Ausencia</h3>
                            </div>

                            {error && (
                                <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                                    {error}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                        Fecha de inicio *
                                    </label>
                                    <input
                                        type="date"
                                        value={newStart}
                                        onChange={(e) => setNewStart(e.target.value)}
                                        min={getTodayString()}
                                        disabled={creating}
                                        required
                                        className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white disabled:opacity-50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                        Fecha de fin *
                                    </label>
                                    <input
                                        type="date"
                                        value={newEnd}
                                        onChange={(e) => setNewEnd(e.target.value)}
                                        min={newStart || getTodayString()}
                                        disabled={creating}
                                        required
                                        className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white disabled:opacity-50"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                    Notas (opcional)
                                </label>
                                <input
                                    type="text"
                                    value={newNotes}
                                    onChange={(e) => setNewNotes(e.target.value)}
                                    placeholder="Ej: Vacaciones, viaje familiar..."
                                    disabled={creating}
                                    className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 disabled:opacity-50"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={creating}
                                className="w-full py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors disabled:opacity-50"
                            >
                                {creating ? 'Creando...' : 'Crear Ausencia'}
                            </button>
                        </form>

                        {/* Absences List */}
                        <div className="space-y-2">
                            <h3 className="text-sm font-medium text-zinc-900 dark:text-white">Ausencias Registradas</h3>
                            {loading ? (
                                <div className="text-center py-8">
                                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-zinc-900 dark:border-white border-t-transparent"></div>
                                </div>
                            ) : absences.length === 0 ? (
                                <div className="text-center py-8 text-sm text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                                    No hay ausencias registradas
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {absences.map((absence) => {
                                        const isPast = new Date(absence.endDate) < new Date();
                                        return (
                                            <div
                                                key={absence.id}
                                                className={`flex items-start justify-between p-3 rounded-lg border ${isPast
                                                        ? 'border-zinc-200 dark:border-zinc-700 opacity-60 bg-zinc-50 dark:bg-zinc-900'
                                                        : 'border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800'
                                                    }`}
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Calendar size={14} className="text-zinc-500 dark:text-zinc-400" />
                                                        <span className="text-sm font-medium text-zinc-900 dark:text-white">
                                                            {formatDate(absence.startDate)} - {formatDate(absence.endDate)}
                                                        </span>
                                                        {isPast && (
                                                            <span className="text-xs px-2 py-0.5 bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 rounded">
                                                                Pasada
                                                            </span>
                                                        )}
                                                    </div>
                                                    {absence.notes && (
                                                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                                            {absence.notes}
                                                        </p>
                                                    )}
                                                </div>
                                                {!isPast && (
                                                    <button
                                                        onClick={() => handleDelete(absence.id)}
                                                        className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-zinc-200 dark:border-zinc-700">
                        <button
                            onClick={onClose}
                            className="w-full py-2 bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-white rounded-lg text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
                        >
                            Cerrar
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
