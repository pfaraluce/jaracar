import React, { useState } from 'react';
import { X, Hotel } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CreateRoomModalProps {
    isOpen: boolean;
    onClose: () => void;
    onRoomCreated: () => void;
}

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({ isOpen, onClose, onRoomCreated }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [totalBeds, setTotalBeds] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!name.trim()) {
            setError('El nombre de la habitación es obligatorio');
            return;
        }

        if (totalBeds < 1 || totalBeds > 20) {
            setError('El número de camas debe estar entre 1 y 20');
            return;
        }

        setIsLoading(true);

        try {
            const { roomsService } = await import('../services/rooms');
            await roomsService.createRoom(name.trim(), description.trim() || undefined, totalBeds);

            // Reset form
            setName('');
            setDescription('');
            setTotalBeds(1);

            onRoomCreated();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Error al crear la habitación');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        if (!isLoading) {
            setName('');
            setDescription('');
            setTotalBeds(1);
            setError('');
            onClose();
        }
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
                        onClick={handleClose}
                    />

                    {/* Modal */}
                    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white/20 rounded-lg">
                                            <Hotel className="w-6 h-6" />
                                        </div>
                                        <h2 className="text-2xl font-bold">Nueva Habitación</h2>
                                    </div>
                                    <button
                                        onClick={handleClose}
                                        disabled={isLoading}
                                        className="p-2 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                {error && (
                                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-red-800 dark:text-red-200 text-sm">
                                        {error}
                                    </div>
                                )}

                                {/* Room Name */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Nombre de la Habitación *
                                    </label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Ej: Habitación 101"
                                        disabled={isLoading}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 disabled:opacity-50"
                                        required
                                    />
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Descripción (opcional)
                                    </label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Ej: Planta baja, cerca del comedor"
                                        disabled={isLoading}
                                        rows={3}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 disabled:opacity-50 resize-none"
                                    />
                                </div>

                                {/* Total Beds */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Número de Camas *
                                    </label>
                                    <input
                                        type="number"
                                        value={totalBeds}
                                        onChange={(e) => setTotalBeds(parseInt(e.target.value) || 1)}
                                        min={1}
                                        max={20}
                                        disabled={isLoading}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
                                        required
                                    />
                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                        Entre 1 y 20 camas
                                    </p>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={handleClose}
                                        disabled={isLoading}
                                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 font-medium"
                                    >
                                        {isLoading ? 'Creando...' : 'Crear Habitación'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
};
