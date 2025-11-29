import React, { useEffect, useState } from 'react';
import { User, UserRole } from '../types';
import { adminService } from '../services/admin';
import { UserAvatar } from './UserAvatar';
import { Check, X, Shield, ShieldOff, Search } from 'lucide-react';

export const AdminUserList: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'ALL' | 'PENDING'>('ALL');
    const [searchTerm, setSearchTerm] = useState('');

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
        } catch (error) {
            console.error('Error updating status:', error);
            alert(`Error al actualizar: ${(error as Error).message}`);
            fetchUsers(); // Revert on error
        }
    };

    const handleRoleChange = async (userId: string, newRole: UserRole) => {
        try {
            // Optimistic update
            setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
            await adminService.updateUserRole(userId, newRole === UserRole.ADMIN ? 'ADMIN' : 'USER');
        } catch (error) {
            console.error('Error updating role:', error);
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
        return <div className="text-center py-8 text-zinc-500">Cargando usuarios...</div>;
    }

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-center flex-wrap">
                <div className="flex bg-zinc-100 p-1 rounded-lg">
                    <button
                        onClick={() => setFilter('PENDING')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${filter === 'PENDING' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'
                            }`}
                    >
                        Pendientes
                    </button>
                    <button
                        onClick={() => setFilter('ALL')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${filter === 'ALL' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'
                            }`}
                    >
                        Todos
                    </button>
                </div>
                <div className="relative w-full sm:w-auto">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                    <input
                        type="text"
                        placeholder="Buscar usuario..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full sm:w-64 pl-9 pr-3 py-1.5 text-sm border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900/10 outline-none"
                    />
                </div>
            </div>

            {/* List */}
            <div className="border border-zinc-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-zinc-50 text-zinc-500 font-medium border-b border-zinc-200">
                            <tr>
                                <th className="px-4 py-3">Usuario</th>
                                <th className="px-4 py-3">Estado</th>
                                <th className="px-4 py-3">Rol</th>
                                <th className="px-4 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                                        No se encontraron usuarios
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map(user => (
                                    <tr key={user.id} className="hover:bg-zinc-50/50 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <UserAvatar name={user.name} imageUrl={user.avatarUrl} size="sm" />
                                                <div>
                                                    <p className="font-medium text-zinc-900">{user.name}</p>
                                                    <p className="text-xs text-zinc-500">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${user.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                user.status === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-100' :
                                                    'bg-amber-50 text-amber-700 border-amber-100'
                                                }`}>
                                                {user.status === 'APPROVED' ? 'Aprobado' :
                                                    user.status === 'REJECTED' ? 'Rechazado' : 'Pendiente'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${user.role === UserRole.ADMIN ? 'bg-purple-50 text-purple-700' : 'text-zinc-600'
                                                }`}>
                                                {user.role === UserRole.ADMIN && <Shield size={12} />}
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {user.status === 'PENDING' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleStatusChange(user.id, 'APPROVED')}
                                                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                                                            title="Aprobar"
                                                        >
                                                            <Check size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleStatusChange(user.id, 'REJECTED')}
                                                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                            title="Rechazar"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </>
                                                )}

                                                <div className="w-px h-4 bg-zinc-200 mx-1" />

                                                <button
                                                    onClick={() => handleRoleChange(user.id, user.role === UserRole.ADMIN ? UserRole.USER : UserRole.ADMIN)}
                                                    className={`p-1.5 rounded transition-colors ${user.role === UserRole.ADMIN
                                                        ? 'text-purple-600 hover:bg-purple-50'
                                                        : 'text-zinc-400 hover:text-purple-600 hover:bg-purple-50'
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
        </div>
    );
};
