import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { messagingService, UserAdminMessage } from '../services/messages';
import { profileService } from '../services/profiles';
import { MessageSquare, Send, Loader2, CheckCircle2, Trash2, Reply, Bell, History, Search, Plus, X, User as UserIcon } from 'lucide-react';
import { AdminNotifications } from './AdminNotifications';
import { UserAvatar } from './UserAvatar';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface MessagingViewProps {
    user: User;
}

export const MessagingView: React.FC<MessagingViewProps> = ({ user }) => {
    const isAdmin = user.role === UserRole.ADMIN;
    const [viewMode, setViewMode] = useState<'NOTIFICATIONS' | 'CHATS'>(isAdmin ? 'CHATS' : 'CHATS');
    const [messages, setMessages] = useState<UserAdminMessage[]>([]);
    const [profiles, setProfiles] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
    const [replies, setReplies] = useState<Record<string, UserAdminMessage[]>>({});
    const [searchQuery, setSearchQuery] = useState('');
    const [showNewChatModal, setShowNewChatModal] = useState(false);
    const [userSearchQuery, setUserSearchQuery] = useState('');
    const [sendPushOnReply, setSendPushOnReply] = useState(true);

    useEffect(() => {
        loadMessages();
        if (isAdmin) {
            loadProfiles();
        }
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

    const loadProfiles = async () => {
        try {
            const data = await profileService.getAllProfiles();
            setProfiles(data.filter(u => u.status === 'APPROVED' && u.role !== UserRole.KITCHEN));
        } catch (err) {
            console.error('Error loading profiles:', err);
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
                loadMessages();
            } else {
                const data = await messagingService.getReplies(parentId);
                setReplies(prev => ({ ...prev, [parentId]: data }));
            }
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setSending(false);
        }
    };

    const handleReply = async (userId: string, parentId: string, content: string, sendNotification: boolean = true) => {
        if (!content.trim()) return;
        try {
            await messagingService.replyToMessage(userId, parentId, content, sendNotification);
            const data = await messagingService.getReplies(parentId);
            setReplies(prev => ({ ...prev, [parentId]: data }));
        } catch (error) {
            console.error('Error replying:', error);
        }
    };

    const handleStartNewChat = async (targetUser: User) => {
        setSending(true);
        try {
            // Check if thread already exists
            const existingThread = messages.find(m => m.user_id === targetUser.id && m.parent_id === null);
            if (existingThread) {
                selectThread(existingThread);
            } else {
                setSelectedThreadId(targetUser.id);
                setViewMode('CHATS');
            }
            setShowNewChatModal(false);
            setUserSearchQuery('');
        } catch (err) {
            console.error('Error starting new chat:', err);
        } finally {
            setSending(false);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('¿Eliminar esta conversación?')) return;
        try {
            await messagingService.deleteMessage(id);
            setMessages(prev => prev.filter(m => m.id !== id));
            if (selectedThreadId === id) setSelectedThreadId(null);
        } catch (error) {
            console.error('Error deleting message:', error);
        }
    };

    const selectThread = async (msg: UserAdminMessage) => {
        setViewMode('CHATS');
        setSelectedThreadId(msg.id);
        
        if (isAdmin && !msg.is_read) {
            try {
                await messagingService.markAsRead(msg.user_id);
                setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_read: true } : m));
            } catch (err) {
                console.warn('Failed to mark as read:', err);
            }
        }
        
        try {
            const data = await messagingService.getReplies(msg.id);
            setReplies(prev => ({ ...prev, [msg.id]: data }));
        } catch (error) {
            console.error('Error loading replies:', error);
        }
    };

    const filteredMessages = messages.filter(m => {
        if (m.parent_id !== null) return false;
        if (!searchQuery.trim()) return true;
        const name = m.sender?.full_name?.toLowerCase() || '';
        const content = m.content.toLowerCase();
        const query = searchQuery.toLowerCase();
        return name.includes(query) || content.includes(query);
    });

    const filteredProfiles = profiles.filter(p => {
        const query = userSearchQuery.toLowerCase();
        return p.name.toLowerCase().includes(query) || p.email.toLowerCase().includes(query);
    });

    const selectedMsg = messages.find(m => m.id === selectedThreadId);
    const temporaryUser = !selectedMsg && selectedThreadId ? profiles.find(p => p.id === selectedThreadId) : null;

    if (!isAdmin) {
        return (
            <div className="flex flex-col h-full overflow-hidden">
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar lg:p-8">
                     <div className="max-w-4xl mx-auto space-y-8">
                         <div className="bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm rounded-3xl p-8 border border-zinc-100 dark:border-zinc-800/50">
                            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-6 flex items-center gap-2">
                                <MessageSquare size={18} className="text-zinc-400" />
                                Nueva Consulta
                            </h3>
                            <form 
                                onSubmit={(e) => {
                                    handleSendMessage(e);
                                }} 
                                className="space-y-4"
                            >
                                <textarea
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="¿En qué podemos ayudarte?"
                                    rows={4}
                                    className="w-full px-5 py-3 text-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 outline-none resize-none transition-all font-medium"
                                />
                                <div className="flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={!newMessage.trim() || sending}
                                        className="px-6 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl text-sm font-medium flex items-center gap-2 disabled:opacity-50 transition-all hover:opacity-90 active:scale-95"
                                    >
                                        {sending ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                                        Enviar
                                    </button>
                                </div>
                            </form>
                        </div>

                        <div className="space-y-4 pb-12">
                            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-1">
                                Historial
                            </h3>
                            {loading ? (
                                <div className="flex justify-center p-12">
                                    <Loader2 className="animate-spin text-zinc-300" size={24} />
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="text-center p-8 bg-zinc-50/50 dark:bg-zinc-900/50 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800">
                                    <p className="text-sm text-zinc-500 font-medium">No hay mensajes anteriores</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {messages.filter(m => m.parent_id === null).map((msg) => (
                                        <div key={msg.id} className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm rounded-2xl border border-zinc-100 dark:border-zinc-800 overflow-hidden hover:border-zinc-200 dark:hover:border-zinc-700 transition-colors">
                                            <div className="p-4 border-b border-zinc-50 dark:border-zinc-800/50 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <UserAvatar name={msg.sender?.full_name || 'U'} imageUrl={msg.sender?.avatar_url} size="xs" />
                                                    <div>
                                                        <p className="text-sm font-medium text-zinc-900 dark:text-white">{msg.sender?.full_name}</p>
                                                        <p className="text-xs text-zinc-400">{format(new Date(msg.created_at), 'd MMM, HH:mm', { locale: es })}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="p-5">
                                                <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                            </div>
                                            <div className="px-5 pb-5">
                                                <button
                                                    onClick={() => selectThread(msg)}
                                                    className="text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 flex items-center gap-2 transition-colors"
                                                >
                                                    <Reply size={14} className="rotate-180" />
                                                    {replies[msg.id]?.length || 0} respuestas
                                                    {selectedThreadId === msg.id ? ' (Ocultar)' : ' (Ver conversación)'}
                                                </button>
                                                
                                                {selectedThreadId === msg.id && (
                                                    <div className="mt-4 pt-4 border-t border-zinc-50 dark:border-zinc-800/50 space-y-4">
                                                        {replies[msg.id]?.map((reply) => (
                                                            <div key={reply.id} className="flex gap-3 pl-3 border-l-2 border-zinc-100 dark:border-zinc-800">
                                                                <div className="flex-1">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <span className="text-xs font-semibold text-zinc-900 dark:text-white">{reply.sender?.full_name}</span>
                                                                        <span className="text-[10px] text-zinc-400">{format(new Date(reply.created_at), 'HH:mm', { locale: es })}</span>
                                                                    </div>
                                                                    <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{reply.content}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        <form 
                                                            onSubmit={(e) => {
                                                                e.preventDefault();
                                                                const input = (e.currentTarget.elements.namedItem('reply') as HTMLInputElement);
                                                                if (!input.value.trim()) return;
                                                                handleSendMessage(e as any, msg.id, input.value);
                                                                input.value = '';
                                                            }}
                                                            className="flex gap-2"
                                                        >
                                                            <input
                                                                name="reply"
                                                                type="text"
                                                                placeholder="Escribe una respuesta..."
                                                                className="flex-1 px-4 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white outline-none"
                                                            />
                                                            <button type="submit" className="p-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg hover:opacity-90"><Send size={16} /></button>
                                                        </form>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full overflow-hidden">
            {/* Sidebar */}
            <div className="w-80 flex-shrink-0 flex flex-col border-r border-zinc-100 dark:border-zinc-800/50 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm">
                <div className="p-5 space-y-5">
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight px-1">Mensajería</h2>
                    
                    {/* Navigation Tabs */}
                    <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800/50 rounded-xl">
                        <button
                            onClick={() => setViewMode('NOTIFICATIONS')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-lg transition-all ${
                                viewMode === 'NOTIFICATIONS' 
                                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' 
                                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                            }`}
                        >
                            <Bell size={14} />
                            Notificaciones
                        </button>
                        <button
                            onClick={() => setViewMode('CHATS')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-lg transition-all ${
                                viewMode === 'CHATS' 
                                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' 
                                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                            }`}
                        >
                            <MessageSquare size={14} />
                            Chats
                        </button>
                    </div>

                    {viewMode === 'CHATS' && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between px-1">
                                <span className="text-xs font-medium text-zinc-500">Recientes</span>
                                <button 
                                    onClick={() => setShowNewChatModal(true)}
                                    className="p-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full hover:scale-105 active:scale-95 transition-all shadow-sm"
                                >
                                    <Plus size={14} />
                                </button>
                            </div>
                            <div className="relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-zinc-900 dark:group-focus-within:text-white transition-colors" size={14} />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Buscar chat..."
                                    className="w-full pl-9 pr-4 py-2 text-xs bg-white dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white outline-none transition-all"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {viewMode === 'CHATS' && (
                    <div className="flex-1 overflow-y-auto custom-scrollbar px-2">
                        {loading ? (
                            <div className="flex justify-center p-8">
                                <Loader2 className="animate-spin text-zinc-200" size={20} />
                            </div>
                        ) : filteredMessages.length === 0 ? (
                            <div className="p-8 text-center">
                                <MessageSquare className="mx-auto text-zinc-200 dark:text-zinc-800 mb-3" size={32} />
                                <p className="text-xs text-zinc-400 font-medium">Sin conversaciones</p>
                            </div>
                        ) : (
                            <div className="space-y-1 pb-4">
                                {filteredMessages.map((msg) => (
                                    <button
                                        key={msg.id}
                                        onClick={() => selectThread(msg)}
                                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left relative group ${
                                            selectedThreadId === msg.id 
                                            ? 'bg-white dark:bg-zinc-800 shadow-sm border border-zinc-100 dark:border-zinc-700/50' 
                                            : 'hover:bg-white/50 dark:hover:bg-zinc-800/30'
                                        }`}
                                    >
                                        <div className="relative flex-shrink-0">
                                            <UserAvatar name={msg.sender?.full_name || 'U'} imageUrl={msg.sender?.avatar_url} size="xs" />
                                            {!msg.is_read && (
                                                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 border-2 border-white dark:border-zinc-950 rounded-full" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className={`text-sm truncate ${!msg.is_read ? 'font-semibold text-zinc-900 dark:text-white' : 'font-medium text-zinc-700 dark:text-zinc-300'}`}>
                                                    {msg.sender?.full_name}
                                                </p>
                                                <span className="text-[10px] text-zinc-400 tabular-nums">
                                                    {format(new Date(msg.created_at), 'HH:mm', { locale: es })}
                                                </span>
                                            </div>
                                            <p className={`text-xs truncate ${!msg.is_read ? 'text-zinc-900 dark:text-white font-medium' : 'text-zinc-500 dark:text-zinc-500'}`}>
                                                {msg.is_global ? '📢 Notificación Global' : msg.content}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Content Area */}
            <div className="flex-1 flex flex-col bg-white/30 dark:bg-zinc-950/30 backdrop-blur-md">
                {viewMode === 'NOTIFICATIONS' ? (
                    <div className="flex-1 overflow-y-auto px-8 lg:px-12 py-6">
                        <AdminNotifications />
                    </div>
                ) : (selectedMsg || temporaryUser) ? (
                    <div className="flex flex-col h-full">
                        {/* Conversation Header */}
                        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800/50 flex items-center justify-between bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm">
                            <div className="flex items-center gap-3">
                                <UserAvatar 
                                    name={selectedMsg?.sender?.full_name || temporaryUser?.name || 'U'} 
                                    imageUrl={selectedMsg?.sender?.avatar_url || temporaryUser?.avatarUrl} 
                                    size="sm" 
                                />
                                <div>
                                    <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                                        {selectedMsg?.sender?.full_name || temporaryUser?.name}
                                    </p>
                                    <div className="flex items-center gap-1.5">
                                        <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium tracking-wide">
                                            {selectedMsg?.is_global ? 'Broadcast' : 'Chat Directo'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {selectedMsg && (
                                    <button
                                        onClick={(e) => handleDelete(selectedMsg.id, e)}
                                        className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-all"
                                        title="Eliminar conversación"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                )}
                                {temporaryUser && (
                                    <button 
                                        onClick={() => setSelectedThreadId(null)}
                                        className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all"
                                    >
                                        <X size={18} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                            {selectedMsg ? (
                                <>
                                    {/* Root Message */}
                                    <div className="flex gap-3">
                                        <div className="flex-shrink-0 mt-1">
                                            <UserAvatar name={selectedMsg.sender?.full_name || 'U'} imageUrl={selectedMsg.sender?.avatar_url} size="xs" />
                                        </div>
                                        <div className="space-y-1 max-w-[75%]">
                                            {selectedMsg.is_global && (
                                                <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-1 block">
                                                    📢 Notificación Global
                                                </span>
                                            )}
                                            <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl rounded-tl-none border border-zinc-100 dark:border-zinc-800 shadow-sm">
                                                <p className="text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap">
                                                    {selectedMsg.content}
                                                </p>
                                            </div>
                                            <p className="text-[10px] text-zinc-400 ml-1">
                                                {format(new Date(selectedMsg.created_at), 'd MMM, HH:mm', { locale: es })}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Replies */}
                                    {replies[selectedMsg.id]?.map((reply) => {
                                        const isFromMe = reply.sender_id === user.id;
                                        return (
                                            <div key={reply.id} className={`flex gap-3 ${isFromMe ? 'flex-row-reverse' : ''}`}>
                                                <div className="flex-shrink-0 mt-1">
                                                    <UserAvatar name={reply.sender?.full_name || 'U'} imageUrl={reply.sender?.avatar_url} size="xs" />
                                                </div>
                                                <div className={`space-y-1 max-w-[75%] flex flex-col ${isFromMe ? 'items-end' : 'items-start'}`}>
                                                    <div className={`p-4 rounded-2xl shadow-sm ${
                                                        isFromMe 
                                                        ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-tr-none' 
                                                        : 'bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border border-zinc-100 dark:border-zinc-800 rounded-tl-none'
                                                    }`}>
                                                        <p className="text-sm leading-relaxed">{reply.content}</p>
                                                    </div>
                                                    <p className={`text-[10px] text-zinc-400 flex items-center gap-1 ${isFromMe ? 'mr-1' : 'ml-1'}`}>
                                                        {format(new Date(reply.created_at), 'HH:mm', { locale: es })}
                                                        {isFromMe && <CheckCircle2 size={10} className="text-emerald-500" />}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </>
                            ) : temporaryUser && (
                                <div className="flex flex-col items-center justify-center h-full opacity-50">
                                    <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                                        <UserIcon size={32} className="text-zinc-400" />
                                    </div>
                                    <p className="text-sm font-medium text-zinc-500">Inicia la conversación con {temporaryUser.name}</p>
                                </div>
                            )}
                        </div>

                        {/* Thread Input Area */}
                        <div className="px-6 py-4 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm border-t border-zinc-100 dark:border-zinc-800/50">
                            <form 
                                onSubmit={async (e) => {
                                    e.preventDefault();
                                    const input = (e.currentTarget.elements.namedItem('reply') as HTMLInputElement);
                                    const content = input.value.trim();
                                    if (!content) return;

                                    if (selectedMsg) {
                                        if (sendPushOnReply) {
                                            handleReply(selectedMsg.user_id, selectedMsg.id, content, true);
                                        } else {
                                             handleReply(selectedMsg.user_id, selectedMsg.id, content, false);
                                        }
                                    } else if (temporaryUser) {
                                        await messagingService.startDirectMessage(temporaryUser.id, content, sendPushOnReply);
                                        loadMessages();
                                        setSelectedThreadId(null);
                                    }
                                    input.value = '';
                                }}
                                className="max-w-4xl mx-auto space-y-2"
                            >
                                <div className="flex gap-3 items-end">
                                    <div className="flex-1">
                                        <textarea
                                            name="reply"
                                            rows={1}
                                            placeholder="Escribir mensaje..."
                                            onInput={(e) => {
                                                const el = e.currentTarget;
                                                el.style.height = 'auto';
                                                el.style.height = Math.min(el.scrollHeight, 120) + 'px';
                                            }}
                                            className="w-full px-4 py-3 text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white outline-none resize-none transition-all placeholder:text-zinc-400 placeholder:font-medium"
                                        />
                                    </div>
                                    <button 
                                        type="submit"
                                        className="p-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg flex-shrink-0"
                                    >
                                        <Send size={20} />
                                    </button>
                                </div>
                                <div className="flex justify-end items-center">
                                    <button
                                        type="button"
                                        onClick={() => setSendPushOnReply(!sendPushOnReply)}
                                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full transition-all text-[10px] font-medium border ${
                                            sendPushOnReply 
                                            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400' 
                                            : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-400'
                                        }`}
                                    >
                                        <Bell size={10} className={sendPushOnReply ? '' : 'text-zinc-300'} />
                                        Notificación Push
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                        <div className="w-20 h-20 bg-zinc-100/50 dark:bg-zinc-900/50 rounded-3xl flex items-center justify-center mb-6 text-zinc-300 dark:text-zinc-700">
                            <MessageSquare size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">Mensajería Admin</h3>
                        <p className="text-sm text-zinc-500 max-w-xs leading-relaxed">
                            Selecciona una conversación o envía una nueva notificación global.
                        </p>
                    </div>
                )}
            </div>

            {/* New Chat Modal */}
            {showNewChatModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/20 backdrop-blur-sm animate-in fade-in">
                    <div className="w-full max-w-md bg-white dark:bg-zinc-950 rounded-3xl shadow-2xl border border-zinc-100 dark:border-zinc-800 overflow-hidden">
                        <div className="p-5 border-b border-zinc-50 dark:border-zinc-800 flex items-center justify-between">
                            <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider">Nuevo Chat</h3>
                            <button onClick={() => setShowNewChatModal(false)} className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="relative group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                                <input
                                    type="text"
                                    autoFocus
                                    value={userSearchQuery}
                                    onChange={(e) => setUserSearchQuery(e.target.value)}
                                    placeholder="Buscar usuario..."
                                    className="w-full pl-11 pr-4 py-3 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white outline-none font-medium"
                                />
                            </div>
                            <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-1">
                                {filteredProfiles.length === 0 ? (
                                    <p className="text-center py-8 text-xs font-medium text-zinc-400">No se encontraron usuarios</p>
                                ) : (
                                    filteredProfiles.map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => handleStartNewChat(p)}
                                            className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all text-left"
                                        >
                                            <UserAvatar name={p.name} imageUrl={p.avatarUrl} size="xs" />
                                            <div>
                                                <p className="text-sm font-semibold text-zinc-900 dark:text-white">{p.name}</p>
                                                <p className="text-xs text-zinc-500">{p.role}</p>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
