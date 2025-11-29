import React from 'react';

interface UserAvatarProps {
    name: string;
    imageUrl?: string;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({ name, imageUrl, size = 'md', className = '' }) => {
    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(part => part[0])
            .join('')
            .substring(0, 2)
            .toUpperCase();
    };

    const sizeClasses = {
        sm: 'w-6 h-6 text-xs',
        md: 'w-8 h-8 text-sm',
        lg: 'w-10 h-10 text-base'
    };

    if (imageUrl) {
        return (
            <img
                src={imageUrl}
                alt={name}
                className={`${sizeClasses[size]} rounded-full object-cover border border-zinc-200 ${className}`}
            />
        );
    }

    return (
        <div
            className={`${sizeClasses[size]} rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center font-medium text-zinc-600 ${className}`}
            title={name}
        >
            {getInitials(name)}
        </div>
    );
};
