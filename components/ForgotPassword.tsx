import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { authService } from '../services/auth';

interface ForgotPasswordProps {
    onBack: () => void;
}

export const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onBack }) => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess(false);

        try {
            await authService.resetPassword(email);
            setSuccess(true);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md">
            <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-zinc-900 mb-2">Recuperar Contraseña</h1>
                <p className="text-zinc-600">
                    Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.
                </p>
            </div>

            <AnimatePresence mode="wait">
                {success ? (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center"
                    >
                        <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-100 rounded-full mb-4">
                            <CheckCircle size={24} className="text-emerald-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-emerald-900 mb-2">¡Correo Enviado!</h3>
                        <p className="text-emerald-700 text-sm mb-6">
                            Hemos enviado un enlace de recuperación a <strong>{email}</strong>. Revisa tu bandeja de entrada (y spam).
                        </p>
                        <button
                            onClick={onBack}
                            className="text-sm font-medium text-emerald-700 hover:text-emerald-800 underline"
                        >
                            Volver al inicio de sesión
                        </button>
                    </motion.div>
                ) : (
                    <motion.form
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onSubmit={handleSubmit}
                        className="space-y-4"
                    >
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 mb-1">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900/20 focus:border-zinc-900 outline-none transition-all"
                                    placeholder="tu@email.com"
                                    required
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-zinc-900 text-white py-2 rounded-lg hover:bg-zinc-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
                        </button>

                        <button
                            type="button"
                            onClick={onBack}
                            className="w-full flex items-center justify-center gap-2 text-zinc-500 hover:text-zinc-900 transition-colors text-sm mt-4"
                        >
                            <ArrowLeft size={16} />
                            Volver
                        </button>
                    </motion.form>
                )}
            </AnimatePresence>
        </div>
    );
};
