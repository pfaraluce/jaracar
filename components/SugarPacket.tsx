import React, { useEffect, useState } from 'react';
import { quotesService, Quote } from '../services/quotes';
import { RefreshCcw, Recycle } from 'lucide-react';

export const SugarPacket: React.FC = () => {
    const [quote, setQuote] = useState<Quote | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchQuote = async () => {
        setLoading(true);
        try {
            const data = await quotesService.getRandomQuote();
            setQuote(data);
        } catch (error) {
            console.error('Failed to fetch quote', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQuote();
    }, []);

    if (!quote) return null;

    return (
        <div className="w-full flex justify-center py-6 px-2">
            <div
                className="relative bg-[#fafafa] text-[#8B0000] w-full max-w-xl min-h-[140px] flex items-center justify-center p-8 shadow-md hover:shadow-lg transition-all cursor-pointer group transform rotate-1 hover:rotate-0"
                onClick={fetchQuote}
                style={{
                    // Authentic sugar packet feel: slight texture, specific shadow
                    backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.8), rgba(255,255,255,0.8) 10px, rgba(245,245,245,0.8) 10px, rgba(245,245,245,0.8) 20px)',
                    boxShadow: '2px 4px 8px rgba(0,0,0,0.08)',
                }}
            >
                {/* Serrated Edge Left */}
                <div
                    className="absolute -left-1.5 top-0 bottom-0 w-3 bg-[#fafafa] z-10"
                    style={{
                        mask: 'conic-gradient(from -45deg at bottom 4px right 1px, transparent 135deg, #000 135deg 225deg, transparent 225deg) repeat-y',
                        maskSize: '10px 14px',
                        WebkitMask: 'conic-gradient(from -45deg at bottom 4px right 1px, transparent 135deg, #000 135deg 225deg, transparent 225deg) repeat-y',
                        WebkitMaskSize: '100% 14px',
                    }}
                />

                {/* Serrated Edge Right */}
                <div
                    className="absolute -right-1.5 top-0 bottom-0 w-3 bg-[#fafafa] z-10"
                    style={{
                        transform: 'scaleX(-1)',
                        mask: 'conic-gradient(from -45deg at bottom 4px right 1px, transparent 135deg, #000 135deg 225deg, transparent 225deg) repeat-y',
                        maskSize: '10px 14px',
                        WebkitMask: 'conic-gradient(from -45deg at bottom 4px right 1px, transparent 135deg, #000 135deg 225deg, transparent 225deg) repeat-y',
                        WebkitMaskSize: '100% 14px',
                    }}
                />

                {/* Left/Right Crimped Seam Lines (Internal) */}
                <div className="absolute left-3 top-0 bottom-0 w-px bg-zinc-200/50 border-r border-dashed border-zinc-300/30" />
                <div className="absolute right-3 top-0 bottom-0 w-px bg-zinc-200/50 border-l border-dashed border-zinc-300/30" />

                {/* Content */}
                <div className={`text-center space-y-3 transition-opacity duration-500 z-20 ${loading ? 'opacity-50' : 'opacity-100'}`}>
                    <p
                        className="text-2xl md:text-4xl leading-relaxed px-6 md:px-12 select-none"
                        style={{ fontFamily: "'Parisienne', cursive" }}
                    >
                        "{quote.text}"
                    </p>
                    {(quote.author || quote.date) && (
                        <div className="pt-1 flex flex-col items-center gap-0.5 text-[#8B0000]/60 text-sm font-medium">
                            {quote.author && <span style={{ fontFamily: "'Parisienne', cursive" }} className="text-lg">— {quote.author}</span>}
                            {quote.date && (
                                <span className="text-[10px] uppercase tracking-wider opacity-60 font-sans">
                                    {new Date(quote.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* Decor: Recycle Icon Bottom Right */}
                <div className="absolute bottom-2 right-4 opacity-30 border border-[#8B0000] p-0.5 rounded-sm rotate-12">
                    <Recycle size={12} strokeWidth={1.5} />
                </div>

                {/* Hint to refresh */}
                <div className="absolute top-2 right-4 opacity-0 group-hover:opacity-20 transition-opacity">
                    <RefreshCcw size={14} />
                </div>

            </div>
        </div >
    );
};
