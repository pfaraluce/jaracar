import { supabase } from './supabase';
import { Room, RoomBed } from '../types';

export const roomsService = {
    // Get all rooms with their beds
    getAllRooms: async (): Promise<Room[]> => {
        const { data, error } = await supabase
            .from('rooms')
            .select('*')
            .order('name');

        if (error) throw new Error(error.message);

        return data.map(r => ({
            id: r.id,
            name: r.name,
            description: r.description,
            totalBeds: r.total_beds,
            createdAt: r.created_at,
            updatedAt: r.updated_at
        }));
    },

    // Get a single room by ID
    getRoom: async (roomId: string): Promise<Room> => {
        const { data, error } = await supabase
            .from('rooms')
            .select('*')
            .eq('id', roomId)
            .single();

        if (error) throw new Error(error.message);

        return {
            id: data.id,
            name: data.name,
            description: data.description,
            totalBeds: data.total_beds,
            createdAt: data.created_at,
            updatedAt: data.updated_at
        };
    },

    // Create a new room with beds
    createRoom: async (name: string, description: string | undefined, totalBeds: number): Promise<Room> => {
        // Create the room
        const { data: room, error: roomError } = await supabase
            .from('rooms')
            .insert({
                name,
                description,
                total_beds: totalBeds
            })
            .select()
            .single();

        if (roomError) throw new Error(roomError.message);

        // Create beds for the room
        const beds = Array.from({ length: totalBeds }, (_, i) => ({
            room_id: room.id,
            bed_number: i + 1
        }));

        const { error: bedsError } = await supabase
            .from('room_beds')
            .insert(beds);

        if (bedsError) {
            // Rollback: delete the room if bed creation fails
            await supabase.from('rooms').delete().eq('id', room.id);
            throw new Error(bedsError.message);
        }

        return {
            id: room.id,
            name: room.name,
            description: room.description,
            totalBeds: room.total_beds,
            createdAt: room.created_at,
            updatedAt: room.updated_at
        };
    },

    // Update room details and adjust beds
    updateRoom: async (roomId: string, name: string, description: string | undefined, totalBeds: number): Promise<void> => {
        // 1. Update room details
        const { error: updateError } = await supabase
            .from('rooms')
            .update({
                name,
                description,
                total_beds: totalBeds
            })
            .eq('id', roomId);

        if (updateError) throw new Error(updateError.message);

        // 2. Adjust beds if count changed
        // Get current max bed number
        const { data: currentBeds, error: bedsError } = await supabase
            .from('room_beds')
            .select('bed_number')
            .eq('room_id', roomId)
            .order('bed_number', { ascending: false });

        if (bedsError) throw new Error(bedsError.message);

        const currentCount = currentBeds.length;

        if (totalBeds > currentCount) {
            // Add new beds
            const newBeds = Array.from({ length: totalBeds - currentCount }, (_, i) => ({
                room_id: roomId,
                bed_number: currentCount + i + 1
            }));

            const { error: insertError } = await supabase
                .from('room_beds')
                .insert(newBeds);

            if (insertError) throw new Error(insertError.message);

        } else if (totalBeds < currentCount) {
            // Remove extra beds (validation strictly handled in frontend regarding occupied beds)
            const { error: deleteError } = await supabase
                .from('room_beds')
                .delete()
                .eq('room_id', roomId)
                .gt('bed_number', totalBeds);

            if (deleteError) throw new Error(deleteError.message);
        }
    },

    // Delete a room (beds will be cascade deleted)
    deleteRoom: async (roomId: string): Promise<void> => {
        const { error } = await supabase
            .from('rooms')
            .delete()
            .eq('id', roomId);

        if (error) throw new Error(error.message);
    },

    // Get all beds for a room
    getRoomBeds: async (roomId: string): Promise<RoomBed[]> => {
        const { data, error } = await supabase
            .from('room_beds')
            .select(`
                *,
                rooms!inner(name),
                profiles!room_beds_assigned_user_id_fkey(full_name, avatar_url)
            `)
            .eq('room_id', roomId)
            .order('bed_number');

        if (error) throw new Error(error.message);

        return data.map(bed => ({
            id: bed.id,
            roomId: bed.room_id,
            bedNumber: bed.bed_number,
            assignedUserId: bed.assigned_user_id,
            assignedUserName: bed.profiles?.full_name,
            assignedUserAvatar: bed.profiles?.avatar_url,
            roomName: bed.rooms.name,
            createdAt: bed.created_at,
            updatedAt: bed.updated_at
        }));
    },

    // Get all beds across all rooms
    getAllBeds: async (): Promise<RoomBed[]> => {
        const { data, error } = await supabase
            .from('room_beds')
            .select(`
                *,
                rooms!inner(name),
                profiles!room_beds_assigned_user_id_fkey(full_name, avatar_url)
            `)
            .order('room_id')
            .order('bed_number');

        if (error) throw new Error(error.message);

        return data.map(bed => ({
            id: bed.id,
            roomId: bed.room_id,
            bedNumber: bed.bed_number,
            assignedUserId: bed.assigned_user_id,
            assignedUserName: bed.profiles?.full_name,
            assignedUserAvatar: bed.profiles?.avatar_url,
            roomName: bed.rooms.name,
            createdAt: bed.created_at,
            updatedAt: bed.updated_at
        }));
    },

    // Get available (unassigned) beds
    getAvailableBeds: async (roomId?: string): Promise<RoomBed[]> => {
        let query = supabase
            .from('room_beds')
            .select(`
                *,
                rooms!inner(name)
            `)
            .is('assigned_user_id', null)
            .order('room_id')
            .order('bed_number');

        if (roomId) {
            query = query.eq('room_id', roomId);
        }

        const { data, error } = await query;

        if (error) throw new Error(error.message);

        return data.map(bed => ({
            id: bed.id,
            roomId: bed.room_id,
            bedNumber: bed.bed_number,
            assignedUserId: undefined,
            assignedUserName: undefined,
            assignedUserAvatar: undefined,
            roomName: bed.rooms.name,
            createdAt: bed.created_at,
            updatedAt: bed.updated_at
        }));
    },

    // Assign a bed to a user
    assignBedToUser: async (bedId: string, userId: string): Promise<void> => {
        const { error } = await supabase
            .from('room_beds')
            .update({ assigned_user_id: userId })
            .eq('id', bedId);

        if (error) throw new Error(error.message);
    },

    // Unassign a bed (remove user)
    unassignBed: async (bedId: string): Promise<void> => {
        const { error } = await supabase
            .from('room_beds')
            .update({ assigned_user_id: null })
            .eq('id', bedId);

        if (error) throw new Error(error.message);
    },

    // Get bed by user ID
    getUserBed: async (userId: string): Promise<RoomBed | null> => {
        const { data, error } = await supabase
            .from('room_beds')
            .select(`
                *,
                rooms!inner(name)
            `)
            .eq('assigned_user_id', userId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null; // No rows returned
            throw new Error(error.message);
        }

        return {
            id: data.id,
            roomId: data.room_id,
            bedNumber: data.bed_number,
            assignedUserId: data.assigned_user_id,
            roomName: data.rooms.name,
            createdAt: data.created_at,
            updatedAt: data.updated_at
        };
    }
};
