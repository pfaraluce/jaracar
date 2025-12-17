import React, { useState, useEffect } from 'react';
import { User, MaintenanceTicket } from '../types';
import { maintenanceService } from '../services/maintenance';
import { profileService } from '../services/profiles';
import { UserSelector } from './UserSelector';
import { UserAvatar } from './UserAvatar';
import { Plus, MapPin, AlertCircle, CheckCircle2, Clock, XCircle, Loader2, Pencil, RotateCcw, Trash2, Filter, User as UserIcon } from 'lucide-react';

interface MaintenanceViewProps {
    user: User;
}

export const MaintenanceView: React.FC<MaintenanceViewProps> = ({ user }) => {
    const [tickets, setTickets] = useState<MaintenanceTicket[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'active' | 'history'>('active');
    const [priorityFilter, setPriorityFilter] = useState<'all' | 'low' | 'medium' | 'high' | 'critical'>('all');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [newTicket, setNewTicket] = useState<{
        title: string;
        description: string;
        priority: MaintenanceTicket['priority'];
        location: string;
        imageUrl?: string;
        reporterId: string;
        assignedUserId?: string;
    }>({
        title: '',
        description: '',
        priority: 'medium',
        location: '',
        reporterId: user.id
    });
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        loadTickets();
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            const users = await profileService.getAllProfiles();
            setAllUsers(users || []);
        } catch (error) {
            console.error('Error loading users:', error);
        }
    };

    // Filter users who have maintenance view permission
    const maintenanceUsers = allUsers.filter(u =>
        u.role === 'ADMIN' || // Admins always have access
        u.permissions?.maintenance?.view // Users with explicit permission
    );

    const loadTickets = async () => {
        const cacheKey = `maintenance-tickets`;

        // Try to load from cache first
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            try {
                const cachedData = JSON.parse(cached);
                setTickets(cachedData);
                setLoading(false); // Show cached data immediately
            } catch (e) {
                console.error('Cache parse error:', e);
            }
        }

        // Fetch fresh data in background
        try {
            const data = await maintenanceService.getTickets();
            setTickets(data);

            // Cache the fresh data
            localStorage.setItem(cacheKey, JSON.stringify(data));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        try {
            setCreating(true);
            const url = await maintenanceService.uploadImage(file);
            setNewTicket(prev => ({ ...prev, imageUrl: url }));
        } catch (error) {
            console.error("Upload failed", error);
            alert("Error subiendo imagen");
        } finally {
            setCreating(false);
        }
    };

    const handleEdit = (ticket: MaintenanceTicket) => {
        setNewTicket({
            title: ticket.title,
            description: ticket.description,
            priority: ticket.priority,
            location: ticket.location || '',
            imageUrl: ticket.imageUrl || undefined,
            reporterId: ticket.reporterId || user.id,
            assignedUserId: ticket.assignedUserId || undefined
        });
        setEditingId(ticket.id);
        setIsCreateOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Seguro que quieres borrar esta incidencia?')) return;
        try {
            await maintenanceService.deleteTicket(id);
            loadTickets(); // Refresh
        } catch (error) {
            console.error("Delete failed", error);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        try {
            if (editingId) {
                await maintenanceService.updateTicket(editingId, newTicket);
            } else {
                await maintenanceService.createTicket({
                    ...newTicket,
                    reporterId: newTicket.reporterId || user.id
                });
            }
            setIsCreateOpen(false);
            setNewTicket({ title: '', description: '', priority: 'medium', location: '', imageUrl: undefined, reporterId: user.id, assignedUserId: undefined });
            setEditingId(null);
            loadTickets();
        } catch (error) {
            console.error(error);
            alert('Error al guardar la incidencia. Por favor inténtalo de nuevo.');
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
            closed: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-500',
        }[status] || 'bg-zinc-100';

        const labels: Record<string, string> = {
            open: 'Abierto',
            in_progress: 'En Proceso',
            resolved: 'Resuelto',
            closed: 'Cerrado'
        };

        return (
            <span className={`px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider font-bold ${styles}`}>
                {labels[status] || status}
            </span>
        );
    };

    const filteredTickets = tickets.filter(t => {
        const isClosed = t.status === 'closed' || t.status === 'resolved';
        if (viewMode === 'active' && isClosed) return false;
        if (viewMode === 'history' && !isClosed) return false;
        if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
        return true;
    });

    const priorityBorderColors = {
        low: 'border-blue-200 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-700',
        medium: 'border-amber-200 dark:border-amber-800 hover:border-amber-300 dark:hover:border-amber-700',
        high: 'border-orange-200 dark:border-orange-800 hover:border-orange-300 dark:hover:border-orange-700',
        critical: 'border-red-200 dark:border-red-800 hover:border-red-300 dark:hover:border-red-700',
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Mantenimiento</h2>
                    <p className="text-zinc-500 dark:text-zinc-400">Gestión de incidencias y averías</p>
                </div>

                <div className="flex items-center gap-3">
                    {/* View Switcher */}
                    <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg border border-zinc-200 dark:border-zinc-800">
                        <button
                            onClick={() => setViewMode('active')}
                            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === 'active'
                                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                                }`}
                        >
                            Pendientes
                        </button>
                        <button
                            onClick={() => setViewMode('history')}
                            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === 'history'
                                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                                }`}
                        >
                            Historial
                        </button>
                    </div>

                    {/* Priority Filter */}
                    <select
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value as any)}
                        className="h-9 px-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10"
                    >
                        <option value="all">Todas</option>
                        <option value="low">Baja</option>
                        <option value="medium">Media</option>
                        <option value="high">Alta</option>
                        <option value="critical">Crítica</option>
                    </select>

                    <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800 mx-1" />

                    {/* Add Button */}
                    <button
                        onClick={() => {
                            setEditingId(null);
                            setNewTicket({ title: '', description: '', priority: 'medium', location: '', imageUrl: undefined, reporterId: user.id });
                            setIsCreateOpen(true);
                        }}
                        className="group h-9 px-4 flex items-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors text-sm font-medium"
                        title="Nueva Incidencia"
                    >
                        <Plus size={16} />
                        <span className="hidden sm:inline">Nueva</span>
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => <div key={i} className="h-48 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl animate-pulse" />)}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTickets.map(ticket => (
                        <div key={ticket.id} className={`group bg-white dark:bg-zinc-900 border rounded-2xl overflow-hidden hover:shadow-xl transition-all flex flex-col ${priorityBorderColors[ticket.priority]}`}>
                            {/* Card Image */}
                            <div className="aspect-video bg-zinc-100 dark:bg-zinc-800 relative overflow-hidden">
                                {ticket.imageUrl ? (
                                    <img src={ticket.imageUrl} alt={ticket.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-zinc-300 dark:text-zinc-700">
                                        <Loader2 size={32} className="opacity-20" />
                                    </div>
                                )}
                                <div className="absolute top-3 left-3 flex gap-2">
                                    <StatusBadge status={ticket.status} />
                                </div>
                            </div>

                            {/* Card Content */}
                            <div className="p-4 flex flex-col flex-1">
                                <div className="flex items-start justify-between gap-3 mb-2">
                                    <div className="space-y-1">
                                        <h3 className="font-bold text-zinc-900 dark:text-white leading-tight">{ticket.title}</h3>
                                        <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                                            {ticket.location && (
                                                <span className="flex items-center gap-1">
                                                    <MapPin size={12} /> {ticket.location}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 mb-4 flex-1">
                                    {ticket.description}
                                </p>

                                {/* Card Footer Actions */}
                                <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                                    <div className="flex flex-wrap items-center gap-3 text-xs">
                                        {/* Reporter Info */}
                                        <div className="flex items-center gap-1.5" title="Solicitado por">
                                            <UserAvatar
                                                name={ticket.reporterName || 'Usuario'}
                                                imageUrl={ticket.reporterAvatar}
                                                size="sm"
                                                className="w-5 h-5 !text-[9px]"
                                            />
                                            <span className="font-medium text-zinc-700 dark:text-zinc-300 truncate max-w-[80px] sm:max-w-[100px]">{ticket.reporterName || 'Usuario'}</span>
                                        </div>

                                        {/* Assigned Info */}
                                        {ticket.assignedUserId && (
                                            <>
                                                <div className="w-px h-3 bg-zinc-200 dark:bg-zinc-700" />
                                                <div className="flex items-center gap-1.5" title="Asignado a">
                                                    <span className="text-zinc-400 hidden sm:inline">→</span>
                                                    <UserAvatar
                                                        name={ticket.assignedUserName || 'Usuario'}
                                                        imageUrl={ticket.assignedUserAvatar}
                                                        size="sm"
                                                        className="w-5 h-5 !text-[9px]"
                                                    />
                                                    <span className="font-medium text-zinc-700 dark:text-zinc-300 truncate max-w-[80px] sm:max-w-[100px]">{ticket.assignedUserName}</span>
                                                </div>
                                            </>
                                        )}

                                        <div className="w-px h-3 bg-zinc-200 dark:bg-zinc-700" />
                                        <span className="text-zinc-400 font-medium">
                                            {new Date(ticket.createdAt).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' })}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                        {/* Reopen (Admin/Assignee/Reporter - Resolved/Closed) */}
                                        {(user.role === 'ADMIN' || user.id === ticket.reporterId || user.id === ticket.assignedUserId) && (ticket.status === 'resolved' || ticket.status === 'closed') && (
                                            <button
                                                onClick={() => handleStatusChange(ticket.id, 'open')}
                                                className="p-1.5 text-zinc-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                title="Reabrir"
                                            >
                                                <RotateCcw size={16} />
                                            </button>
                                        )}

                                        {/* Resolve (Admin - Not Resolved) OR Assignee OR Reporter */}
                                        {(user.role === 'ADMIN' || user.id === ticket.reporterId || user.id === ticket.assignedUserId) && ticket.status !== 'resolved' && ticket.status !== 'closed' && (
                                            <button
                                                onClick={() => handleStatusChange(ticket.id, 'resolved')}
                                                className="p-1.5 text-zinc-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                                                title="Marcar Resuelto"
                                            >
                                                <CheckCircle2 size={16} />
                                            </button>
                                        )}

                                        {/* Edit */}
                                        {(user.role === 'ADMIN' || user.id === ticket.reporterId || user.id === ticket.assignedUserId) && (
                                            <button
                                                onClick={() => handleEdit(ticket)}
                                                className="p-1.5 text-zinc-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                title="Editar"
                                            >
                                                <Pencil size={16} />
                                            </button>
                                        )}

                                        {/* Delete */}
                                        {(user.role === 'ADMIN' || user.id === ticket.reporterId || user.id === ticket.assignedUserId) && (
                                            <button
                                                onClick={() => handleDelete(ticket.id)}
                                                className="p-1.5 text-zinc-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                                                title="Eliminar"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {filteredTickets.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center py-20 text-zinc-400">
                            <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                                <CheckCircle2 size={32} className="opacity-20" />
                            </div>
                            <p className="font-medium">No hay incidencias en esta vista.</p>
                        </div>
                    )}
                </div>
            )}

            {isCreateOpen && (
                <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-zinc-900 w-full h-full sm:h-auto sm:max-w-lg rounded-none sm:rounded-2xl shadow-xl flex flex-col max-h-none sm:max-h-[90vh] animate-in slide-in-from-bottom-10 duration-300">
                        <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                                {editingId ? 'Editar Incidencia' : 'Nueva Incidencia'}
                            </h3>
                            <button
                                onClick={() => setIsCreateOpen(false)}
                                className="p-2 -mr-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            >
                                <XCircle size={24} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
                            <form id="create-ticket-form" onSubmit={handleSave} className="space-y-5">
                                <div>
                                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Título</label>
                                    <input
                                        required
                                        value={newTicket.title}
                                        onChange={e => setNewTicket({ ...newTicket, title: e.target.value })}
                                        className="w-full mt-1.5 px-3 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 outline-none transition-all"
                                        placeholder="Ej. Bombilla fundida en pasillo"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <UserSelector
                                        label="Solicitado por"
                                        users={allUsers}
                                        value={newTicket.reporterId}
                                        onChange={(userId) => setNewTicket({ ...newTicket, reporterId: userId })}
                                        placeholder="Buscar usuario..."
                                        disabled={true}
                                    />
                                    <UserSelector
                                        label="Asignado a"
                                        users={maintenanceUsers}
                                        value={newTicket.assignedUserId || ''}
                                        onChange={(userId) => setNewTicket({ ...newTicket, assignedUserId: userId })}
                                        placeholder="Asignar a..."
                                        disabled={user.role !== 'ADMIN'}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Ubicación</label>
                                        <div className="relative mt-1.5">
                                            <MapPin size={16} className="absolute left-3 top-3 text-zinc-400" />
                                            <input
                                                value={newTicket.location}
                                                onChange={e => setNewTicket({ ...newTicket, location: e.target.value })}
                                                className="w-full pl-9 pr-3 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 outline-none transition-all"
                                                placeholder="Ej. Hab 101"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Prioridad</label>
                                        <select
                                            value={newTicket.priority}
                                            onChange={e => setNewTicket({ ...newTicket, priority: e.target.value as any })}
                                            className="w-full mt-1.5 px-3 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 outline-none transition-all appearance-none"
                                        >
                                            <option value="low">Baja</option>
                                            <option value="medium">Media</option>
                                            <option value="high">Alta</option>
                                            <option value="critical">Crítica</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Descripción</label>
                                    <textarea
                                        rows={3}
                                        value={newTicket.description}
                                        onChange={e => setNewTicket({ ...newTicket, description: e.target.value })}
                                        className="w-full mt-1.5 px-3 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 outline-none transition-all resize-none"
                                        placeholder="Detalles del problema..."
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 block">Foto (Opcional)</label>
                                    {newTicket.imageUrl ? (
                                        <div className="relative rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 group">
                                            <img src={newTicket.imageUrl} alt="Preview" className="w-full h-48 object-cover" />
                                            <button
                                                type="button"
                                                onClick={() => setNewTicket(prev => ({ ...prev, imageUrl: undefined }))}
                                                className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-black/70 backdrop-blur-sm transition-colors"
                                            >
                                                <XCircle size={20} />
                                            </button>
                                        </div>
                                    ) : (
                                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl cursor-pointer bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors group">
                                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-full group-hover:scale-110 transition-transform mb-2">
                                                    <Plus className="w-6 h-6 text-zinc-400" />
                                                </div>
                                                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Toca para añadir foto</p>
                                            </div>
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept="image/*"
                                                onChange={handleFileChange}
                                            />
                                        </label>
                                    )}
                                </div>
                            </form>
                        </div>

                        <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-b-2xl pb-8 sm:pb-4">
                            <button
                                type="submit"
                                form="create-ticket-form"
                                disabled={creating}
                                className="w-full py-3.5 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-xl font-bold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                            >
                                {creating ? <Loader2 className="animate-spin" size={20} /> : (editingId ? 'Guardar Cambios' : 'Crear Incidencia')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
