import { supabase } from './supabase';
import { Reservation, ActivityLog } from '../types';

export const reservationService = {
    getReservations: async (carId?: string): Promise<Reservation[]> => {
        let query = supabase
            .from('reservations')
            .select('*, user:profiles(full_name)');

        if (carId) {
            query = query.eq('car_id', carId);
        }

        const { data, error } = await query;
        if (error) throw new Error(error.message);

        return data.map((res: any) => ({
            id: res.id,
            carId: res.car_id,
            userId: res.user_id,
            userName: res.user?.full_name || 'Usuario',
            startTime: res.start_time,
            endTime: res.end_time,
            status: res.status,
            notes: res.notes
        }));
    },

    createReservation: async (res: Omit<Reservation, 'id' | 'status' | 'userName'>): Promise<Reservation> => {
        const { data, error } = await supabase
            .from('reservations')
            .insert({
                car_id: res.carId,
                user_id: res.userId,
                start_time: res.startTime,
                end_time: res.endTime,
                status: 'ACTIVE',
                notes: res.notes
            })
            .select()
            .single();

        if (error) throw new Error(error.message);

        return {
            id: data.id,
            carId: data.car_id,
            userId: data.user_id,
            userName: 'Usuario',
            startTime: data.start_time,
            endTime: data.end_time,
            status: data.status,
            notes: data.notes
        };
    },

    cancelReservation: async (reservationId: string, userId: string): Promise<void> => {
        const { data: reservation, error: fetchError } = await supabase
            .from('reservations')
            .select('car_id')
            .eq('id', reservationId)
            .single();

        if (fetchError) throw new Error(fetchError.message);

        const { error } = await supabase
            .from('reservations')
            .update({ status: 'CANCELLED' })
            .eq('id', reservationId);

        if (error) throw new Error(error.message);
    },

    updateReservationNote: async (reservationId: string, note: string): Promise<void> => {
        const { error } = await supabase
            .from('reservations')
            .update({ notes: note })
            .eq('id', reservationId);

        if (error) throw new Error(error.message);
    },

    updateReservation: async (reservationId: string, updates: { startTime: string; endTime: string }): Promise<void> => {
        const { error } = await supabase
            .from('reservations')
            .update({
                start_time: updates.startTime,
                end_time: updates.endTime
            })
            .eq('id', reservationId);

        if (error) throw new Error(error.message);
    },

    finishReservation: async (reservationId: string): Promise<void> => {
        const now = new Date().toISOString();
        const { error } = await supabase
            .from('reservations')
            .update({ end_time: now })
            .eq('id', reservationId);

        if (error) throw new Error(error.message);
    }
};
