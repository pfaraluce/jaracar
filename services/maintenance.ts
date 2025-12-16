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
        const { data, error } = await supabase
            .from('maintenance_tickets')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return data.map(d => ({
            id: d.id,
            title: d.title,
            description: d.description,
            status: d.status,
            priority: d.priority,
            reporterId: d.reporter_id,
            location: d.location,
            imageUrl: d.image_url,
            createdAt: d.created_at
        }));
    },

    async updateStatus(id: string, status: MaintenanceTicket['status']): Promise<void> {
        const { error } = await supabase
            .from('maintenance_tickets')
            .update({ status })
            .eq('id', id);

        if (error) throw error;
    }
};
