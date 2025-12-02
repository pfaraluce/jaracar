import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light' | 'system';

interface ThemeProviderProps {
    children: React.ReactNode;
    defaultTheme?: Theme;
    storageKey?: string;
}

interface ThemeProviderState {
    theme: Theme;
    setTheme: (theme: Theme) => void;
}

const initialState: ThemeProviderState = {
    theme: 'system',
    setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
    children,
    defaultTheme = 'system',
    storageKey = 'jaracar-theme',
}: ThemeProviderProps) {
    const [theme, setThemeState] = useState<Theme>(() => {
        return (localStorage.getItem(storageKey) as Theme) || defaultTheme;
    });

    useEffect(() => {
        const root = window.document.documentElement;
        console.log('[ThemeContext] useEffect triggered. Theme:', theme);
        console.log('[ThemeContext] Current root classes before:', root.className);

        root.classList.remove('light', 'dark');

        if (theme === 'system') {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
                .matches
                ? 'dark'
                : 'light';

            console.log('[ThemeContext] System theme detected:', systemTheme);
            root.classList.add(systemTheme);
            console.log('[ThemeContext] Added system theme. Classes now:', root.className);
            return;
        }

        console.log('[ThemeContext] Adding theme class:', theme);
        root.classList.add(theme);
        console.log('[ThemeContext] Classes after adding:', root.className);
    }, [theme]);

    // Listen for system theme changes when in system mode
    useEffect(() => {
        if (theme !== 'system') return;

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = () => {
            const root = window.document.documentElement;
            root.classList.remove('light', 'dark');
            const systemTheme = mediaQuery.matches ? 'dark' : 'light';
            root.classList.add(systemTheme);
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [theme]);

    const value = {
        theme,
        setTheme: (newTheme: Theme) => {
            console.log('[ThemeContext] setTheme called with:', newTheme);
            console.log('[ThemeContext] Current theme before change:', theme);
            localStorage.setItem(storageKey, newTheme);
            console.log('[ThemeContext] Saved to localStorage:', localStorage.getItem(storageKey));
            setThemeState(newTheme);
            console.log('[ThemeContext] State updated');
        },
    };

    return (
        <ThemeProviderContext.Provider value={value}>
            {children}
        </ThemeProviderContext.Provider>
    );
}

export const useTheme = () => {
    const context = useContext(ThemeProviderContext);

    if (context === undefined)
        throw new Error('useTheme must be used within a ThemeProvider');

    return context;
}
