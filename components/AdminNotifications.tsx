import React, { useState } from 'react';
import { Send, Loader2, Check, AlertCircle, Bell } from 'lucide-react';
import { supabase } from '../services/supabase';

export const AdminNotifications: React.FC = () => {
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSendBroadcast = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!title.trim() || !message.trim()) {
            setError('El título y el mensaje son obligatorios');
            return;
        }

        setSending(true);
        setError(null);
        setSuccess(false);

        try {
            const { data, error: invokeError } = await supabase.functions.invoke('broadcast-notification', {
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
        <div className="max-w-2xl mx-auto">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
                {/* Header */}
                <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                            <Bell className="text-zinc-900 dark:text-white" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                                Enviar Notificación
                            </h2>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                Envía un mensaje a todos los usuarios que tengan activadas las notificaciones de administración
                            </p>
                        </div>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSendBroadcast} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2 text-sm text-red-600 dark:text-red-400">
                            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    {success && (
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                            <Check size={16} />
                            <span>Notificación enviada correctamente</span>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-zinc-900 dark:text-white mb-2">
                            Título
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Ej: Recordatorio importante"
                            maxLength={50}
                            disabled={sending}
                            className="w-full px-4 py-2.5 text-sm bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white outline-none disabled:opacity-50"
                        />
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                            {title.length}/50 caracteres
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-900 dark:text-white mb-2">
                            Mensaje
                        </label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Escribe tu mensaje aquí..."
                            rows={4}
                            maxLength={200}
                            disabled={sending}
                            className="w-full px-4 py-2.5 text-sm bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white outline-none resize-none disabled:opacity-50"
                        />
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                            {message.length}/200 caracteres
                        </p>
                    </div>

                    {/* Preview */}
                    {(title || message) && (
                        <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700">
                            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">
                                Vista previa
                            </p>
                            <div className="bg-white dark:bg-zinc-900 rounded-lg p-3 shadow-sm border border-zinc-200 dark:border-zinc-700">
                                {title && (
                                    <p className="font-semibold text-sm text-zinc-900 dark:text-white mb-1">
                                        {title}
                                    </p>
                                )}
                                {message && (
                                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                        {message}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={sending || !title.trim() || !message.trim()}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {sending ? (
                            <>
                                <Loader2 className="animate-spin" size={18} />
                                Enviando...
                            </>
                        ) : (
                            <>
                                <Send size={18} />
                                Enviar a todos los usuarios
                            </>
                        )}
                    </button>

                    <p className="text-xs text-center text-zinc-500 dark:text-zinc-400">
                        Solo recibirán la notificación los usuarios que tengan activadas las notificaciones de administración
                    </p>
                </form>
            </div>
        </div>
    );
};
