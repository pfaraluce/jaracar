import { supabase } from './supabase';
import { User, UserRole } from '../types';

export const authService = {
    login: async (email: string, password: string): Promise<User> => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            if (error.message.includes('Email not confirmed')) {
                throw new Error('Por favor confirma tu correo electrónico antes de iniciar sesión.');
            }
            if (error.message.includes('Invalid login credentials')) {
                throw new Error('Credenciales incorrectas. Verifica tu email y contraseña.');
            }
            throw new Error(error.message);
        }

        if (!data.user) throw new Error('No user data returned');

        // Try to get profile data
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('full_name, role, status')
            .eq('id', data.user.id)
            .single();

        if (profileError) {
            console.error('Error fetching profile:', profileError);
        }

        const isAdminEmail = email.toLowerCase() === 'pfaraluce@gmail.com';
        const name = profile?.full_name || data.user.user_metadata.name || email.split('@')[0];
        const role = profile?.role || (isAdminEmail ? UserRole.ADMIN : UserRole.USER);
        // Force APPROVED for hardcoded admin email to prevent lockout
        const status = isAdminEmail ? 'APPROVED' : (profile?.status || 'PENDING');

        return {
            id: data.user.id,
            email: data.user.email || '',
            name: name,
            role: role,
            status: status,
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

        // Even on signup, check if it's the admin email (fallback)
        const role = email.toLowerCase() === 'pfaraluce@gmail.com' ? UserRole.ADMIN : UserRole.USER;
        const status = role === UserRole.ADMIN ? 'APPROVED' : 'PENDING';

        return {
            id: data.user.id,
            email: data.user.email || '',
            name: name,
            role: role,
            status: status
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

        // Try to get profile data
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('full_name, role, status')
            .eq('id', user.id)
            .single();

        if (profileError) {
            console.error('Error fetching profile:', profileError);
        }

        const isAdminEmail = email.toLowerCase() === 'pfaraluce@gmail.com';

        return {
            id: user.id,
            email: email,
            name: profile?.full_name || user.user_metadata.name || email.split('@')[0] || 'User',
            role: profile?.role || (isAdminEmail ? UserRole.ADMIN : UserRole.USER),
            status: isAdminEmail ? 'APPROVED' : (profile?.status || 'PENDING')
        };
    },

    getSession: async () => {
        const { data } = await supabase.auth.getSession();
        return data.session;
    },

    resetPassword: async (email: string): Promise<void> => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin, // Redirect back to app
        });
        if (error) throw new Error(error.message);
    }
};
