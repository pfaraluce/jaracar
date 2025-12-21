import React, { useState, useEffect } from 'react';
import { Hotel, Plus, Trash2, X, Calendar as CalendarIcon, List, Edit2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Room, RoomBed, User } from '../types';
import { roomsService } from '../services/rooms';
import { profileService } from '../services/profiles';
import { UserAvatar } from './UserAvatar';
import { RoomTimelineView } from './RoomTimelineView';

export const RoomsManagementView: React.FC = () => {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [beds, setBeds] = useState<RoomBed[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [activeView, setActiveView] = useState<'list' | 'timeline'>('list');

    // Create/Edit room form state
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
    const [newRoomName, setNewRoomName] = useState('');
    const [newRoomDescription, setNewRoomDescription] = useState('');
    const [newRoomBeds, setNewRoomBeds] = useState(2);
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [roomsData, bedsData, usersData] = await Promise.all([
                roomsService.getAllRooms(),
                roomsService.getAllBeds(),
                profileService.getAllProfiles()
            ]);
            setRooms(roomsData);
            setBeds(bedsData);
            setUsers(usersData.filter(u => u.status === 'APPROVED'));
        } catch (error) {
            console.error('Error loading data:', error);
            showToast('Error al cargar datos', 'error');
        } finally {
            setLoading(false);
        }
    };

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handleEditRoom = (room: Room) => {
        setEditingRoomId(room.id);
        setNewRoomName(room.name);
        setNewRoomDescription(room.description || '');
        setNewRoomBeds(room.totalBeds);
        setShowCreateForm(true);
    };

    const handleCancelEdit = () => {
        setEditingRoomId(null);
        setShowCreateForm(false);
        setNewRoomName('');
        setNewRoomDescription('');
        setNewRoomBeds(2);
    };

    const handleSubmitRoom = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newRoomName.trim() || newRoomBeds < 1) return;

        setCreating(true);
        try {
            if (editingRoomId) {
                // Update existing room
                const currentBeds = beds.filter(b => b.roomId === editingRoomId);
                const assignedBeds = currentBeds.filter(b => b.assignedUserId);

                if (newRoomBeds < assignedBeds.length) {
                    throw new Error(`No se puede reducir el número de camas a ${newRoomBeds} porque hay ${assignedBeds.length} camas ocupadas.`);
                }

                await roomsService.updateRoom(editingRoomId, newRoomName.trim(), newRoomDescription.trim() || undefined, newRoomBeds);
                showToast('Habitación actualizada correctamente', 'success');
            } else {
                await roomsService.createRoom(newRoomName.trim(), newRoomDescription.trim() || undefined, newRoomBeds);
                showToast('Habitación creada correctamente', 'success');
            }

            handleCancelEdit();
            await loadData();
        } catch (error: any) {
            showToast(error.message || 'Error al guardar habitación', 'error');
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteRoom = async (roomId: string, roomName: string) => {
        if (!confirm(`¿Eliminar la habitación "${roomName}"? Esto desasignará a todos los usuarios.`)) {
            return;
        }

        try {
            await roomsService.deleteRoom(roomId);
            showToast('Habitación eliminada', 'success');
            await loadData();
        } catch (error: any) {
            showToast(error.message || 'Error al eliminar habitación', 'error');
        }
    };

    const handleAssignUser = async (bedId: string, userId: string) => {
        try {
            await profileService.updateRoomAssignment(userId, bedId);
            showToast('Usuario asignado correctamente', 'success');
            await loadData();
        } catch (error: any) {
            showToast(error.message || 'Error al asignar usuario', 'error');
        }
    };

    const handleUnassignUser = async (userId: string) => {
        try {
            await profileService.updateRoomAssignment(userId, null);
            showToast('Usuario desasignado', 'success');
            await loadData();
        } catch (error: any) {
            showToast(error.message || 'Error al desasignar usuario', 'error');
        }
    };

    const getUnassignedUsers = () => {
        return users.filter(u => !u.roomId);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-zinc-900 dark:border-white border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Toast */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg ${toast.type === 'success'
                            ? 'bg-green-500 text-white'
                            : 'bg-red-500 text-white'
                            }`}
                    >
                        {toast.message}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header with Tabs */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div>
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Gestión de Habitaciones</h2>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                            {rooms.length} habitación{rooms.length !== 1 ? 'es' : ''} · {beds.length} cama{beds.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <div className="flex gap-2 border border-zinc-200 dark:border-zinc-700 rounded-lg p-1">
                        <button
                            onClick={() => setActiveView('list')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors ${activeView === 'list'
                                ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                                }`}
                        >
                            <List size={16} />
                            Lista
                        </button>
                        <button
                            onClick={() => setActiveView('timeline')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors ${activeView === 'timeline'
                                ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                                }`}
                        >
                            <CalendarIcon size={16} />
                            Cronograma
                        </button>
                    </div>
                </div>
                {activeView === 'list' && (
                    <button
                        onClick={() => {
                            if (showCreateForm) {
                                handleCancelEdit();
                            } else {
                                setShowCreateForm(true);
                            }
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors text-sm font-medium"
                    >
                        {showCreateForm ? <X size={16} /> : <Plus size={16} />}
                        {showCreateForm ? 'Cancelar' : 'Nueva Habitación'}
                    </button>
                )}
            </div>

            {/* Content */}
            {activeView === 'timeline' ? (
                <RoomTimelineView rooms={rooms} beds={beds} />
            ) : (
                <>
                    {/* Create/Edit Room Form */}
                    <AnimatePresence>
                        {showCreateForm && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                            >
                                <form onSubmit={handleSubmitRoom} className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-3">
                                        {editingRoomId ? 'Editar Habitación' : 'Nueva Habitación'}
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                                Nombre *
                                            </label>
                                            <input
                                                type="text"
                                                value={newRoomName}
                                                onChange={(e) => setNewRoomName(e.target.value)}
                                                placeholder="Ej: Habitación 101"
                                                disabled={creating}
                                                required
                                                className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white disabled:opacity-50"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                                Descripción
                                            </label>
                                            <input
                                                type="text"
                                                value={newRoomDescription}
                                                onChange={(e) => setNewRoomDescription(e.target.value)}
                                                placeholder="Ej: Planta baja"
                                                disabled={creating}
                                                className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white disabled:opacity-50"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                                Nº de camas *
                                            </label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="number"
                                                    value={newRoomBeds}
                                                    onChange={(e) => setNewRoomBeds(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                                                    min="1"
                                                    max="20"
                                                    disabled={creating}
                                                    required
                                                    className="flex-1 px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white disabled:opacity-50"
                                                />
                                                <button
                                                    type="submit"
                                                    disabled={creating}
                                                    className="px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors disabled:opacity-50 font-medium text-sm flex items-center gap-2"
                                                >
                                                    {editingRoomId ? <Check size={16} /> : <Plus size={16} />}
                                                    {creating ? (editingRoomId ? 'Actualizando...' : 'Creando...') : (editingRoomId ? 'Actualizar' : 'Crear')}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </form>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Rooms List */}
                    <div className="space-y-3">
                        {rooms.length === 0 ? (
                            <div className="text-center py-12 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700">
                                <Hotel className="w-12 h-12 text-zinc-400 mx-auto mb-2" />
                                <p className="text-zinc-600 dark:text-zinc-400">No hay habitaciones creadas</p>
                                <button
                                    onClick={() => setShowCreateForm(true)}
                                    className="mt-4 text-sm text-zinc-900 dark:text-white hover:underline"
                                >
                                    Crear la primera habitación
                                </button>
                            </div>
                        ) : (
                            rooms.map((room) => {
                                const roomBeds = beds.filter(b => b.roomId === room.id);
                                const occupiedBeds = roomBeds.filter(b => b.assignedUserId).length;

                                return (
                                    <div
                                        key={room.id}
                                        className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-4"
                                    >
                                        {/* Room Header */}
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <Hotel className="w-5 h-5 text-zinc-400" />
                                                    <h3 className="font-semibold text-zinc-900 dark:text-white">{room.name}</h3>
                                                    <span className="text-xs px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400">
                                                        {occupiedBeds}/{room.totalBeds} ocupada{room.totalBeds !== 1 ? 's' : ''}
                                                    </span>
                                                </div>
                                                {room.description && (
                                                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 ml-7">
                                                        {room.description}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => handleEditRoom(room)}
                                                    className="p-1.5 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded transition-colors"
                                                    title="Editar habitación"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteRoom(room.id, room.name)}
                                                    className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                                    title="Eliminar habitación"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Beds List */}
                                        <div className="space-y-2 ml-7">
                                            {roomBeds.map((bed) => {
                                                const assignedUser = users.find(u => u.id === bed.assignedUserId);
                                                const unassignedUsers = getUnassignedUsers();

                                                return (
                                                    <div
                                                        key={bed.id}
                                                        className="flex items-center justify-between p-2 rounded bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
                                                    >
                                                        <div className="flex items-center gap-3 flex-1">
                                                            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 w-16">
                                                                Cama {bed.bedNumber}
                                                            </span>
                                                            {assignedUser ? (
                                                                <div className="flex items-center gap-2 flex-1">
                                                                    <UserAvatar
                                                                        name={assignedUser.name}
                                                                        imageUrl={assignedUser.avatarUrl}
                                                                        size="sm"
                                                                    />
                                                                    <span className="text-sm text-zinc-900 dark:text-white">
                                                                        {assignedUser.name}
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-sm text-zinc-400 italic">Disponible</span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {assignedUser ? (
                                                                <button
                                                                    onClick={() => handleUnassignUser(assignedUser.id)}
                                                                    className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                                                    title="Desasignar usuario"
                                                                >
                                                                    <X size={14} />
                                                                </button>
                                                            ) : unassignedUsers.length > 0 ? (
                                                                <select
                                                                    onChange={(e) => e.target.value && handleAssignUser(bed.id, e.target.value)}
                                                                    value=""
                                                                    className="text-xs px-2 py-1 border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white rounded focus:ring-2 focus:ring-blue-500"
                                                                >
                                                                    <option value="">Asignar usuario...</option>
                                                                    {unassignedUsers.map(u => (
                                                                        <option key={u.id} value={u.id}>{u.name}</option>
                                                                    ))}
                                                                </select>
                                                            ) : (
                                                                <span className="text-xs text-zinc-400">Sin usuarios disponibles</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </>
            )}
        </div>
    );
};
