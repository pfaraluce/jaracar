// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const NOTION_API_KEY = Deno.env.get('NOTION_API_KEY') ?? '';
const NOTION_DATABASE_ID = Deno.env.get('NOTION_DATABASE_ID') ?? '';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        if (!NOTION_API_KEY || !NOTION_DATABASE_ID) {
            throw new Error('Missing environment variables: NOTION_API_KEY or NOTION_DATABASE_ID');
        }

        // Query Notion Database
        const response = await fetch(`https://api.notion.com/v1/databases/${NOTION_DATABASE_ID}/query`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${NOTION_API_KEY}`,
                'Notion-Version': '2022-06-28',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                page_size: 50, // Grab a batch
                // We could add a random sort if Notion supported it easily, 
                // but typically we just fetch enough and pick random in code if database isn't huge.
                // Or specific filter. For now, fetch all active.
            }),
        });

        if (!response.ok) {
            const err = await response.text();
            return new Response(JSON.stringify({ error: 'Notion API Error', details: err }), {
                status: 502,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const data = await response.json();

        // Parse simplified quotes
        // Assumption: 'Name' or 'Text' property for quote, 'Author' property, 'Date' property
        // We need to be resilient to property names since we haven't seen the schema.
        // Usually Title property is key.

        const quotes = data.results.map((page: any) => {
            // Helper to safely get text content from common property types
            const getText = (prop: any) => {
                if (!prop) return '';
                if (prop.type === 'title') return prop.title?.[0]?.plain_text || '';
                if (prop.type === 'rich_text') return prop.rich_text?.[0]?.plain_text || '';
                if (prop.type === 'date') return prop.date?.start || '';
                if (prop.type === 'select') return prop.select?.name || '';
                if (prop.type === 'people') return prop.people?.[0]?.name || '';
                return '';
            };

            const props = page.properties;

            // Auto-detect fields by checking keys or standard fallback
            // Ideally user tells us names, but we try standard ones
            let text = '';
            let author = '';
            let date = '';

            // Find property names dynamically or assume standard
            // "Frase" or "Name" or "Title" -> text
            // "Autor" -> author
            // "Fecha" -> date

            for (const [key, val] of Object.entries(props)) {
                const k = key.toLowerCase();
                if (k.includes('frase') || k.includes('text') || k.includes('quote') || (val as any).id === 'title') {
                    if (!text) text = getText(val);
                }
                if (k.includes('autor') || k.includes('author')) { author = getText(val); }
                if (k.includes('fecha') || k.includes('date')) { date = getText(val); }
            }

            // Fallback if specific keys not found, use first text found as quote
            if (!text) {
                // Find any title property
                const titleProp = Object.values(props).find((p: any) => p.id === 'title');
                if (titleProp) text = getText(titleProp);
            }

            return { text, author, date, id: page.id };
        }).filter((q: any) => q.text.length > 0);

        // Select Random Quote
        const randomQuote = quotes.length > 0
            ? quotes[Math.floor(Math.random() * quotes.length)]
            : null;

        return new Response(JSON.stringify(randomQuote), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: (error as Error).message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
