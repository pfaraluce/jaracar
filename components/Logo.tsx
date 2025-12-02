import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface LogoProps {
    className?: string;
    size?: 'sm' | 'md' | 'lg';
}

export const Logo: React.FC<LogoProps> = ({ className = '', size = 'md' }) => {
    const { theme } = useTheme();

    // Determine which logo to use based on theme
    const logoSrc = theme === 'dark'
        ? '/logo-jaracar-white.svg'
        : '/logo-jaracar-black.svg';

    // Size mappings
    const sizeClasses = {
        sm: 'h-6',
        md: 'h-8',
        lg: 'h-10'
    };

    return (
        <img
            src={logoSrc}
            alt="JaraCar"
            className={`${sizeClasses[size]} w-auto ${className}`}
        />
    );
};
