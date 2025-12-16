import { supabase } from './supabase';
import { MealTemplate, MealOrder } from '../types';

export const mealService = {
    // --- Templates ---

    async getMyTemplates(): Promise<MealTemplate[]> {
        const { data, error } = await supabase
            .from('meal_templates')
            .select('*');

        if (error) throw error;

        // Convert snake_case from DB to camelCase
        return data.map(d => ({
            id: d.id,
            userId: d.user_id,
            dayOfWeek: d.day_of_week,
            mealType: d.meal_type,
            option: d.option,
            isBag: d.is_bag
        }));
    },

    async upsertTemplate(userId: string, dayOfWeek: number, mealType: string, option: string, isBag: boolean): Promise<void> {
        const { error } = await supabase
            .from('meal_templates')
            .upsert({
                user_id: userId,
                day_of_week: dayOfWeek,
                meal_type: mealType,
                option,
                is_bag: isBag
            }, { onConflict: 'user_id,day_of_week,meal_type' });

        if (error) throw error;
    },

    // --- Orders ---

    async getMyOrders(startDate: string, endDate: string): Promise<MealOrder[]> {
        const { data, error } = await supabase
            .from('meal_orders')
            .select('*')
            .gte('date', startDate)
            .lte('date', endDate);

        if (error) throw error;

        return data.map(d => ({
            id: d.id,
            userId: d.user_id,
            date: d.date,
            mealType: d.meal_type,
            option: d.option,
            isBag: d.is_bag,
            status: d.status
        }));
    },

    async upsertOrder(userId: string, date: string, mealType: string, option: string, isBag: boolean): Promise<void> {
        const { error } = await supabase
            .from('meal_orders')
            .upsert({
                user_id: userId,
                date: date,
                meal_type: mealType,
                option,
                is_bag: isBag,
                status: 'confirmed'
            }, { onConflict: 'user_id,date,meal_type' });

        if (error) throw error;
    }
};
