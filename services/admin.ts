import { supabase } from './supabase';
import { User } from '../types';

export const adminService = {
    getUsers: async (): Promise<User[]> => {
        // Fetch profiles
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (profilesError) throw new Error(profilesError.message);

        // Fetch active room assignments
        const { data: assignments, error: assignmentsError } = await supabase
            .from('room_beds')
            .select('id, bed_number, assigned_user_id, rooms(id, name)')
            .not('assigned_user_id', 'is', null);

        if (assignmentsError) console.error('Error fetching assignments:', assignmentsError);
        const userAssignments = new Map(assignments?.map(a => [a.assigned_user_id, a]));

        console.log('AdminService getUsers response:', { profilesCount: profiles?.length, assignmentsCount: assignments?.length });

        return profiles.map((profile: any) => {
            const assignment = userAssignments.get(profile.id);
            const roomData = assignment?.rooms as any;

            return {
                id: profile.id,
                email: profile.email || '',
                name: profile.full_name || 'Sin nombre',
                role: profile.role || 'USER',
                status: profile.status || 'PENDING',
                avatarUrl: profile.avatar_url,
                permissions: profile.permissions || {},
                // Map additional profile fields
                hasDiet: profile.has_diet,
                dietNumber: profile.diet_number,
                
                // Map room info
                roomId: roomData?.id,
                bedId: assignment?.id,
                bedNumber: assignment?.bed_number,
                roomName: roomData?.name
            };
        });
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
