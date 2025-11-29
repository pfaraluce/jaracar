import { supabase } from './supabase';
import { User } from '../types';

export const adminService = {
    getUsers: async (): Promise<User[]> => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);

        // Fetch emails from auth is not directly possible via client SDK for all users without admin API
        // BUT, we can't access auth.users from client. 
        // Workaround: We rely on the profile data. 
        // Ideally, profiles should have email synced. 
        // Let's assume profiles has email (it does based on setup_profiles.sql)

        return data.map((profile: any) => ({
            id: profile.id,
            email: profile.email || '', // Should be in profiles
            name: profile.full_name || 'Sin nombre',
            role: profile.role || 'USER',
            status: profile.status || 'PENDING',
            avatarUrl: profile.avatar_url
        }));
    },

    updateUserStatus: async (userId: string, status: 'APPROVED' | 'REJECTED' | 'PENDING') => {
        const { error } = await supabase
            .from('profiles')
            .update({ status })
            .eq('id', userId);

        if (error) throw new Error(error.message);
    },

    updateUserRole: async (userId: string, role: 'ADMIN' | 'USER') => {
        const { error } = await supabase
            .from('profiles')
            .update({ role })
            .eq('id', userId);

        if (error) throw new Error(error.message);
    }
};
