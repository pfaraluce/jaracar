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

        // Use profileService to get complete profile data
        try {
            const { profileService } = await import('./profiles');
            return await profileService.getProfile(data.user.id);
        } catch (profileError) {
            console.error('Error fetching profile:', profileError);

            // Fallback
            const isAdminEmail = email.toLowerCase() === 'pfaraluce@gmail.com';
            return {
                id: data.user.id,
                email: data.user.email || '',
                name: data.user.user_metadata.name || email.split('@')[0],
                role: isAdminEmail ? UserRole.ADMIN : UserRole.USER,
                status: isAdminEmail ? 'APPROVED' : 'PENDING'
            };
        }
    },

    loginWithGoogle: async () => {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/`,
            }
        });

        if (error) throw new Error(error.message);
        return data;
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
        try {
            // Add timeout to prevent infinite hang
            const sessionPromise = supabase.auth.getSession();
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('getSession timeout')), 5000)
            );

            const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]) as any;

            if (!session?.user) return null;

            const user = session.user;
            const email = user.email || '';
            const isAdminEmail = email.toLowerCase() === 'pfaraluce@gmail.com';

            // Use profileService to get complete profile data including room assignment
            try {
                const { profileService } = await import('./profiles');
                const profile = await profileService.getProfile(user.id);

                // Sync Google avatar if needed
                if (!profile.avatarUrl && (user.user_metadata.avatar_url || user.user_metadata.picture)) {
                    const googleUrl = user.user_metadata.avatar_url || user.user_metadata.picture;
                    const newAvatarUrl = await authService._syncGoogleAvatar(user.id, googleUrl);
                    if (newAvatarUrl) {
                        profile.avatarUrl = newAvatarUrl;
                    }
                }

                return profile;
            } catch (profileError) {
                console.error('Error fetching profile with profileService:', profileError);

                // Fallback to basic profile query
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();

                return {
                    id: user.id,
                    email: email,
                    name: profile?.full_name || user.user_metadata.name || email.split('@')[0] || 'User',
                    role: profile?.role || (isAdminEmail ? UserRole.ADMIN : UserRole.USER),
                    status: isAdminEmail ? 'APPROVED' : (profile?.status || 'PENDING'),
                    avatarUrl: profile?.avatar_url || (user.user_metadata.avatar_url || user.user_metadata.picture),
                    permissions: profile?.permissions,
                    birthday: profile?.birthday,
                    initials: profile?.initials,
                    dietNumber: profile?.diet_number,
                    hasDiet: profile?.has_diet,
                    dietName: profile?.diet_name,
                    dietNotes: profile?.diet_notes
                };
            }
        } catch (error) {
            console.error('[AUTH] getCurrentUser: Error', error);
            return null;
        }
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
    },

    updatePassword: async (newPassword: string): Promise<void> => {
        const { error } = await supabase.auth.updateUser({
            password: newPassword
        });
        if (error) throw new Error(error.message);
    },

    /**
     * Helper to sync Google Avatar if profile doesn't have one
     */
    _syncGoogleAvatar: async (userId: string, googleAvatarUrl: string): Promise<string | null> => {
        try {
            console.log('[Auth] Syncing Google Avatar...');
            // 1. Fetch the image from Google
            const response = await fetch(googleAvatarUrl);
            const blob = await response.blob();

            // 2. Upload to Supabase Storage
            const fileName = `${userId}/avatar_${Date.now()}.jpg`;
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, blob, { upsert: true });

            if (uploadError) throw uploadError;

            // 3. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName);

            // 4. Update Profile
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', userId);

            if (updateError) throw updateError;

            return publicUrl;
        } catch (error) {
            console.error('[Auth] Error syncing Google avatar:', error);
            return null;
        }
    }

};
