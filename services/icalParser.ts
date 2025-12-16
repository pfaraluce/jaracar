// @ts-ignore
import ICAL from 'ical.js';

// Logic to parse the "Epacta" description string
export interface EpactaMetadata {
    color?: string; // mo, bl, az, etc.
    misal?: string;
    leccionario?: string;
    prefacio?: string;
    plegaria?: string;
    flores?: boolean;
    exposicion?: 'Simple' | 'Solemne';
    alerts?: string[];
    externalLinks?: { url: string; text: string }[];
    otros?: string[];
}

const parseEpactaDescription = (desc: string): EpactaMetadata => {
    if (!desc) return {};

    // 1. Clean up newlines that might break HTML tags in the description
    // Sometimes ICS wraps lines weirdly. We try to join lines that look like broken HTML.
    let cleanDesc = desc.replace(/\r\n/g, " ").replace(/\n/g, " ");

    // 2. Split by " / " (Space Slash Space) to avoid breaking URLs like http://...
    const parts = cleanDesc.split(' / ').map(p => p.trim());
    const result: EpactaMetadata = {};

    // Helper to check for keywords and remove them from the string if found
    // Returns [foundBoolean, remainingString]
    const extractKeyword = (text: string, keyword: string): boolean => {
        return text.toLowerCase().includes(keyword.toLowerCase());
    };

    // 1. Color
    if (parts.length > 0) {
        let colorPart = parts[0];
        // Check for "flo" in color part just in case
        if (extractKeyword(colorPart, 'flo')) {
            result.flores = true;
            colorPart = colorPart.replace(/flo/gi, '').trim();
        }
        result.color = colorPart;
    }

    // 2. Misal
    if (parts.length > 1) result.misal = parts[1];

    // 3. Leccionario
    if (parts.length > 2) result.leccionario = parts[2];

    // 4. Prefacio & Plegaria
    if (parts.length > 3) {
        const pfPeChunk = parts[3];
        const subParts = pfPeChunk.split(' - ');
        if (subParts.length > 1) {
            result.plegaria = subParts.pop();
            result.prefacio = subParts.join(' - ');
        } else {
            result.prefacio = pfPeChunk;
        }
    }

    // 5. Otros (Process for keywords, links, and alerts)
    if (parts.length > 4) {
        const rawOthers = parts.slice(4);
        result.otros = [];
        result.externalLinks = [];
        result.alerts = [];

        rawOthers.forEach(item => {
            let currentItem = item;

            // --- KEYWORDS ---
            if (currentItem.includes('ExSol') || currentItem.includes('ExSo')) {
                result.exposicion = 'Solemne';
                return; // Consume
            }
            if (currentItem.includes('ExSi')) {
                result.exposicion = 'Simple';
                return; // Consume
            }
            // Check for 'flo' or '(flo)'
            if (currentItem.toLowerCase().includes('flo')) {
                result.flores = true;
                return; // Consume
            }

            // --- SPECIAL ALERTS (Consagrar viril) ---
            if (currentItem.toLowerCase().includes('consagrar viril')) {
                result.alerts?.push(currentItem); // Add the whole text as alert
                return; // Consume
            }

            // --- ALERTS [Bracketed Text] ---
            const bracketRegex = /\[(.*?)\]/g;
            let bracketMatch;
            while ((bracketMatch = bracketRegex.exec(currentItem)) !== null) {
                if (bracketMatch[1].trim()) {
                    result.alerts?.push(bracketMatch[1].trim());
                }
            }
            // Remove brackets from string
            currentItem = currentItem.replace(bracketRegex, '').trim();

            // --- LINKS ---
            // Regex to capture <a href="...">text</a>
            const linkRegex = /<a\s+(?:[^>]*?\s+)?href="([^"]*)"[^>]*>(.*?)<\/a>/gi;
            let linkMatch = linkRegex.exec(currentItem);

            if (linkMatch) {
                // It's a link
                result.externalLinks?.push({
                    url: linkMatch[1],
                    text: linkMatch[2] || 'Enlace'
                });
            } else if (currentItem.length > 0) {
                // Normal text (cleaned of brackets)
                // We keep HTML tags like <b>, <i>, <br> to be handled by frontend
                result.otros?.push(currentItem);
            }
        });
    }

    return result;
};


export const parseICS = (icsData: string, isEpacta: boolean = false): CalendarEvent[] => {
    const events: CalendarEvent[] = [];

    // Define window of interest: 1 year ago to 2 years in future
    const now = new Date();
    const minDate = new Date(now);
    minDate.setFullYear(now.getFullYear() - 1);

    const maxDate = new Date(now);
    maxDate.setFullYear(now.getFullYear() + 2);

    try {
        const jcalData = ICAL.parse(icsData);
        const comp = new ICAL.Component(jcalData);
        const vevents = comp.getAllSubcomponents('vevent');

        vevents.forEach((vevent: any) => {
            const event = new ICAL.Event(vevent);

            const processEvent = (startDate: Date, endDate: Date, uid: string) => {
                const baseEvent: CalendarEvent = {
                    id: uid,
                    title: event.summary,
                    description: event.description,
                    location: event.location,
                    start: startDate,
                    end: endDate,
                    allDay: event.startDate.isDate // Check if date only
                };

                // Epacta Parsing Logic
                if (isEpacta && event.description) {
                    baseEvent.metadata = parseEpactaDescription(event.description);
                }

                events.push(baseEvent);
            };

            if (event.isRecurring()) {
                const iterator = event.iterator();

                let next: any;
                let count = 0;
                while ((next = iterator.next()) && count < 5000) {
                    const jsDate = next.toJSDate();

                    if (jsDate > maxDate) break;
                    if (jsDate < minDate) {
                        count++;
                        continue;
                    }

                    const details = event.getOccurrenceDetails(next);
                    processEvent(
                        details.startDate.toJSDate(),
                        details.endDate.toJSDate(),
                        event.uid + '_' + jsDate.getTime()
                    );

                    count++;
                }
            } else {
                const start = event.startDate.toJSDate();
                if (start >= minDate && start <= maxDate) {
                    processEvent(start, event.endDate.toJSDate(), event.uid);
                }
            }
        });

    } catch (e) {
        console.error("Error parsing ICS with ical.js", e);
    }

    return events.sort((a, b) => a.start.getTime() - b.start.getTime());
};

export interface CalendarEvent {
    id: string;
    title: string;
    description?: string;
    start: Date;
    end?: Date;
    location?: string;
    allDay: boolean;
    color?: string;
    metadata?: EpactaMetadata; // New field for rich liturgical data
}
