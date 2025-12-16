import { useState, useEffect } from 'react';
import { calendarService, CalendarSource } from '../services/calendar';
import { parseICS, CalendarEvent } from '../services/icalParser';

// Predefined palette for calendars
const CALENDAR_COLORS = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
    '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
];

export const useCalendarEvents = () => {
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [calendars, setCalendars] = useState<CalendarSource[]>([]);

    // Improved proxy list - corsproxy.io is clearer and usually handles headers better
    const fetchWithProxy = async (url: string) => {
        const proxies = [
            'https://corsproxy.io/?',
            'https://api.allorigins.win/raw?url='
        ];

        let lastError;
        for (const proxy of proxies) {
            try {
                // Determine if we need to encode based on the proxy
                // corsproxy.io works best with direct append for some, encoded for others.
                // Standard approach: most proxies expect encoded.
                const target = proxy + encodeURIComponent(url);
                const response = await fetch(target);
                if (response.ok) return await response.text();
            } catch (e) {
                lastError = e;
                continue;
            }
        }
        throw lastError || new Error('All proxies failed');
    };

    const loadData = async () => {
        setLoading(true);
        try {
            const cals = await calendarService.getCalendars();
            setCalendars(cals);

            // 1. Try to load from DB cache first (fastest)
            const calendarIds = cals.map(c => c.id);
            if (calendarIds.length === 0) {
                setEvents([]);
                setLoading(false);
                return;
            }

            // Load cached
            const cachedEvents = await calendarService.getCachedEvents(calendarIds);

            // If we have cache, use it immediately
            if (cachedEvents.length > 0) {
                const colored = cachedEvents.map(ev => {
                    const idx = cals.findIndex(c => c.id === (ev as any).calendarId);
                    ev.color = CALENDAR_COLORS[idx % CALENDAR_COLORS.length] || '#3b82f6';
                    return ev;
                });
                setEvents(colored.sort((a, b) => a.start.getTime() - b.start.getTime()));
            } else {
                // Empty cache? Maybe trigger background sync?
                // For now, let's leave it empty and let the user see the "Refresh" option in main calendar 
                // OR we could silently try to sync one.
            }

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    return { events, loading, calendars, refresh: loadData };
};
