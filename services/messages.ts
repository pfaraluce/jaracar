import { supabase } from './supabase';

export interface UserAdminMessage {
    id: string;
    user_id: string;
    sender_id: string;
    receiver_id?: string | null;
    content: string;
    parent_id: string | null;
    is_read: boolean;
    is_completed: boolean;
    is_global?: boolean;
    created_at: string;
    updated_at: string;
    sender?: {
        full_name: string;
        avatar_url: string;
    };
    receiver?: {
        full_name: string;
        avatar_url: string;
    };
}

export const messagingService = {
    /**
     * Send a message (User -> Admin OR Admin -> User/Group)
     * If receiverId is provided, it's a direct message.
     */
    sendMessage: async (content: string, parentId: string | null = null, receiverId: string | null = null): Promise<UserAdminMessage> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('user_admin_messages')
            .insert({
                user_id: user.id, // Legacy owner
                sender_id: user.id,
                receiver_id: receiverId,
                content: content.trim(),
                parent_id: parentId,
                is_read: true // Sender read it
            })
            .select('*')
            .single();

        if (error) throw error;

        // Notify Recipient
        try {
            if (receiverId) {
                // Direct Notification
                await supabase.functions.invoke('send-notification', {
                    body: {
                        userId: receiverId,
                        title: `Nuevo mensaje de ${user.user_metadata?.full_name || 'un usuario'}`,
                        body: content.trim().substring(0, 100) + (content.length > 100 ? '...' : ''),
                        data: {
                            type: 'direct_message',
                            messageId: data.id,
                            senderId: user.id
                        }
                    }
                });
            } else {
                // Legacy / Fallback: Notify all admins (if no receiver specified and not a reply)
                // BUT current requirement says "User chooses Admin". So user should always provide receiverId for new chats.
                // Keeping legacy support just in case.
                await supabase.functions.invoke('send-notification', {
                    body: {
                        title: `Nuevo mensaje de ${user.user_metadata?.full_name || 'un usuario'}`,
                        body: content.trim().substring(0, 100) + (content.length > 100 ? '...' : ''),
                        role: 'ADMIN' // Legacy broadcast
                    }
                });
            }
        } catch (e) {
            console.warn('Failed to send notification:', e);
        }

        return data;
    },

    /**
     * Reply to a user message (as an admin)
     */
    replyToMessage: async (userId: string, parentId: string, content: string, sendNotification: boolean = true): Promise<UserAdminMessage> => {
        const { data: { user: adminUser } } = await supabase.auth.getUser();
        if (!adminUser) throw new Error('Admin not authenticated');

        const { data, error } = await supabase
            .from('user_admin_messages')
            .insert({
                user_id: userId, // The user who will see this thread
                sender_id: adminUser.id,
                content: content.trim(),
                parent_id: parentId,
                is_read: true // Admin just sent it, so they read it
            })
            .select('*')
            .single();

        if (error) throw error;

        // Notify user if requested
        if (sendNotification) {
            try {
                await supabase.functions.invoke('send-notification', {
                    body: {
                        userId: userId,
                        title: 'Respuesta del administrador',
                        body: content.trim().substring(0, 100) + (content.length > 100 ? '...' : ''),
                    }
                });
            } catch (e) {
                console.warn('Failed to send notification:', e);
            }
        }

        return data;
    },

    /**
     * Get messages for the current user (Regular User View)
     * Returns:
     * 1. Messages sent BY user
     * 2. Messages sent TO user (receiver_id = user.id)
     * 3. Global Broadcasts (is_global = true)
     */
    getMessages: async (): Promise<UserAdminMessage[]> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('user_admin_messages')
            .select(`
                *,
                sender:profiles!sender_id(full_name, avatar_url),
                receiver:profiles!receiver_id(full_name, avatar_url)
            `)
            .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id},is_global.eq.true${user.user_metadata?.role === 'ADMIN' ? ',receiver_id.is.null' : ''}`)
            .eq('deleted_by_user', false)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    /**
     * Get all active message threads for admins
     * Returns threads where Admin is sender OR receiver OR it's a legacy thread
     */
    getAdminMessages: async (): Promise<UserAdminMessage[]> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Fetch root messages (parent_id is null) that are not completed
        // For admins, we want to see threads assigned to THEM or created by THEM or Legacy (no receiver)
        const { data, error } = await supabase
            .from('user_admin_messages')
            .select(`
                *,
                sender:profiles!sender_id(full_name, avatar_url),
                receiver:profiles!receiver_id(full_name, avatar_url)
            `)
            .is('parent_id', null)
            .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id},receiver_id.is.null`) 
            .eq('is_completed', false)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    /**
     * Get unread notification count
     */
    getUnreadCount: async (): Promise<number> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return 0;
        
        const isAdmin = user.user_metadata?.role === 'ADMIN';

        const { count, error } = await supabase
            .from('user_admin_messages')
            .select('*', { count: 'exact', head: true })
            .or(`receiver_id.eq.${user.id},is_global.eq.true${isAdmin ? ',receiver_id.is.null' : ''}`) 
            .eq('is_read', false)
            .neq('sender_id', user.id); // Ensure we don't count our own messages

        if (error) {
            console.error('Error fetching unread count:', error);
            return 0;
        }
        return count || 0;
    },

    /**
     * Get all replies for a specific root message
     */
    getReplies: async (parentId: string): Promise<UserAdminMessage[]> => {
        const { data, error } = await supabase
            .from('user_admin_messages')
            .select(`
                *,
                sender:profiles!sender_id(full_name, avatar_url)
            `)
            .eq('parent_id', parentId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    /**
     * Mark a message thread (and its replies) as completed
     */
    markAsCompleted: async (id: string): Promise<void> => {
        const { error } = await supabase
            .from('user_admin_messages')
            .update({ is_completed: true })
            .eq('id', id);

        if (error) throw error;
    },

    /**
     * Start a new direct message thread from an admin to a specific user
     */
    startDirectMessage: async (userId: string, content: string, sendNotification: boolean): Promise<UserAdminMessage> => {
        const { data: { user: adminUser } } = await supabase.auth.getUser();
        if (!adminUser) throw new Error('Admin not authenticated');

        const { data, error } = await supabase
            .from('user_admin_messages')
            .insert({
                user_id: userId,
                sender_id: adminUser.id,
                content: content.trim(),
                parent_id: null,
                is_completed: false,
                is_read: false // Admin sent it, but recipient hasn't seen it. Wait. If is_read=true, admin sees it as read. But recipient?
                // Actually startDirectMessage is for Admin -> new User chat.
                // The ROW is inserted. 'is_read' applies to whom?
                // The schema isn't split (like inbox/outbox).
                // Usually is_read=false implies the RECEIVER hasn't read it.
                // So insert as FALSE. Sender (Admin) knows they sent it.
            })
            .select('*')
            .single();

        if (error) throw error;

        if (sendNotification) {
            try {
                await supabase.functions.invoke('send-notification', {
                    body: {
                        userId: userId,
                        title: 'Nuevo mensaje del administrador',
                        body: content.trim().substring(0, 100) + (content.length > 100 ? '...' : ''),
                        data: {
                            type: 'admin_direct_message',
                            messageId: data.id
                        }
                    }
                });
            } catch (e) {
                console.warn('Failed to send notification:', e);
            }
        }

        return data;
    },

    /**
     * Mark all messages in a thread as read for the current user
     * Updated to support targeted reading (marking messages where I am receiver)
     */
    markAsRead: async (senderOrType?: string): Promise<void> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        let query = supabase
            .from('user_admin_messages')
            .update({ is_read: true })
            .eq('is_read', false)
            .eq('user_id', user.id); // Optimization: only my rows
        
        if (senderOrType === 'GLOBAL') {
             query = query.eq('is_global', true);
        } else if (senderOrType === 'SUPPORT') {
             query = query.is('receiver_id', null);
        } else if (senderOrType) {
             // Direct conversation with specific sender
             query = query.eq('sender_id', senderOrType);
        } else {
             // General mark all read for me
             query = query.eq('user_id', user.id);
        }

        const { error } = await query;
        if (error) throw error;
    },

    /**
     * Delete a specific message
     * Users: Soft delete (hide from view)
     * Admins: Hard delete (removes from database)
     */
    deleteMessage: async (id: string): Promise<void> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Check if user is admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        const isAdmin = profile?.role === 'ADMIN' || profile?.role === 'admin';

        if (isAdmin) {
            // Hard delete for admins
            const { error } = await supabase
                .from('user_admin_messages')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
    } else {
            // Soft delete for users
            const { error } = await supabase
                .from('user_admin_messages')
                .update({ deleted_by_user: true })
                .eq('id', id);

            if (error) throw error;
        }
    },

    /**
     * Delete an entire thread/conversation
     */
    deleteThread: async (partnerId: string | null): Promise<void> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        const isAdmin = profile?.role === 'ADMIN';

        if (isAdmin) {
             // Admin: Hard Delete
             if (partnerId === 'SUPPORT') {
                 console.warn("Cannot hard delete generic SUPPORT thread without specific user ID");
                 return;
             }
             
             // Deleting thread with specific user 'partnerId'.
             // Hard delete messages where:
             // 1. (sender=me AND receiver=partner) 
             // 2. (sender=partner AND receiver=me)
             // 3. (sender=partner AND receiver=null) [Legacy]
             const { error } = await supabase
                .from('user_admin_messages')
                .delete()
                .or(`and(sender_id.eq.${user.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user.id}),and(sender_id.eq.${partnerId},receiver_id.is.null)`);
             
             if (error) throw error;
             
        } else {
             // User: Soft Delete
             if (partnerId === 'SUPPORT') {
                  const { error } = await supabase
                    .from('user_admin_messages')
                    .update({ deleted_by_user: true })
                    .eq('sender_id', user.id)
                    .is('receiver_id', null);
                  if (error) throw error;
             } else if (partnerId && partnerId !== 'GLOBAL') {
                  const { error } = await supabase
                    .from('user_admin_messages')
                    .update({ deleted_by_user: true })
                    .or(`and(sender_id.eq.${user.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user.id})`);
                  if (error) throw error;
             }
        }
    },

    /**
     * Send a global broadcast message (Persisted)
     * We insert a message for EACH user to manage "is_read" status individually.
     * These messages are marked is_global=true for UI grouping.
     */
    sendGlobalMessage: async (title: string, content: string): Promise<void> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Unauthorized');
        
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        if (profile?.role !== 'ADMIN') throw new Error('Unauthorized');

        // Fetch all candidates (e.g. active residents)
        // Adjust filter as needed (e.g. status='APPROVED')
        const { data: recipients, error: fetchError } = await supabase
            .from('profiles')
            .select('id')
            .neq('id', user.id) // Don't send to self
            .eq('status', 'APPROVED');
            
        if (fetchError) throw fetchError;
        if (!recipients || recipients.length === 0) return;

        const messagesToInsert = recipients.map(recipient => ({
            user_id: recipient.id, // For RLS (User sees their own row)
            sender_id: user.id,
            receiver_id: recipient.id, // Explicit receiver
            content: `[${title.toUpperCase()}] ${content}`,
            is_read: false,
            is_global: true, // Mark as global for UI grouping
            parent_id: null
        }));

        // Batch insert
        const { error } = await supabase
            .from('user_admin_messages')
            .insert(messagesToInsert);

        if (error) throw error;
    }
};
