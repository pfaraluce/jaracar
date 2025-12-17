import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User as UserIcon, Lock, Eye, EyeOff, CheckCircle, Calendar, Hash, Utensils } from 'lucide-react';
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

    // New profile fields
    const [birthday, setBirthday] = useState('');
    const [initials, setInitials] = useState('');
    const [hasDiet, setHasDiet] = useState(false);
    const [dietName, setDietName] = useState('');
    const [dietNotes, setDietNotes] = useState('');
    const [isKitchen, setIsKitchen] = useState(false);

    useEffect(() => {
        const checkRole = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
                if (profile?.role === 'KITCHEN') {
                    setIsKitchen(true);
                    setName('Administración'); // Default name for instrumental profile
                }
            }
        };
        checkRole();
    }, []);

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

        if (initials && initials.length > 3) {
            setError('Las siglas no pueden tener más de 3 caracteres');
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
                const profileUpdates: any = {
                    full_name: name,
                    status: 'APPROVED', // Usuario invitado ya está pre-aprobado
                };

                // Add optional fields if provided
                if (birthday) profileUpdates.birthday = birthday;
                if (initials) profileUpdates.initials = initials.toUpperCase();
                if (hasDiet) {
                    profileUpdates.has_diet = true;
                    if (dietName) profileUpdates.diet_name = dietName;
                    if (dietNotes) profileUpdates.diet_notes = dietNotes;
                }

                const { error: profileError } = await supabase
                    .from('profiles')
                    .update(profileUpdates)
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
                        ¡Bienvenido a Quango!
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
                    Has sido invitado a Quango. Completa tu información para empezar.
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

                {/* Nombre - Hide for Kitchen */}
                {!isKitchen && (
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
                                required={!isKitchen}
                                minLength={2}
                            />
                        </div>
                    </div>
                )}

                {!isKitchen && (
                    <>
                        {/* Birthday */}
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 mb-1">
                                Cumpleaños (opcional)
                            </label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
                                <input
                                    type="date"
                                    value={birthday}
                                    onChange={(e) => setBirthday(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900/20 focus:border-zinc-900 outline-none transition-all"
                                />
                            </div>
                        </div>

                        {/* Initials */}
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 mb-1">
                                Siglas (opcional, máx. 3)
                            </label>
                            <div className="relative">
                                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
                                <input
                                    type="text"
                                    value={initials}
                                    onChange={(e) => setInitials(e.target.value.slice(0, 3).toUpperCase())}
                                    maxLength={3}
                                    className="w-full pl-10 pr-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900/20 focus:border-zinc-900 outline-none transition-all uppercase"
                                    placeholder="ABC"
                                />
                            </div>
                        </div>

                        {/* Diet Section */}
                        <div className="border border-zinc-200 rounded-lg p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Utensils className="text-zinc-400" size={20} />
                                    <label className="text-sm font-medium text-zinc-700">¿Tienes alguna dieta especial?</label>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setHasDiet(!hasDiet)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${hasDiet ? 'bg-zinc-900' : 'bg-zinc-200'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${hasDiet ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>

                            {hasDiet && (
                                <div className="space-y-3 pt-2">
                                    <div>
                                        <label className="block text-xs font-medium text-zinc-600 mb-1">Nombre de la dieta</label>
                                        <input
                                            type="text"
                                            value={dietName}
                                            onChange={(e) => setDietName(e.target.value)}
                                            placeholder="Ej: Sin gluten, Vegana..."
                                            className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900/20 focus:border-zinc-900 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-zinc-600 mb-1">Notas adicionales (opcional)</label>
                                        <textarea
                                            value={dietNotes}
                                            onChange={(e) => setDietNotes(e.target.value)}
                                            placeholder="Detalles sobre alergias, restricciones..."
                                            rows={2}
                                            className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900/20 focus:border-zinc-900 outline-none resize-none"
                                        />
                                    </div>
                                    <p className="text-xs text-zinc-500">Se te asignará un número de dieta automáticamente</p>
                                </div>
                            )}
                        </div>
                    </>
                )}

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
