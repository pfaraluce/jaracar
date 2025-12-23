import { messaging, getToken, onMessage } from '../src/firebase/config';
import { supabase } from './supabase';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

export interface NotificationPreferences {
    admin_announcements: boolean;
    meal_orders: boolean;
    reservations: boolean;
    reminders: boolean;
    vehicle_inspections: boolean;
    maintenance_tickets: boolean;
}

/**
 * Request notification permission from the browser
 */
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
    if (!('Notification' in window)) {
        throw new Error('This browser does not support notifications');
    }

    const permission = await Notification.requestPermission();
    return permission;
};

/**
 * Get FCM token from Firebase
 */
export const getMessagingToken = async (): Promise<string | null> => {
    if (!messaging) {
        console.warn('Messaging not initialized');
        return null;
    }

    try {
        // Check if service worker is supported
        if (!('serviceWorker' in navigator)) {
            throw new Error('Service workers are not supported');
        }

        // Register service worker and wait for it to be ready
        let registration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
        
        if (!registration) {
            registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
                scope: '/'
            });
            
            // Wait for the service worker to be ready
            await navigator.serviceWorker.ready;
        }

        // Ensure service worker is active
        if (!registration.active) {
            await new Promise((resolve) => {
                const interval = setInterval(() => {
                    if (registration!.active) {
                        clearInterval(interval);
                        resolve(true);
                    }
                }, 100);
            });
        }

        // Get FCM token
        const token = await getToken(messaging, {
            vapidKey: VAPID_KEY,
            serviceWorkerRegistration: registration
        });

        return token;
    } catch (error) {
        console.error('Error getting FCM token:', error);
        return null;
    }
};

/**
 * Save FCM token to database
 */
export const saveTokenToDatabase = async (token: string, deviceInfo?: any): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('User not authenticated');
    }

    const { error } = await supabase
        .from('user_fcm_tokens')
        .upsert({
            user_id: user.id,
            token,
            device_info: deviceInfo || {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                timestamp: new Date().toISOString()
            }
        }, {
            onConflict: 'token'
        });

    if (error) {
        console.error('Error saving FCM token:', error);
        throw error;
    }
};

/**
 * Delete FCM token from database
 */
export const deleteToken = async (token: string): Promise<void> => {
    const { error } = await supabase
        .from('user_fcm_tokens')
        .delete()
        .eq('token', token);

    if (error) {
        console.error('Error deleting FCM token:', error);
        throw error;
    }
};

/**
 * Get user's notification preferences
 */
export const getNotificationPreferences = async (): Promise<NotificationPreferences | null> => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const { data, error } = await supabase
        .from('user_notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

    if (error) {
        console.error('Error fetching notification preferences:', error);
        return null;
    }

    return data;
};

/**
 * Update user's notification preferences
 */
export const updateNotificationPreferences = async (
    preferences: Partial<NotificationPreferences>
): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('User not authenticated');
    }

    const { error } = await supabase
        .from('user_notification_preferences')
        .upsert({
            user_id: user.id,
            ...preferences,
            updated_at: new Date().toISOString()
        }, {
            onConflict: 'user_id'
        });

    if (error) {
        console.error('Error updating notification preferences:', error);
        throw error;
    }
};

/**
 * Initialize FCM and request permission
 */
export const initializeNotifications = async (): Promise<boolean> => {
    try {
        // Check if notifications are supported
        if (!('Notification' in window)) {
            console.warn('Notifications not supported');
            return false;
        }

        // Check current permission
        if (Notification.permission === 'granted') {
            // Get and save token
            const token = await getMessagingToken();
            if (token) {
                await saveTokenToDatabase(token);
                return true;
            }
        } else if (Notification.permission === 'default') {
            // Permission not yet requested
            return false;
        }

        return false;
    } catch (error) {
        console.error('Error initializing notifications:', error);
        return false;
    }
};

/**
 * Listen for foreground messages
 */
export const onMessageListener = (callback: (payload: any) => void) => {
    if (!messaging) {
        console.warn('Messaging not initialized');
        return () => { };
    }

    return onMessage(messaging, (payload) => {
        callback(payload);
    });
};

/**
 * Send a test notification (for development)
 */
export const sendTestNotification = async (title: string, body: string): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('User not authenticated');
    }

    const { error } = await supabase.functions.invoke('send-notification', {
        body: {
            userId: user.id,
            title,
            body
        }
    });

    if (error) {
        console.error('Error sending test notification:', error);
        throw error;
    }
};
