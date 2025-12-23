import { supabase } from './supabase';
import { KitchenConfig, Holiday } from '../types';

export interface MealGuest {
    id: string;
    date: string;
    mealType: 'breakfast' | 'lunch' | 'dinner';
    count: number;
    option: string;
    isBag: boolean;
    notes?: string;
    createdBy?: string;
}

export interface DailyLock {
    id: string;
    date: string;
    lockedAt?: string;
    isLocked: boolean; // Computed from all meals
}

export const kitchenService = {
    // --- Config ---
    async getConfig(): Promise<KitchenConfig> {
        const { data, error } = await supabase
            .from('kitchen_config')
            .select('*')
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return { 
                    id: 'dummy', 
                    weekly_schedule: {},
                    schedule_weekdays: '',
                    schedule_saturday: '',
                    schedule_sunday_holiday: '',
                    overrides: {}
                };
            }
            throw error;
        }
        return data;
    },

    async updateConfig(id: string, updates: Partial<KitchenConfig>): Promise<KitchenConfig> {
        const { data, error } = await supabase
            .from('kitchen_config')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // --- Holidays ---
    async getHolidays(): Promise<Holiday[]> {
        const { data, error } = await supabase
            .from('holidays')
            .select('*')
            .order('date', { ascending: true });

        if (error) throw error;
        return data.map((h: any) => ({
            id: h.id,
            name: h.name,
            date: h.date,
            createdAt: h.created_at
        }));
    },

    async addHoliday(name: string, date: string): Promise<Holiday> {
        const { data, error } = await supabase
            .from('holidays')
            .insert({ name, date })
            .select()
            .single();

        if (error) throw error;
        return {
            id: data.id,
            name: data.name,
            date: data.date,
            createdAt: data.created_at
        };
    },

    async deleteHoliday(id: string): Promise<void> {
        const { error } = await supabase
            .from('holidays')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // --- Locks ---
    async getDailyLockStatus(date: string): Promise<boolean> {
        // Check if ANY meal is locked.
        const { data, error } = await supabase
            .from('daily_meal_status')
            .select('*')
            .eq('date', date);

        if (error) throw error;
        // If we find any lock record equal to true, return true
        return data.some((d: any) => d.is_locked);
    },

    // Explicitly fetching lock Objects for a date is useful for the manager
    async getLocks(date: string): Promise<DailyLock[]> {
        const { data, error } = await supabase
            .from('daily_meal_status')
            .select('*')
            .eq('date', date);

        if (error) throw error;

        return data.map((d: any) => ({
            id: d.id,
            date: d.date,
            mealType: d.meal_type,
            isLocked: d.is_locked,
            lockedAt: d.locked_at
        }));
    },

    async setDayLock(date: string, isLocked: boolean): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();

        // Upsert lock for ALL types
        const types = ['breakfast', 'lunch', 'dinner'];
        const updates = types.map(t => ({
            date,
            meal_type: t,
            is_locked: isLocked,
            locked_at: isLocked ? new Date().toISOString() : null,
            locked_by: user?.id
        }));

        const { error } = await supabase
            .from('daily_meal_status')
            .upsert(updates, { onConflict: 'date, meal_type' });

        if (error) throw error;
    },

    // --- Guests ---
    async getGuests(date: string): Promise<MealGuest[]> {
        const { data, error } = await supabase
            .from('meal_guests')
            .select('*')
            .eq('date', date);

        if (error) throw error;

        return data.map((d: any) => ({
            id: d.id,
            date: d.date,
            mealType: d.meal_type,
            count: d.count,
            option: d.option || 'standard',
            isBag: d.is_bag || false,
            notes: d.notes,
            createdBy: d.created_by
        }));
    },

    async addGuest(date: string, mealType: string, count: number, option: string = 'standard', isBag: boolean = false, notes?: string): Promise<MealGuest> {
        const { data: { user } } = await supabase.auth.getUser();

        const { data, error } = await supabase
            .from('meal_guests')
            .insert({
                date,
                meal_type: mealType,
                count,
                option,
                is_bag: isBag,
                notes,
                created_by: user?.id
            })
            .select()
            .single();

        if (error) throw error;
        return {
            id: data.id,
            date: data.date,
            mealType: data.meal_type,
            count: data.count,
            option: data.option,
            isBag: data.is_bag,
            notes: data.notes,
            createdBy: data.created_by
        };
    },

    async deleteGuest(id: string): Promise<void> {
        const { error } = await supabase
            .from('meal_guests')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
