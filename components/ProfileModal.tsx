import React, { useState, useRef, useEffect } from 'react';
import { User, UserRole, DietFile } from '../types';
import { X, Camera, Shield, Mail, User as UserIcon, Loader2, Moon, Sun, Monitor, Edit2, Check, Calendar, Hash, Utensils, Upload, FileText, Trash2 } from 'lucide-react';
import { UserAvatar } from './UserAvatar';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../services/supabase';
import { AdminUserList } from './AdminUserList';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { useTheme } from '../contexts/ThemeContext';
import { profileService } from '../services/profiles';

interface ProfileModalProps {
    user: User;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void;
    onRestartTutorial?: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ user, isOpen, onClose, onUpdate, onRestartTutorial }) => {
    const [activeTab, setActiveTab] = useState<'PROFILE' | 'ADMIN'>('PROFILE');
    const [uploading, setUploading] = useState(false);
    const [isEditingName, setIsEditingName] = useState(false);
    const [editedName, setEditedName] = useState(user.name);
    const [savingName, setSavingName] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const dietFileInputRef = useRef<HTMLInputElement>(null);
    const { theme, setTheme } = useTheme();

    // New profile fields
    const [birthday, setBirthday] = useState(user.birthday || '');
    const [initials, setInitials] = useState(user.initials || '');
    const [hasDiet, setHasDiet] = useState(user.hasDiet || false);
    const [dietName, setDietName] = useState(user.dietName || '');
    const [dietNotes, setDietNotes] = useState(user.dietNotes || '');
    const [dietFiles, setDietFiles] = useState<DietFile[]>([]);
    const [uploadingDietFile, setUploadingDietFile] = useState(false);
    const [savingProfile, setSavingProfile] = useState(false);

    useBodyScrollLock(isOpen);

    // Sync state with user prop
    useEffect(() => {
        setBirthday(user.birthday || '');
        setInitials(user.initials || '');
        setHasDiet(user.hasDiet || false);
        setDietName(user.dietName || '');
        setDietNotes(user.dietNotes || '');
    }, [user]);

    // Load diet files when modal opens
    useEffect(() => {
        if (isOpen && user.hasDiet) {
            loadDietFiles();
        }
    }, [isOpen, user.hasDiet]);

    const loadDietFiles = async () => {
        try {
            const files = await profileService.getDietFiles(user.id);
            setDietFiles(files);
        } catch (err: any) {
            console.error('Error loading diet files:', err);
        }
    };

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || event.target.files.length === 0) {
            return;
        }
        setUploading(true);
        setError(null);
        const file = event.target.files[0];
        const fileExt = file.name.split('.').pop();
        // Use a consistent path for the user's avatar to avoid cluttering storage
        const fileName = `${user.id}/avatar.${fileExt}`;

        try {
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, file, { upsert: true });

            if (uploadError) {
                throw uploadError;
            }

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName);

            // Add timestamp to force cache refresh
            const publicUrlWithTimestamp = `${publicUrl}?t=${new Date().getTime()}`;

            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrlWithTimestamp })
                .eq('id', user.id);

            if (updateError) {
                throw updateError;
            }

            onUpdate();
        } catch (err: any) {
            console.error('Error uploading avatar:', err);
            setError(err.message || 'Error al subir la imagen');
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
        setError(null);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ full_name: editedName.trim() })
                .eq('id', user.id);

            if (error) {
                throw error;
            }

            onUpdate();
            setIsEditingName(false);
        } catch (err: any) {
            console.error('Error updating name:', err);
            setError(err.message || 'Error al actualizar el nombre');
            setEditedName(user.name);
        } finally {
            setSavingName(false);
        }
    };

    const handleSaveProfile = async () => {
        setSavingProfile(true);
        setError(null);
        try {
            await profileService.updateProfile(user.id, {
                birthday: birthday || undefined,
                initials: initials.slice(0, 3).toUpperCase() || undefined,
                hasDiet,
                dietName: hasDiet ? dietName : undefined,
                dietNotes: hasDiet ? dietNotes : undefined,
            });

            onUpdate();
        } catch (err: any) {
            console.error('Error updating profile:', err);
            setError(err.message || 'Error al actualizar el perfil');
        } finally {
            setSavingProfile(false);
        }
    };

    const handleDietFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || event.target.files.length === 0) {
            return;
        }

        const file = event.target.files[0];
        setUploadingDietFile(true);
        setError(null);

        try {
            await profileService.uploadDietFile(user.id, file);
            await loadDietFiles();
        } catch (err: any) {
            console.error('Error uploading diet file:', err);
            setError(err.message || 'Error al subir el archivo');
        } finally {
            setUploadingDietFile(false);
            if (dietFileInputRef.current) {
                dietFileInputRef.current.value = '';
            }
        }
    };

    const handleDeleteDietFile = async (fileId: string, filePath: string) => {
        if (!confirm('¿Estás seguro de que quieres eliminar este archivo?')) {
            return;
        }

        try {
            await profileService.deleteDietFile(fileId, filePath);
            await loadDietFiles();
        } catch (err: any) {
            console.error('Error deleting diet file:', err);
            setError(err.message || 'Error al eliminar el archivo');
        }
    };

    const getThemeButtonClass = (btnTheme: string) => {
        const isActive = theme === btnTheme;
        return `flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${isActive
            ? 'bg-zinc-50 border-zinc-900 text-zinc-900 dark:bg-zinc-800 dark:border-white dark:text-white ring-1 ring-zinc-900 dark:ring-white'
            : 'border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
            }`;
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
                    className={`relative w-full h-full sm:h-auto bg-white dark:bg-zinc-900 sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 border border-zinc-200 dark:border-zinc-800 ${activeTab === 'ADMIN' ? 'sm:max-w-4xl' : 'sm:max-w-md'
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

                    {/* Error Message */}
                    {error && (
                        <div className="mx-6 mt-6 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                            <div className="min-w-[4px] h-4 bg-red-500 rounded-full" />
                            {error}
                        </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {activeTab === 'PROFILE' ? (
                            <div className="space-y-8">
                                {/* Avatar Section */}
                                <div className="flex flex-col items-center">
                                    <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
                                        <div className="w-24 h-24 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 ring-4 ring-white dark:ring-zinc-900 shadow-lg">
                                            <UserAvatar
                                                name={user.name}
                                                imageUrl={user.avatarUrl}
                                                size="xl"
                                                className="w-full h-full"
                                            />
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
                                            className={getThemeButtonClass('light')}
                                        >
                                            <Sun size={20} />
                                            <span className="text-xs font-medium">Claro</span>
                                        </button>
                                        <button
                                            onClick={() => setTheme('dark')}
                                            className={getThemeButtonClass('dark')}
                                        >
                                            <Moon size={20} />
                                            <span className="text-xs font-medium">Oscuro</span>
                                        </button>
                                        <button
                                            onClick={() => setTheme('system')}
                                            className={getThemeButtonClass('system')}
                                        >
                                            <Monitor size={20} />
                                            <span className="text-xs font-medium">Sistema</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Personal Info Section */}
                                <div className="space-y-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                                    <h3 className="text-sm font-medium text-zinc-900 dark:text-white">Información Personal</h3>

                                    <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                                        <Mail className="text-zinc-400" size={20} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Correo electrónico</p>
                                            <p className="text-sm text-zinc-900 dark:text-zinc-200 truncate">{user.email}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                                        <Calendar className="text-zinc-400" size={20} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Cumpleaños</p>
                                            <input
                                                type="date"
                                                value={birthday}
                                                onChange={(e) => setBirthday(e.target.value)}
                                                className="text-sm text-zinc-900 dark:text-zinc-200 bg-transparent border-none outline-none w-full"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                                        <Hash className="text-zinc-400" size={20} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Siglas (máx. 3)</p>
                                            <input
                                                type="text"
                                                value={initials}
                                                onChange={(e) => setInitials(e.target.value.slice(0, 3).toUpperCase())}
                                                maxLength={3}
                                                placeholder="ABC"
                                                className="text-sm text-zinc-900 dark:text-zinc-200 bg-transparent border-none outline-none w-full uppercase"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Diet Section */}
                                <div className="space-y-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Utensils className="text-zinc-400" size={20} />
                                            <h3 className="text-sm font-medium text-zinc-900 dark:text-white">Dieta</h3>
                                        </div>
                                        <button
                                            onClick={() => setHasDiet(!hasDiet)}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${hasDiet ? 'bg-zinc-900 dark:bg-white' : 'bg-zinc-200 dark:bg-zinc-700'}`}
                                        >
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-zinc-900 transition-transform ${hasDiet ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    </div>

                                    {hasDiet && (
                                        <div className="space-y-3 pl-7">
                                            {user.dietNumber && (
                                                <div className="flex items-center gap-2 p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                                                    <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Número de dieta:</span>
                                                    <span className="text-sm font-semibold text-zinc-900 dark:text-white">{user.dietNumber}</span>
                                                </div>
                                            )}

                                            <div>
                                                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Nombre de la dieta</label>
                                                <input
                                                    type="text"
                                                    value={dietName}
                                                    onChange={(e) => setDietName(e.target.value)}
                                                    placeholder="Ej: Sin gluten, Vegana..."
                                                    className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white outline-none"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Notas</label>
                                                <textarea
                                                    value={dietNotes}
                                                    onChange={(e) => setDietNotes(e.target.value)}
                                                    placeholder="Detalles adicionales sobre la dieta..."
                                                    rows={3}
                                                    className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white outline-none resize-none"
                                                />
                                            </div>

                                            <div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">Archivos</label>
                                                    <button
                                                        onClick={() => dietFileInputRef.current?.click()}
                                                        disabled={uploadingDietFile}
                                                        className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-zinc-900 dark:text-white bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50"
                                                    >
                                                        {uploadingDietFile ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} />}
                                                        Subir archivo
                                                    </button>
                                                    <input
                                                        type="file"
                                                        ref={dietFileInputRef}
                                                        onChange={handleDietFileUpload}
                                                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                                        className="hidden"
                                                    />
                                                </div>

                                                {dietFiles.length > 0 ? (
                                                    <div className="space-y-2">
                                                        {dietFiles.map((file) => (
                                                            <div key={file.id} className="flex items-center justify-between p-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                                    <FileText className="text-zinc-400 flex-shrink-0" size={16} />
                                                                    <span className="text-xs text-zinc-900 dark:text-zinc-200 truncate">{file.fileName}</span>
                                                                </div>
                                                                <button
                                                                    onClick={() => handleDeleteDietFile(file.id, file.filePath)}
                                                                    className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-red-600 dark:text-red-400 transition-colors"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-zinc-400 text-center py-4">No hay archivos subidos</p>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Save Button */}
                                <button
                                    onClick={handleSaveProfile}
                                    disabled={savingProfile}
                                    className="w-full py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {savingProfile ? (
                                        <>
                                            <Loader2 className="animate-spin" size={18} />
                                            Guardando...
                                        </>
                                    ) : (
                                        'Guardar cambios'
                                    )}
                                </button>

                                {/* Tutorial Reset */}
                                <div className="flex justify-center pt-2">
                                    <button
                                        onClick={() => {
                                            onRestartTutorial?.();
                                            onClose();
                                        }}
                                        className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                                    >
                                        Volver a ver el tutorial de inicio
                                    </button>
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
