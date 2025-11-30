import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, User, Users } from 'lucide-react';
import { User as UserType, UserRole } from '../types';
import { profileService } from '../services/profiles';
import { UserAvatar } from './UserAvatar';
import { AdminUserList } from './AdminUserList';

import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

interface ProfileModalProps {
    user: UserType;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ user, isOpen, onClose, onUpdate }) => {
    useBodyScrollLock(isOpen);
    const [fullName, setFullName] = useState(user.name);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<'PROFILE' | 'ADMIN'>('PROFILE');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            setError('La imagen debe ser menor a 2MB');
            return;
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setError('Solo se permiten imágenes');
            return;
        }

        setAvatarFile(file);
        setError('');

        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setAvatarPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleSave = async () => {
        setLoading(true);
        setError('');

        try {
            let avatarUrl = user.avatarUrl;

            // Upload avatar if changed
            if (avatarFile) {
                avatarUrl = await profileService.uploadAvatar(user.id, avatarFile);
            }

            // Update profile
            await profileService.updateProfile(user.id, fullName, avatarUrl);

            onUpdate();
            onClose();
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                    onClick={onClose}
                />
                <motion.div
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className={`relative w-full h-full sm:h-auto bg-white sm:rounded-2xl shadow-2xl p-6 overflow-y-auto transition-all duration-300 ${activeTab === 'ADMIN' ? 'sm:max-w-2xl' : 'sm:max-w-md'
                        } sm:max-h-[90vh]`}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold text-zinc-900">
                            {activeTab === 'PROFILE' ? 'Editar Perfil' : 'Gestión de Usuarios'}
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-zinc-100 rounded-full text-zinc-400 hover:text-zinc-900 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Admin Tabs */}
                    {user.role === UserRole.ADMIN && (
                        <div className="flex p-1 bg-zinc-100 rounded-lg mb-6">
                            <button
                                onClick={() => setActiveTab('PROFILE')}
                                className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'PROFILE'
                                    ? 'bg-white text-zinc-900 shadow-sm'
                                    : 'text-zinc-500 hover:text-zinc-700'
                                    }`}
                            >
                                <User size={14} />
                                Mi Perfil
                            </button>
                            <button
                                onClick={() => setActiveTab('ADMIN')}
                                className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'ADMIN'
                                    ? 'bg-white text-zinc-900 shadow-sm'
                                    : 'text-zinc-500 hover:text-zinc-700'
                                    }`}
                            >
                                <Users size={14} />
                                Usuarios
                            </button>
                        </div>
                    )}

                    {activeTab === 'ADMIN' ? (
                        <AdminUserList />
                    ) : (
                        <>
                            {/* Avatar Section */}
                            <div className="flex flex-col items-center mb-6">
                                <div className="relative mb-4">
                                    {avatarPreview ? (
                                        <img
                                            src={avatarPreview}
                                            alt="Preview"
                                            className="w-24 h-24 rounded-full object-cover border-2 border-zinc-200"
                                        />
                                    ) : (
                                        <UserAvatar
                                            name={fullName}
                                            imageUrl={user.avatarUrl}
                                            size="lg"
                                            className="w-24 h-24 text-4xl"
                                        />
                                    )}
                                    <label
                                        htmlFor="avatar-upload"
                                        className="absolute bottom-0 right-0 p-2 bg-zinc-900 text-white rounded-full cursor-pointer hover:bg-zinc-800 transition-colors shadow-lg"
                                    >
                                        <Upload size={16} />
                                    </label>
                                    <input
                                        id="avatar-upload"
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        className="hidden"
                                    />
                                </div>
                                <p className="text-xs text-zinc-500">Haz clic en el icono para cambiar tu foto</p>
                            </div>

                            {/* Form */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-medium text-zinc-700 mb-1">
                                        Nombre completo
                                    </label>
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="w-full px-2 py-1.5 text-xs border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900/10 outline-none"
                                        placeholder="Tu nombre"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-medium text-zinc-700 mb-1">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        value={user.email}
                                        disabled
                                        className="w-full px-2 py-1.5 text-xs border border-zinc-200 rounded-lg bg-zinc-50 text-zinc-500 cursor-not-allowed outline-none"
                                    />
                                </div>

                                {error && (
                                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                                        {error}
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={onClose}
                                    className="flex-1 px-4 py-1.5 text-sm font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={loading || !fullName.trim()}
                                    className="flex-1 px-4 py-1.5 text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Guardando...' : 'Guardar cambios'}
                                </button>
                            </div>
                        </>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
