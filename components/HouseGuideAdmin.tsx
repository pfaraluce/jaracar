import React, { useState, useEffect } from 'react';
import { 
    Plus, 
    Trash2, 
    Save, 
    Clock, 
    Key, 
    FileText, 
    BookOpen, 
    Info, 
    X,
    Upload,
    Loader2,
    Edit2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { HouseSettings, HouseDocument, AppGuideSection, ScheduleItem, HouseKey } from '../types';
import { houseGuideService } from '../services/houseGuide';

interface HouseGuideAdminProps {
    onUpdate?: () => void;
}

export const HouseGuideAdmin: React.FC<HouseGuideAdminProps> = ({ onUpdate }) => {
    const [settings, setSettings] = useState<HouseSettings | null>(null);
    const [documents, setDocuments] = useState<HouseDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [isExperience, setIsExperience] = useState(false);
    const [activeTab, setActiveTab] = useState<'SCHEDULES' | 'KEYS' | 'INSTRUCTIONS' | 'DOCS'>('SCHEDULES');

    // Form states
    const [editingDocId, setEditingDocId] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [settingsData, docsData] = await Promise.all([
                houseGuideService.getSettings(),
                houseGuideService.getDocuments()
            ]);
            setSettings(settingsData);
            setDocuments(docsData);
        } catch (error) {
            console.error('Error loading admin data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSettings = async () => {
        if (!settings) return;
        setSaving(true);
        try {
            await houseGuideService.updateSettings(settings);
            alert('Ajustes guardados correctamente');
            if (onUpdate) onUpdate();
        } catch (error) {
            alert('Error al guardar: ' + (error as Error).message);
        } finally {
            setSaving(false);
        }
    };

    // --- Schedule Handlers ---
    const addScheduleItem = (day: 'weekdays' | 'saturdays' | 'sundays') => {
        if (!settings) return;
        const newItem: ScheduleItem = { time: '08:00', activity: 'Nueva actividad' };
        setSettings({
            ...settings,
            schedules: {
                ...settings.schedules,
                [day]: [...settings.schedules[day], newItem]
            }
        });
    };

    const updateScheduleItem = (day: 'weekdays' | 'saturdays' | 'sundays', index: number, field: keyof ScheduleItem, value: string) => {
        if (!settings) return;
        const newShedules = { ...settings.schedules };
        newShedules[day][index] = { ...newShedules[day][index], [field]: value };
        setSettings({ ...settings, schedules: newShedules });
    };

    const removeScheduleItem = (day: 'weekdays' | 'saturdays' | 'sundays', index: number) => {
        if (!settings) return;
        const newDaySchedules = settings.schedules[day].filter((_, i) => i !== index);
        setSettings({
            ...settings,
            schedules: { ...settings.schedules, [day]: newDaySchedules }
        });
    };

    // --- Key Handlers ---
    const addKey = () => {
        if (!settings) return;
        const newKey: HouseKey = { id: crypto.randomUUID(), name: 'Nueva llave', description: '' };
        setSettings({ ...settings, houseKeys: [...settings.houseKeys, newKey] });
    };

    const updateKey = (id: string, field: keyof HouseKey, value: string) => {
        if (!settings) return;
        const newKeys = settings.houseKeys.map(k => k.id === id ? { ...k, [field]: value } : k);
        setSettings({ ...settings, houseKeys: newKeys });
    };

    const removeKey = (id: string) => {
        if (!settings) return;
        setSettings({ ...settings, houseKeys: settings.houseKeys.filter(k => k.id !== id) });
    };

    // --- Doc Handlers ---
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            await houseGuideService.uploadDocument(file, isExperience ? 'experience' : 'general');
            await loadData();
            setIsExperience(false); // Reset toggle
        } catch (error) {
            alert('Error al subir: ' + (error as Error).message);
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteDoc = async (id: string, path: string) => {
        if (!confirm('¿Eliminar documento?')) return;
        try {
            await houseGuideService.deleteDocument(id, path);
            await loadData();
        } catch (error) {
            alert('Error al eliminar');
        }
    };

    if (loading) return <div className="p-8 text-center text-zinc-500">Cargando administración...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-zinc-900 dark:text-white">Admin: Guía de la Casa</h3>
                {activeTab !== 'DOCS' && (
                    <button
                        onClick={handleSaveSettings}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl text-sm font-medium disabled:opacity-50 transition-all active:scale-95"
                    >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        Guardar Cambios
                    </button>
                )}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {[
                    { id: 'SCHEDULES', label: 'Horarios', icon: Clock },
                    { id: 'KEYS', label: 'Llaves y Claves', icon: Key },
                    { id: 'INSTRUCTIONS', label: 'Instrucciones', icon: Info },
                    { id: 'DOCS', label: 'Documentos', icon: FileText },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                            activeTab === tab.id 
                            ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white' 
                            : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                        }`}
                    >
                        <tab.icon size={14} />
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
                <AnimatePresence mode="wait">
                    {/* SCHEDULES ADMIN */}
                    {activeTab === 'SCHEDULES' && settings && (
                        <motion.div key="schedules" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                            {['weekdays', 'saturdays', 'sundays'].map((day) => (
                                <div key={day} className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                                            {day === 'weekdays' ? 'Lunes a Viernes' : day === 'saturdays' ? 'Sábados' : 'Domingos y Festivos'}
                                        </h4>
                                        <button 
                                            onClick={() => addScheduleItem(day as any)}
                                            className="p-1 px-3 text-xs bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center gap-1 hover:bg-zinc-200 transition-colors"
                                        >
                                            <Plus size={12} /> Añadir
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        {settings.schedules[day as keyof typeof settings.schedules].map((item, idx) => (
                                            <div key={idx} className="flex gap-2 items-start">
                                                <div className="flex flex-col gap-1">
                                                    <input 
                                                        type="text" 
                                                        value={item.time} 
                                                        onChange={e => updateScheduleItem(day as any, idx, 'time', e.target.value)}
                                                        placeholder="08:00"
                                                        title="Hora de inicio"
                                                        className="w-20 px-2 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg outline-none"
                                                    />
                                                    <input 
                                                        type="text" 
                                                        value={item.endTime || ''} 
                                                        onChange={e => updateScheduleItem(day as any, idx, 'endTime', e.target.value)}
                                                        placeholder="Fin (opc)"
                                                        title="Hora de fin (opcional)"
                                                        className="w-20 px-2 py-1 text-[10px] bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg outline-none"
                                                    />
                                                </div>
                                                <div className="flex-1 space-y-1">
                                                    <textarea 
                                                        value={item.activity} 
                                                        onChange={e => updateScheduleItem(day as any, idx, 'activity', e.target.value)}
                                                        placeholder="Actividad"
                                                        rows={2}
                                                        className="w-full px-2 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none resize-none"
                                                    />
                                                    <textarea 
                                                        value={item.notes || ''} 
                                                        onChange={e => updateScheduleItem(day as any, idx, 'notes', e.target.value)}
                                                        placeholder="Notas (opcional)"
                                                        rows={2}
                                                        className="w-full px-2 py-1 text-[10px] bg-transparent border-b border-zinc-100 dark:border-zinc-800 outline-none resize-none"
                                                    />
                                                </div>
                                                <button 
                                                    onClick={() => removeScheduleItem(day as any, idx)}
                                                    className="p-1.5 text-zinc-400 hover:text-red-500"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    )}

                    {/* KEYS ADMIN */}
                    {activeTab === 'KEYS' && settings && (
                        <motion.div key="keys" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                            <div className="flex justify-end">
                                <button onClick={addKey} className="flex items-center gap-1 px-3 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg text-xs">
                                    <Plus size={14} /> Nueva Llave
                                </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {settings.houseKeys.map(key => (
                                    <div key={key.id} className="p-4 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl space-y-3">
                                        <div className="flex justify-between items-center">
                                            <input 
                                                type="text" 
                                                value={key.name}
                                                onChange={e => updateKey(key.id, 'name', e.target.value)}
                                                className="bg-transparent font-medium text-sm outline-none border-b border-zinc-200 dark:border-zinc-600 focus:border-zinc-900 dark:focus:border-white"
                                            />
                                            <button onClick={() => removeKey(key.id)} className="text-zinc-400 hover:text-red-500">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                        <textarea 
                                            value={key.description}
                                            onChange={e => updateKey(key.id, 'description', e.target.value)}
                                            placeholder="Descripción"
                                            rows={3}
                                            className="w-full bg-transparent text-xs outline-none resize-none"
                                        />
                                        <input 
                                            type="text" 
                                            value={key.location || ''}
                                            onChange={e => updateKey(key.id, 'location', e.target.value)}
                                            placeholder="Ubicación"
                                            className="w-full bg-zinc-100 dark:bg-zinc-900/50 px-2 py-1 rounded text-[10px] outline-none"
                                        />
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* INSTRUCTIONS ADMIN */}
                    {activeTab === 'INSTRUCTIONS' && settings && (
                        <motion.div key="instructions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Instrucciones generales de la casa</label>
                            <textarea 
                                value={settings.instructions}
                                onChange={e => setSettings({...settings, instructions: e.target.value})}
                                rows={15}
                                className="w-full p-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-zinc-900/10 transition-all font-normal leading-relaxed"
                                placeholder="Escribe aquí las instrucciones generales..."
                            />
                        </motion.div>
                    )}

                    {/* DOCUMENTS ADMIN */}
                    {activeTab === 'DOCS' && (
                        <motion.div key="docs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h4 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider">Gestión de Documentos</h4>
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-center gap-2 px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl">
                                        <input
                                            type="checkbox"
                                            id="isExperience"
                                            checked={isExperience}
                                            onChange={(e) => setIsExperience(e.target.checked)}
                                            className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 text-zinc-900 focus:ring-zinc-900"
                                        />
                                        <label htmlFor="isExperience" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                            Subir como "Experiencia"
                                        </label>
                                    </div>
                                    <label className="cursor-pointer px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl text-xs font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-all">
                                        {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                                        Subir Documento
                                        <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                                    </label>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                {documents.map(doc => (
                                    <div key={doc.id} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <FileText size={18} className="text-zinc-400" />
                                            <div className="flex flex-col">
                                                <span className="text-sm text-zinc-700 dark:text-zinc-300 font-medium">{doc.fileName}</span>
                                                {doc.category === 'experience' && (
                                                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">Experiencia</span>
                                                )}
                                            </div>
                                        </div>
                                        <button onClick={() => handleDeleteDoc(doc.id, doc.filePath)} className="p-2 text-zinc-400 hover:text-red-500">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}


                </AnimatePresence>
            </div>
        </div>
    );
};
