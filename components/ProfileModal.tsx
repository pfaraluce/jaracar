import React, { useState, useRef } from 'react';
import { User, UserRole } from '../types';
import { X, Camera, Shield, Mail, User as UserIcon, Loader2, Moon, Sun, Monitor, Edit2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../services/supabase';
import { AdminUserList } from './AdminUserList';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { useTheme } from '../contexts/ThemeContext';

interface ProfileModalProps {
    user: User;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ user, isOpen, onClose, onUpdate }) => {
    const [activeTab, setActiveTab] = useState<'PROFILE' | 'ADMIN'>('PROFILE');
    const [uploading, setUploading] = useState(false);
    const [isEditingName, setIsEditingName] = useState(false);
    const [editedName, setEditedName] = useState(user.name);
    const [savingName, setSavingName] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { theme, setTheme } = useTheme();

    useBodyScrollLock(isOpen);

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || event.target.files.length === 0) {
            return;
        }
        setUploading(true);
        const file = event.target.files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}-${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        try {
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) {
                throw uploadError;
            }

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', user.id);

            if (updateError) {
                throw updateError;
            }

            onUpdate();
        } catch (error) {
            console.error('Error uploading avatar:', error);
            alert('Error al subir la imagen');
        } finally {
            setUploading(false);
        }
    };

    const handleSaveName = async () => {
        if (!editedName.trim() || editedName === user.name) {
            setIsEditingName(false);
            return;
        }

        setSavingName(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ name: editedName.trim() })
                .eq('id', user.id);

            if (error) {
                throw error;
            }

            onUpdate();
            setIsEditingName(false);
        } catch (error) {
            console.error('Error updating name:', error);
            alert('Error al actualizar el nombre');
            setEditedName(user.name);
        } finally {
            setSavingName(false);
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
                    onClick={onClose}
                    className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                />
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className={`relative w-full h-full sm:h-auto bg-white dark:bg-zinc-900 sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ${activeTab === 'ADMIN' ? 'sm:max-w-4xl' : 'sm:max-w-md'
                        } sm:max-h-[90vh]`}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-zinc-100 dark:border-zinc-800">
                        <div className="flex gap-4">
                            <button
                                onClick={() => setActiveTab('PROFILE')}
                                className={`text-sm font-medium transition-colors ${activeTab === 'PROFILE' ? 'text-zinc-900 dark:text-white' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
                                    }`}
                            >
                                Perfil
                            </button>
                            {user.role === UserRole.ADMIN && (
                                <button
                                    onClick={() => setActiveTab('ADMIN')}
                                    className={`text-sm font-medium transition-colors ${activeTab === 'ADMIN' ? 'text-zinc-900 dark:text-white' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
                                        }`}
                                >
                                    Administración
                                </button>
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-500 dark:text-zinc-400"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {activeTab === 'PROFILE' ? (
                            <div className="space-y-8">
                                {/* Avatar Section */}
                                <div className="flex flex-col items-center">
                                    <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
                                        <div className="w-24 h-24 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 ring-4 ring-white dark:ring-zinc-900 shadow-lg">
                                            {user.avatarUrl ? (
                                                <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-zinc-300 dark:text-zinc-600">
                                                    <UserIcon size={40} />
                                                </div>
                                            )}
                                        </div>
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 rounded-full transition-opacity">
                                            <Camera className="text-white drop-shadow-md" size={24} />
                                        </div>
                                        {uploading && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-black/80 rounded-full">
                                                <Loader2 className="animate-spin text-zinc-900 dark:text-white" size={24} />
                                            </div>
                                        )}
                                    </div>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        accept="image/*"
                                        className="hidden"
                                    />
                                    <div className="mt-4 flex items-center gap-2">
                                        {isEditingName ? (
                                            <>
                                                <input
                                                    type="text"
                                                    value={editedName}
                                                    onChange={(e) => setEditedName(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleSaveName();
                                                        if (e.key === 'Escape') {
                                                            setIsEditingName(false);
                                                            setEditedName(user.name);
                                                        }
                                                    }}
                                                    className="text-xl font-semibold text-zinc-900 dark:text-white bg-transparent border-b-2 border-zinc-300 dark:border-zinc-600 focus:border-zinc-900 dark:focus:border-white outline-none px-2 text-center"
                                                    autoFocus
                                                    disabled={savingName}
                                                />
                                                <button
                                                    onClick={handleSaveName}
                                                    disabled={savingName}
                                                    className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-green-600 dark:text-green-400 disabled:opacity-50"
                                                >
                                                    {savingName ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">{user.name}</h2>
                                                <button
                                                    onClick={() => setIsEditingName(true)}
                                                    className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                    <div className="mt-2 flex gap-2">
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                                            {user.role === UserRole.ADMIN && <Shield size={12} />}
                                            {user.role}
                                        </span>
                                    </div>
                                </div>

                                {/* Appearance Section */}
                                <div className="space-y-3">
                                    <h3 className="text-sm font-medium text-zinc-900 dark:text-white">Apariencia</h3>
                                    <div className="grid grid-cols-3 gap-3">
                                        <button
                                            onClick={() => setTheme('light')}
                                            className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${theme === 'light'
                                                ? 'bg-zinc-50 border-zinc-900 text-zinc-900 dark:bg-zinc-800 dark:border-white dark:text-white'
                                                : 'border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                                                }`}
                                        >
                                            <Sun size={20} />
                                            <span className="text-xs font-medium">Claro</span>
                                        </button>
                                        <button
                                            onClick={() => setTheme('dark')}
                                            className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${theme === 'dark'
                                                ? 'bg-zinc-50 border-zinc-900 text-zinc-900 dark:bg-zinc-800 dark:border-white dark:text-white'
                                                : 'border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                                                }`}
                                        >
                                            <Moon size={20} />
                                            <span className="text-xs font-medium">Oscuro</span>
                                        </button>
                                        <button
                                            onClick={() => setTheme('system')}
                                            className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${theme === 'system'
                                                ? 'bg-zinc-50 border-zinc-900 text-zinc-900 dark:bg-zinc-800 dark:border-white dark:text-white'
                                                : 'border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                                                }`}
                                        >
                                            <Monitor size={20} />
                                            <span className="text-xs font-medium">Sistema</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Info Section */}
                                <div className="space-y-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                                    <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                                        <Mail className="text-zinc-400" size={20} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Correo electrónico</p>
                                            <p className="text-sm text-zinc-900 dark:text-zinc-200 truncate">{user.email}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <AdminUserList />
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
