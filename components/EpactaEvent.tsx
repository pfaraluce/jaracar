import React, { useState } from 'react';
import { Flower2, Sun, BookOpen, Scroll, List, HandHelping, ExternalLink, AlertCircle, Pencil, X, Save, RotateCcw, RefreshCw } from 'lucide-react';
import { EpactaMetadata, CalendarEvent } from '../services/icalParser';
import { calendarService } from '../services/calendar';
import { format } from 'date-fns';

// Helper component to render simplified HTML tags
const FormattedText: React.FC<{ text: string }> = ({ text }) => {
    // Simple parser for <b>, <i>, <br> AND URLs
    if (!text) return null;

    // Split by tags: <b>, </b>, <i>, </i>, <br>, <br/>
    const parts = text.split(/(<\/?(?:b|i|br)\s*\/?>)/gi);

    let isBold = false;
    let isItalic = false;

    // Helper to finding links in a text string
    const renderWithLinks = (str: string, keyPrefix: string) => {
        // Regex to find URLs (starts with http/https)
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const subParts = str.split(urlRegex);

        return subParts.map((sub, i) => {
            if (sub.match(urlRegex)) {
                return (
                    <a
                        key={`${keyPrefix}-${i}`}
                        href={sub}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline break-all"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {sub}
                    </a>
                );
            }
            return <span key={`${keyPrefix}-${i}`}>{sub}</span>;
        });
    };

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
                        {renderWithLinks(part, `part-${index}`)}
                    </span>
                );
            })}
        </span>
    );
};

interface EpactaEventProps {
    event: CalendarEvent;
    compact?: boolean;
    isAdmin?: boolean;
    onUpdate?: () => void;
}

export const EpactaEvent: React.FC<EpactaEventProps> = ({ 
    event, 
    compact = false, 
    isAdmin = false, 
    onUpdate 
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(event.descriptionOverride || event.rawDescription || event.description || '');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            await calendarService.updateEventOverride(event.id, editValue);
            setIsEditing(false);
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error(error);
            alert("Error al guardar.");
        } finally {
            setSaving(false);
        }
    };

    const handleReset = async () => {
        if (!confirm("¿Eliminar cambios manuales y volver al original?")) return;
        setSaving(true);
        try {
            await calendarService.updateEventOverride(event.id, null);
            setEditValue(event.rawDescription || event.description || '');
            setIsEditing(false);
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

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
        className: "p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow relative group/event"
    };

    const colorStyle = getLiturgicalColorStyles(meta.color);

    // Editing View
    if (isEditing) {
        return (
            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border-2 border-dashed border-zinc-200 dark:border-zinc-700 space-y-3">
                <div className="flex justify-between items-center">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Editar Epacta (RAW)</span>
                    <button onClick={() => setIsEditing(false)} className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition-colors">
                        <X size={14} />
                    </button>
                </div>
                <textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-full min-h-[100px] p-3 text-xs font-mono bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Color / Misal / Leccionario / Prefacio - Plegaria / ..."
                />
                <div className="flex justify-between gap-2">
                    <button
                        onClick={handleReset}
                        disabled={saving || !event.descriptionOverride}
                        className="px-3 py-1.5 text-[10px] font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded flex items-center gap-1 transition-colors disabled:opacity-30"
                    >
                        <RotateCcw size={12} /> Descartar cambios manuales
                    </button>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setIsEditing(false)}
                            className="px-3 py-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-4 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                            {saving ? <RefreshCw size={12} className="animate-spin" /> : <Save size={12} />}
                            Guardar
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Fallback for simple description (no metadata)
    if (!hasMetadata && !isSuplemento && event.description) {
        return (
            <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-400 border-t border-zinc-200 dark:border-zinc-700 pt-2 line-clamp-4 relative group/event">
                {isAdmin && (
                    <button 
                        onClick={() => setIsEditing(true)}
                        className="absolute top-2 right-0 p-1 bg-white dark:bg-zinc-800 shadow-sm border border-zinc-200 dark:border-zinc-700 rounded-lg opacity-0 group-hover/event:opacity-100 transition-opacity"
                    >
                        <Pencil size={12} className="text-zinc-400" />
                    </button>
                )}
                {event.description}
            </div>
        );
    }

    return (
        // @ts-ignore
        <Container {...containerProps}>
            {!compact && (
                <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                        <h4 className="font-bold text-zinc-900 dark:text-white text-base leading-tight">
                            {event.title}
                        </h4>
                        {event.descriptionOverride && (
                            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-tighter">Corregido manualmente</span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {isAdmin && (
                            <button 
                                onClick={() => setIsEditing(true)}
                                className="p-1 px-2 flex items-center gap-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700"
                                title="Editar texto Epacta"
                            >
                                <Pencil size={12} />
                                <span className="text-[10px] font-bold">RAW</span>
                            </button>
                        )}
                        {!event.allDay && (
                            <span className="text-xs font-mono bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded text-zinc-500 whitespace-nowrap">
                                {format(event.start, 'HH:mm')}
                            </span>
                        )}
                    </div>
                </div>
            )}

            <div className={`space-y-3 ${compact ? 'mt-3 pt-3 border-t border-dashed border-zinc-200 dark:border-zinc-700' : ''}`}>

                {/* Header Badges (Color, Family, Flores, Expo) */}
                {(meta.color || meta.flores || meta.exposicion || meta.familyFeast) && (
                    <div className="flex flex-wrap gap-2 mb-2">
                        {meta.color && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${colorStyle || 'bg-zinc-100'}`}>
                                {meta.color}
                            </span>
                        )}

                        {meta.familyFeast && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800">
                                Fiesta {meta.familyFeast}
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
                        
                        {compact && isAdmin && (
                             <button 
                                onClick={() => setIsEditing(true)}
                                className="p-0.5 px-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 text-zinc-400 transition-all ml-auto"
                                title="Editar texto Epacta"
                             >
                                <Pencil size={10} />
                             </button>
                        )}
                    </div>
                )}

                {/* Liturgical Details */}
                <>
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
                            className="text-xs text-zinc-600 dark:text-zinc-400 prose prose-xs dark:prose-invert max-w-none [&>a]:text-blue-600 [&>a]:underline"
                            dangerouslySetInnerHTML={{ __html: event.description }}
                        />
                    )}
                </>
            </div>
        </Container>
    );
};
