import React, { useEffect, useState } from 'react';
import { X, RefreshCw } from 'lucide-react';

interface UpdateNotificationProps {
    onUpdate: () => void;
    onDismiss: () => void;
}

export const UpdateNotification: React.FC<UpdateNotificationProps> = ({ onUpdate, onDismiss }) => {
    const [isVisible, setIsVisible] = useState(true);

    const handleUpdate = () => {
        setIsVisible(false);
        onUpdate();
    };

    const handleDismiss = () => {
        setIsVisible(false);
        onDismiss();
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg shadow-2xl p-4 flex items-center gap-4 min-w-[320px] max-w-md">
                <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                        <RefreshCw className="w-5 h-5" />
                    </div>
                </div>

                <div className="flex-1">
                    <h3 className="font-semibold text-sm">Nueva versión disponible</h3>
                    <p className="text-xs text-white/90 mt-0.5">
                        Actualiza para obtener las últimas mejoras
                    </p>
                </div>

                <button
                    onClick={handleUpdate}
                    className="px-4 py-2 bg-white text-blue-600 rounded-md text-sm font-medium hover:bg-blue-50 transition-colors"
                >
                    Actualizar
                </button>

                <button
                    onClick={handleDismiss}
                    className="flex-shrink-0 p-1 hover:bg-white/20 rounded transition-colors"
                    aria-label="Cerrar"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};

// Hook to manage service worker updates
export const useServiceWorkerUpdate = () => {
    const [showUpdateNotification, setShowUpdateNotification] = useState(false);
    const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

    useEffect(() => {
        // Check if service workers are supported
        if (!('serviceWorker' in navigator)) {
            console.log('[PWA] Service workers not supported');
            return;
        }

        // Register service worker
        navigator.serviceWorker
            .register('/sw.js')
            .then((registration) => {
                console.log('[PWA] Service worker registered:', registration);

                // Check for updates every 60 seconds
                setInterval(() => {
                    registration.update();
                }, 60000);

                // Listen for updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    if (!newWorker) return;

                    console.log('[PWA] New service worker found');

                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // New service worker available
                            console.log('[PWA] New service worker installed, showing update notification');
                            setWaitingWorker(newWorker);
                            setShowUpdateNotification(true);
                        }
                    });
                });

                // Check if there's already a waiting worker
                if (registration.waiting) {
                    setWaitingWorker(registration.waiting);
                    setShowUpdateNotification(true);
                }
            })
            .catch((error) => {
                console.error('[PWA] Service worker registration failed:', error);
            });

        // Listen for controller change (new SW activated)
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            console.log('[PWA] Controller changed, reloading page');
            window.location.reload();
        });
    }, []);

    const updateServiceWorker = () => {
        if (waitingWorker) {
            // Tell the waiting service worker to skip waiting and activate
            waitingWorker.postMessage({ type: 'SKIP_WAITING' });
        }
    };

    const dismissUpdate = () => {
        setShowUpdateNotification(false);
    };

    return {
        showUpdateNotification,
        updateServiceWorker,
        dismissUpdate,
    };
};
