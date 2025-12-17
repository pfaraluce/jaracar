import { supabase } from './supabase';
import { MaintenanceTicket } from '../types';

export const maintenanceService = {

    async createTicket(ticket: Omit<MaintenanceTicket, 'id' | 'createdAt' | 'status'>) {
        const { data, error } = await supabase
            .from('maintenance_tickets')
            .insert({
                title: ticket.title,
                description: ticket.description,
                priority: ticket.priority,
                reporter_id: ticket.reporterId,
                assigned_user_id: ticket.assignedUserId,
                location: ticket.location,
                image_url: ticket.imageUrl,
                status: 'open'
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async getTickets(): Promise<MaintenanceTicket[]> {
        // First get all tickets
        const { data: tickets, error: ticketsError } = await supabase
            .from('maintenance_tickets')
            .select('*')
            .order('created_at', { ascending: false });

        if (ticketsError) throw ticketsError;
        if (!tickets) return [];

        // Get unique user IDs
        const userIds = new Set<string>();
        tickets.forEach(t => {
            if (t.reporter_id) userIds.add(t.reporter_id);
            if (t.assigned_user_id) userIds.add(t.assigned_user_id);
        });

        // Fetch user profiles
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', Array.from(userIds));

        if (profilesError) throw profilesError;

        // Create a map for quick lookup
        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

        // Map tickets with user data
        return tickets.map(d => {
            const reporter = profileMap.get(d.reporter_id);
            const assigned = profileMap.get(d.assigned_user_id);

            return {
                id: d.id,
                title: d.title,
                description: d.description,
                status: d.status,
                priority: d.priority,
                reporterId: d.reporter_id,
                reporterName: reporter?.full_name,
                reporterAvatar: reporter?.avatar_url,
                assignedUserId: d.assigned_user_id,
                assignedUserName: assigned?.full_name,
                assignedUserAvatar: assigned?.avatar_url,
                location: d.location,
                imageUrl: d.image_url,
                createdAt: d.created_at
            };
        });
    },

    async uploadImage(file: File): Promise<string> {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('maintenance-images')
            .upload(filePath, file);

        if (uploadError) {
            throw uploadError;
        }

        const { data } = supabase.storage
            .from('maintenance-images')
            .getPublicUrl(filePath);

        return data.publicUrl;
    },

    async assignTicket(ticketId: string, userId: string): Promise<void> {
        const { error } = await supabase
            .from('maintenance_tickets')
            .update({ reporter_id: userId })
            .eq('id', ticketId);

        if (error) throw error;
    },

    async updateStatus(id: string, status: MaintenanceTicket['status']): Promise<void> {
        const { error } = await supabase
            .from('maintenance_tickets')
            .update({ status })
            .eq('id', id);

        if (error) throw error;
    },

    async updateTicket(id: string, updates: Partial<MaintenanceTicket>): Promise<void> {
        const { error } = await supabase
            .from('maintenance_tickets')
            .update({
                title: updates.title,
                description: updates.description,
                priority: updates.priority,
                location: updates.location,
                image_url: updates.imageUrl,
                reporter_id: updates.reporterId,
                assigned_user_id: updates.assignedUserId
            })
            .eq('id', id);

        if (error) throw error;
    },

    async deleteTicket(id: string): Promise<void> {
        const { error } = await supabase
            .from('maintenance_tickets')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
