import React, { useState, useEffect } from 'react';
import { User, MaintenanceTicket } from '../types';
import { maintenanceService } from '../services/maintenance';
import { Plus, MapPin, AlertCircle, CheckCircle2, Clock, XCircle, Loader2 } from 'lucide-react';

interface MaintenanceViewProps {
    user: User;
}

export const MaintenanceView: React.FC<MaintenanceViewProps> = ({ user }) => {
    const [tickets, setTickets] = useState<MaintenanceTicket[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newTicket, setNewTicket] = useState({
        title: '',
        description: '',
        priority: 'medium' as MaintenanceTicket['priority'],
        location: ''
    });
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        loadTickets();
    }, []);

    const loadTickets = async () => {
        try {
            const data = await maintenanceService.getTickets();
            setTickets(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        try {
            await maintenanceService.createTicket({
                ...newTicket,
                reporterId: user.id
            });
            setIsCreateOpen(false);
            setNewTicket({ title: '', description: '', priority: 'medium', location: '' });
            loadTickets();
        } catch (error) {
            console.error(error);
        } finally {
            setCreating(false);
        }
    };

    const handleStatusChange = async (id: string, newStatus: MaintenanceTicket['status']) => {
        try {
            // Optimistic update
            setTickets(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
            await maintenanceService.updateStatus(id, newStatus);
        } catch (error) {
            console.error(error);
            loadTickets(); // Revert
        }
    };

    const StatusBadge = ({ status }: { status: string }) => {
        const styles = {
            open: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
            in_progress: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
            resolved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
            closed: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400',
        }[status] || 'bg-zinc-100';

        const labels = {
            open: 'Abierto',
            in_progress: 'En Proceso',
            resolved: 'Resuelto',
            closed: 'Cerrado'
        }[status] || status;

        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles}`}>
                {labels}
            </span>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Mantenimiento</h2>
                    <p className="text-zinc-500 dark:text-zinc-400">Reporta y sigue incidencias en la residencia.</p>
                </div>
                <button
                    onClick={() => setIsCreateOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-lg hover:opacity-90 transition-all font-medium text-sm"
                >
                    <Plus size={16} />
                    Nueva Incidencia
                </button>
            </div>

            {isCreateOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-zinc-900 rounded-xl max-w-md w-full p-6 space-y-4">
                        <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Nueva Incidencia</h3>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Título</label>
                                <input
                                    required
                                    value={newTicket.title}
                                    onChange={e => setNewTicket({ ...newTicket, title: e.target.value })}
                                    className="w-full mt-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm"
                                    placeholder="Ej. Bombilla fundida en pasillo"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Ubicación</label>
                                <div className="relative">
                                    <MapPin size={16} className="absolute left-3 top-3 text-zinc-400" />
                                    <input
                                        value={newTicket.location}
                                        onChange={e => setNewTicket({ ...newTicket, location: e.target.value })}
                                        className="w-full mt-1 pl-9 pr-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm"
                                        placeholder="Ej. Habitación 101"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Descripción</label>
                                <textarea
                                    rows={3}
                                    value={newTicket.description}
                                    onChange={e => setNewTicket({ ...newTicket, description: e.target.value })}
                                    className="w-full mt-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm"
                                    placeholder="Detalles del problema..."
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Prioridad</label>
                                <select
                                    value={newTicket.priority}
                                    onChange={e => setNewTicket({ ...newTicket, priority: e.target.value as any })}
                                    className="w-full mt-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm"
                                >
                                    <option value="low">Baja</option>
                                    <option value="medium">Media</option>
                                    <option value="high">Alta</option>
                                    <option value="critical">Crítica</option>
                                </select>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateOpen(false)}
                                    className="flex-1 px-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="flex-1 px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-lg hover:opacity-90 disabled:opacity-50"
                                >
                                    {creating ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Crear'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map(i => <div key={i} className="h-24 bg-zinc-100 dark:bg-zinc-800/50 rounded-xl animate-pulse" />)}
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {tickets.map(ticket => (
                        <div key={ticket.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col sm:flex-row gap-4 justify-between items-start">
                            <div className="space-y-2 flex-1">
                                <div className="flex items-center gap-2">
                                    <StatusBadge status={ticket.status} />
                                    <span className={`text-xs px-2 py-0.5 rounded-full border ${ticket.priority === 'critical' ? 'border-red-200 text-red-700 bg-red-50' :
                                            ticket.priority === 'high' ? 'border-orange-200 text-orange-700 bg-orange-50' :
                                                'border-zinc-200 text-zinc-500'
                                        }`}>
                                        {ticket.priority.toUpperCase()}
                                    </span>
                                    <span className="text-xs text-zinc-400">
                                        {new Date(ticket.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                                <h3 className="font-semibold text-zinc-900 dark:text-white">{ticket.title}</h3>
                                <p className="text-sm text-zinc-600 dark:text-zinc-400">{ticket.description}</p>
                                {ticket.location && (
                                    <div className="flex items-center gap-1 text-xs text-zinc-500">
                                        <MapPin size={12} />
                                        {ticket.location}
                                    </div>
                                )}
                            </div>

                            {user.role === 'ADMIN' && (
                                <div className="flex gap-2 sm:flex-col">
                                    {ticket.status !== 'resolved' && (
                                        <button
                                            onClick={() => handleStatusChange(ticket.id, 'resolved')}
                                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                                            title="Marcar como Resuelto"
                                        >
                                            <CheckCircle2 size={20} />
                                        </button>
                                    )}
                                    {ticket.status === 'open' && (
                                        <button
                                            onClick={() => handleStatusChange(ticket.id, 'in_progress')}
                                            className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg"
                                            title="Marcar En Proceso"
                                        >
                                            <Clock size={20} />
                                        </button>
                                    )}
                                    {ticket.status !== 'closed' && (
                                        <button
                                            onClick={() => handleStatusChange(ticket.id, 'closed')}
                                            className="p-2 text-zinc-400 hover:bg-zinc-100 rounded-lg"
                                            title="Cerrar Ticket"
                                        >
                                            <XCircle size={20} />
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
