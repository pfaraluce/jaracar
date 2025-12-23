import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ClipboardList, 
    Plus, 
    Trash2, 
    CheckCircle2, 
    Circle, 
    User as UserIcon, 
    Car as CarIcon,
    Search,
    X,
    AlertCircle
} from 'lucide-react';
import { Task, User, Car } from '../types';
import { tasksService } from '../services/tasks';
import { adminService } from '../services/admin';
import { carService } from '../services/cars';
import { houseGuideService } from '../services/houseGuide';
import { UserSelector } from './UserSelector';

export const TasksAdmin: React.FC = () => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [cars, setCars] = useState<Car[]>([]);
    const [loading, setLoading] = useState(true);
    const [showInlineForm, setShowInlineForm] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [settings, setSettings] = useState<any>(null);
    const [updatingMaintenance, setUpdatingMaintenance] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        assignedUserId: '',
        vehicleId: '',
        type: 'general' as 'general' | 'vehicle',
        status: 'open' as 'open' | 'completed'
    });

    useEffect(() => {
        loadData();
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const data = await houseGuideService.getSettings();
            setSettings(data);
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    };

    const loadData = async () => {
        setLoading(true);
        try {
            const [tasksData, usersData, carsData] = await Promise.all([
                tasksService.getTasks(),
                adminService.getUsers(),
                carService.getCars()
            ]);
            setTasks(tasksData);
            setUsers(usersData.filter(u => u.status === 'APPROVED'));
            setCars(carsData);
        } catch (error) {
            console.error('Error loading tasks data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await tasksService.createTask(formData);
            await loadData();
            // Bulk creation: keep user and type
            setFormData(prev => ({
                ...prev,
                title: '',
                description: '',
                status: 'open'
            }));
        } catch (error) {
            console.error('Error creating task:', error);
        }
    };

    const handleToggleStatus = async (task: Task) => {
        try {
            const newStatus = task.status === 'open' ? 'completed' : 'open';
            await tasksService.updateTask(task.id, { status: newStatus });
            await loadData();
        } catch (error) {
            console.error('Error updating task status:', error);
        }
    };

    const handleDeleteTask = async (id: string) => {
        if (!confirm('¿Estás seguro de que quieres eliminar este encargo?')) return;
        try {
            await tasksService.deleteTask(id);
            await loadData();
        } catch (error) {
            console.error('Error deleting task:', error);
        }
    };

    const handleToggleMaintenance = async () => {
        if (!settings) return;
        setUpdatingMaintenance(true);
        try {
            const newValue = !settings.tasksMaintenanceMode;
            await houseGuideService.updateSettings({ 
                id: settings.id, 
                tasksMaintenanceMode: newValue 
            });
            await loadSettings();
        } catch (error) {
            console.error('Error updating maintenance mode:', error);
            alert('Error al actualizar el modo mantenimiento');
        } finally {
            setUpdatingMaintenance(false);
        }
    };

    const filteredTasks = tasks.filter(t => 
        t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.assignedUserName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium text-zinc-900 dark:text-white flex items-center gap-2">
                        <ClipboardList size={20} className="text-zinc-500" />
                        Gestión de Encargos
                    </h3>
                    <p className="text-xs text-zinc-500 mt-1">Asigna encargos recurrentes a residentes</p>
                </div>
                <div className="flex items-center gap-4">
                    {/* Maintenance Toggle */}
                    <div className="flex items-center gap-3 px-4 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-2xl">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Modo WIP</span>
                            <span className="text-[9px] text-zinc-500 whitespace-nowrap">Ocultar a usuarios</span>
                        </div>
                        <button
                            onClick={handleToggleMaintenance}
                            disabled={updatingMaintenance || !settings}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                settings?.tasksMaintenanceMode ? 'bg-amber-500' : 'bg-zinc-200 dark:bg-zinc-700'
                            } disabled:opacity-50`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    settings?.tasksMaintenanceMode ? 'translate-x-6' : 'translate-x-1'
                                }`}
                            />
                        </button>
                    </div>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                        <input 
                            type="text"
                            placeholder="Buscar encargo..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-zinc-500/20 transition-all"
                        />
                    </div>
                    <button
                        onClick={() => setShowInlineForm(!showInlineForm)}
                        className={`p-2 rounded-xl transition-all shadow-sm flex items-center gap-2 px-4 font-medium text-sm ${
                            showInlineForm 
                            ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400' 
                            : 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100'
                        }`}
                    >
                        {showInlineForm ? <X size={18} /> : <Plus size={18} />}
                        {showInlineForm ? 'Cerrar' : 'Nuevo Encargo'}
                    </button>
                </div>
            </div>

            <AnimatePresence>
                {showInlineForm && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <form 
                            onSubmit={handleCreateTask}
                            className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4"
                        >
                            <div className="flex flex-col lg:flex-row gap-4 items-end">
                                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Título</label>
                                        <input 
                                            required
                                            type="text"
                                            value={formData.title}
                                            onChange={(e) => setFormData({...formData, title: e.target.value})}
                                            placeholder="Título del encargo..."
                                            className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-zinc-500/20 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Descripción</label>
                                        <input 
                                            value={formData.description}
                                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                                            placeholder="Detalles (opcional)..."
                                            className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-zinc-500/20 transition-all"
                                        />
                                    </div>
                                </div>
                                
                                <div className="flex-[0.8] grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                                    <UserSelector 
                                        label="Asignar a"
                                        users={users}
                                        value={formData.assignedUserId}
                                        onChange={(val) => setFormData({...formData, assignedUserId: val})}
                                        compact={true}
                                    />
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Tipo</label>
                                        <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl border border-zinc-200 dark:border-zinc-700">
                                            <button
                                                type="button"
                                                onClick={() => setFormData({...formData, type: 'general'})}
                                                className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition-all ${
                                                    formData.type === 'general'
                                                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                                                    : 'text-zinc-500'
                                                }`}
                                            >
                                                General
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setFormData({...formData, type: 'vehicle'})}
                                                className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition-all ${
                                                    formData.type === 'vehicle'
                                                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                                                    : 'text-zinc-500'
                                                }`}
                                            >
                                                Vehículo
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="w-full lg:w-48">
                                    {formData.type === 'vehicle' ? (
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Vehículo</label>
                                            <select 
                                                required={formData.type === 'vehicle'}
                                                value={formData.vehicleId}
                                                onChange={(e) => setFormData({...formData, vehicleId: e.target.value})}
                                                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-zinc-500/20 transition-all font-medium"
                                            >
                                                <option value="">Seleccionar...</option>
                                                {cars.map(car => (
                                                    <option key={car.id} value={car.id}>{car.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    ) : (
                                        <button
                                            type="submit"
                                            className="w-full py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-bold shadow-sm hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                                        >
                                            <Plus size={16} />
                                            Añadir
                                        </button>
                                    )}
                                </div>
                            </div>

                            {formData.type === 'vehicle' && (
                                <div className="flex justify-end border-t border-zinc-100 dark:border-zinc-800 pt-3">
                                    <button
                                        type="submit"
                                        className="px-8 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-bold shadow-sm hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                                    >
                                        <Plus size={16} />
                                        Crear Encargo de Vehículo
                                    </button>
                                </div>
                            )}
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="w-10 h-10 border-4 border-zinc-200 dark:border-zinc-800 border-t-zinc-900 dark:border-t-white rounded-full animate-spin" />
                </div>
            ) : filteredTasks.length === 0 ? (
                <div className="text-center py-20 bg-zinc-50 dark:bg-zinc-800/50 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800">
                    <ClipboardList size={40} className="mx-auto text-zinc-300 mb-3" />
                    <p className="text-sm text-zinc-500 font-medium">No hay encargos que coincidan con la búsqueda</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredTasks.map(task => (
                        <div 
                            key={task.id} 
                            className={`bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm transition-all ${task.status === 'completed' ? 'opacity-60' : ''}`}
                        >
                            <div className="flex justify-between items-start mb-3">
                                <button 
                                    onClick={() => handleToggleStatus(task)}
                                    className={`transition-colors ${task.status === 'completed' ? 'text-emerald-500' : 'text-zinc-300 dark:text-zinc-600 hover:text-emerald-500'}`}
                                >
                                    {task.status === 'completed' ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                                </button>
                                <button 
                                    onClick={() => handleDeleteTask(task.id)}
                                    className="p-1.5 text-zinc-400 hover:text-rose-500 transition-colors"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <h4 className={`font-bold text-zinc-900 dark:text-white ${task.status === 'completed' ? 'line-through' : ''}`}>
                                        {task.title}
                                    </h4>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">{task.description}</p>
                                </div>

                                <div className="flex flex-wrap gap-2 pt-2">
                                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-[10px] font-medium text-zinc-600 dark:text-zinc-400 border border-zinc-100 dark:border-zinc-700">
                                        <UserIcon size={12} />
                                        {task.assignedUserName || 'Sin asignar'}
                                    </div>
                                    {task.type === 'vehicle' && (
                                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-[10px] font-bold text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30">
                                            <CarIcon size={12} />
                                            {task.vehicleName || 'Vehículo'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
