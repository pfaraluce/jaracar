import { supabase } from './supabase';
import { CalendarEvent, EpactaMetadata } from './icalParser';

export interface CalendarSource {
    id: string;
    name: string;
    url: string;
    color: string;
    is_epacta: boolean; // Field from DB
}

export const calendarService = {
    async getCalendars(): Promise<CalendarSource[]> {
        const { data, error } = await supabase
            .from('calendars')
            .select('*')
            .order('name');

        if (error) throw error;
        return data;
    },

    async addCalendar(name: string, url: string, isEpacta: boolean, color: string = '#3b82f6') {
        const { data, error } = await supabase
            .from('calendars')
            .insert({
                name,
                url,
                color,
                is_epacta: isEpacta
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteCalendar(id: string) {
        const { error } = await supabase
            .from('calendars')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // --- CACHING METHODS ---

    async getCachedEvents(calendarIds: string[]): Promise<CalendarEvent[]> {
        if (calendarIds.length === 0) return [];

        const { data, error } = await supabase
            .from('calendar_events')
            .select('*')
            .in('calendar_id', calendarIds);

        if (error) throw error;

        // Map DB fields to CalendarEvent interface
        return data.map(dbEvent => ({
            id: dbEvent.id, // Internal ID
            title: dbEvent.title,
            description: dbEvent.description,
            start: new Date(dbEvent.start_time),
            end: dbEvent.end_time ? new Date(dbEvent.end_time) : undefined,
            allDay: dbEvent.all_day,
            location: dbEvent.location,
            metadata: dbEvent.metadata, // JSONB works as object directly in Supabase JS
            calendarId: dbEvent.calendar_id
        }));
    },

    async syncEvents(calendarId: string, events: CalendarEvent[]) {
        // 1. Delete existing cache for this calendar
        // Strategy: "Replace All" for simplicity and to handle deletions in source.
        const { error: deleteError } = await supabase
            .from('calendar_events')
            .delete()
            .eq('calendar_id', calendarId);

        if (deleteError) throw deleteError;

        if (events.length === 0) return;

        // 2. Prepare DB objects
        const allDbEvents = events.map(ev => ({
            calendar_id: calendarId,
            external_uid: ev.id,
            title: ev.title,
            description: ev.description?.substring(0, 1000),
            start_time: ev.start.toISOString(),
            end_time: ev.end ? ev.end.toISOString() : null,
            all_day: ev.allDay,
            location: ev.location,
            metadata: ev.metadata
        }));

        // 3. Batch Insert (Chunk size 100 to avoid 400 Bad Request / Payload limit)
        const BATCH_SIZE = 100;

        // Use a loop to process batches sequentially or Promise.all for parallel
        // Sequential is safer for rate limits, though basic insert shouldn't be rate limited easily.
        for (let i = 0; i < allDbEvents.length; i += BATCH_SIZE) {
            const batch = allDbEvents.slice(i, i + BATCH_SIZE);

            const { error: insertError } = await supabase
                .from('calendar_events')
                .insert(batch);

            if (insertError) {
                console.error("Batch insert failed", insertError);
                throw insertError;
            }
        }
    }
};
