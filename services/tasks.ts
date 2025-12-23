import { supabase } from './supabase';
import { Task } from '../types';

export const tasksService = {
    async getTasks(userId?: string): Promise<Task[]> {
        let query = supabase
            .from('tasks')
            .select(`
                *,
                assigned_user:profiles!assigned_user_id(full_name, avatar_url),
                vehicle:cars!vehicle_id(name)
            `)
            .order('created_at', { ascending: false });

        if (userId) {
            query = query.eq('assigned_user_id', userId);
        }

        const { data, error } = await query;

        if (error) throw new Error(error.message);

        return data.map((t: any) => ({
            id: t.id,
            title: t.title,
            description: t.description,
            assignedUserId: t.assigned_user_id,
            assignedUserName: t.assigned_user?.full_name,
            assignedUserAvatar: t.assigned_user?.avatar_url,
            vehicleId: t.vehicle_id,
            vehicleName: t.vehicle?.name,
            type: t.type,
            status: t.status,
            createdAt: t.created_at
        }));
    },

    async createTask(task: Omit<Task, 'id' | 'createdAt'>): Promise<Task> {
        const { data, error } = await supabase
            .from('tasks')
            .insert({
                title: task.title,
                description: task.description,
                assigned_user_id: task.assignedUserId,
                vehicle_id: task.vehicleId,
                type: task.type,
                status: task.status
            })
            .select(`
                *,
                assigned_user:profiles!assigned_user_id(full_name, avatar_url),
                vehicle:cars!vehicle_id(name)
            `)
            .single();

        if (error) throw new Error(error.message);

        return {
            id: data.id,
            title: data.title,
            description: data.description,
            assignedUserId: data.assigned_user_id,
            assignedUserName: data.assigned_user?.full_name,
            assignedUserAvatar: data.assigned_user?.avatar_url,
            vehicleId: data.vehicle_id,
            vehicleName: data.vehicle?.name,
            type: data.type,
            status: data.status,
            createdAt: data.created_at
        };
    },

    async updateTask(id: string, updates: Partial<Omit<Task, 'id' | 'createdAt'>>): Promise<void> {
        const dbUpdates: any = {};
        if (updates.title !== undefined) dbUpdates.title = updates.title;
        if (updates.description !== undefined) dbUpdates.description = updates.description;
        if (updates.status !== undefined) dbUpdates.status = updates.status;
        if (updates.assignedUserId !== undefined) dbUpdates.assigned_user_id = updates.assignedUserId;
        if (updates.vehicleId !== undefined) dbUpdates.vehicle_id = updates.vehicleId;

        const { error } = await supabase
            .from('tasks')
            .update(dbUpdates)
            .eq('id', id);

        if (error) throw new Error(error.message);
    },

    async deleteTask(id: string): Promise<void> {
        const { error } = await supabase
            .from('tasks')
            .delete()
            .eq('id', id);

        if (error) throw new Error(error.message);
    }
};
