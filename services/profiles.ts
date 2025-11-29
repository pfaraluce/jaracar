import { supabase } from './supabase';

export const profileService = {
    getProfile: async (userId: string) => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) throw new Error(error.message);
        return data;
    },

    updateProfile: async (userId: string, fullName: string, avatarUrl?: string) => {
        const updates: any = { full_name: fullName };
        if (avatarUrl !== undefined) {
            updates.avatar_url = avatarUrl;
        }

        const { error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', userId);

        if (error) throw new Error(error.message);
    },

    uploadAvatar: async (userId: string, file: File): Promise<string> => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}.${fileExt}`;
        const filePath = `${fileName}`;

        // Delete old avatar if exists
        await supabase.storage
            .from('avatars')
            .remove([filePath]);

        // Upload new avatar
        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, file, { upsert: true });

        if (uploadError) throw new Error(uploadError.message);

        const { data } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);

        return data.publicUrl;
    }
};
