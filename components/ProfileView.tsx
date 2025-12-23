import React, { useState, useRef, useEffect } from 'react';
import { User, UserRole, DietFile, UserAbsence } from '../types';
import { Camera, Shield, Mail, Loader2, Moon, Sun, Monitor, Edit2, Check, Calendar, Hash, Utensils, Upload, FileText, Trash2, LogOut, Hotel, ChevronDown, ChevronUp, Plus, User as UserIcon, Users } from 'lucide-react';
import { UserAvatar } from './UserAvatar';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../services/supabase';
import { useTheme } from '../contexts/ThemeContext';
import { profileService } from '../services/profiles';
import { absencesService } from '../services/absences';
import { NotificationSettings } from './NotificationSettings';
import { MessagingView } from './MessagingView';
import { AdminUserList } from './AdminUserList';
import { RoomsManagementView } from './RoomsManagementView';

interface ProfileViewProps {
    user: User;
    onUpdate: () => void;
    onRestartTutorial?: () => void;
    onLogout: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ user, onUpdate, onRestartTutorial, onLogout }) => {
    const [uploading, setUploading] = useState(false);
    const [isEditingName, setIsEditingName] = useState(false);
    const [editedName, setEditedName] = useState(user.name);
    const [savingName, setSavingName] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const dietFileInputRef = useRef<HTMLInputElement>(null);
    const { theme, setTheme } = useTheme();

    type ProfileTab = 'PROFILE' | 'MESSAGES' | 'ADMIN_USERS' | 'ADMIN_ROOMS';
    const [activeTab, setActiveTab] = useState<ProfileTab>('PROFILE');

    // New profile fields
    const [birthday, setBirthday] = useState(user.birthday || '');
    const [initials, setInitials] = useState(user.initials || '');
    const [hasDiet, setHasDiet] = useState(user.hasDiet || false);
    const [dietName, setDietName] = useState(user.dietName || '');
    const [dietNotes, setDietNotes] = useState(user.dietNotes || '');
    const [dietFiles, setDietFiles] = useState<DietFile[]>([]);
    const [uploadingDietFile, setUploadingDietFile] = useState(false);
    const [savingProfile, setSavingProfile] = useState(false);

    // Absence management state
    const [showAbsences, setShowAbsences] = useState(false);
    const [absences, setAbsences] = useState<UserAbsence[]>([]);
    const [loadingAbsences, setLoadingAbsences] = useState(false);
    const [newAbsenceStart, setNewAbsenceStart] = useState('');
    const [newAbsenceEnd, setNewAbsenceEnd] = useState('');
    const [newAbsenceNotes, setNewAbsenceNotes] = useState('');
    const [creatingAbsence, setCreatingAbsence] = useState(false);
    const [absenceError, setAbsenceError] = useState('');

    // Sync state with user prop
    useEffect(() => {
        setBirthday(user.birthday || '');
        setInitials(user.initials || '');
        setHasDiet(user.hasDiet || false);
        setDietName(user.dietName || '');
        setDietNotes(user.dietNotes || '');
    }, [user]);

    // Load diet files and absences
    useEffect(() => {
        if (user.hasDiet) {
            loadDietFiles();
        }
    }, [user.hasDiet]);

    useEffect(() => {
        if (user.roomId && showAbsences) {
            loadAbsences();
        }
    }, [user.roomId, showAbsences]);

    const loadDietFiles = async () => {
        try {
            const files = await profileService.getDietFiles(user.id);
            setDietFiles(files);
        } catch (err: any) {
            console.error('Error loading diet files:', err);
        }
    };

    const loadAbsences = async () => {
        setLoadingAbsences(true);
        try {
            const data = await absencesService.getUserAbsences(user.id);
            setAbsences(data);
        } catch (err: any) {
            console.error('Error loading absences:', err);
        } finally {
            setLoadingAbsences(false);
        }
    };

    const handleCreateAbsence = async (e: React.FormEvent) => {
        e.preventDefault();
        setAbsenceError('');

        if (!newAbsenceStart || !newAbsenceEnd) {
            setAbsenceError('Las fechas son obligatorias');
            return;
        }

        if (new Date(newAbsenceStart) > new Date(newAbsenceEnd)) {
            setAbsenceError('La fecha de inicio debe ser anterior a la fecha de fin');
            return;
        }

        setCreatingAbsence(true);
        try {
            const hasOverlap = await absencesService.hasOverlappingAbsence(user.id, newAbsenceStart, newAbsenceEnd);
            if (hasOverlap) {
                setAbsenceError('Ya tienes una ausencia registrada en estas fechas');
                setCreatingAbsence(false);
                return;
            }

            await absencesService.createAbsence(user.id, newAbsenceStart, newAbsenceEnd, newAbsenceNotes || undefined);
            setNewAbsenceStart('');
            setNewAbsenceEnd('');
            setNewAbsenceNotes('');
            await loadAbsences();
        } catch (err: any) {
            setAbsenceError(err.message || 'Error al crear la ausencia');
        } finally {
            setCreatingAbsence(false);
        }
    };

    const handleDeleteAbsence = async (absenceId: string) => {
        if (!confirm('¿Estás seguro de que quieres eliminar esta ausencia?')) {
            return;
        }

        try {
            await absencesService.deleteAbsence(absenceId);
            await loadAbsences();
        } catch (err: any) {
            setAbsenceError(err.message || 'Error al eliminar la ausencia');
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    const getTodayString = () => {
        return new Date().toISOString().split('T')[0];
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
        const fileName = `${user.id}/avatar.${fileExt}`;

        try {
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName);

            const publicUrlWithTimestamp = `${publicUrl}?t=${new Date().getTime()}`;

            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrlWithTimestamp })
                .eq('id', user.id);

            if (updateError) throw updateError;

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

            if (error) throw error;

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

    return (
        <div className="space-y-8 pb-12">
            {/* Internal Tab Navigation */}
            <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-800/50 rounded-2xl w-fit border border-zinc-200 dark:border-zinc-800">
                <button
                    onClick={() => setActiveTab('PROFILE')}
                    className={`px-4 py-2 rounded-xl text-sm transition-all flex items-center gap-2 ${activeTab === 'PROFILE'
                        ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-sm'
                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                        }`}
                >
                    <UserIcon size={18} />
                    <span className="hidden md:block">Mi Perfil</span>
                </button>
                <button
                    onClick={() => setActiveTab('MESSAGES')}
                    className={`px-4 py-2 rounded-xl text-sm transition-all flex items-center gap-2 ${activeTab === 'MESSAGES'
                        ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-sm'
                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                        }`}
                >
                    <Mail size={18} />
                    <span className="hidden md:block">Mensajería</span>
                </button>
                {user.role === UserRole.ADMIN && (
                    <>
                        <button
                            onClick={() => setActiveTab('ADMIN_USERS')}
                            className={`px-4 py-2 rounded-xl text-sm transition-all flex items-center gap-2 ${activeTab === 'ADMIN_USERS'
                                ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-sm'
                                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                               }`}
                        >
                            <Users size={18} />
                            <span className="hidden md:block">Usuarios</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('ADMIN_ROOMS')}
                            className={`px-4 py-2 rounded-xl text-sm transition-all flex items-center gap-2 ${activeTab === 'ADMIN_ROOMS'
                                ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-sm'
                                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                                }`}
                        >
                            <Hotel size={18} />
                            <span className="hidden md:block">Habitaciones</span>
                        </button>
                    </>
                )}
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'PROFILE' && (
                    <motion.div
                        key="profile"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-8"
                    >
            {/* Header section with profile overview */}
            <div className="flex flex-col md:flex-row items-center gap-6 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
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
                
                <div className="flex-1 text-center md:text-left">
                    <div className="flex flex-col md:flex-row items-center gap-3">
                        {isEditingName ? (
                            <div className="flex items-center gap-2">
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
                                    className="text-2xl font-bold text-zinc-900 dark:text-white bg-transparent border-b-2 border-zinc-300 dark:border-zinc-600 focus:border-zinc-900 dark:focus:border-white outline-none px-2"
                                    autoFocus
                                    disabled={savingName}
                                />
                                <button
                                    onClick={handleSaveName}
                                    disabled={savingName}
                                    className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-green-600 dark:text-green-400 disabled:opacity-50"
                                >
                                    {savingName ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{user.name}</h1>
                                <button
                                    onClick={() => setIsEditingName(true)}
                                    className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                                >
                                    <Edit2 size={18} />
                                </button>
                            </div>
                        )}
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700">
                            {user.role === UserRole.ADMIN && <Shield size={14} className="text-amber-500" />}
                            {user.role}
                        </span>
                    </div>
                    <p className="text-zinc-500 dark:text-zinc-400 mt-1">{user.email}</p>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={onLogout}
                        className="flex items-center gap-2 px-4 py-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-colors font-medium border border-rose-100 dark:border-rose-900/30"
                    >
                        <LogOut size={18} />
                        Cerrar sesión
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3 text-sm text-red-600 dark:text-red-400 shadow-sm animation-in slide-in-from-top duration-300">
                    <div className="flex-shrink-0 w-1.5 h-1.5 bg-red-500 rounded-full" />
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column */}
                <div className="space-y-8">
                    {/* Appearance Section */}
                    <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
                        <div className="flex items-center gap-2">
                            <Moon className="text-zinc-400" size={20} />
                            <h3 className="text-base font-medium text-zinc-900 dark:text-white">Apariencia</h3>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <button onClick={() => setTheme('light')} className={getThemeButtonClass('light')}>
                                <Sun size={24} />
                                <span className="text-xs font-medium">Claro</span>
                            </button>
                            <button onClick={() => setTheme('dark')} className={getThemeButtonClass('dark')}>
                                <Moon size={24} />
                                <span className="text-xs font-medium">Oscuro</span>
                            </button>
                            <button onClick={() => setTheme('system')} className={getThemeButtonClass('system')}>
                                <Monitor size={24} />
                                <span className="text-xs font-medium">Sistema</span>
                            </button>
                        </div>
                    </div>

                    {/* Notification Settings */}
                    <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                        <NotificationSettings userId={user.id} userRole={user.role} />
                    </div>

                    {/* Tutorial Reset */}
                    <div className="bg-zinc-100/50 dark:bg-zinc-800/30 p-6 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-700 text-center">
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">¿Necesitas ayuda para recordar cómo funciona todo?</p>
                        <button
                            onClick={onRestartTutorial}
                            className="px-6 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl text-sm font-medium hover:opacity-90 transition-all active:scale-95 shadow-sm"
                        >
                            Volver a ver el tutorial
                        </button>
                    </div>
                </div>

                {/* Right Column */}
                <div className="space-y-8">
                    {/* Personal & Room Info */}
                    <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
                        <div className="flex items-center gap-2">
                            <UserIcon className="text-zinc-400" size={20} />
                            <h3 className="text-base font-medium text-zinc-900 dark:text-white">Información y Estancia</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 space-y-1">
                                <label className="flex items-center gap-2 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                                    <Calendar size={14} /> Cumpleaños
                                </label>
                                <input
                                    type="date"
                                    value={birthday}
                                    onChange={(e) => setBirthday(e.target.value)}
                                    className="w-full text-sm font-medium text-zinc-900 dark:text-white bg-transparent outline-none"
                                />
                            </div>

                            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 space-y-1">
                                <label className="flex items-center gap-2 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                                    <Hash size={14} /> Siglas (máx. 3)
                                </label>
                                <input
                                    type="text"
                                    value={initials}
                                    onChange={(e) => setInitials(e.target.value.slice(0, 3).toUpperCase())}
                                    maxLength={3}
                                    placeholder="ABC"
                                    className="w-full text-sm font-medium text-zinc-900 dark:text-white bg-transparent outline-none uppercase"
                                />
                            </div>
                        </div>

                        <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                            <div className="space-y-1">
                                <label className="flex items-center gap-2 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                                    <Hotel size={14} /> Habitación Asignada
                                </label>
                                <p className="text-sm font-medium text-zinc-900 dark:text-white">
                                    {user.roomName && user.bedNumber
                                        ? user.roomTotalBeds && user.roomTotalBeds > 1
                                            ? `${user.roomName} - Cama ${user.bedNumber}`
                                            : user.roomName
                                        : 'No asignada'
                                    }
                                </p>
                            </div>
                            {user.roomId && (
                                <button
                                    onClick={() => setShowAbsences(!showAbsences)}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg text-xs font-medium transition-all active:scale-95"
                                >
                                    Ausencias
                                    {showAbsences ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </button>
                            )}
                        </div>

                        <AnimatePresence>
                            {showAbsences && user.roomId && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="pt-4 mt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-6"
                                >
                                    {/* Create Form */}
                                    <form onSubmit={handleCreateAbsence} className="space-y-4 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
                                        <div className="flex items-center gap-2 text-zinc-900 dark:text-white">
                                            <Plus size={16} />
                                            <h4 className="text-sm font-bold">Registrar nueva ausencia</h4>
                                        </div>

                                        {absenceError && <p className="text-xs text-rose-500 font-medium">{absenceError}</p>}

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider px-1">Inicio</label>
                                                <input
                                                    type="date"
                                                    value={newAbsenceStart}
                                                    onChange={(e) => setNewAbsenceStart(e.target.value)}
                                                    min={getTodayString()}
                                                    disabled={creatingAbsence}
                                                    required
                                                    className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg outline-none"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider px-1">Fin</label>
                                                <input
                                                    type="date"
                                                    value={newAbsenceEnd}
                                                    onChange={(e) => setNewAbsenceEnd(e.target.value)}
                                                    min={newAbsenceStart || getTodayString()}
                                                    disabled={creatingAbsence}
                                                    required
                                                    className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg outline-none"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider px-1">Notas (opcional)</label>
                                            <input
                                                type="text"
                                                value={newAbsenceNotes}
                                                onChange={(e) => setNewAbsenceNotes(e.target.value)}
                                                placeholder="Ej: Vacaciones..."
                                                disabled={creatingAbsence}
                                                className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg outline-none"
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={creatingAbsence}
                                            className="w-full py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl text-sm font-medium hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 shadow-sm"
                                        >
                                            {creatingAbsence ? 'Guardando...' : 'Registrar Ausencia'}
                                        </button>
                                    </form>

                                    {/* List */}
                                    <div className="space-y-3">
                                        <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wider px-1">Historial de ausencias</h4>
                                        {loadingAbsences ? (
                                            <div className="flex justify-center py-4"><Loader2 size={24} className="animate-spin text-zinc-300" /></div>
                                        ) : absences.length === 0 ? (
                                            <p className="text-sm text-zinc-400 italic text-center py-4 bg-zinc-50 dark:bg-zinc-800/30 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700">No tienes ausencias registradas</p>
                                        ) : (
                                            <div className="space-y-2">
                                                {absences.map((abs) => {
                                                    const isPast = new Date(abs.endDate) < new Date();
                                                    return (
                                                        <div key={abs.id} className={`p-4 rounded-xl border flex items-center justify-between ${isPast ? 'bg-zinc-50/50 dark:bg-zinc-800/20 border-zinc-100 dark:border-zinc-800 opacity-60' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 shadow-sm'}`}>
                                                            <div className="flex items-start gap-3">
                                                                <Calendar size={16} className="mt-0.5 text-zinc-400" />
                                                                <div>
                                                                    <p className="text-sm font-medium text-zinc-900 dark:text-white">{formatDate(abs.startDate)} - {formatDate(abs.endDate)}</p>
                                                                    {abs.notes && <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{abs.notes}</p>}
                                                                </div>
                                                            </div>
                                                            {!isPast && (
                                                                <button onClick={() => handleDeleteAbsence(abs.id)} className="p-2 text-zinc-400 hover:text-rose-500 transition-colors">
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Diet Information */}
                    <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Utensils className="text-zinc-400" size={20} />
                                <h3 className="text-base font-medium text-zinc-900 dark:text-white">Alimentación y Dieta</h3>
                            </div>
                            <button
                                onClick={() => setHasDiet(!hasDiet)}
                                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${hasDiet ? 'bg-green-500' : 'bg-zinc-200 dark:bg-zinc-700'}`}
                            >
                                <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${hasDiet ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>

                        {hasDiet && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                                {user.dietNumber && (
                                    <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30 flex items-center justify-between">
                                        <span className="text-sm font-medium text-green-700 dark:text-green-400">Tu número de dieta asignado:</span>
                                        <span className="text-xl font-bold text-green-600 dark:text-green-300"># {user.dietNumber}</span>
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider px-1">Nombre de la dieta</label>
                                        <input
                                            type="text"
                                            value={dietName}
                                            onChange={(e) => setDietName(e.target.value)}
                                            placeholder="Ej: Vegetariana, Sin lactosa..."
                                            className="w-full px-4 py-3 text-sm bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500/20 transition-all"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider px-1">Notas y detalles</label>
                                        <textarea
                                            value={dietNotes}
                                            onChange={(e) => setDietNotes(e.target.value)}
                                            placeholder="Indica alergias o preferencias específicas..."
                                            rows={3}
                                            className="w-full px-4 py-3 text-sm bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none resize-none focus:ring-2 focus:ring-green-500/20 transition-all"
                                        />
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between px-1">
                                            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Documentación (Informes, etc.)</label>
                                            <button
                                                onClick={() => dietFileInputRef.current?.click()}
                                                disabled={uploadingDietFile}
                                                className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
                                            >
                                                {uploadingDietFile ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                                                Subir
                                            </button>
                                        </div>
                                        <input type="file" ref={dietFileInputRef} onChange={handleDietFileUpload} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" className="hidden" />

                                        {dietFiles.length > 0 ? (
                                            <div className="grid grid-cols-1 gap-2">
                                                {dietFiles.map((file) => (
                                                    <div key={file.id} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl">
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <div className="p-2 bg-white dark:bg-zinc-900 rounded-lg shadow-sm">
                                                                <FileText className="text-blue-500" size={18} />
                                                            </div>
                                                            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 truncate">{file.fileName}</span>
                                                        </div>
                                                        <button onClick={() => handleDeleteDietFile(file.id, file.filePath)} className="p-2 text-zinc-400 hover:text-rose-500 transition-colors">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="p-6 text-center border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-2xl">
                                                <p className="text-xs text-zinc-400 font-medium italic">No hay archivos adjuntos</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </div>

                    {/* Final Save Action */}
                    <button
                        onClick={handleSaveProfile}
                        disabled={savingProfile}
                        className="w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl text-base font-bold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 shadow-xl flex items-center justify-center gap-3"
                    >
                        {savingProfile ? (
                            <>
                                <Loader2 className="animate-spin" size={24} />
                                Guardando perfil...
                            </>
                        ) : (
                            <>
                                <Check size={24} />
                                Guardar todos los cambios
                            </>
                        )}
                    </button>
                    </div>
                </div>
                </motion.div>
            )}

            {activeTab === 'MESSAGES' && (
                <motion.div
                    key="messages"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                >
                    <MessagingView user={user} />
                </motion.div>
            )}

            {activeTab === 'ADMIN_USERS' && user.role === UserRole.ADMIN && (
                <motion.div
                    key="admin-users"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm p-6"
                >
                    <AdminUserList />
                </motion.div>
            )}

            {activeTab === 'ADMIN_ROOMS' && user.role === UserRole.ADMIN && (
                <motion.div
                    key="admin-rooms"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm p-6"
                >
                    <RoomsManagementView />
                </motion.div>
            )}
        </AnimatePresence>
        </div>
    );
};
