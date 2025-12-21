import { supabase } from './supabase';
import { UserAbsence } from '../types';

export const absencesService = {
    // Create a new absence
    createAbsence: async (
        userId: string,
        startDate: string,
        endDate: string,
        notes?: string
    ): Promise<UserAbsence> => {
        const { data, error } = await supabase
            .from('user_absences')
            .insert({
                user_id: userId,
                start_date: startDate,
                end_date: endDate,
                notes
            })
            .select()
            .single();

        if (error) throw new Error(error.message);

        return {
            id: data.id,
            userId: data.user_id,
            startDate: data.start_date,
            endDate: data.end_date,
            notes: data.notes,
            createdAt: data.created_at,
            updatedAt: data.updated_at
        };
    },

    // Get all absences for a user
    getUserAbsences: async (userId: string): Promise<UserAbsence[]> => {
        const { data, error } = await supabase
            .from('user_absences')
            .select(`
                *,
                profiles!inner(full_name)
            `)
            .eq('user_id', userId)
            .order('start_date', { ascending: false });

        if (error) throw new Error(error.message);

        return data.map(absence => ({
            id: absence.id,
            userId: absence.user_id,
            userName: absence.profiles.full_name,
            startDate: absence.start_date,
            endDate: absence.end_date,
            notes: absence.notes,
            createdAt: absence.created_at,
            updatedAt: absence.updated_at
        }));
    },

    // Get all absences (admin view)
    getAllAbsences: async (): Promise<UserAbsence[]> => {
        const { data, error } = await supabase
            .from('user_absences')
            .select(`
                *,
                profiles!inner(full_name)
            `)
            .order('start_date', { ascending: false });

        if (error) throw new Error(error.message);

        return data.map(absence => ({
            id: absence.id,
            userId: absence.user_id,
            userName: absence.profiles.full_name,
            startDate: absence.start_date,
            endDate: absence.end_date,
            notes: absence.notes,
            createdAt: absence.created_at,
            updatedAt: absence.updated_at
        }));
    },

    // Delete an absence
    deleteAbsence: async (absenceId: string): Promise<void> => {
        const { error } = await supabase
            .from('user_absences')
            .delete()
            .eq('id', absenceId);

        if (error) throw new Error(error.message);
    },

    // Get absences active on a specific date
    getActiveAbsences: async (date?: string): Promise<UserAbsence[]> => {
        const targetDate = date || new Date().toISOString().split('T')[0];

        const { data, error } = await supabase
            .from('user_absences')
            .select(`
                *,
                profiles!inner(full_name)
            `)
            .lte('start_date', targetDate)
            .gte('end_date', targetDate);

        if (error) throw new Error(error.message);

        return data.map(absence => ({
            id: absence.id,
            userId: absence.user_id,
            userName: absence.profiles.full_name,
            startDate: absence.start_date,
            endDate: absence.end_date,
            notes: absence.notes,
            createdAt: absence.created_at,
            updatedAt: absence.updated_at
        }));
    },

    // Get absences within a date range
    getAbsencesInRange: async (startDate: string, endDate: string): Promise<UserAbsence[]> => {
        const { data, error } = await supabase
            .from('user_absences')
            .select(`
                *,
                profiles!inner(full_name)
            `)
            .or(`and(start_date.lte.${endDate},end_date.gte.${startDate})`);

        if (error) throw new Error(error.message);

        return data.map(absence => ({
            id: absence.id,
            userId: absence.user_id,
            userName: absence.profiles.full_name,
            startDate: absence.start_date,
            endDate: absence.end_date,
            notes: absence.notes,
            createdAt: absence.created_at,
            updatedAt: absence.updated_at
        }));
    },

    // Check if user has overlapping absences
    hasOverlappingAbsence: async (
        userId: string,
        startDate: string,
        endDate: string,
        excludeAbsenceId?: string
    ): Promise<boolean> => {
        let query = supabase
            .from('user_absences')
            .select('id')
            .eq('user_id', userId)
            .or(`and(start_date.lte.${endDate},end_date.gte.${startDate})`);

        if (excludeAbsenceId) {
            query = query.neq('id', excludeAbsenceId);
        }

        const { data, error } = await query;

        if (error) throw new Error(error.message);

        return data.length > 0;
    }
};
