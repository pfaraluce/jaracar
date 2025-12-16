import React, { useState, useEffect } from 'react';
import { kitchenService, KitchenConfig } from '../services/kitchen';
import { Clock, Lock } from 'lucide-react';

export const CountdownTimer = () => {
    const [config, setConfig] = useState<KitchenConfig | null>(null);
    const [timeLeft, setTimeLeft] = useState<string | null>(null);
    const [isClosingSoon, setIsClosingSoon] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        loadConfig();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [config]);

    const loadConfig = async () => {
        try {
            const cfg = await kitchenService.getConfig();
            setConfig(cfg);
        } catch (e) {
            console.error("Failed to load kitchen config", e);
        }
    };

    const updateTimer = () => {
        if (!config || !config.weekly_schedule) return;

        const now = new Date();
        const startDay = now.getDay().toString(); // 0-6

        // Find the next cutoff
        // We only care about TODAY'S cutoff for now.
        // If today's cutoff is passed, we don't show a countdown for tomorrow yet (simplification),
        // or we could finding the next valid slot.
        // User requirement: "Countdown timer". Usually for the imminent deadline.

        const todayTimeStr = config.weekly_schedule[startDay];

        let targetDate: Date | null = null;

        if (todayTimeStr) {
            const [h, m] = todayTimeStr.split(':').map(Number);
            const candidate = new Date(now);
            candidate.setHours(h, m, 0, 0);

            if (candidate.getTime() > now.getTime()) {
                targetDate = candidate;
            }
        }

        if (!targetDate) {
            // Check tomorrow? 
            // If today is done, maybe show tomorrow's cutoff?
            // For now, let's hide if no active countdown for TODAY to avoid confusion, 
            // unless user specifically wants "Next Cutoff". 
            // Given "Kitchen Admin" context, usually it's "Hurry up for today".
            // Let's stick to Today's cutoff. If null or passed, hide.
            setIsVisible(false);
            return;
        }

        const diff = targetDate.getTime() - now.getTime();

        // Show if within 6 hours (?) or always if valid? 
        // Let's show always if valid for today.
        setIsVisible(true);

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
        setIsClosingSoon(diff < 3600000); // Red if < 1 hour
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom duration-500">
            <div className={`px-5 py-3 rounded-xl shadow-lg border flex items-center gap-3 transition-colors ${isClosingSoon
                    ? 'bg-red-500 text-white border-red-600'
                    : 'bg-zinc-900 dark:bg-zinc-800 text-white border-zinc-700'
                }`}>
                <div className={`p-1.5 rounded-full ${isClosingSoon ? 'bg-white/20' : 'bg-white/10'}`}>
                    <Clock size={16} className={isClosingSoon ? "animate-pulse" : ""} />
                </div>
                <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-wider opacity-90">Cierre de Pedidos</h4>
                    <div className="text-xl font-mono font-bold leading-none tabular-nums mt-0.5">{timeLeft}</div>
                </div>
            </div>
        </div>
    );
};
