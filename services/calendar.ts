import { supabase } from './supabase';
import { CalendarEvent, EpactaMetadata, parseEpactaDescription } from './icalParser';

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
        return data.map(dbEvent => {
            const description = dbEvent.description_override || dbEvent.description;
            return {
                id: dbEvent.id, // Internal ID
                title: dbEvent.title,
                description: description,
                rawDescription: dbEvent.description,
                descriptionOverride: dbEvent.description_override,
                start: new Date(dbEvent.start_time),
                end: dbEvent.end_time ? new Date(dbEvent.end_time) : undefined,
                allDay: dbEvent.all_day,
                location: dbEvent.location,
                metadata: dbEvent.metadata, 
                calendarId: dbEvent.calendar_id
            };
        });
    },

    async updateEventOverride(eventId: string, descriptionOverride: string | null) {
        // 1. Fetch current event to get raw description if clearing override
        const { data: event, error: fetchError } = await supabase
            .from('calendar_events')
            .select('*')
            .eq('id', eventId)
            .single();

        if (fetchError) throw fetchError;

        const effectiveDescription = descriptionOverride || event.description;
        const newMetadata = parseEpactaDescription(effectiveDescription);

        const { error } = await supabase
            .from('calendar_events')
            .update({
                description_override: descriptionOverride,
                metadata: newMetadata
            })
            .eq('id', eventId);

        if (error) throw error;
    },

    async syncEvents(calendarId: string, events: CalendarEvent[]) {
        // 1. Fetch existing events for this calendar to preserve overrides
        const { data: existingEvents } = await supabase
            .from('calendar_events')
            .select('external_uid, description_override')
            .eq('calendar_id', calendarId);

        const overrideMap = new Map(existingEvents?.map(e => [e.external_uid, e.description_override]) || []);

        // 2. Prepare DB objects
        const allDbEvents = events.map(ev => {
            const existingOverride = overrideMap.get(ev.id);
            const metadata = existingOverride ? parseEpactaDescription(existingOverride) : ev.metadata;
            
            return {
                calendar_id: calendarId,
                external_uid: ev.id,
                title: ev.title,
                description: ev.description?.substring(0, 1000),
                start_time: ev.start.toISOString(),
                end_time: ev.end ? ev.end.toISOString() : null,
                all_day: ev.allDay,
                location: ev.location,
                metadata: metadata
            };
        });

        // 3. Delete those that are no longer in the source (to handle deletions)
        // Extract external_uids from the new set
        const newUids = events.map(e => e.id);
        const { error: deleteError } = await supabase
            .from('calendar_events')
            .delete()
            .eq('calendar_id', calendarId)
            .not('external_uid', 'in', `(${newUids.join(',')})`);

        if (deleteError) {
            console.error("Cleanup of old events failed", deleteError);
            // Non-critical, continue
        }

        // 4. Batch Upsert 
        const BATCH_SIZE = 100;
        for (let i = 0; i < allDbEvents.length; i += BATCH_SIZE) {
            const batch = allDbEvents.slice(i, i + BATCH_SIZE);

            const { error: insertError } = await supabase
                .from('calendar_events')
                .upsert(batch, { onConflict: 'calendar_id,external_uid' });

            if (insertError) {
                console.error("Batch upsert failed", insertError);
                throw insertError;
            }
        }
    }
};
