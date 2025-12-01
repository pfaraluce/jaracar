import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, UserRole } from '../types';
import { adminService } from '../services/admin';
import { UserAvatar } from './UserAvatar';
import { Check, X, Shield, ShieldOff, Search, Mail, CheckCircle, AlertTriangle, MessageSquare } from 'lucide-react';

export const AdminUserList: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'ALL' | 'PENDING'>('ALL');
    const [searchTerm, setSearchTerm] = useState('');

    // Invite State
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviting, setInviting] = useState(false);

    // Toast State
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handleInviteUser = async () => {
        if (!inviteEmail) return;
        setInviting(true);
        try {
            await adminService.inviteUser(inviteEmail);
            showToast('Invitación enviada con éxito', 'success');
            setShowInviteModal(false);
            setInviteEmail('');
        } catch (error) {
            console.error('Error inviting user:', error);
            showToast('Error al invitar: ' + (error as Error).message, 'error');
        } finally {
            setInviting(false);
        }
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

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleStatusChange = async (userId: string, newStatus: 'APPROVED' | 'REJECTED') => {
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

    const filteredUsers = users.filter(user => {
        const matchesFilter = filter === 'ALL' || user.status === 'PENDING';
        const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesFilter && matchesSearch;
    });

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

            {/* List */}
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 font-medium border-b border-zinc-200 dark:border-zinc-800">
                            <tr>
                                <th className="px-4 py-2.5">Usuario</th>
                                <th className="px-4 py-2.5">Estado</th>
                                <th className="px-4 py-2.5">Rol</th>
                                <th className="px-4 py-2.5 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-4 py-8 text-center text-zinc-500 dark:text-zinc-400">
                                        No se encontraron usuarios
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
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${user.status === 'APPROVED' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800' :
                                                user.status === 'REJECTED' ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-100 dark:border-red-800' :
                                                    'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-800'
                                                }`}>
                                                {user.status === 'APPROVED' ? 'Aprobado' :
                                                    user.status === 'REJECTED' ? 'Rechazado' : 'Pendiente'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${user.role === UserRole.ADMIN ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400' : 'text-zinc-600 dark:text-zinc-400'
                                                }`}>
                                                {user.role === UserRole.ADMIN && <Shield size={10} />}
                                                {user.role}
                                            </span>
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
                                                    onClick={() => handleRoleChange(user.id, user.role === UserRole.ADMIN ? UserRole.USER : UserRole.ADMIN)}
                                                    className={`p-1.5 rounded transition-colors ${user.role === UserRole.ADMIN
                                                        ? 'text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20'
                                                        : 'text-zinc-400 dark:text-zinc-500 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20'
                                                        }`}
                                                    title={user.role === UserRole.ADMIN ? "Quitar Admin" : "Hacer Admin"}
                                                >
                                                    {user.role === UserRole.ADMIN ? <ShieldOff size={16} /> : <Shield size={16} />}
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
            {/* Invite Modal */}
            {showInviteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowInviteModal(false)} />
                    <div className="relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-xl shadow-2xl p-6 overflow-hidden border border-zinc-200 dark:border-zinc-800">
                        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">Invitar Usuario</h3>
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
            )}

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
        </div>
    );
};
