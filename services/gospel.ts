import { format } from 'date-fns';

export interface GospelData {
    title: string;
    description: string;
    link: string;
}

export const gospelService = {
    async getGospel(date: Date): Promise<GospelData | null> {
        try {
            const dateStr = format(date, 'yyyy-MM-dd');
            const targetUrl = `https://opusdei.org/es-es/gospel/${dateStr}/`;

            // Use corsproxy.io as alternative
            const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;

            const response = await fetch(proxyUrl);
            const htmlText = await response.text();

            if (!htmlText) return null;

            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlText, 'text/html');

            const title = doc.querySelector('.title')?.textContent?.trim() || '';
            const description = doc.querySelector('.description')?.textContent?.trim() || '';

            if (!title) return null;

            return {
                title,
                description,
                link: targetUrl
            };
        } catch (error) {
            console.error("Failed to fetch gospel", error);
            return null;
        }
    }
};
