import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface LogoProps {
    className?: string;
    size?: 'sm' | 'md' | 'lg';
}

export const Logo: React.FC<LogoProps> = ({ className = '', size = 'md' }) => {
    const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>('light');

    // Try to use ThemeContext if available, otherwise use system theme
    let contextTheme: 'light' | 'dark' | 'system' | null = null;
    try {
        const { theme } = useTheme();
        contextTheme = theme;
    } catch {
        // Not inside ThemeProvider, will use system theme
    }

    // Detect system theme
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        setSystemTheme(mediaQuery.matches ? 'dark' : 'light');

        const handler = (e: MediaQueryListEvent) => {
            setSystemTheme(e.matches ? 'dark' : 'light');
        };

        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, []);

    // Determine which logo to use
    const isDark = contextTheme
        ? (contextTheme === 'dark' || (contextTheme === 'system' && systemTheme === 'dark'))
        : systemTheme === 'dark';

    const logoSrc = isDark
        ? '/logo-quang-white.svg'
        : '/logo-quango-black.svg';

    // Size mappings
    const sizeClasses = {
        sm: 'h-6',
        md: 'h-8',
        lg: 'h-10'
    };

    return (
        <img
            src={logoSrc}
            alt="Quango"
            className={`${sizeClasses[size]} w-auto ${className}`}
        />
    );
};
