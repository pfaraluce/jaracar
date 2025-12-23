import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Loader2, Check, AlertCircle } from 'lucide-react';
import {
    requestNotificationPermission,
    getMessagingToken,
    saveTokenToDatabase,
    getNotificationPreferences,
    updateNotificationPreferences,
    NotificationPreferences
} from '../services/notifications';
import { UserRole } from '../types';

interface NotificationSettingsProps {
    userId: string;
    userRole: UserRole;
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({ userId, userRole }) => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
    const [preferences, setPreferences] = useState<NotificationPreferences>({
        global_enabled: true,
        admin_announcements: true,
        meal_orders: false,
        reservations: false,
        reminders: false,
        vehicle_inspections: false,
        maintenance_tickets: false
    });

    useEffect(() => {
        loadPreferences();
        checkPermissionStatus();
    }, []);

    const checkPermissionStatus = () => {
        if ('Notification' in window) {
            setPermissionStatus(Notification.permission);
        }
    };

    const loadPreferences = async () => {
        setLoading(true);
        try {
            const prefs = await getNotificationPreferences();
            if (prefs) {
                setPreferences(prefs);
            }
        } catch (err: any) {
            console.error('Error loading preferences:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleRequestPermission = async () => {
        setSaving(true);
        setError(null);
        try {
            const permission = await requestNotificationPermission();
            setPermissionStatus(permission);

            if (permission === 'granted') {
                const token = await getMessagingToken();
                if (token) {
                    await saveTokenToDatabase(token);
                    setSuccess(true);
                    setTimeout(() => setSuccess(false), 3000);
                }
            } else if (permission === 'denied') {
                setError('Has bloqueado las notificaciones. Por favor, habilítalas en la configuración del navegador.');
            }
        } catch (err: any) {
            console.error('Error requesting permission:', err);
            setError(err.message || 'Error al solicitar permisos');
        } finally {
            setSaving(false);
        }
    };

    const handleTogglePreference = async (key: keyof NotificationPreferences) => {
        const newPreferences = {
            ...preferences,
            [key]: !preferences[key]
        };
        setPreferences(newPreferences);

        setSaving(true);
        setError(null);
        try {
            await updateNotificationPreferences(newPreferences);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 2000);
        } catch (err: any) {
            console.error('Error updating preferences:', err);
            setError(err.message || 'Error al guardar preferencias');
            // Revert on error
            setPreferences(preferences);
        } finally {
            setSaving(false);
        }
    };

    const getPermissionStatusText = () => {
        switch (permissionStatus) {
            case 'granted':
                return { text: 'Activadas', color: 'text-green-600 dark:text-green-400' };
            case 'denied':
                return { text: 'Bloqueadas', color: 'text-red-600 dark:text-red-400' };
            default:
                return { text: 'No solicitadas', color: 'text-zinc-500 dark:text-zinc-400' };
        }
    };

    const statusInfo = getPermissionStatusText();

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="animate-spin text-zinc-400" size={24} />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Bell className="text-zinc-400" size={20} />
                    <h3 className="text-sm font-medium text-zinc-900 dark:text-white">Notificaciones Push</h3>
                </div>
                <span className={`text-xs font-medium ${statusInfo.color}`}>
                    {statusInfo.text}
                </span>
            </div>

            {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2 text-sm text-red-600 dark:text-red-400">
                    <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                </div>
            )}

