import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Calendar, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserAbsence } from '../types';
import { absencesService } from '../services/absences';

interface AbsenceManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
}

export const AbsenceManagementModal: React.FC<AbsenceManagementModalProps> = ({ isOpen, onClose, userId }) => {
    const [absences, setAbsences] = useState<UserAbsence[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Form state
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (isOpen) {
            loadAbsences();
        }
    }, [isOpen, userId]);

    const loadAbsences = async () => {
        setIsLoading(true);
        setError('');
        try {
            const data = await absencesService.getUserAbsences(userId);
            setAbsences(data);
        } catch (err: any) {
            setError(err.message || 'Error al cargar ausencias');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!startDate || !endDate) {
            setError('Las fechas son obligatorias');
            return;
        }

        if (new Date(startDate) > new Date(endDate)) {
            setError('La fecha de inicio debe ser anterior a la fecha de fin');
            return;
        }

        setIsSubmitting(true);

        try {
            // Check for overlapping absences
            const hasOverlap = await absencesService.hasOverlappingAbsence(userId, startDate, endDate);
            if (hasOverlap) {
                setError('Ya tienes una ausencia registrada en estas fechas');
                setIsSubmitting(false);
                return;
            }

            await absencesService.createAbsence(userId, startDate, endDate, notes || undefined);

            // Reset form
            setStartDate('');
            setEndDate('');
            setNotes('');

            // Reload absences
            await loadAbsences();
        } catch (err: any) {
            setError(err.message || 'Error al crear la ausencia');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (absenceId: string) => {
        if (!confirm('¿Estás seguro de que quieres eliminar esta ausencia?')) {
            return;
        }

        try {
            await absencesService.deleteAbsence(absenceId);
            await loadAbsences();
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

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white/20 rounded-lg">
                                            <Calendar className="w-6 h-6" />
                                        </div>
                                        <h2 className="text-2xl font-bold">Gestionar Ausencias</h2>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                <p className="mt-2 text-sm text-white/80">
                                    Durante tus ausencias, tu habitación aparecerá como disponible
                                </p>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                {/* Error Message */}
                                {error && (
                                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-start gap-2 text-red-800 dark:text-red-200">
                                        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                        <span className="text-sm">{error}</span>
                                    </div>
                                )}

                                {/* Create Absence Form */}
                                <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                        <Plus className="w-5 h-5" />
                                        Nueva Ausencia
                                    </h3>
                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    Fecha de Inicio *
                                                </label>
                                                <input
                                                    type="date"
                                                    value={startDate}
                                                    onChange={(e) => setStartDate(e.target.value)}
                                                    min={getTodayString()}
                                                    disabled={isSubmitting}
                                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    Fecha de Fin *
                                                </label>
                                                <input
                                                    type="date"
                                                    value={endDate}
                                                    onChange={(e) => setEndDate(e.target.value)}
                                                    min={startDate || getTodayString()}
                                                    disabled={isSubmitting}
                                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Notas (opcional)
                                            </label>
                                            <textarea
                                                value={notes}
                                                onChange={(e) => setNotes(e.target.value)}
                                                placeholder="Ej: Vacaciones, viaje familiar..."
                                                disabled={isSubmitting}
                                                rows={2}
                                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 disabled:opacity-50 resize-none"
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 font-medium"
                                        >
                                            {isSubmitting ? 'Creando...' : 'Crear Ausencia'}
                                        </button>
                                    </form>
                                </div>

                                {/* Absences List */}
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                        Mis Ausencias
                                    </h3>
                                    {isLoading ? (
                                        <div className="text-center py-8">
                                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
                                            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Cargando...</p>
                                        </div>
                                    ) : absences.length === 0 ? (
                                        <div className="text-center py-8 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                                            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                                            <p className="text-gray-600 dark:text-gray-400">No tienes ausencias registradas</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {absences.map((absence) => {
                                                const isPast = new Date(absence.endDate) < new Date();
                                                return (
                                                    <div
                                                        key={absence.id}
                                                        className={`bg-white dark:bg-gray-900 border rounded-lg p-4 ${isPast
                                                                ? 'border-gray-200 dark:border-gray-700 opacity-60'
                                                                : 'border-blue-200 dark:border-blue-800'
                                                            }`}
                                                    >
                                                        <div className="flex items-start justify-between">
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                                                    <span className="font-medium text-gray-900 dark:text-white">
                                                                        {formatDate(absence.startDate)} - {formatDate(absence.endDate)}
                                                                    </span>
                                                                    {isPast && (
                                                                        <span className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                                                                            Pasada
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {absence.notes && (
                                                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                                        {absence.notes}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            {!isPast && (
                                                                <button
                                                                    onClick={() => handleDelete(absence.id)}
                                                                    className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                                    title="Eliminar ausencia"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                                <button
                                    onClick={onClose}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-medium"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
};
