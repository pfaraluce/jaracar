import React from 'react';
import { Flower2, Sun, BookOpen, Scroll, List, HandHelping, ExternalLink, AlertCircle } from 'lucide-react';
import { EpactaMetadata, CalendarEvent } from '../services/icalParser';
import { format } from 'date-fns';

// Helper component to render simplified HTML tags
const FormattedText: React.FC<{ text: string }> = ({ text }) => {
    // Simple parser for <b>, <i>, <br>
    if (!text) return null;

    // Split by tags: <b>, </b>, <i>, </i>, <br>, <br/>
    const parts = text.split(/(<\/?(?:b|i|br)\s*\/?>)/gi);

    let isBold = false;
    let isItalic = false;

    return (
        <span>
            {parts.map((part, index) => {
                const low = part.toLowerCase();
                if (low === '<b>') { isBold = true; return null; }
                if (low === '</b>') { isBold = false; return null; }
                if (low === '<i>') { isItalic = true; return null; }
                if (low === '</i>') { isItalic = false; return null; }
                if (low.startsWith('<br')) return <br key={index} />;

                if (!part) return null;

                return (
                    <span key={index} className={`${isBold ? 'font-bold' : ''} ${isItalic ? 'italic' : ''}`}>
                        {part}
                    </span>
                );
            })}
        </span>
    );
};

interface EpactaEventProps {
    event: CalendarEvent;
    compact?: boolean;
}

export const EpactaEvent: React.FC<EpactaEventProps> = ({ event, compact = false }) => {
    const meta = event.metadata || {};
    const hasMetadata = Object.keys(meta).length > 0;
    const isSuplemento = event.title?.toLowerCase().includes('suplementos');

    const getLiturgicalColorStyles = (code?: string) => {
        if (!code) return null;
        const c = code.toLowerCase().trim();
        if (c.includes('mo')) return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800'; // Morado
        if (c.includes('bl')) return 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700';   // Blanco
        if (c.includes('ro')) return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800';         // Rojo
        if (c.includes('ve')) return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800';   // Verde
        if (c.includes('az')) return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800';      // Azul
        return 'bg-zinc-100 text-zinc-800 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700';
    };

    // If not compact (e.g. Dashboard), show a card-like container
    const Container = compact ? React.Fragment : 'div';
    const containerProps = compact ? {} : {
        className: "p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow"
    };

    const colorStyle = getLiturgicalColorStyles(meta.color);

    // Fallback for simple description (no metadata)
    if (!hasMetadata && !isSuplemento && event.description) {
        return (
            <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-400 border-t border-zinc-200 dark:border-zinc-700 pt-2 line-clamp-4">
                {event.description}
            </div>
        );
    }

    return (
        // @ts-ignore
        <Container {...containerProps}>
            {!compact && (
                <div className="flex items-start justify-between mb-3">
                    <h4 className="font-bold text-zinc-900 dark:text-white text-base leading-tight">
                        {event.title}
                    </h4>
                    {!event.allDay && (
                        <span className="text-xs font-mono bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded text-zinc-500">
                            {format(event.start, 'HH:mm')}
                        </span>
                    )}
                </div>
            )}

            <div className={`space-y-3 ${compact ? 'mt-3 pt-3 border-t border-dashed border-zinc-200 dark:border-zinc-700' : ''}`}>

                {/* Header Badges (Color, Flores, Expo) */}
                {(meta.color || meta.flores || meta.exposicion) && (
                    <div className="flex flex-wrap gap-2 mb-2">
                        {meta.color && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${colorStyle || 'bg-zinc-100'}`}>
                                {meta.color}
                            </span>
                        )}

                        {meta.flores && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-800 flex items-center gap-1">
                                <Flower2 size={10} /> Flores
                            </span>
                        )}

                        {meta.exposicion && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800 flex items-center gap-1">
                                <Sun size={10} /> {meta.exposicion === 'Solemne' ? 'Exp. Solemne' : 'Exp. Simple'}
                            </span>
                        )}
                    </div>
                )}

                {/* Misal */}
                {meta.misal && (
                    <div className="flex gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                        <BookOpen size={14} className="shrink-0 mt-0.5 text-zinc-400" />
                        <span className="leading-relaxed"><FormattedText text={meta.misal} /></span>
                    </div>
                )}

                {/* Leccionario */}
                {meta.leccionario && (
                    <div className="flex gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                        <Scroll size={14} className="shrink-0 mt-0.5 text-zinc-400" />
                        <span className="leading-relaxed"><FormattedText text={meta.leccionario} /></span>
                    </div>
                )}

                {/* Prefacio & Plegaria */}
                {(meta.prefacio || meta.plegaria) && (
                    <div className="space-y-2">
                        {meta.prefacio && (
                            <div className="flex gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                                <List size={14} className="shrink-0 mt-0.5 text-zinc-400" />
                                <span className="leading-relaxed"><FormattedText text={meta.prefacio} /></span>
                            </div>
                        )}
                        {meta.plegaria && (
                            <div className="flex gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                                <HandHelping size={14} className="shrink-0 mt-0.5 text-zinc-400" />
                                <span className="leading-relaxed"><FormattedText text={meta.plegaria} /></span>
                            </div>
                        )}
                    </div>
                )}

                {/* External Links */}
                {meta.externalLinks && meta.externalLinks.length > 0 && (
                    <div className="flex flex-col gap-1 pt-1">
                        {meta.externalLinks.map((link, i) => (
                            <a
                                key={i}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs transition-colors group"
                            >
                                <ExternalLink size={12} className="shrink-0" />
                                <span className="truncate underline font-medium">{link.text}</span>
                            </a>
                        ))}
                    </div>
                )}

                {/* Otros */}
                {meta.otros && meta.otros.length > 0 && (
                    <div className="text-xs text-zinc-500 space-y-1 pl-5 border-l-2 border-zinc-100 dark:border-zinc-800">
                        {meta.otros.map((o, i) => (
                            <p key={i}>
                                <FormattedText text={o} />
                            </p>
                        ))}
                    </div>
                )}

                {/* Alerts [Bracketed Text & Consagrar Viril] - MOVED TO BOTTOM */}
                {meta.alerts && meta.alerts.length > 0 && (
                    <div className="flex flex-col gap-2 pt-2">
                        {meta.alerts.map((alert, i) => (
                            <div key={i} className="flex gap-2 text-xs bg-orange-50 dark:bg-orange-900/20 text-orange-800 dark:text-orange-200 p-2 rounded border border-orange-100 dark:border-orange-900/30">
                                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                                <span className="font-medium"><FormattedText text={alert} /></span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Fallback for simple HTML description in Suplementos */}
                {isSuplemento && event.description && (
                    <div
                        className="mt-2 text-xs text-zinc-600 dark:text-zinc-400 border-t border-zinc-200 dark:border-zinc-700 pt-2 prose prose-xs dark:prose-invert max-w-none [&>a]:text-blue-600 [&>a]:underline"
                        dangerouslySetInnerHTML={{ __html: event.description }}
                    />
                )}
            </div>
        // @ts-ignore
        </Container>
    );
};
