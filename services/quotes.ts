import { supabase } from './supabase';

export interface Quote {
    id?: string;
    text: string;
    author?: string;
    date?: string;
}

// Mock Data - Frases de Azucarillo style
const MOCK_QUOTES: Quote[] = [
    { text: "No siempre necesitas un plan, a veces solo necesitas respirar, confiar, dejarte llevar y ver qué sucede." },
    { text: "La vida es como una taza de café, todo está en cómo la preparas, pero sobre todo en cómo la tomas." },
    { text: "Si puedes soñarlo, puedes hacerlo." },
    { text: "Sonríe, es la llave que encaja en todas las cerraduras del corazón." },
    { text: "Hoy es un buen día para tener un gran día." },
    { text: "Lo mejor está por venir." },
    { text: "Cree en ti y todo será posible." },
    { text: "La felicidad no es un destino, es la actitud con la que viajas por la vida." },
    { text: "Haz más de lo que te hace feliz." },
    { text: "Cáete siete veces, levántate ocho." },
    { text: "Tu actitud determina tu dirección." },
    { text: "El éxito es la suma de pequeños esfuerzos repetidos día tras día." },
    { text: "No cuentes los días, haz que los días cuenten.", author: "Muhammad Ali" },
    { text: "La mejor forma de predecir el futuro es crearlo." },
    { text: "Lo único imposible es aquello que no intentas." },
    { text: "Cada día es una nueva oportunidad para cambiar tu vida." },
    { text: "Sé el cambio que quieres ver en el mundo.", author: "Mahatma Gandhi" },
    { text: "La vida es 10% lo que te pasa y 90% cómo reaccionas a ello." }
];

export const quotesService = {
    getRandomQuote: async (): Promise<Quote> => {
        try {
            const { data, error } = await supabase.functions.invoke('get-quote');
            if (error) throw error;
            if (data) return data;
            throw new Error('No data returned');
        } catch (err: any) {
            // Log detailed error for debugging
            console.warn('[QuotesService] Data fetch failed:', err);
            if (err && err.message) {
                console.warn('[QuotesService] Error message:', err.message);
            }
            // If it's a FunctionsHttpError, it might not expose the body directly in the message easily, 
            // but checking the Network Tab is the best bet.

            // Fallback
            const randomIndex = Math.floor(Math.random() * MOCK_QUOTES.length);
            return MOCK_QUOTES[randomIndex];
        }
    }
};
