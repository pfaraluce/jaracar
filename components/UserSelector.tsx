import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { UserAvatar } from './UserAvatar';
import { Search, X, ChevronDown, Check } from 'lucide-react';

interface UserSelectorProps {
    users: User[];
    value: string;
    onChange: (userId: string) => void;
    label: string;
    placeholder?: string;
    disabled?: boolean;
    compact?: boolean;
}

export const UserSelector: React.FC<UserSelectorProps> = ({
    users,
    value,
    onChange,
    label,
    placeholder = "Buscar usuario...",
    disabled = false,
    compact = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const selectedUser = users.find(u => u.id === value);

    // Filter users based on search
    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            if (inputRef.current) {
                inputRef.current.focus();
            }
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleSelect = (userId: string) => {
        onChange(userId);
        setIsOpen(false);
        setSearchTerm('');
    };

    return (
        <div className={compact ? "space-y-1 w-full" : "space-y-1.5"} ref={wrapperRef}>
            {!compact && (
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {label}
                </label>
            )}
            {compact && (
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">
                    {label}
                </label>
            )}

            <div className="relative">
                {isOpen ? (
                    <div className="absolute inset-0 z-10">
                        <div className={`flex items-center w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-sm ring-2 ring-zinc-900/10 dark:ring-white/10 ${compact ? 'h-9' : 'h-10'}`}>
                            <Search size={16} className="text-zinc-400 mr-2" />
                            <input
                                ref={inputRef}
                                type="text"
                                className="flex-1 bg-transparent border-none p-0 text-sm focus:ring-0 text-zinc-900 dark:text-white placeholder-zinc-400"
                                placeholder={placeholder}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="absolute top-full left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg z-20 animate-in fade-in zoom-in-95 duration-100">
                            {filteredUsers.length === 0 ? (
                                <div className="p-3 text-sm text-zinc-500 text-center">
                                    No se encontraron usuarios
                                </div>
                            ) : (
                                <div className="p-1">
                                    {filteredUsers.map(user => (
                                        <button
                                            key={user.id}
                                            onClick={() => handleSelect(user.id)}
                                            className={`w-full flex items-center gap-3 px-2 py-2 text-sm rounded-md transition-colors ${user.id === value
                                                    ? 'bg-zinc-100 dark:bg-zinc-700/50 text-zinc-900 dark:text-white'
                                                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700'
                                                }`}
                                        >
                                            <UserAvatar name={user.name} imageUrl={user.avatarUrl} size="sm" />
                                            <div className="flex flex-col items-start flex-1 min-w-0">
                                                <span className="font-medium truncate w-full text-left">{user.name}</span>
                                                <span className="text-xs text-zinc-500 truncate w-full text-left">{user.email}</span>
                                            </div>
                                            {user.id === value && (
                                                <Check size={16} className="text-emerald-500" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => !disabled && setIsOpen(true)}
                        disabled={disabled}
                        className={`flex items-center justify-between w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg transition-all text-left ${compact ? 'h-9 px-2' : 'h-10'} ${disabled
                                ? 'opacity-60 cursor-not-allowed bg-zinc-50 dark:bg-zinc-800/50'
                                : 'hover:border-zinc-300 dark:hover:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10'
                            }`}
                    >
                        <div className="flex items-center gap-2 min-w-0">
                            {selectedUser ? (
                                <>
                                    <UserAvatar name={selectedUser.name} imageUrl={selectedUser.avatarUrl} size={compact ? "xs" : "sm"} />
                                    <span className={`${compact ? 'text-xs' : 'text-sm'} text-zinc-900 dark:text-white truncate font-medium`}>
                                        {selectedUser.name}
                                    </span>
                                </>
                            ) : (
                                <span className={`${compact ? 'text-xs' : 'text-sm'} text-zinc-400`}>{compact ? 'Asignar...' : 'Seleccionar usuario...'}</span>
                            )}
                        </div>
                        <ChevronDown size={16} className="text-zinc-400 shrink-0" />
                    </button>
                )}
            </div>
        </div>
    );
};
