import React, { useState, useEffect } from 'react';
import { User, DietFile } from '../types';
import { profileService } from '../services/profiles';
import { FileText, Image as ImageIcon, Download, ExternalLink, Utensils, AlertCircle } from 'lucide-react';

interface DietUserCardProps {
    user: User;
}

const DietUserCard: React.FC<DietUserCardProps> = ({ user }) => {
    const [files, setFiles] = useState<DietFile[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadFiles();
    }, [user.id]);

    const loadFiles = async () => {
        try {
            const userFiles = await profileService.getDietFiles(user.id);
            setFiles(userFiles);
        } catch (error) {
            console.error('Error loading diet files:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenFile = (file: DietFile) => {
        try {
            const url = profileService.getDietFileUrl(file.filePath);
            if (url) {
                window.open(url, '_blank');
            }
        } catch (error) {
            console.error('Error opening file:', error);
        }
    };

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
            <div className="flex items-start justify-between mb-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                            {user.initials || user.name.split(' ').map(p => p[0]).join('').substring(0, 3).toUpperCase()}
                        </h3>
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full">
                            <Utensils size={14} />
                            <span className="text-xs font-bold">D{user.dietNumber}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-zinc-900 dark:text-white mb-1">
                        {user.dietName || 'Dieta Especial'}
                    </h4>
                    {user.dietNotes ? (
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            {user.dietNotes}
                        </p>
                    ) : (
                        <p className="text-sm text-zinc-400 italic">Sin notas adicionales</p>
                    )}
                </div>

                <div>
                    <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                        Archivos Adjuntos ({files.length})
                    </h4>

                    {loading ? (
                        <div className="text-sm text-zinc-500 animate-pulse">Cargando archivos...</div>
                    ) : files.length === 0 ? (
                        <div className="flex items-center gap-2 text-sm text-zinc-400">
                            <AlertCircle size={16} />
                            <span>No hay archivos adjuntos</span>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {files.map((file) => (
                                <button
                                    key={file.id}
                                    onClick={() => handleOpenFile(file)}
                                    className="flex items-center gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors group text-left"
                                >
                                    <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">
                                        {file.mimeType.startsWith('image/') ? <ImageIcon size={20} /> : <FileText size={20} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 truncate group-hover:text-zinc-900 dark:group-hover:text-white">
                                            {file.fileName}
                                        </p>
                                        <p className="text-xs text-zinc-500">
                                            {new Date(file.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <ExternalLink size={16} className="text-zinc-300 group-hover:text-zinc-500" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export const KitchenDietsView = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDietUsers();
    }, []);

    const loadDietUsers = async () => {
        try {
            const allUsers = await profileService.getAllProfiles();
            const dietUsers = allUsers.filter(u => u.hasDiet).sort((a, b) => (a.dietNumber || 0) - (b.dietNumber || 0));
            setUsers(dietUsers);
        } catch (error) {
            console.error('Error loading diet users:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-zinc-500">Cargando dietas...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
                    Dietas Especiales
                </h2>
                <div className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 rounded-full text-sm font-semibold">
                    {users.length} Residentes
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {users.map(user => (
                    <DietUserCard key={user.id} user={user} />
                ))}
            </div>

            {users.length === 0 && (
                <div className="text-center py-12 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 border-dashed">
                    <p className="text-zinc-500">No hay residentes con dieta especial registrada.</p>
                </div>
            )}
        </div>
    );
};
