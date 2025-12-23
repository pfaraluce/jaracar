import { supabase } from './supabase';

export interface UserAdminMessage {
    id: string;
    user_id: string;
    sender_id: string;
    content: string;
    parent_id: string | null;
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
                parent_id: parentId
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
    replyToMessage: async (userId: string, parentId: string, content: string): Promise<UserAdminMessage> => {
        const { data: { user: adminUser } } = await supabase.auth.getUser();
        if (!adminUser) throw new Error('Admin not authenticated');

        const { data, error } = await supabase
            .from('user_admin_messages')
            .insert({
                user_id: userId, // The user who will see this thread
                sender_id: adminUser.id,
                content: content.trim(),
                parent_id: parentId
            })
            .select('*')
            .single();

        if (error) throw error;

        // Notify user
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
     * Delete a specific message
     */
    deleteMessage: async (id: string): Promise<void> => {
        const { error } = await supabase
            .from('user_admin_messages')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
