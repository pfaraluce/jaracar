import { supabase } from './supabase';
import { DietFile } from '../types';

export const profileService = {
    getAllProfiles: async () => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .in('status', ['APPROVED', 'PENDING']); // Fetch all active users

        if (error) throw new Error(error.message);

        // Fetch room/bed info separately for users with room assignments
        const profilesWithRooms = await Promise.all(data.map(async (p) => {
            let roomName = undefined;
            let bedNumber = undefined;
            let roomTotalBeds = undefined;

            if (p.bed_id) {
                const { data: bedData } = await supabase
                    .from('room_beds')
                    .select('bed_number, rooms(name, total_beds)')
                    .eq('id', p.bed_id)
                    .single();

                if (bedData) {
                    bedNumber = bedData.bed_number;
                    roomName = (bedData.rooms as any)?.name;
                    roomTotalBeds = (bedData.rooms as any)?.total_beds;
                }
            }

            return {
                id: p.id,
                email: p.email,
                name: p.full_name,
                role: p.role,
                status: p.status,
                avatarUrl: p.avatar_url,
                permissions: p.permissions,
                birthday: p.birthday,
                initials: p.initials,
                hasDiet: p.has_diet,
                dietNumber: p.diet_number,
                dietName: p.diet_name,
                dietNotes: p.diet_notes,
                roomId: p.room_id,
                bedId: p.bed_id,
                roomName,
                bedNumber,
                roomTotalBeds
            };
        }));

        return profilesWithRooms;
    },

    getProfile: async (userId: string) => {
        const { data: p, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) throw new Error(error.message);

        // Fetch room/bed info separately if user has room assignment
        let roomName = undefined;
        let bedNumber = undefined;
        let roomTotalBeds = undefined;

        if (p.bed_id) {
            const { data: bedData } = await supabase
                .from('room_beds')
                .select('bed_number, rooms(name, total_beds)')
                .eq('id', p.bed_id)
                .single();

            if (bedData) {
                bedNumber = bedData.bed_number;
                roomName = (bedData.rooms as any)?.name;
                roomTotalBeds = (bedData.rooms as any)?.total_beds;
            }
        }

        return {
            id: p.id,
            email: p.email,
            name: p.full_name,
            role: p.role,
            status: p.status,
            avatarUrl: p.avatar_url,
            permissions: p.permissions,
            birthday: p.birthday,
            initials: p.initials,
            hasDiet: p.has_diet,
            dietNumber: p.diet_number,
            dietName: p.diet_name,
            dietNotes: p.diet_notes,
            roomId: p.room_id,
            bedId: p.bed_id,
            roomName,
            bedNumber,
            roomTotalBeds
        };
    },

    updateProfile: async (userId: string, updates: {
        fullName?: string;
        avatarUrl?: string;
        birthday?: string;
        initials?: string;
        hasDiet?: boolean;
        dietName?: string;
        dietNotes?: string;
    }) => {
        const dbUpdates: any = {};

        if (updates.fullName !== undefined) dbUpdates.full_name = updates.fullName;
        if (updates.avatarUrl !== undefined) dbUpdates.avatar_url = updates.avatarUrl;
        if (updates.birthday !== undefined) dbUpdates.birthday = updates.birthday;
        if (updates.initials !== undefined) dbUpdates.initials = updates.initials;
        if (updates.hasDiet !== undefined) dbUpdates.has_diet = updates.hasDiet;
        if (updates.dietName !== undefined) dbUpdates.diet_name = updates.dietName;
        if (updates.dietNotes !== undefined) dbUpdates.diet_notes = updates.dietNotes;

        const { error } = await supabase
            .from('profiles')
            .update(dbUpdates)
            .eq('id', userId);

        if (error) throw new Error(error.message);
    },

    updateDietNumber: async (userId: string, dietNumber: number | null) => {
        const { error } = await supabase
            .from('profiles')
            .update({ diet_number: dietNumber })
            .eq('id', userId);

        if (error) throw new Error(error.message);
    },

    compactDietNumbers: async () => {
        const { error } = await supabase.rpc('compact_diet_numbers');
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
    },

    // Diet file management
    uploadDietFile: async (userId: string, file: File): Promise<DietFile> => {
        // Get the authenticated user's ID directly from Supabase
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

        if (authError || !authUser) {
            console.error('Auth error:', authError);
            throw new Error('Usuario no autenticado');
        }

        console.log('Auth User ID:', authUser.id);
        console.log('Passed User ID:', userId);
        console.log('IDs match:', authUser.id === userId);

        const fileExt = file.name.split('.').pop();
        const timestamp = Date.now();
        const fileName = `${authUser.id}/${timestamp}_${file.name}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
            .from('diet-files')
            .upload(fileName, file);

        if (uploadError) {
            console.error('Storage upload error:', uploadError);
            throw new Error(uploadError.message);
        }

        console.log('File uploaded to storage successfully');

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('diet-files')
            .getPublicUrl(fileName);

        console.log('Attempting to insert into database with user_id:', authUser.id);

        // Save metadata to database - use authUser.id to match RLS policy
        const { data, error } = await supabase
            .from('diet_files')
            .insert({
                user_id: authUser.id, // Use authenticated user ID
                file_name: file.name,
                file_path: fileName,
                file_size: file.size,
                mime_type: file.type
            })
            .select()
            .single();

        if (error) {
            console.error('Database insert error:', error);
            console.error('Error details:', JSON.stringify(error, null, 2));
            throw new Error(error.message);
        }

        console.log('Database insert successful:', data);

        return {
            id: data.id,
            userId: data.user_id,
            fileName: data.file_name,
            filePath: data.file_path,
            fileSize: data.file_size,
            mimeType: data.mime_type,
            createdAt: data.created_at
        };
    },

    getDietFiles: async (userId: string): Promise<DietFile[]> => {
        const { data, error } = await supabase
            .from('diet_files')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);

        return data.map(file => ({
            id: file.id,
            userId: file.user_id,
            fileName: file.file_name,
            filePath: file.file_path,
            fileSize: file.file_size,
            mimeType: file.mime_type,
            createdAt: file.created_at
        }));
    },

    deleteDietFile: async (fileId: string, filePath: string): Promise<void> => {
        // Delete from storage
        const { error: storageError } = await supabase.storage
            .from('diet-files')
            .remove([filePath]);

        if (storageError) throw new Error(storageError.message);

        // Delete from database
        const { error: dbError } = await supabase
            .from('diet_files')
            .delete()
            .eq('id', fileId);

        if (dbError) throw new Error(dbError.message);
    },

    getDietFileUrl: (filePath: string): string => {
        const { data } = supabase.storage
            .from('diet-files')
            .getPublicUrl(filePath);

        return data.publicUrl;
    },

    // Update room assignment for a user
    updateRoomAssignment: async (userId: string, bedId: string | null): Promise<void> => {
        // If bedId is null, we're unassigning the user
        if (bedId === null) {
            // Find current bed and unassign
            const { data: currentBed } = await supabase
                .from('room_beds')
                .select('id')
                .eq('assigned_user_id', userId)
                .single();

            if (currentBed) {
                await supabase
                    .from('room_beds')
                    .update({ assigned_user_id: null })
                    .eq('id', currentBed.id);
            }
        } else {
            // First, unassign user from any current bed
            await supabase
                .from('room_beds')
                .update({ assigned_user_id: null })
                .eq('assigned_user_id', userId);

            // Then assign to new bed
            const { error } = await supabase
                .from('room_beds')
                .update({ assigned_user_id: userId })
                .eq('id', bedId);

            if (error) throw new Error(error.message);
        }
    }
};

