import { useRegisterSW } from 'virtual:pwa-register/react'
import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

export function ReloadPrompt() {
    const [showReload, setShowReload] = useState(false);

    const {
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r) {
            console.log('SW Registered: ' + r)
        },
        onRegisterError(error) {
            console.log('SW registration error', error)
        },
    })

    useEffect(() => {
        if (needRefresh) {
            setShowReload(true);
            // Auto-update after a short delay to let the user see the toast, 
            // or immediately. Since user asked for "force", we'll do it relatively quickly.
            // But giving 2 seconds is polite.
            const timer = setTimeout(() => {
                updateServiceWorker(true);
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [needRefresh, updateServiceWorker]);

    if (!showReload) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3">
                <RefreshCw className="w-5 h-5 animate-spin" />
                <div className="flex flex-col">
                    <span className="font-medium text-sm">Nueva versión disponible</span>
                    <span className="text-xs opacity-80">Actualizando...</span>
                </div>
            </div>
        </div>
    );
}
