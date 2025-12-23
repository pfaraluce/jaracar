import React, { useState } from 'react';
import { Send, Loader2, Check, AlertCircle, Bell, Info } from 'lucide-react';
import { supabase } from '../services/supabase';

export const AdminNotifications: React.FC = () => {
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!title.trim()) {
            setError('El título es obligatorio para notificaciones globales');
            return;
        }

        if (!message.trim()) {
            setError('El mensaje es obligatorio');
            return;
        }

        setSending(true);
        setError(null);
        setSuccess(false);

        try {
            const { error: invokeError } = await supabase.functions.invoke('broadcast-notification', {
                body: {
                    title: title.trim(),
                    body: message.trim()
                }
            });
            if (invokeError) throw invokeError;

            setSuccess(true);
            setTitle('');
            setMessage('');
            setTimeout(() => setSuccess(false), 5000);
        } catch (err: any) {
            setError(err.message || 'Error al enviar la notificación');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto py-6">
            <div className="space-y-8">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
                        <Bell className="text-zinc-900 dark:text-white" size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">
                            Difusión Global
                        </h2>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            Envía una notificación push a todos los residentes
                        </p>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSend} className="space-y-6">
                    {error && (
                        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3 text-sm text-red-600 dark:text-red-400 animate-in fade-in slide-in-from-top-2">
                            <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                            <span className="font-medium">{error}</span>
                        </div>
                    )}

                    {success && (
                        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-3 text-sm text-emerald-600 dark:text-emerald-400 animate-in fade-in slide-in-from-top-2">
                            <Check size={18} />
                            <span className="font-semibold">Notificación enviada correctamente a todos los usuarios</span>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-zinc-500 mb-2 ml-1">
                                Título
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Ej: Asamblea de residentes hoy"
                                maxLength={50}
                                disabled={sending}
                                className="w-full px-5 py-3 text-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 outline-none disabled:opacity-50 transition-all font-medium"
                            />
                            <p className="text-[10px] text-zinc-400 mt-1.5 ml-1 text-right">
                                {title.length}/50
                            </p>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-zinc-500 mb-2 ml-1">
                                Mensaje
                            </label>
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Escribe el contenido de la difusión..."
                                rows={6}
                                maxLength={200}
                                disabled={sending}
                                className="w-full px-5 py-3 text-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 outline-none resize-none disabled:opacity-50 transition-all font-medium"
                            />
                            <p className="text-[10px] text-zinc-400 mt-1.5 ml-1 text-right">
                                {message.length}/200
                            </p>
                        </div>
                    </div>

                    {/* Info */}
                    <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/20 rounded-xl">
                        <Info size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                            Este mensaje llegará instantáneamente a todos los usuarios que tengan activadas las notificaciones del administrador.
                        </p>
                    </div>

                    <button
                        type="submit"
                        disabled={sending || !title.trim() || !message.trim()}
                        className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                    >
                        {sending ? (
                            <>
                                <Loader2 className="animate-spin" size={18} />
                                Enviando...
                            </>
                        ) : (
                            <>
                                <Send size={18} />
                                Enviar Difusión Global
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};
