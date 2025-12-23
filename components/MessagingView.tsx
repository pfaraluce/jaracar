import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, UserRole, UserAdminMessage } from '../types';
import { messagingService } from '../services/messages';
import { profileService } from '../services/profiles';
import { MessageSquare, Send, Loader2, Search, User as UserIcon, Plus, X, Globe, Bell, Trash2 } from 'lucide-react';
import { UserAvatar } from './UserAvatar';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { AdminNotifications } from './AdminNotifications';
import { ConfirmModal } from './ConfirmModal';

interface MessagingViewProps {
    user: User;
    onUnreadUpdate?: () => void;
}

export const MessagingView: React.FC<MessagingViewProps> = ({ user, onUnreadUpdate }) => {
    const isAdmin = user.role === UserRole.ADMIN;
    
    // State
    const [viewMode, setViewMode] = useState<'NOTIFICATIONS' | 'CHATS'>('CHATS');
    const [messages, setMessages] = useState<UserAdminMessage[]>([]);
    const [availableContacts, setAvailableContacts] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    
    // Conversation State
    const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null); // 'GLOBAL', 'SUPPORT', or UserID
    const [newMessage, setNewMessage] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    
    // UI State
    const [showNewChatModal, setShowNewChatModal] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Delete Confirmation State
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [threadToDelete, setThreadToDelete] = useState<string | null>(null);

    // Initial Load
    useEffect(() => {
        loadData();
    }, [user.id]);

    // Auto-scroll to bottom of chat
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [selectedPartnerId, messages]);

    const loadData = async () => {
        setLoading(true);
        try {
            // 1. Fetch all messages (The updated getMessages handles Admin logic too)
            const msgs = await messagingService.getMessages();
            setMessages(msgs);

            // 2. Load Profiles for "New Chat"
            const profiles = await profileService.getAllProfiles();
            if (isAdmin) {
                // Admin: specific users (exclude myself AND Kitchen role)
                const contacts = profiles.filter(p => p.id !== user.id && p.status === 'APPROVED' && p.role !== UserRole.KITCHEN);
                setAvailableContacts(contacts);
            } else {
                 // User: Only active Admins
                const admins = profiles.filter(p => p.role === UserRole.ADMIN && p.status === 'APPROVED');
                setAvailableContacts(admins);
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    // --- Grouping Logic ---
    const threads = useMemo(() => {
        const groups: Record<string, UserAdminMessage[]> = {};
        
        messages.forEach(msg => {
            let key = '';

            if (msg.is_global) {
                key = 'GLOBAL';
            } else if (!msg.receiver_id && !msg.sender_id) {
                 // Should not happen, but fallback
                 key = 'SUPPORT'; 
            } else if (!msg.receiver_id) {
                // Legacy Ticket (no receiver). 
                // If I am Admin, I see these. Group by sender (User).
                // If I am User, I sent this. Treat as 'SUPPORT'.
                if (isAdmin) {
                    key = msg.sender_id;
                } else {
                    key = 'SUPPORT';
                }
            } else {
                // Direct Message
                // My Partner is the one who is NOT me.
                const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
                key = partnerId || 'UNKNOWN';
            }

            if (!groups[key]) groups[key] = [];
            groups[key].push(msg);
        });

        // Sort messages in each thread
        Object.keys(groups).forEach(key => {
            groups[key].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        });

        // Sort threads by latest message
        return Object.entries(groups).sort(([, aMsgs], [, bMsgs]) => {
            const lastA = aMsgs[aMsgs.length - 1];
            const lastB = bMsgs[bMsgs.length - 1];
            return new Date(lastB.created_at).getTime() - new Date(lastA.created_at).getTime();
        });
    }, [messages, user.id, isAdmin]);

    // Derived Data for Selected Thread
    const activeThreadMessages = selectedPartnerId ? (threads.find(([key]) => key === selectedPartnerId)?.[1] || []) : [];
    
    // Resolve Partner Info
    const getPartnerInfo = (key: string) => {
        if (key === 'GLOBAL') return { name: 'Avisos Globales', avatar: null, isSpecial: true, icon: Globe };
        if (key === 'SUPPORT') return { name: 'Soporte General', avatar: null, isSpecial: true, icon: MessageSquare };
        
        // Find in messages (best effort)
        const sample = threads.find(([k]) => k === key)?.[1][0];
        if (sample) {
            const isMeSender = sample.sender_id === user.id;
            const partner = isMeSender ? sample.receiver : sample.sender;
            return { 
                name: partner?.full_name || 'Usuario', 
                avatar: partner?.avatar_url,
                isSpecial: false,
                icon: null
            };
        }
        
        // Fallback for empty new chat
        const contact = availableContacts.find(a => a.id === key);
        if (contact) return { name: contact.name, avatar: contact.avatarUrl, isSpecial: false, icon: null };
        
        return { name: 'Desconocido', avatar: null, isSpecial: false, icon: UserIcon };
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedPartnerId || sending) return;

        setSending(true);
        try {
            let actualReceiverId: string | null = null;
            
            if (selectedPartnerId === 'GLOBAL') {
                 if (!isAdmin) {
                     const globalMsgs = threads.find(([k]) => k === 'GLOBAL')?.[1] || [];
                     const lastAdminMsg = [...globalMsgs].reverse().find(m => m.sender_id !== user.id);
                     
                     if (lastAdminMsg) {
                         // Switch to direct chat with admin
                         actualReceiverId = lastAdminMsg.sender_id;
                         setSelectedPartnerId(actualReceiverId);
                     } else {
                         alert("No hay un administrador a quien responder en este hilo.");
                         setSending(false);
                         return;
                     }
                 } else {
                     actualReceiverId = null; // Broadcast context
                 }
            } else if (selectedPartnerId === 'SUPPORT') {
                actualReceiverId = null;
            } else {
                actualReceiverId = selectedPartnerId;
            }

            await messagingService.sendMessage(newMessage, null, actualReceiverId);
            setNewMessage('');
            loadData();
        } catch (error) {
            console.error('Error sending:', error);
        } finally {
            setSending(false);
        }
    };

    const handleMarkAsRead = async (partnerId: string) => {
        await messagingService.markAsRead(partnerId);
        
        // Optimistic update
        setMessages(prev => prev.map(m => {
            const isRelevant = 
                (partnerId === 'GLOBAL' && m.is_global) || 
                (partnerId === 'SUPPORT' && !m.receiver_id && !m.is_global) ||
                (m.sender_id === partnerId);
            return isRelevant ? { ...m, is_read: true } : m;
        }));
        
        // Re-fetch count
        if (onUnreadUpdate) {
            onUnreadUpdate();
        } else {
            messagingService.getUnreadCount();
        }
    };

    const handleDeleteThreadClick = (key: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setThreadToDelete(key);
        setDeleteConfirmOpen(true);
    };

    const confirmDeleteThread = async () => {
        if (!threadToDelete) return;
        const key = threadToDelete;

        try {
            const target = key === 'SUPPORT' ? 'SUPPORT' : key;
            if (key === 'GLOBAL') {
                alert('No se pueden eliminar los avisos globales.');
                return;
            }
            
            await messagingService.deleteThread(target);
            
            setMessages(prev => {
                return prev.filter(msg => {
                   if (key === 'GLOBAL') return !msg.is_global;
                   if (key === 'SUPPORT') return true;
                   const isDirectWithPartner = (msg.sender_id === key || msg.receiver_id === key);
                   return !isDirectWithPartner;
                });
            });
            
            await loadData();
            
            if (selectedPartnerId === key) setSelectedPartnerId(null);
        } catch (error) {
            console.error('Error deleting thread:', error);
            alert('Error al eliminar la conversación');
        }
    };


    const activePartnerInfo = selectedPartnerId ? getPartnerInfo(selectedPartnerId) : null;
    
    // Filter threads
    const filteredThreads = threads.filter(([key, msgs]) => {
        if (!searchQuery.trim()) return true;
        const info = getPartnerInfo(key);
        const nameMatch = info.name.toLowerCase().includes(searchQuery.toLowerCase());
        const contentMatch = msgs.some(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()));
        return nameMatch || contentMatch;
    });

    if (viewMode === 'NOTIFICATIONS' && isAdmin) {
        return (
            <div className="h-full flex flex-col items-center justify-center">
                 <div className="w-full h-full p-4 overflow-y-auto">
                    <div className="mb-4 flex items-center gap-4">
                        <button onClick={() => setViewMode('CHATS')} className="text-zinc-500 hover:text-zinc-900 flex items-center gap-2">
                             <X size={20} /> Volver al Chat
                        </button>
                    </div>
                    <AdminNotifications />
                 </div>
            </div>
        );
    }

    return (
        <div className="flex h-full bg-white dark:bg-black overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            {/* Sidebar (List of Chats) */}
            <div className={`w-full md:w-80 lg:w-96 flex flex-col border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 ${selectedPartnerId ? 'hidden md:flex' : 'flex'}`}>
                {/* Header */}
                <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between sticky top-0 bg-inherit z-10 backdrop-blur-md">
                    <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Mensajes</h2>
                    <button 
                        onClick={() => setShowNewChatModal(true)}
                        className="p-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full hover:opacity-90 transition-opacity"
                        title="Iniciar nuevo chat"
                    >
                        <Plus size={20} />
                    </button>
                    {isAdmin && (
                        <button 
                            onClick={() => setViewMode('NOTIFICATIONS')}
                            className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                            title="Notificaciones del Sistema"
                        >
                            <Bell size={20} />
                        </button>
                    )}
                </div>

                {/* Search */}
                <div className="px-4 py-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar conversación..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 text-sm bg-white dark:bg-zinc-800 border-none rounded-xl shadow-sm focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white outline-none"
                        />
                    </div>
                </div>

                {/* Thread List */}
                <div className="flex-1 overflow-y-auto px-2 space-y-1 custom-scrollbar">
                    {loading ? (
                        <div className="flex justify-center p-8"><Loader2 className="animate-spin text-zinc-400" /></div>
                    ) : filteredThreads.length === 0 ? (
                        <div className="text-center p-8 text-zinc-400 text-sm">No hay conversaciones activas</div>
                    ) : (
                        filteredThreads.map(([key, msgs]) => {
                            const info = getPartnerInfo(key);
                            const lastMsg = msgs[msgs.length - 1];
                            const unreadCount = msgs.filter(m => !m.is_read && m.sender_id !== user.id).length; // Rough count
                            const isActive = selectedPartnerId === key;
                            const SpecialIcon = info.icon;

                            return (
                                <button
                                    key={key}
                                    onClick={() => {
                                        setSelectedPartnerId(key);
                                        if (unreadCount > 0) handleMarkAsRead(key);
                                    }}
                                    className={`w-full p-3 flex items-center gap-3 rounded-xl transition-all ${
                                        isActive 
                                        ? 'bg-white dark:bg-zinc-800 shadow-sm border border-zinc-200 dark:border-zinc-700' 
                                        : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/50 border border-transparent'
                                    }`}
                                >
                                    <div className="relative shrink-0">
                                        {SpecialIcon ? (
                                            <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500">
                                                <SpecialIcon size={20} />
                                            </div>
                                        ) : (
                                            <UserAvatar name={info.name} imageUrl={info.avatar} size="sm" />
                                        )}
                                        {unreadCount > 0 && (
                                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold border-2 border-zinc-50 dark:border-zinc-900">
                                                {unreadCount}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0 text-left">
                                        <div className="flex justify-between items-baseline mb-0.5">
                                            <span className={`text-sm truncate mr-2 ${unreadCount > 0 ? 'font-bold text-zinc-900 dark:text-white' : 'font-medium text-zinc-700 dark:text-zinc-200'}`}>
                                                {info.name}
                                            </span>
                                            <span className="text-[10px] text-zinc-400 shrink-0">
                                                {format(new Date(lastMsg.created_at), 'd MMM', { locale: es })}
                                            </span>
                                        </div>
                                        <p className={`text-xs truncate ${unreadCount > 0 ? 'text-zinc-900 dark:text-white font-medium' : 'text-zinc-500'}`}>
                                            {lastMsg.sender_id === user.id && 'Tú: '}{lastMsg.content}
                                        </p>
                                    </div>
                                    
                                    {isActive && key !== 'GLOBAL' && (
                                        <div 
                                            role="button"
                                            onClick={(e) => handleDeleteThreadClick(key, e)}
                                            className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                                            title="Eliminar conversación"
                                        >
                                            <Trash2 size={14} />
                                        </div>
                                    )}
                                </button>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <div className={`flex-1 flex flex-col bg-white dark:bg-black ${!selectedPartnerId ? 'hidden md:flex' : 'flex'}`}>
                {selectedPartnerId ? (
                    <>
                        {/* Chat Header */}
                        <div className="h-16 px-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-4 shrink-0">
                            <button 
                                onClick={() => setSelectedPartnerId(null)}
                                className="md:hidden p-2 -ml-2 text-zinc-500 hover:text-zinc-900"
                            >
                                <X size={20} />
                            </button>
                            <div className="flex items-center gap-3">
                                {activePartnerInfo?.icon ? (
                                    <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600">
                                        <activePartnerInfo.icon size={16} />
                                    </div>
                                ) : (
                                    <UserAvatar name={activePartnerInfo?.name || ''} imageUrl={activePartnerInfo?.avatar} size="sm" />
                                )}
                                <div>
                                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                                        {activePartnerInfo?.name}
                                    </h3>
                                    <p className="text-xs text-zinc-500">
                                        {selectedPartnerId === 'GLOBAL' ? 'Mensajes para todos los usuarios' : 'Chat Directo'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-zinc-50/30 dark:bg-zinc-900/10 custom-scrollbar">
                            {activeThreadMessages.map((msg, idx) => {
                                const isMe = msg.sender_id === user.id;
                                const showAvatar = !isMe && (idx === 0 || activeThreadMessages[idx - 1].sender_id === user.id);
                                return (
                                    <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                                        <div className={`shrink-0 w-8 ${showAvatar ? 'visible' : 'invisible'}`}>
                                             {!isMe && <UserAvatar name={msg.sender?.full_name || 'U'} imageUrl={msg.sender?.avatar_url} size="xs" />}
                                        </div>
                                        <div className={`flex flex-col max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
                                            <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                                                isMe 
                                                ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-tr-sm' 
                                                : 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-700 rounded-tl-sm'
                                            }`}>
                                                {msg.content}
                                            </div>
                                            <span className="text-[10px] text-zinc-400 mt-1 px-1">
                                                {format(new Date(msg.created_at), 'HH:mm', { locale: es })}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        {(selectedPartnerId !== 'GLOBAL' || isAdmin) && (
                            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black">
                                <form onSubmit={handleSendMessage} className="flex gap-3 max-w-3xl mx-auto">
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder="Escribe un mensaje..."
                                        className="flex-1 px-5 py-3 text-sm bg-zinc-100 dark:bg-zinc-900 border-transparent rounded-xl focus:bg-white dark:focus:bg-black focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all outline-none"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!newMessage.trim() || sending}
                                        className="p-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl hover:opacity-90 active:scale-95 disabled:opacity-50 transition-all shadow-sm"
                                    >
                                        {sending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                                    </button>
                                </form>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-400 p-8 text-center">
                        <MessageSquare size={48} className="mb-4 opacity-50" />
                        <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-2">Tus Mensajes</h3>
                        <p className="max-w-xs">Selecciona una conversación de la lista o inicia un nuevo chat.</p>
                    </div>
                )}
            </div>

            {/* New Chat Modal */}
            {showNewChatModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-zinc-200 dark:border-zinc-800">
                        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-800/30">
                            <h3 className="font-bold text-zinc-900 dark:text-white">Nuevo Chat</h3>
                            <button onClick={() => setShowNewChatModal(false)} className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors">
                                <X size={20} className="text-zinc-500" />
                            </button>
                        </div>
                        <div className="p-2 h-80 overflow-y-auto custom-scrollbar">
                           <div className="space-y-1">
                           <div className="space-y-1">
                                {availableContacts.map(contact => (
                                    <button
                                        key={contact.id}
                                        onClick={() => {
                                            // Check if thread exists, else set as selected (empty)
                                            setSelectedPartnerId(contact.id);
                                            setShowNewChatModal(false);
                                        }}
                                        className="w-full flex items-center gap-3 p-3 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors text-left"
                                    >
                                        <UserAvatar name={contact.name} imageUrl={contact.avatarUrl} size="sm" />
                                        <div>
                                            <p className="text-sm font-medium text-zinc-900 dark:text-white">{contact.name}</p>
                                            <p className="text-xs text-zinc-500">{contact.role === 'ADMIN' ? 'Administrador' : 'Usuario'}</p>
                                        </div>
                                    </button>
                                ))}
                                {availableContacts.length === 0 && (
                                    <div className="p-8 text-center text-zinc-500 text-sm">
                                        No hay contactos disponibles.
                                    </div>
                                )}
                           </div>
                           </div>
                        </div>
                    </div>
                </div>
            )}
            <ConfirmModal
                isOpen={deleteConfirmOpen}
                onClose={() => setDeleteConfirmOpen(false)}
                onConfirm={confirmDeleteThread}
                title="Eliminar conversación"
                message="¿Estás seguro de que quieres eliminar esta conversación? Esta acción eliminará permanentemente los mensajes y no se puede deshacer."
                confirmText="Eliminar"
                isDestructive={true}
            />
        </div>
    );
};
