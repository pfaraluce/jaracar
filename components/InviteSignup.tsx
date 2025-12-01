import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User as UserIcon, Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { authService } from '../services/auth';
import { supabase } from '../services/supabase';

interface InviteSignupProps {
    inviteEmail: string;
    onSuccess: () => void;
}

export const InviteSignup: React.FC<InviteSignupProps> = ({ inviteEmail, onSuccess }) => {
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validaciones
        if (name.trim().length < 2) {
            setError('El nombre debe tener al menos 2 caracteres');
            return;
        }

        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }

        setLoading(true);

        try {
            // Actualizar la contraseña del usuario invitado
            const { error: updateError } = await supabase.auth.updateUser({
                password: password,
                data: {
                    name: name
                }
            });

            if (updateError) throw updateError;

            // Actualizar el perfil con el nombre y marcar como APPROVED
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { error: profileError } = await supabase
                    .from('profiles')
                    .update({
                        full_name: name,
                        status: 'APPROVED' // Usuario invitado ya está pre-aprobado
                    })
                    .eq('id', user.id);

                if (profileError) {
                    console.error('Error updating profile:', profileError);
                }
            }

            setSuccess(true);
            setTimeout(() => {
                onSuccess();
            }, 2000);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="w-full max-w-md">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-emerald-50 border border-emerald-200 rounded-xl p-8 text-center"
                >
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-4">
                        <CheckCircle size={32} className="text-emerald-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-emerald-900 mb-2">
                        ¡Bienvenido a JaraCar!
                    </h3>
                    <p className="text-emerald-700 text-sm">
                        Tu cuenta ha sido configurada exitosamente. Redirigiendo...
                    </p>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-md">
            <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-zinc-900 mb-2">
                    Completa tu Registro
                </h1>
                <p className="text-zinc-600 text-sm">
                    Has sido invitado a JaraCar. Completa tu información para empezar.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email (solo lectura) */}
                <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">
                        Email
                    </label>
                    <div className="relative">
                        <input
                            type="email"
                            value={inviteEmail}
                            disabled
                            className="w-full pl-4 pr-4 py-2 border border-zinc-300 rounded-lg bg-zinc-50 text-zinc-500 cursor-not-allowed"
                        />
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">Email de invitación (no editable)</p>
                </div>

                {/* Nombre */}
                <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">
                        Nombre Completo
                    </label>
                    <div className="relative">
                        <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900/20 focus:border-zinc-900 outline-none transition-all"
                            placeholder="Tu nombre completo"
                            required
                            minLength={2}
                        />
                    </div>
                </div>

                {/* Contraseña */}
                <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">
                        Contraseña
                    </label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-10 pr-12 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900/20 focus:border-zinc-900 outline-none transition-all"
                            placeholder="••••••••"
                            required
                            minLength={6}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                        >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">Mínimo 6 caracteres</p>
                </div>

                {/* Confirmar Contraseña */}
                <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">
                        Confirmar Contraseña
                    </label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
                        <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full pl-10 pr-12 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900/20 focus:border-zinc-900 outline-none transition-all"
                            placeholder="••••••••"
                            required
                            minLength={6}
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                        >
                            {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
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
                    {loading ? 'Completando registro...' : 'Completar Registro'}
                </button>

                <div className="text-center">
                    <p className="text-xs text-zinc-500">
                        Al completar el registro, tu cuenta será aprobada automáticamente
                    </p>
                </div>
            </form>
        </div>
    );
};
