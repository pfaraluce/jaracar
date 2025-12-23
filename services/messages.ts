import { supabase } from './supabase';

export interface UserAdminMessage {
    id: string;
    user_id: string;
    sender_id: string;
    content: string;
    parent_id: string | null;
    is_read: boolean;
    is_completed: boolean;
    created_at: string;
    updated_at: string;
    sender?: {
        full_name: string;
        avatar_url: string;
    };
}

export const messagingService = {
    /**
     * Send a message or a reply (as a user or any role)
     */
    sendMessage: async (content: string, parentId: string | null = null): Promise<UserAdminMessage> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('user_admin_messages')
            .insert({
                user_id: user.id,
                sender_id: user.id,
                content: content.trim(),
                parent_id: parentId,
                is_read: true // Sender has read their own message
            })
            .select('*')
            .single();

        if (error) throw error;

        // Notify admins if it's a new thread, or just generic notify logic
        try {
            await supabase.functions.invoke('send-notification', {
                body: {
                    title: `Nuevo mensaje de ${user.user_metadata?.full_name || 'un usuario'}`,
                    body: content.trim().substring(0, 100) + (content.length > 100 ? '...' : ''),
                    role: 'ADMIN' // Notify all admins
                }
            });
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
     * Get messages for the current user
     */
    getMessages: async (): Promise<UserAdminMessage[]> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('user_admin_messages')
            .select(`
                *,
                sender:profiles!sender_id(full_name, avatar_url)
            `)
            .eq('user_id', user.id)
            .eq('deleted_by_user', false)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    /**
     * Get all active (not completed) message threads for admins
     */
    getAdminMessages: async (): Promise<UserAdminMessage[]> => {
        // Fetch root messages (parent_id is null) that are not completed
        const { data, error } = await supabase
            .from('user_admin_messages')
            .select(`
                *,
                sender:profiles!sender_id(full_name, avatar_url)
            `)
            .is('parent_id', null)
            .eq('is_completed', false)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
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
                is_read: true // Admin sent this, so they have read it
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
     * Mark all messages in a thread as read for the admin
     */
    markAsRead: async (userId: string): Promise<void> => {
        const { error } = await supabase
            .from('user_admin_messages')
            .update({ is_read: true })
            .eq('user_id', userId)
            .eq('is_read', false);

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
    }
};
