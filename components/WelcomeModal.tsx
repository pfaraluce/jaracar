import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, X } from 'lucide-react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

interface WelcomeModalProps {
    userName: string;
    onStartTutorial: () => void;
    onSkip: () => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ userName, onStartTutorial, onSkip }) => {
    useBodyScrollLock(true);
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl p-8 text-center"
            >
                {/* Close button */}
                <button
                    onClick={onSkip}
                    className="absolute top-4 right-4 p-2 hover:bg-zinc-100 rounded-full text-zinc-400 hover:text-zinc-900 transition-colors"
                >
                    <X size={20} />
                </button>

                {/* Icon */}
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                    className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-zinc-900 to-zinc-700 rounded-2xl mb-6"
                >
                    <Sparkles size={32} className="text-white" />
                </motion.div>

                {/* Title */}
                <motion.h1
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-2xl font-bold text-zinc-900 mb-2"
                >
                    ¡Bienvenido a JaraCar, {userName}!
                </motion.h1>

                {/* Description */}
                <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-zinc-600 mb-8 leading-relaxed"
                >
                    Tu plataforma para gestionar reservas de vehículos de forma simple y eficiente.
                    Reserva coches, marca tus favoritos y mantén todo organizado en un solo lugar.
                </motion.p>

                {/* Actions */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="flex flex-col sm:flex-row gap-3"
                >
                    <button
                        onClick={onSkip}
                        className="flex-1 px-6 py-3 text-sm font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors"
                    >
                        Explorar por mi cuenta
                    </button>
                    <button
                        onClick={onStartTutorial}
                        className="flex-1 px-6 py-3 text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg"
                    >
                        Comenzar tutorial
                        <ArrowRight size={16} />
                    </button>
                </motion.div>
            </motion.div>
        </div>
    );
};
