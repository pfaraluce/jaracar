import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Car as CarIcon, Upload, Image as ImageIcon, Link as LinkIcon } from 'lucide-react';
import { Button } from './ui/Button';
import { carService } from '../services/cars';
import { CarStatus } from '../types';

interface AddCarModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const AddCarModal: React.FC<AddCarModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [showUrlInput, setShowUrlInput] = useState(false);
    const [urlInput, setUrlInput] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        plate: '',
        fuelType: 'gasoline' as 'diesel' | 'gasoline' | 'electric',
        nextServiceDate: '',
        imageUrl: '',
        inWorkshop: false
    });
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageUpload = async (file: File) => {
        setUploading(true);
        try {
            const url = await carService.uploadImage(file);
            setFormData(prev => ({ ...prev, imageUrl: url }));
        } catch (error) {
            console.error(error);
            const errorMsg = (error as Error).message;
            if (errorMsg.includes('Bucket not found')) {
                alert('El bucket de imágenes no está configurado. Usa una URL de imagen por ahora.');
            } else {
                alert('Error al subir la imagen: ' + errorMsg);
            }
        } finally {
            setUploading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleImageUpload(file);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            handleImageUpload(file);
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.startsWith('image/')) {
                const file = items[i].getAsFile();
                if (file) handleImageUpload(file);
                break;
            }
        }
    };

    const handleUrlSubmit = () => {
        if (urlInput.trim()) {
            setFormData(prev => ({ ...prev, imageUrl: urlInput.trim() }));
            setUrlInput('');
            setShowUrlInput(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await carService.addCar({
                name: formData.name,
                plate: formData.plate,
                status: CarStatus.AVAILABLE,
                imageUrl: formData.imageUrl || 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&q=80&w=800',
                fuelType: formData.fuelType,
                nextServiceDate: formData.nextServiceDate || undefined,
                inWorkshop: formData.inWorkshop
            });

            // Success feedback with toast-style notification
            const notification = document.createElement('div');
            notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-3 rounded-lg shadow-lg z-[9999] flex items-center gap-2';
            notification.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg><span>Vehículo creado correctamente</span>';
            document.body.appendChild(notification);
            setTimeout(() => notification.remove(), 3000);

            onSuccess();
            onClose();
            setFormData({
                name: '',
                plate: '',
                fuelType: 'gasoline',
                nextServiceDate: '',
                imageUrl: '',
                inWorkshop: false
            });
        } catch (error) {
            console.error(error);

            // Error feedback with toast-style notification
            const notification = document.createElement('div');
            notification.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg z-[9999] flex items-center gap-2';
            notification.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg><span>Error: ${(error as Error).message}</span>`;
            document.body.appendChild(notification);
            setTimeout(() => notification.remove(), 5000);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onPaste={handlePaste}>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-md bg-white rounded-xl shadow-xl overflow-hidden"
                    >
                        <div className="flex items-center justify-between p-4 border-b border-zinc-100">
                            <h3 className="font-semibold text-zinc-900 flex items-center gap-2 text-sm">
                                <CarIcon size={16} /> Añadir Nuevo Vehículo
                            </h3>
                            <button onClick={onClose} className="p-1 hover:bg-zinc-100 rounded-full text-zinc-400">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-4 space-y-3">
                            <div>
                                <label className="block text-[10px] font-medium text-zinc-500 mb-1">Nombre del Vehículo</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="ej. Toyota Corolla 2023"
                                    className="w-full text-xs py-1.5 px-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900/10 outline-none"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-medium text-zinc-500 mb-1">Matrícula</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="1234 ABC"
                                        className="w-full text-xs py-1.5 px-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900/10 outline-none uppercase"
                                        value={formData.plate}
                                        onChange={e => setFormData({ ...formData, plate: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-medium text-zinc-500 mb-1">Combustible</label>
                                    <select
                                        required
                                        className="w-full text-xs py-1.5 px-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900/10 outline-none"
                                        value={formData.fuelType}
                                        onChange={e => setFormData({ ...formData, fuelType: e.target.value as any })}
                                    >
                                        <option value="gasoline">Gasolina</option>
                                        <option value="diesel">Diésel</option>
                                        <option value="electric">Eléctrico</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-medium text-zinc-500 mb-1">Próxima Revisión (Opcional)</label>
                                <input
                                    type="date"
                                    className="w-full text-xs py-1.5 px-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900/10 outline-none"
                                    value={formData.nextServiceDate}
                                    onChange={e => setFormData({ ...formData, nextServiceDate: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-medium text-zinc-500 mb-1">Imagen del Vehículo</label>
                                <div className="space-y-2">
                                    {/* Image Preview or Placeholder */}
                                    <div
                                        onDrop={handleDrop}
                                        onDragOver={(e) => e.preventDefault()}
                                        className="relative aspect-video w-full overflow-hidden rounded-lg border border-dashed border-zinc-300 bg-zinc-50 flex items-center justify-center cursor-pointer hover:border-zinc-400 transition-colors"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        {formData.imageUrl ? (
                                            <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="text-center p-4">
                                                <ImageIcon size={20} className="mx-auto text-zinc-300 mb-2" />
                                                <p className="text-[10px] text-zinc-400">Arrastra o haz clic</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-2">
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileChange}
                                            className="hidden"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={uploading}
                                            className="flex-1 flex items-center justify-center gap-2 py-1 px-2 text-[10px] border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors disabled:opacity-50"
                                        >
                                            <Upload size={12} />
                                            {uploading ? 'Subiendo...' : 'Subir'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setShowUrlInput(!showUrlInput)}
                                            className="flex-1 flex items-center justify-center gap-2 py-1 px-2 text-[10px] border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
                                        >
                                            <LinkIcon size={12} />
                                            URL
                                        </button>
                                    </div>

                                    {/* URL Input */}
                                    {showUrlInput && (
                                        <div className="flex gap-2">
                                            <input
                                                type="url"
                                                placeholder="https://..."
                                                className="flex-1 text-xs py-1.5 px-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900/10 outline-none"
                                                value={urlInput}
                                                onChange={e => setUrlInput(e.target.value)}
                                                onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), handleUrlSubmit())}
                                            />
                                            <button
                                                type="button"
                                                onClick={handleUrlSubmit}
                                                className="px-3 py-1.5 text-xs bg-zinc-900 text-white rounded-lg hover:bg-zinc-800"
                                            >
                                                OK
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="pt-2">
                                <Button className="w-full text-xs py-2" isLoading={loading} disabled={uploading}>
                                    <Save size={14} className="mr-2" /> Guardar Vehículo
                                </Button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
