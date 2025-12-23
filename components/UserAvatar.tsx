import React from 'react';

interface UserAvatarProps {
    name: string;
    imageUrl?: string;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
    border?: boolean;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({ name, imageUrl, size = 'md', className = '', border = false }) => {
    const [hasError, setHasError] = React.useState(false);

    // Reset error state if imageUrl changes
    React.useEffect(() => {
        setHasError(false);
    }, [imageUrl]);

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(part => part[0])
            .join('')
            .substring(0, 2)
            .toUpperCase();
    };

    const sizeClasses = {
        xs: 'w-5 h-5 text-[8px]',
        sm: 'w-6 h-6 text-xs',
        md: 'w-8 h-8 text-sm',
        lg: 'w-10 h-10 text-base',
        xl: 'w-24 h-24 text-3xl'
    };

    if (imageUrl && !hasError) {
        return (
            <img
                src={imageUrl}
                alt={name}
                onError={() => setHasError(true)}
                className={`${sizeClasses[size]} rounded-full object-cover border ${border ? 'border-white dark:border-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800' : 'border-zinc-200'} ${className}`}
            />
        );
    }

    return (
        <div
            className={`${sizeClasses[size]} rounded-full bg-zinc-100 border ${border ? 'border-white dark:border-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800' : 'border-zinc-200'} flex items-center justify-center font-medium text-zinc-600 ${className}`}
            title={name}
        >
            {getInitials(name)}
        </div>
    );
};
