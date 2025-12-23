import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { messagingService, UserAdminMessage } from '../services/messages';
import { MessageSquare, Send, Loader2, CheckCircle2, Trash2, Reply, Bell, History } from 'lucide-react';
import { AdminNotifications } from './AdminNotifications';
import { UserAvatar } from './UserAvatar';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface MessagingViewProps {
    user: User;
}

export const MessagingView: React.FC<MessagingViewProps> = ({ user }) => {
    const isAdmin = user.role === UserRole.ADMIN;
    const [subTab, setSubTab] = useState<'MESSAGES' | 'BROADCAST'>(isAdmin ? 'MESSAGES' : 'MESSAGES');
    const [messages, setMessages] = useState<UserAdminMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [selectedThread, setSelectedThread] = useState<string | null>(null);
    const [replies, setReplies] = useState<Record<string, UserAdminMessage[]>>({});

    useEffect(() => {
        loadMessages();
    }, [isAdmin]);

    const loadMessages = async () => {
        setLoading(true);
        try {
            if (isAdmin) {
                const data = await messagingService.getAdminMessages();
                setMessages(data);
            } else {
                const data = await messagingService.getMessages();
                setMessages(data);
            }
        } catch (error) {
            console.error('Error loading messages:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = async (e: React.FormEvent, parentId: string | null = null, replyContent: string | null = null) => {
        e.preventDefault();
        const content = replyContent || newMessage;
        if (!content.trim() || sending) return;

        setSending(true);
        try {
            await messagingService.sendMessage(content, parentId);
            if (!parentId) {
                setNewMessage('');
            }
            if (parentId) {
                // Refresh replies for this thread
                const data = await messagingService.getReplies(parentId);
                setReplies(prev => ({ ...prev, [parentId]: data }));
            } else {
                loadMessages();
            }
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setSending(false);
        }
    };

    const handleReply = async (userId: string, parentId: string, content: string) => {
        try {
            await messagingService.replyToMessage(userId, parentId, content);
            // Refresh replies for this thread
            const data = await messagingService.getReplies(parentId);
            setReplies(prev => ({ ...prev, [parentId]: data }));
        } catch (error) {
            console.error('Error replying:', error);
        }
    };

    const handleComplete = async (id: string) => {
        try {
            await messagingService.markAsCompleted(id);
            setMessages(prev => prev.filter(m => m.id !== id));
        } catch (error) {
            console.error('Error completing message:', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de que quieres eliminar este mensaje?')) return;
        try {
            await messagingService.deleteMessage(id);
            setMessages(prev => prev.filter(m => m.id !== id));
        } catch (error) {
            console.error('Error deleting message:', error);
        }
    };

    const loadReplies = async (parentId: string) => {
        if (replies[parentId]) {
            setSelectedThread(selectedThread === parentId ? null : parentId);
            return;
        }

        try {
            const data = await messagingService.getReplies(parentId);
            setReplies(prev => ({ ...prev, [parentId]: data }));
            setSelectedThread(parentId);
        } catch (error) {
            console.error('Error loading replies:', error);
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Sub-tabs for admin */}
            {isAdmin && (
                <div className="flex gap-4 p-4 border-b border-zinc-100 dark:border-zinc-800">
                    <button
                        onClick={() => setSubTab('MESSAGES')}
                        className={`text-sm font-medium transition-colors ${subTab === 'MESSAGES' ? 'text-zinc-900 dark:text-white' : 'text-zinc-400'}`}
                    >
                        Mensajes Recibidos
                    </button>
                    <button
                        onClick={() => setSubTab('BROADCAST')}
                        className={`text-sm font-medium transition-colors ${subTab === 'BROADCAST' ? 'text-zinc-900 dark:text-white' : 'text-zinc-400'}`}
                    >
                        Difusión (Global)
                    </button>
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {subTab === 'BROADCAST' ? (
                    <AdminNotifications />
                ) : (
                    <div className="space-y-6">
                        {/* User View: Input and History */}
                        {!isAdmin && (
                            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-sm">
                                <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-3 flex items-center gap-2">
                                    <MessageSquare size={16} />
                                    Enviar mensaje al administrador
                                </h3>
                                <form onSubmit={handleSendMessage} className="space-y-3">
                                    <textarea
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder="Escribe tu consulta o mensaje aquí..."
                                        rows={3}
                                        className="w-full px-4 py-2 text-sm bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white outline-none resize-none transition-all"
                                    />
                                    <div className="flex justify-end">
                                        <button
                                            type="submit"
                                            disabled={!newMessage.trim() || sending}
                                            className="px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 transition-all active:scale-95"
                                        >
                                            {sending ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                                            Enviar Mensaje
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* Message History / Admin Inbox */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-2 px-1">
                                <History size={16} />
                                {isAdmin ? 'Mensajes de usuarios' : 'Mis mensajes anteriores'}
                            </h3>

                            {loading ? (
                                <div className="flex justify-center p-8">
                                    <Loader2 className="animate-spin text-zinc-400" size={24} />
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="text-center p-8 bg-zinc-50 dark:bg-zinc-800/30 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700">
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400">No hay mensajes recientes</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {messages.filter(m => m.parent_id === null).map((msg) => (
                                        <div key={msg.id} className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
                                            <div className="p-4 border-b border-zinc-50 dark:border-zinc-800/50 flex items-start justify-between gap-4">
                                                <div className="flex gap-3">
                                                    <UserAvatar
                                                        name={msg.sender?.full_name || 'Usuario'}
                                                        imageUrl={msg.sender?.avatar_url}
                                                        size="sm"
                                                    />
                                                    <div>
                                                        <p className="text-sm font-medium text-zinc-900 dark:text-white">
                                                            {msg.sender?.full_name}
                                                        </p>
                                                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                                            {format(new Date(msg.created_at), 'd MMM, HH:mm', { locale: es })}
                                                        </p>
                                                    </div>
                                                </div>
                                                {isAdmin && (
                                                    <div className="flex gap-1">
                                                        <button
                                                            onClick={() => handleComplete(msg.id)}
                                                            className="p-1.5 text-zinc-400 hover:text-green-500 transition-colors"
                                                            title="Marcar como completado"
                                                        >
                                                            <CheckCircle2 size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(msg.id)}
                                                            className="p-1.5 text-zinc-400 hover:text-red-500 transition-colors"
                                                            title="Eliminar"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="p-4">
                                                <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                                                    {msg.content}
                                                </p>
                                            </div>

                                            {/* Thread Footer / Replies Toggle */}
                                            <div className="px-4 pb-4">
                                                <button
                                                    onClick={() => loadReplies(msg.id)}
                                                    className="text-xs font-medium text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 flex items-center gap-1 transition-colors"
                                                >
                                                    <Reply size={14} className="rotate-180" />
                                                    {replies[msg.id]?.length || 0} respuestas
                                                    {selectedThread === msg.id ? ' (Ocultar)' : ' (Ver respuestas)'}
                                                </button>

                                                {/* Replies and Reply Input */}
                                                {selectedThread === msg.id && (
                                                    <div className="mt-4 pt-4 border-t border-zinc-50 dark:border-zinc-800/50 space-y-4">
                                                        {/* Replies List */}
                                                        {replies[msg.id]?.map((reply) => (
                                                            <div key={reply.id} className="flex gap-3 pl-4 border-l-2 border-zinc-100 dark:border-zinc-800">
                                                                <UserAvatar
                                                                    name={reply.sender?.full_name || 'Admin'}
                                                                    imageUrl={reply.sender?.avatar_url}
                                                                    size="sm"
                                                                />
                                                                <div className="flex-1">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <span className="text-xs font-medium text-zinc-900 dark:text-white">
                                                                            {reply.sender?.full_name}
                                                                        </span>
                                                                        <span className="text-[10px] text-zinc-400">
                                                                            {format(new Date(reply.created_at), 'HH:mm', { locale: es })}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                                                        {reply.content}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        ))}

                                                        {/* Reply Input for everyone (if thread selected) */}
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="text"
                                                                placeholder="Escribe una respuesta..."
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                                                                        if (isAdmin) {
                                                                            handleReply(msg.user_id, msg.id, e.currentTarget.value);
                                                                        } else {
                                                                            handleSendMessage(e as any, msg.id, e.currentTarget.value);
                                                                        }
                                                                        e.currentTarget.value = '';
                                                                    }
                                                                }}
                                                                className="flex-1 px-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white outline-none"
                                                            />
                                                            <button className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
                                                                <Send size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