            {success && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                    <Check size={16} />
                    <span>Preferencias guardadas correctamente</span>
                </div>
            )}

            {/* Global Master Switch */}
            {permissionStatus === 'granted' && (
                <div className="bg-zinc-50 dark:bg-zinc-800/80 rounded-xl p-4 border border-zinc-200 dark:border-zinc-700/50">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${preferences.global_enabled ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500'}`}>
                                {preferences.global_enabled ? <Bell size={20} /> : <BellOff size={20} />}
                            </div>
                            <div>
                                <h4 className="font-semibold text-zinc-900 dark:text-white">Todas las notificaciones</h4>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                    {preferences.global_enabled ? 'Recibirás las notificaciones seleccionadas abajo' : 'Todas las notificaciones pausadas'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => handleTogglePreference('global_enabled')}
                            disabled={saving}
                            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${preferences.global_enabled
                                    ? 'bg-green-500'
                                    : 'bg-zinc-200 dark:bg-zinc-700'
                                }`}
                        >
                            <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${preferences.global_enabled ? 'translate-x-6' : 'translate-x-1'
                                }`} />
                        </button>
                    </div>
                </div>
            )}

            {permissionStatus !== 'granted' && (
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700">
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
                        Para recibir notificaciones, necesitas dar permiso a tu navegador.
                    </p>
                    <button
                        onClick={handleRequestPermission}
                        disabled={saving || permissionStatus === 'denied'}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="animate-spin" size={16} />
                                Solicitando...
                            </>
                        ) : (
                            <>
                                <Bell size={16} />
                                Activar notificaciones
                            </>
                        )}
                    </button>
                    {permissionStatus === 'denied' && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 text-center">
                            Ve a la configuración de tu navegador para habilitar las notificaciones
                        </p>
                    )}
                </div>
            )}

            {permissionStatus === 'granted' && (
                <div className={`space-y-2 transition-opacity duration-200 ${!preferences.global_enabled ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3 px-1">
                        Selecciona qué notificaciones quieres recibir:
                    </p>

                    {/* Admin Announcements - Always shown, enabled by default */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                        <div className="flex-1">
                            <p className="text-sm font-medium text-zinc-900 dark:text-white">
                                Anuncios de administración
                            </p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                Mensajes importantes del equipo
                            </p>
                        </div>
                        <button
                            onClick={() => handleTogglePreference('admin_announcements')}
                            disabled={saving}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${preferences.admin_announcements
                                    ? 'bg-zinc-900 dark:bg-white'
                                    : 'bg-zinc-200 dark:bg-zinc-700'
                                }`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-zinc-900 transition-transform ${preferences.admin_announcements ? 'translate-x-6' : 'translate-x-1'
                                }`} />
                        </button>
                    </div>

                    {/* Meal Orders */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                        <div className="flex-1">
                            <p className="text-sm font-medium text-zinc-900 dark:text-white">
                                Pedidos de comida
                            </p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                Cuando se cierran los pedidos del día
                            </p>
                        </div>
                        <button
                            onClick={() => handleTogglePreference('meal_orders')}
                            disabled={saving}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${preferences.meal_orders
                                    ? 'bg-zinc-900 dark:bg-white'
                                    : 'bg-zinc-200 dark:bg-zinc-700'
                                }`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-zinc-900 transition-transform ${preferences.meal_orders ? 'translate-x-6' : 'translate-x-1'
                                }`} />
                        </button>
                    </div>

                    {/* Reservations */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                        <div className="flex-1">
                            <p className="text-sm font-medium text-zinc-900 dark:text-white">
                                Reservas de vehículos
                            </p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                Cambios en tus reservas
                            </p>
                        </div>
                        <button
                            onClick={() => handleTogglePreference('reservations')}
                            disabled={saving}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${preferences.reservations
                                    ? 'bg-zinc-900 dark:bg-white'
                                    : 'bg-zinc-200 dark:bg-zinc-700'
                                }`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-zinc-900 transition-transform ${preferences.reservations ? 'translate-x-6' : 'translate-x-1'
                                }`} />
                        </button>
                    </div>

                    {/* Reminders */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                        <div className="flex-1">
                            <p className="text-sm font-medium text-zinc-900 dark:text-white">
                                Recordatorios
                            </p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                Recordatorios diarios de pedidos
                            </p>
                        </div>
                        <button
                            onClick={() => handleTogglePreference('reminders')}
                            disabled={saving}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${preferences.reminders
                                    ? 'bg-zinc-900 dark:bg-white'
                                    : 'bg-zinc-200 dark:bg-zinc-700'
                                }`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-zinc-900 transition-transform ${preferences.reminders ? 'translate-x-6' : 'translate-x-1'
                                }`} />
                        </button>
                    </div>

                    {/* Vehicle Inspections - Only for admins */}
                    {userRole === UserRole.ADMIN && (
                        <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                            <div className="flex-1">
                                <p className="text-sm font-medium text-zinc-900 dark:text-white">
                                    Revisiones de vehículos
                                </p>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                    Próximas revisiones de vehículos
                                </p>
                            </div>
                            <button
                                onClick={() => handleTogglePreference('vehicle_inspections')}
                                disabled={saving}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${preferences.vehicle_inspections
                                        ? 'bg-zinc-900 dark:bg-white'
                                        : 'bg-zinc-200 dark:bg-zinc-700'
                                    }`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-zinc-900 transition-transform ${preferences.vehicle_inspections ? 'translate-x-6' : 'translate-x-1'
                                    }`} />
                            </button>
                        </div>
                    )}

                    {/* Maintenance Tickets */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                        <div className="flex-1">
                            <p className="text-sm font-medium text-zinc-900 dark:text-white">
                                Tickets de mantenimiento
                            </p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                Cuando te asignan un ticket
                            </p>
                        </div>
                        <button
                            onClick={() => handleTogglePreference('maintenance_tickets')}
                            disabled={saving}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${preferences.maintenance_tickets
                                    ? 'bg-zinc-900 dark:bg-white'
                                    : 'bg-zinc-200 dark:bg-zinc-700'
                                }`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-zinc-900 transition-transform ${preferences.maintenance_tickets ? 'translate-x-6' : 'translate-x-1'
                                }`} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
