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
                image_url: updates.imageUrl
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
