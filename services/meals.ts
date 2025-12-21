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
            .in('status', ['APPROVED', 'PENDING'])
            .neq('role', 'KITCHEN');

        if (usersError) throw usersError;

        // 2. Fetch Explicit Orders
        const { data: orders, error: ordersError } = await supabase
            .from('meal_orders')
            .select('*')
            .eq('date', date);

        if (ordersError) throw ordersError;

        // 3. Fetch Templates for Day of Week
        const dateObj = new Date(date);
        let dayOfWeek = dateObj.getDay(); // 0=Sun
        if (dayOfWeek === 0) dayOfWeek = 7; // Convert to 1-7 (Mon-Sun)

        const { data: templates, error: templatesError } = await supabase
            .from('meal_templates')
            .select('*')
            .eq('day_of_week', dayOfWeek);

        if (templatesError) throw templatesError;

        // 4. Fetch Absences for this date
        const { data: absences, error: absencesError } = await supabase
            .from('user_absences')
            .select('user_id')
            .lte('start_date', date)
            .gte('end_date', date);

        if (absencesError) throw absencesError;

        const absentUserIds = new Set(absences.map(a => a.user_id));

        // 5. Merge Data for Each User
        const effectivePlan: (MealOrder & { userName: string })[] = [];

        users.forEach(user => {
            const userName = user.full_name || user.email.split('@')[0];
            const isAbsent = absentUserIds.has(user.id);

            // Calculate Breakfast
            this._calculateEffectiveMeal(effectivePlan, user.id, userName, date, 'breakfast', orders, templates, isAbsent);

            // Calculate Lunch
            this._calculateEffectiveMeal(effectivePlan, user.id, userName, date, 'lunch', orders, templates, isAbsent);

            // Calculate Dinner
            this._calculateEffectiveMeal(effectivePlan, user.id, userName, date, 'dinner', orders, templates, isAbsent);
        });

        return effectivePlan;
    },

    _calculateEffectiveMeal(
        plan: any[],
        userId: string,
        userName: string,
        date: string,
        mealType: 'breakfast' | 'lunch' | 'dinner',
        orders: any[],
        templates: any[],
        isAbsent: boolean
    ) {
        const explicitOrder = orders.find(o => o.user_id === userId && o.meal_type === mealType);

        // 1. Explicit Order (Always Priority)
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

        // 2. Absence (If no explicit order, absence means NO MEAL)
        if (isAbsent) {
            // Implicitly skipped, do not add to plan (or add with 'skip' if needed, but 'skip' usually implies not in list)
            // If the UI expects 'skip' entries to show "NO", we could add it.
            // But typical behavior is: if it's not in the returned array, it's not "active".
            // However, looking at DailyMealsList:
            // "skip" or "no" -> 'no' group.
            // If we don't return anything, it won't be in 'no' group?
            // DailyMealsList logic:
            // It iterates over `orders`. If an entry is NOT in `orders`, it is NOT displayed in any group.
            // So if I want them to appear in the "No" list (which they do), I should probably return explicit skip?
            // Wait, does the "No" list exist?
            // In DailyMealsList:
            // `ordersList.filter(o => o.mealType === mealType).forEach(...)`
            // If it's not in ordersList, it's not shown.
            // If the user wants to see them as "Absent" presumably in the "No" column (or just absent), 
            // the user request says: "The day 26... Pablo marked as absence... but I see him eating...".
            // This means currently it falls through to Template -> "Standard".
            // If isAbsent -> return nothing. This removes them from "Standard". 
            // It effectively puts them in "No Order" / "Nothing". 
            // DailyMealsGrid usually shows 'No' for empty, but List view only shows items in the list.
            // If I return nothing, they disappear from the list. This satisfies "Not eating".
            // If the user wants them to appear in a "No/Ausente" list specifically, I'd need to add an entry with option='skip'.
            // Let's assume returning nothing is safe, as it removes them from the "Yes" lists.
            // I will add an explicit entry with 'skip' so they appear in the UI context if needed (e.g. knowing who is NOT eating).
            // Actually, DailyMealsList has a 'no' group: `{ key: 'no', label: 'No' }`.
            // If I want them to show there, I must push an entry.
            plan.push({
                id: `absent-${userId}-${mealType}`,
                userId: userId,
                userName: userName,
                date: date,
                mealType: mealType,
                option: 'skip',
                isBag: false,
                status: 'absence'
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
            return;
        }

        // If no template, default to 'skip' (User not eating)
        plan.push({
            id: `default-${userId}-${mealType}`, // Virtual ID
            userId: userId,
            userName: userName,
            date: date,
            mealType: mealType,
            option: 'skip',
            isBag: false,
            status: 'default' // Virtual status
        });
    },

    async getEffectiveDailyPlans(dates: string[]): Promise<Record<string, (MealOrder & { userName: string })[]>> {
        if (dates.length === 0) return {};

        // 1. Fetch Users (Once)
        const { data: users, error: usersError } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('status', ['APPROVED', 'PENDING'])
            .or('role.neq.KITCHEN,role.is.null');

        if (usersError) throw usersError;

        // 2. Fetch Data for Range
        const sortedDates = [...dates].sort();
        const startDate = sortedDates[0];
        const endDate = sortedDates[sortedDates.length - 1];

        // Fetch all orders in range
        const { data: allOrders, error: ordersError } = await supabase
            .from('meal_orders')
            .select('*')
            .gte('date', startDate)
            .lte('date', endDate);

        if (ordersError) throw ordersError;

        // Fetch all absences in range
        const { data: allAbsences, error: absencesError } = await supabase
            .from('user_absences')
            .select('user_id, start_date, end_date')
            .or(`and(start_date.lte.${endDate},end_date.gte.${startDate})`);

        if (absencesError) throw absencesError;

        // Fetch templates for relevant Days of Week
        const dayOfWeeks = [...new Set(dates.map(d => {
            let dw = new Date(d).getDay();
            return dw === 0 ? 7 : dw;
        }))];

        const { data: allTemplates, error: templatesError } = await supabase
            .from('meal_templates')
            .select('*')
            .in('day_of_week', dayOfWeeks);

        if (templatesError) throw templatesError;

        // 3. Calculate Plans
        const results: Record<string, (MealOrder & { userName: string })[]> = {};

        dates.forEach(date => {
            const dateObj = new Date(date);
            let dayOfWeek = dateObj.getDay();
            if (dayOfWeek === 0) dayOfWeek = 7;

            // Filter data for this specific day
            const dayOrders = allOrders.filter(o => o.date === date);
            const dayTemplates = allTemplates.filter(t => t.day_of_week === dayOfWeek);
            const dayAbsences = allAbsences.filter(a => a.start_date <= date && a.end_date >= date);
            const absentUserIds = new Set(dayAbsences.map(a => a.user_id));

            const effectivePlan: (MealOrder & { userName: string })[] = [];

            users.forEach(user => {
                const userName = user.full_name || user.email.split('@')[0];
                const isAbsent = absentUserIds.has(user.id);

                this._calculateEffectiveMeal(effectivePlan, user.id, userName, date, 'breakfast', dayOrders, dayTemplates, isAbsent);
                this._calculateEffectiveMeal(effectivePlan, user.id, userName, date, 'lunch', dayOrders, dayTemplates, isAbsent);
                this._calculateEffectiveMeal(effectivePlan, user.id, userName, date, 'dinner', dayOrders, dayTemplates, isAbsent);
            });

            results[date] = effectivePlan;
        });

        return results;
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
