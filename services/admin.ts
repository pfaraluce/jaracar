import { supabase } from './supabase';
import { User } from '../types';

export const adminService = {
    getUsers: async (): Promise<User[]> => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        console.log('AdminService getUsers response:', { data, error });

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
            avatarUrl: profile.avatar_url,
            permissions: profile.permissions || {}
        }));
    },

    updateUserStatus: async (userId: string, status: 'APPROVED' | 'REJECTED' | 'PENDING') => {
        const { error } = await supabase.rpc('admin_update_profile', {
            target_user_id: userId,
            new_status: status
        });

        if (error) throw new Error(error.message);
    },

    updateUserRole: async (userId: string, role: 'ADMIN' | 'USER' | 'KITCHEN') => {
        const { error } = await supabase.rpc('admin_update_profile', {
            target_user_id: userId,
            new_role: role
        });

        if (error) throw new Error(error.message);
    },

    updateUserAccess: async (userId: string, role: 'ADMIN' | 'USER' | 'KITCHEN', permissions: any) => {
        const { error } = await supabase.rpc('admin_update_profile', {
            target_user_id: userId,
            new_role: role,
            new_permissions: permissions
        });

        if (error) throw new Error(error.message);
    },

    updateUserPermissions: async (userId: string, permissions: any) => {
        const { error } = await supabase.rpc('admin_update_profile', {
            target_user_id: userId,
            new_permissions: permissions
        });

        if (error) throw new Error(error.message);
    },

    inviteUser: async (email: string, role: string) => {
        const { data, error } = await supabase.functions.invoke('invite-user', {
            body: { email }
        });

        if (error) throw new Error(error.message);

        // Retry logic to update role (wait for trigger to create profile)
        const updateRoleWithRetry = async () => {
            const maxRetries = 5;
            for (let i = 0; i < maxRetries; i++) {
                try {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('id')
                        .eq('email', email)
                        .single();

                    if (profile) {
                        await adminService.updateUserRole(profile.id, role as 'ADMIN' | 'USER' | 'KITCHEN');
                        return; // Success
                    }
                } catch (e) {
                    console.warn(`Attempt ${i + 1} to set role failed:`, e);
                }
                // Wait 1 second before next try
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            console.warn('Could not set role for invited user after retries (Profile not found)');
        };

        // We explicitly await the role update to ensure it's done before returning
        // helpful feedback to the admin (or at least try best effort)
        await updateRoleWithRetry();

        return data;
    }
};
