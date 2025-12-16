import { supabase } from './supabase';
import { MealTemplate, MealOrder } from '../types';

export const mealService = {
    // --- Templates ---

    // --- Templates ---

    async getMyTemplates(): Promise<MealTemplate[]> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data, error } = await supabase
            .from('meal_templates')
            .select('*')
            .eq('user_id', user.id);

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

    async getAllTemplates(dayOfWeek: number): Promise<MealTemplate[]> {
        // Requires public RLS policy on meal_templates
        const { data, error } = await supabase
            .from('meal_templates')
            .select('*')
            .eq('day_of_week', dayOfWeek);

        if (error) throw error;

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

    async getDailyMealPlan(date: string): Promise<(MealOrder & { userName: string })[]> {
        // 1. Fetch Users
        const { data: users, error: usersError } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('status', ['APPROVED', 'PENDING']);

        if (usersError) throw usersError;

        // 2. Fetch Explicit Orders
        const { data: orders, error: ordersError } = await supabase
            .from('meal_orders')
            .select('*')
            .eq('date', date);

        if (ordersError) throw ordersError;

        // 3. Fetch Templates for Day of Week
        const dateObj = new Date(date);
        const dayOfWeek = dateObj.getDay(); // 0-6
        const { data: templates, error: templatesError } = await supabase
            .from('meal_templates')
            .select('*')
            .eq('day_of_week', dayOfWeek);

        if (templatesError) throw templatesError;

        // 4. Merge Data for Each User
        const effectivePlan: (MealOrder & { userName: string })[] = [];

        users.forEach(user => {
            const userName = user.full_name || user.email.split('@')[0];

            // Calculate Breakfast
            this._calculateEffectiveMeal(effectivePlan, user.id, userName, date, 'breakfast', orders, templates);

            // Calculate Lunch
            this._calculateEffectiveMeal(effectivePlan, user.id, userName, date, 'lunch', orders, templates);

            // Calculate Dinner
            this._calculateEffectiveMeal(effectivePlan, user.id, userName, date, 'dinner', orders, templates);
        });

        return effectivePlan;
    },

    _calculateEffectiveMeal(plan: any[], userId: string, userName: string, date: string, mealType: 'breakfast' | 'lunch' | 'dinner', orders: any[], templates: any[]) {
        const explicitOrder = orders.find(o => o.user_id === userId && o.meal_type === mealType);

        if (explicitOrder) {
            plan.push({
                id: explicitOrder.id,
                userId: userId,
                userName: userName,
                date: date,
                mealType: mealType,
                option: explicitOrder.option,
                isBag: explicitOrder.is_bag,
                status: explicitOrder.status
            });
            return;
        }

        const template = templates.find(t => t.user_id === userId && t.meal_type === mealType);

        if (template) {
            plan.push({
                id: `tmpl-${userId}-${mealType}`, // Virtual ID
                userId: userId,
                userName: userName,
                date: date,
                mealType: mealType,
                option: template.option,
                isBag: template.is_bag,
                status: 'template' // Virtual status
            });
        }
        // If no template, user is skipped (Not eating)
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
