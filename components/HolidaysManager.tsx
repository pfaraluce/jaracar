import React, { useState, useEffect } from 'react';
import { kitchenService } from '../services/kitchen';
import { Holiday } from '../types';
import { Trash2, Plus, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface HolidaysManagerProps {
    className?: string;
}

export const HolidaysManager: React.FC<HolidaysManagerProps> = ({ className }) => {
    const [holidays, setHolidays] = useState<Holiday[]>([]);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);
    
    // New Holiday Form
    const [newName, setNewName] = useState('');
    const [newDate, setNewDate] = useState('');

    useEffect(() => {
        loadHolidays();
    }, []);

    const loadHolidays = async () => {
        try {
            const data = await kitchenService.getHolidays();
            setHolidays(data);
        } catch (error) {
            console.error("Failed to load holidays", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName || !newDate) return;

        setAdding(true);
        try {
            await kitchenService.addHoliday(newName, newDate);
            setNewName('');
            setNewDate('');
            loadHolidays();
        } catch (error) {
            console.error("Failed to add holiday", error);
            alert("Error al añadir festivo. Puede que ya exista.");
        } finally {
            setAdding(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este festivo?')) return;
        try {
            await kitchenService.deleteHoliday(id);
            loadHolidays();
        } catch (error) {
            console.error("Failed to delete holiday", error);
        }
    };

    if (loading) return <div className="p-4 flex justify-center"><Loader2 className="animate-spin text-zinc-400" /></div>;

    return (
        <div className={`space-y-4 ${className}`}>
            <h3 className="font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                <CalendarIcon size={18} />
                Gestión de Festivos
            </h3>

            {/* List */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {holidays.length === 0 && (
                    <p className="text-sm text-zinc-400 italic">No hay festivos configurados.</p>
                )}
                {holidays.map(holiday => (
                    <div key={holiday.id} className="flex items-center justify-between p-2 bg-zinc-50 dark:bg-zinc-800 rounded border border-zinc-100 dark:border-zinc-700">
                        <div>
                            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{holiday.name}</p>
                            <p className="text-xs text-zinc-500 uppercase">
                                {format(new Date(holiday.date), "d 'de' MMMM", { locale: es })}
                            </p>
                        </div>
                        <button 
                            onClick={() => handleDelete(holiday.id)}
                            className="text-zinc-400 hover:text-red-500 p-1"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}
            </div>

            {/* Add Form */}
            <form onSubmit={handleAdd} className="flex gap-2 items-end pt-2 border-t border-zinc-200 dark:border-zinc-700">
                <div className="flex-1">
                    <label className="text-[10px] uppercase text-zinc-400 font-bold">Nombre</label>
                    <input 
                        type="text" 
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        placeholder="Ej. Navidad"
                        className="w-full text-xs p-2 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                        required
                    />
                </div>
                <div className="w-32">
                    <label className="text-[10px] uppercase text-zinc-400 font-bold">Fecha</label>
                    <input 
                        type="date" 
                        value={newDate}
                        onChange={e => setNewDate(e.target.value)}
                        className="w-full text-xs p-2 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                        required
                    />
                </div>
                <button 
                    type="submit" 
                    disabled={adding}
                    className="p-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded hover:opacity-90 disabled:opacity-50"
                >
                    {adding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                </button>
            </form>
        </div>
    );
};
