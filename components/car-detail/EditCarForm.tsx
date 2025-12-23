import React, { useState, useMemo, useRef } from 'react';
import { Upload, Link as LinkIcon, Save, Trash2, AlertTriangle } from 'lucide-react';
import { addDays, isBefore, isAfter } from 'date-fns';
import { Car, User } from '../../types';
import { carService } from '../../services/cars';
import { adminService } from '../../services/admin';
import { UserSelector } from '../UserSelector';

interface EditCarFormProps {
    car: Car;
    onSaveSuccess: () => void;
    onDelete: () => void;
    onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const EditCarForm: React.FC<EditCarFormProps> = ({
    car,
    onSaveSuccess,
    onDelete,
    onShowToast
}) => {
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [showUrlInput, setShowUrlInput] = useState(false);
    const [urlInput, setUrlInput] = useState('');
    const [users, setUsers] = useState<User[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        const fetchUsers = async () => {
            try {
                const data = await adminService.getUsers();
                setUsers(data.filter(u => u.status === 'APPROVED'));
            } catch (error) {
                console.error('Error fetching users:', error);
            }
        };
        fetchUsers();
    }, []);

    const [editFormData, setEditFormData] = useState({
        name: car.name,
        inWorkshop: car.inWorkshop,
        nextServiceDate: car.nextServiceDate || '',
        imageUrl: car.imageUrl,
        assignedUserId: car.assignedUserId || ''
    });

    // Check if next service is within 1 week
    const isServiceDueSoon = useMemo(() => {
        if (!car.nextServiceDate) return false;
        const serviceDate = new Date(car.nextServiceDate);
        const oneWeekFromNow = addDays(new Date(), 7);
        return isBefore(serviceDate, oneWeekFromNow) && isAfter(serviceDate, new Date());
    }, [car.nextServiceDate]);

    const handleImageUpload = async (file: File) => {
        setUploading(true);
        try {
            const url = await carService.uploadImage(file);
            setEditFormData(prev => ({ ...prev, imageUrl: url }));
        } catch (error) {
            console.error(error);
            onShowToast('Error al subir la imagen: ' + (error as Error).message, 'error');
        } finally {
            setUploading(false);
        }
    };

    const handleUrlSubmit = () => {
        if (urlInput.trim()) {
            setEditFormData(prev => ({ ...prev, imageUrl: urlInput.trim() }));
            setUrlInput('');
            setShowUrlInput(false);
        }
    };

    const handleSaveEdit = async () => {
        setLoading(true);
        try {
            await carService.updateCar(car.id, {
                name: editFormData.name,
                inWorkshop: editFormData.inWorkshop,
                nextServiceDate: editFormData.nextServiceDate || undefined,
                imageUrl: editFormData.imageUrl,
                assignedUserId: editFormData.assignedUserId || undefined
            });

            onShowToast('Cambios guardados correctamente', 'success');
            onSaveSuccess();
        } catch (e) {
            onShowToast('Error al guardar cambios: ' + (e as Error).message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="mb-4">
                <UserSelector
                    label="Encargado"
                    users={users}
                    value={editFormData.assignedUserId}
                    onChange={(userId) => setEditFormData({ ...editFormData, assignedUserId: userId })}
                    placeholder="Seleccionar encargado..."
                />
            </div>
            <div>
                <label className="block text-[10px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">Nombre</label>
                <input
                    type="text"
                    className="w-full text-xs py-1.5 px-2 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-lg focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 outline-none"
                    value={editFormData.name}
                    onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                />
            </div>

            {/* Image Upload in Edit */}
            <div>
                <label className="block text-[10px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">Imagen</label>
                <div className="space-y-2">
                    <div className="flex gap-2">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                            className="hidden"
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="flex-1 flex items-center justify-center gap-2 py-1 px-2 text-[10px] border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50"
                        >
                            <Upload size={12} />
                            {uploading ? 'Subiendo...' : 'Subir imagen'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowUrlInput(!showUrlInput)}
                            className="flex-1 flex items-center justify-center gap-2 py-1 px-2 text-[10px] border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                        >
                            <LinkIcon size={12} />
                            URL
                        </button>
                    </div>
                    {showUrlInput && (
                        <div className="flex gap-2">
                            <input
                                type="url"
                                placeholder="https://..."
                                className="flex-1 text-xs py-1.5 px-2 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-lg focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 outline-none"
                                value={urlInput}
                                onChange={e => setUrlInput(e.target.value)}
                            />
                            <button
                                type="button"
                                onClick={handleUrlSubmit}
                                className="px-3 py-1.5 text-xs bg-zinc-900 dark:bg-white text-white dark:text-black rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200"
                            >
                                OK
                            </button>
                        </div>
                    )}
                    {editFormData.imageUrl && (
                        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
                            <img src={editFormData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                    )}
                </div>
            </div>

            <div>
                <label className="block text-[10px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">Próxima Revisión</label>
                <input
                    type="date"
                    className={`w-full text-xs py-1.5 px-2 border rounded-lg focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 outline-none bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white [color-scheme:light] dark:[color-scheme:dark] ${isServiceDueSoon ? 'border-amber-300 bg-amber-50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-100' : 'border-zinc-200 dark:border-zinc-700'
                        }`}
                    value={editFormData.nextServiceDate}
                    onChange={e => setEditFormData({ ...editFormData, nextServiceDate: e.target.value })}
                />
                {isServiceDueSoon && (
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                        <AlertTriangle size={10} /> Revisión próxima (menos de 1 semana)
                    </p>
                )}
            </div>

            <div className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${editFormData.inWorkshop ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800' : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700'}`}>
                <input
                    type="checkbox"
                    id="inWorkshop"
                    checked={editFormData.inWorkshop}
                    onChange={e => setEditFormData({ ...editFormData, inWorkshop: e.target.checked })}
                    className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-600 text-zinc-900 dark:text-white focus:ring-zinc-900 dark:focus:ring-white bg-white dark:bg-zinc-700"
                />
                <label htmlFor="inWorkshop" className={`text-xs cursor-pointer ${editFormData.inWorkshop ? 'text-rose-700 dark:text-rose-400 font-medium' : 'text-zinc-700 dark:text-zinc-300'}`}>
                    {editFormData.inWorkshop ? 'En taller - reservas deshabilitadas' : 'En el taller'}
                </label>
            </div>

            <div className="flex gap-2 pt-2">
                <button
                    onClick={handleSaveEdit}
                    disabled={loading}
                    className="flex-1 px-4 py-2 text-xs bg-zinc-900 dark:bg-white text-white dark:text-black rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    <Save size={14} />
                    Guardar
                </button>
            </div>

            {/* Delete Button inside Edit View */}
            <div className="pt-4 mt-4 border-t border-zinc-100 dark:border-zinc-800">
                <button
                    onClick={onDelete}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 p-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                >
                    <Trash2 size={16} />
                    Eliminar coche
                </button>
            </div>
        </div>
    );
};
