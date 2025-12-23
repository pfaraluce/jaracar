import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, UserRole, Room, RoomBed } from '../types';
import { adminService } from '../services/admin';
import { UserAvatar } from './UserAvatar';
import { Search, UserPlus, Filter, Shield, AlertCircle, Check, X, Mail, Edit, ShieldOff, CheckCircle, AlertTriangle, MessageSquare, Lock, Hotel, Utensils, RefreshCcw } from 'lucide-react';

export const AdminUserList: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'ALL' | 'PENDING'>('ALL');
    const [searchTerm, setSearchTerm] = useState('');

    // Invite State
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<'USER' | 'ADMIN' | 'KITCHEN'>('USER');

    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    const [permissionUser, setPermissionUser] = useState<User | null>(null);
    const [isAdvancedMode, setIsAdvancedMode] = useState(false);
    const [inviting, setInviting] = useState(false);
    const [compacting, setCompacting] = useState(false);
    const [editingDietId, setEditingDietId] = useState<string | null>(null);
    const [tempDietNumber, setTempDietNumber] = useState('');

    // Room assignment state
    const [rooms, setRooms] = useState<Room[]>([]);
    const [beds, setBeds] = useState<RoomBed[]>([]);
    const [loadingRooms, setLoadingRooms] = useState(true);

    const showToast = (message: string, type: 'success' | 'error' | 'info') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handleOpenPermissions = (user: User) => {
        setPermissionUser({ ...user }); // Clone to avoid mutation
        setIsAdvancedMode(false); // Reset advanced mode
    };

    const handleModalRoleChange = (newRole: UserRole) => {
        if (!permissionUser) return;

        let newPermissions = { ...permissionUser.permissions };

        // Auto-configure permissions based on role
        if (newRole === 'KITCHEN') {
            // Kitchen doesn't need granular permissions usually, or we disable them
            // For now, let's clear them to avoid confusion
            newPermissions = {};
            setIsAdvancedMode(false); // Force disable legacy advanced mode
        } else if (newRole === 'ADMIN') {
            setIsAdvancedMode(false);
        }

        setPermissionUser({
            ...permissionUser,
            role: newRole,
            permissions: newPermissions
        });
    };

    const handlePermissionChange = (module: string, type: 'view' | 'admin', checked: boolean) => {
        if (!permissionUser) return;

        const currentPerms = permissionUser.permissions || {};
        const modulePerms = currentPerms[module as keyof typeof currentPerms] || { view: true, admin: false };

        // If giving admin rights, ensure view rights are also given
        const newModulePerms = { ...modulePerms, [type]: checked };
        if (type === 'admin' && checked) {
            newModulePerms.view = true;
        }
        // If removing view rights, ensure admin rights are also removed
        if (type === 'view' && !checked) {
            newModulePerms.admin = false;
        }

        setPermissionUser({
            ...permissionUser,
            permissions: {
                ...currentPerms,
                [module]: newModulePerms
            }
        });
    };

    const saveAccess = async () => {
        if (!permissionUser) return;
        try {
            await adminService.updateUserAccess(permissionUser.id, permissionUser.role, permissionUser.permissions);
            showToast('Accesos actualizados correctamente', 'success');
            setPermissionUser(null);
            fetchUsers();
        } catch (error) {
            console.error('Error updating access:', error);
            showToast('Error al actualizar: ' + (error as Error).message, 'error');
        }
    };

    const handleInviteUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await adminService.inviteUser(inviteEmail, inviteRole);
            showToast('Invitación enviada con éxito', 'success');
            setShowInviteModal(false);
            setInviteEmail('');
            setInviteRole('USER');
            fetchUsers();
        } catch (error) {
            console.error('Error inviting user:', error);
            showToast('Error al invitar: ' + (error as Error).message, 'error');
        } finally {
            setLoading(false);
        }
    };

    // --- Handlers ---

    // ... handleStatusChange ...

    const handleUpdateRole = async () => {
        // Dummy or Removed
    };


    const fetchUsers = async () => {
        try {
            const data = await adminService.getUsers();
            setUsers(data);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchRooms = async () => {
        try {
            const { roomsService } = await import('../services/rooms');
            const [roomsData, bedsData] = await Promise.all([
                roomsService.getAllRooms(),
                roomsService.getAllBeds()
            ]);
            setRooms(roomsData);
            setBeds(bedsData);
        } catch (error) {
            console.error('Error fetching rooms:', error);
        } finally {
            setLoadingRooms(false);
        }
    };

    const handleRoomAssignment = async (userId: string, roomId: string) => {
        try {
            const { profileService } = await import('../services/profiles');
            const { roomsService } = await import('../services/rooms');

            if (!roomId) {
                // Unassign room
                await profileService.updateRoomAssignment(userId, null);
                showToast('Habitación desasignada', 'success');
            } else {
                const room = rooms.find(r => r.id === roomId);
                const roomBeds = beds.filter(b => b.roomId === roomId && !b.assignedUserId);

                if (!room || roomBeds.length === 0) {
                    showToast('No hay camas disponibles en esta habitación', 'error');
                    return;
                }

                // If room has only one bed, assign automatically
                // Otherwise, assign the first available bed
                const bedToAssign = roomBeds[0];
                await profileService.updateRoomAssignment(userId, bedToAssign.id);
                showToast('Habitación asignada correctamente', 'success');
            }

            // Refresh data - fetch both in parallel
            const [usersData, roomsData, bedsData] = await Promise.all([
                adminService.getUsers(),
                roomsService.getAllRooms(),
                roomsService.getAllBeds()
            ]);

            setUsers(usersData);
            setRooms(roomsData);
            setBeds(bedsData);
        } catch (error) {
            console.error('Error assigning room:', error);
            showToast('Error al asignar habitación', 'error');
        }
    };

    useEffect(() => {
        fetchUsers();
        fetchRooms();
    }, []);

    const handleStatusChange = async (userId: string, newStatus: 'APPROVED' | 'REJECTED' | 'PENDING') => {
        try {
            // Optimistic update
            setUsers(users.map(u => u.id === userId ? { ...u, status: newStatus } : u));
            console.log(`Attempting to update user ${userId} to status ${newStatus}`);
            await adminService.updateUserStatus(userId, newStatus);
            console.log('Update successful');
            showToast('Estado actualizado', 'success');
        } catch (error) {
            console.error('Error updating status:', error);
            showToast(`Error al actualizar: ${(error as Error).message}`, 'error');
            fetchUsers(); // Revert on error
        }
    };

    const handleRoleChange = async (userId: string, newRole: UserRole) => {
        try {
            // Optimistic update
            setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
            await adminService.updateUserRole(userId, newRole === UserRole.ADMIN ? 'ADMIN' : 'USER');
            showToast('Rol actualizado', 'success');
        } catch (error) {
            console.error('Error updating role:', error);
            showToast('Error al actualizar rol', 'error');
            fetchUsers(); // Revert on error
        }
    };

    const handleUpdateDietNumber = async (userId: string, newNumber: string) => {
        const num = parseInt(newNumber);
        if (isNaN(num)) return;
        try {
            const { profileService } = await import('../services/profiles');
            await profileService.updateDietNumber(userId, num);
            setEditingDietId(null);
            showToast('Número de dieta actualizado', 'success');
            fetchUsers();
        } catch (error) {
            console.error('Error updating diet number:', error);
            showToast('Error al actualizar número de dieta', 'error');
        }
    };

    const handleCompactDiets = async () => {
        if (!confirm('¿Quieres reasignar todos los números de dieta secuencialmente?')) return;
        setCompacting(true);
        try {
            const { profileService } = await import('../services/profiles');
            await profileService.compactDietNumbers();
            showToast('Números de dieta compactados', 'success');
            fetchUsers();
        } catch (error) {
            console.error('Error compacting diets:', error);
            showToast('Error al compactar dietas', 'error');
        } finally {
            setCompacting(false);
        }
    };

    const [showRejected, setShowRejected] = useState(false);

    const filteredUsers = users.filter(user => {
        if (user.status === 'REJECTED') return false; // Hide rejected from main list
        const matchesFilter = filter === 'ALL' || user.status === 'PENDING';
        const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const rejectedUsers = users.filter(user => user.status === 'REJECTED' && (
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    ));

    if (loading) {
        return <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">Cargando usuarios...</div>;
    }

    return (
        <div className="space-y-4 relative min-h-[400px]">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-center flex-wrap">
                <div className="flex gap-3 items-center w-full sm:w-auto">
                    <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg">
                        <button
                            onClick={() => setFilter('PENDING')}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${filter === 'PENDING'
                                ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white'
                                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                                }`}
                        >
                            Pendientes
                        </button>
                        <button
                            onClick={() => setFilter('ALL')}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${filter === 'ALL'
                                ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white'
                                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                                }`}
                        >
                            Todos
                        </button>
                    </div>
                    <button
                        onClick={() => setShowInviteModal(true)}
                        className="px-3 py-1.5 text-xs font-medium bg-zinc-900 dark:bg-white text-white dark:text-black rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors flex items-center gap-2"
                    >
                        <Mail size={14} /> Invitar
                    </button>
                </div>
                <div className="relative w-full sm:w-auto">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                    <input
                        type="text"
                        placeholder="Buscar usuario..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full sm:w-64 pl-9 pr-3 py-1.5 text-sm border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-lg focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 outline-none"
                    />
                </div>
            </div>

            {/* Main List (Approved/Pending) */}
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 font-medium border-b border-zinc-200 dark:border-zinc-800">
                            <tr>
                                <th className="px-4 py-2.5">Usuario</th>
                                <th className="px-4 py-2.5">Estado</th>
                                <th className="px-4 py-2.5">Dieta</th>
                                <th className="px-4 py-2.5">Rol</th>
                                <th className="px-4 py-2.5">Habitación</th>
                                <th className="px-4 py-2.5 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-zinc-500 dark:text-zinc-400">
                                        No se encontraron usuarios {filter === 'PENDING' ? 'pendientes' : ''}
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map(user => (
                                    <tr key={user.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                                        <td className="px-4 py-2.5">
                                            <div className="flex items-center gap-3">
                                                <UserAvatar name={user.name} imageUrl={user.avatarUrl} size="sm" />
                                                <div>
                                                    <p className="font-medium text-zinc-900 dark:text-white">{user.name}</p>
                                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${user.status === 'APPROVED'
                                                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800'
                                                : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-800'
                                                }`}>
                                                {user.status === 'APPROVED' ? 'Aprobado' : 'Pendiente'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2.5">
                                            {user.hasDiet ? (
                                                <div className="flex items-center gap-1">
                                                    <Utensils size={12} className="text-amber-500" />
                                                    {editingDietId === user.id ? (
                                                        <input
                                                            type="number"
                                                            value={tempDietNumber}
                                                            onChange={(e) => setTempDietNumber(e.target.value)}
                                                            className="w-12 px-1 py-0.5 text-xs border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded outline-none"
                                                            autoFocus
                                                            onBlur={() => handleUpdateDietNumber(user.id, tempDietNumber)}
                                                            onKeyDown={(e) => e.key === 'Enter' && handleUpdateDietNumber(user.id, tempDietNumber)}
                                                        />
                                                    ) : (
                                                        <span
                                                            className="text-xs font-bold text-amber-600 dark:text-amber-400 cursor-pointer hover:underline"
                                                            onClick={() => {
                                                                setEditingDietId(user.id);
                                                                setTempDietNumber(user.dietNumber?.toString() || '');
                                                            }}
                                                        >
                                                            D{user.dietNumber}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-[10px] text-zinc-400 italic">No asignada</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${user.role === UserRole.ADMIN ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400' : 'text-zinc-600 dark:text-zinc-400'
                                                }`}>
                                                {user.role === UserRole.ADMIN && <Shield size={10} />}
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2.5">
                                            {loadingRooms ? (
                                                <span className="text-xs text-zinc-400">Cargando...</span>
                                            ) : (
                                                <select
                                                    value={user.roomId || ''}
                                                    onChange={(e) => handleRoomAssignment(user.id, e.target.value)}
                                                    className="text-xs px-2 py-1 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                >
                                                    <option value="">Sin asignar</option>
                                                    {rooms.map(room => {
                                                        const availableBeds = beds.filter(b => b.roomId === room.id && !b.assignedUserId).length;
                                                        const isUserInRoom = user.roomId === room.id;
                                                        return (
                                                            <option
                                                                key={room.id}
                                                                value={room.id}
                                                                disabled={availableBeds === 0 && !isUserInRoom}
                                                            >
                                                                {room.name} {isUserInRoom ? `(Cama ${user.bedNumber})` : availableBeds > 0 ? `(${availableBeds} libre${availableBeds > 1 ? 's' : ''})` : '(Completa)'}
                                                            </option>
                                                        );
                                                    })}
                                                </select>
                                            )}
                                        </td>
                                        <td className="px-4 py-2.5 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {user.status === 'PENDING' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleStatusChange(user.id, 'APPROVED')}
                                                            className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded transition-colors"
                                                            title="Aprobar"
                                                        >
                                                            <Check size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleStatusChange(user.id, 'REJECTED')}
                                                            className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                                            title="Rechazar"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </>
                                                )}

                                                <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700 mx-1" />

                                                <button
                                                    onClick={() => setPermissionUser(user)}
                                                    className="p-1.5 text-zinc-400 hover:text-blue-600 dark:text-zinc-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                                    title="Permisos Granulares"
                                                >
                                                    <Lock size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Diet Management Section */}
            <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-lg">
                        <Utensils size={20} />
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-zinc-900 dark:text-white">Gestión de Dietas</h4>
                        <p className="text-xs text-zinc-500">Compactar números para rellenar huecos vacíos en la secuencia.</p>
                    </div>
                </div>
                <button
                    onClick={handleCompactDiets}
                    disabled={compacting}
                    className="w-full md:w-auto px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                    <RefreshCcw size={14} className={compacting ? 'animate-spin' : ''} />
                    {compacting ? 'Procesando...' : 'Compactar Números'}
                </button>
            </div>

            {/* Rejected Users Section */}
            {rejectedUsers.length > 0 && (
                <div className="mt-8 border border-red-200 dark:border-red-900/30 rounded-xl overflow-hidden bg-red-50/30 dark:bg-red-900/5">
                    <button
                        onClick={() => setShowRejected(!showRejected)}
                        className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <ShieldOff size={16} />
                            Usuarios Rechazados ({rejectedUsers.length})
                        </div>
                        <span className="text-xs">{showRejected ? 'Ocultar' : 'Mostrar'}</span>
                    </button>

                    <AnimatePresence>
                        {showRejected && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="border-t border-red-200 dark:border-red-900/30 overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <tbody className="divide-y divide-red-100 dark:divide-red-900/30">
                                            {rejectedUsers.map(user => (
                                                <tr key={user.id} className="hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">
                                                    <td className="px-4 py-2.5">
                                                        <div className="flex items-center gap-3">
                                                            <UserAvatar name={user.name} imageUrl={user.avatarUrl} size="sm" className="opacity-60" />
                                                            <div>
                                                                <p className="font-medium text-zinc-700 dark:text-zinc-300 line-through decoration-red-400">{user.name}</p>
                                                                <p className="text-xs text-zinc-500 dark:text-zinc-500">{user.email}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2.5">
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800">
                                                            Rechazado
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2.5 text-right">
                                                        <button
                                                            onClick={() => handleStatusChange(user.id, 'PENDING')}
                                                            className="px-3 py-1 text-xs font-medium text-red-600 dark:text-red-400 bg-white dark:bg-zinc-800 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                        >
                                                            Restaurar
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}
            {/* Permissions Modal */}
            {permissionUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setPermissionUser(null)} />
                    <div className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-xl shadow-2xl p-6 overflow-hidden border border-zinc-200 dark:border-zinc-800 max-h-[90vh] flex flex-col">
                        <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-1">Control de Acceso y Roles</h3>
                        <p className="text-sm text-zinc-500 mb-6">Configura el rol y permisos para <span className="font-medium text-zinc-900 dark:text-white">{permissionUser.name}</span></p>

                        <div className="flex-1 overflow-y-auto pr-2 space-y-6">
                            {/* Role Selection */}
                            <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                    Rol del Usuario
                                </label>
                                <select
                                    value={permissionUser.role}
                                    onChange={(e) => handleModalRoleChange(e.target.value as UserRole)}
                                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                                >
                                    <option value="USER">Usuario (Residente)</option>
                                    <option value="ADMIN">Administrador</option>
                                    <option value="KITCHEN">Cocina (Solo ver)</option>
                                </select>
                                <p className="mt-2 text-xs text-zinc-500">
                                    {permissionUser.role === 'KITCHEN' && "El rol de Cocina tiene acceso restringido al Dashboard de Cocina."}
                                    {permissionUser.role === 'ADMIN' && "Los administradores tienen acceso completo a todos los módulos."}
                                    {permissionUser.role === 'USER' && "Los residentes acceden a los módulos permitidos abajo."}
                                </p>
                            </div>

                            {/* Advanced Permissions Disclaimer */}
                            {/* Advanced Permissions Disclaimer - Only for USER role */}
                            {permissionUser.role === 'USER' && (
                                <div>
                                    <label className="flex items-start gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-900/30 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={isAdvancedMode}
                                            onChange={(e) => setIsAdvancedMode(e.target.checked)}
                                            className="mt-1 rounded border-amber-300 text-amber-600 focus:ring-amber-600"
                                        />
                                        <div>
                                            <span className="font-medium text-amber-800 dark:text-amber-400 text-sm">Habilitar Permisos Granulares</span>
                                            <p className="text-xs text-amber-700/80 dark:text-amber-500/80 mt-1">
                                                Modificar estos permisos manualmente es solo para usuarios residentes con necesidades especiales.
                                            </p>
                                        </div>
                                    </label>
                                </div>
                            )}

                            {/* Granular Permissions - Strictly for USER role with Advanced Mode enabled */}
                            {isAdvancedMode && permissionUser.role === 'USER' && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <h4 className="text-sm font-medium text-zinc-900 dark:text-white flex items-center gap-2">
                                        <Shield size={14} /> Permisos por Módulo
                                    </h4>

                                    <div className="grid gap-3">
                                        {['vehicles', 'meals', 'maintenance', 'calendar'].map(module => {
                                            const currentPerms = permissionUser.permissions?.[module as keyof typeof permissionUser.permissions] || { view: true, admin: false };

                                            const getLabel = (m: string) => {
                                                switch (m) {
                                                    case 'vehicles': return 'Vehículos';
                                                    case 'meals': return 'Comidas';
                                                    case 'maintenance': return 'Mantenimiento';
                                                    case 'calendar': return 'Calendario';
                                                    default: return m;
                                                }
                                            };

                                            return (
                                                <div key={module} className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="font-medium text-zinc-900 dark:text-white capitalize text-sm">
                                                            {getLabel(module)}
                                                        </span>
                                                    </div>
                                                    <div className="flex gap-6">
                                                        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                                                            <input
                                                                type="checkbox"
                                                                className="rounded border-zinc-300 dark:border-zinc-600 text-zinc-900 focus:ring-zinc-900"
                                                                checked={currentPerms.view}
                                                                onChange={e => handlePermissionChange(module, 'view', e.target.checked)}
                                                            />
                                                            <span className="text-zinc-600 dark:text-zinc-400">Ver</span>
                                                        </label>
                                                        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                                                            <input
                                                                type="checkbox"
                                                                className="rounded border-zinc-300 dark:border-zinc-600 text-purple-600 focus:ring-purple-600"
                                                                checked={currentPerms.admin}
                                                                onChange={e => handlePermissionChange(module, 'admin', e.target.checked)}
                                                            />
                                                            <span className="text-zinc-600 dark:text-zinc-400 flex items-center gap-1">
                                                                Admin <Shield size={10} className="text-purple-500" />
                                                            </span>
                                                        </label>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                            <button
                                onClick={() => setPermissionUser(null)}
                                className="px-4 py-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={saveAccess}
                                className="px-4 py-2 text-sm font-medium text-white bg-zinc-900 dark:bg-white dark:text-black hover:bg-zinc-800 rounded-lg shadow-sm"
                            >
                                Guardar Cambios
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Invite Modal */}
            {
                showInviteModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowInviteModal(false)} />
                        <div className="relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-xl shadow-2xl p-6 overflow-hidden border border-zinc-200 dark:border-zinc-800">
                            <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-2">Invitar Usuario</h3>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                                Envía una invitación por correo. El usuario será aprobado automáticamente al registrarse.
                            </p>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Correo electrónico</label>
                                    <input
                                        type="email"
                                        value={inviteEmail}
                                        onChange={(e) => setInviteEmail(e.target.value)}
                                        placeholder="usuario@ejemplo.com"
                                        className="w-full px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-lg focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 outline-none"
                                        autoFocus
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Rol</label>
                                    <select
                                        value={inviteRole}
                                        onChange={(e) => setInviteRole(e.target.value as UserRole)}
                                        className="w-full px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-lg focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 outline-none appearance-none"
                                    >
                                        <option value={UserRole.USER}>Usuario (Residente)</option>
                                        <option value={UserRole.ADMIN}>Administrador</option>
                                        <option value={UserRole.KITCHEN}>Cocina (Solo ver)</option>
                                    </select>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowInviteModal(false)}
                                        className="flex-1 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleInviteUser}
                                        disabled={inviting || !inviteEmail}
                                        className="flex-1 px-4 py-2 text-sm font-medium text-white bg-zinc-900 dark:bg-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        {inviting ? 'Enviando...' : 'Enviar Invitación'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Toast Notification */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className={`absolute bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-xs font-medium text-white ${toast.type === 'success' ? 'bg-emerald-600' :
                            toast.type === 'error' ? 'bg-red-600' : 'bg-zinc-900 dark:bg-zinc-700'
                            }`}
                    >
                        {toast.type === 'success' && <CheckCircle size={14} />}
                        {toast.type === 'error' && <AlertTriangle size={14} />}
                        {toast.type === 'info' && <MessageSquare size={14} />}
                        {toast.message}
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
};
