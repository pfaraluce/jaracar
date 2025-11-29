import { supabase } from './supabase';
import { User, UserRole } from '../types';

export const authService = {
    login: async (email: string, password: string): Promise<User> => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) throw new Error(error.message);
        if (!data.user) throw new Error('No user data returned');

        // Try to get name from profiles table
        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', data.user.id)
            .single();

        const name = profile?.full_name || data.user.user_metadata.name || email.split('@')[0];
        // Hardcoded admin check for specific email
        const role = email.toLowerCase() === 'pfaraluce@gmail.com' ? UserRole.ADMIN : UserRole.USER;

        return {
            id: data.user.id,
            email: data.user.email || '',
            name: name,
            role: role,
            avatarUrl: undefined
        };
    },

    signup: async (email: string, name: string, password: string): Promise<User> => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    name,
                }
            }
        });

        if (error) throw new Error(error.message);
        if (!data.user) throw new Error('No user data returned');

        // Even on signup, check if it's the admin email
        const role = email.toLowerCase() === 'pfaraluce@gmail.com' ? UserRole.ADMIN : UserRole.USER;

        return {
            id: data.user.id,
            email: data.user.email || '',
            name: name,
            role: role
        };
    },

    logout: async () => {
        await supabase.auth.signOut();
    },

    getCurrentUser: async (): Promise<User | null> => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return null;

        const user = session.user;
        const email = user.email || '';
        const role = email.toLowerCase() === 'pfaraluce@gmail.com' ? UserRole.ADMIN : UserRole.USER;

        // Try to get name from profiles table
        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single();

        return {
            id: user.id,
            email: email,
            name: profile?.full_name || user.user_metadata.name || email.split('@')[0] || 'User',
            role: role
        };
    }
};
