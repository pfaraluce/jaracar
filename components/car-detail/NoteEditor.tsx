import React, { useState, useEffect, useRef } from 'react';
import { Save, X, Trash2 } from 'lucide-react';

interface NoteEditorProps {
    initialNote: string;
    onSave: (note: string) => Promise<void>;
    canEdit: boolean;
    placeholder?: string;
    className?: string;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({
    initialNote,
    onSave,
    canEdit,
    placeholder = 'Añadir nota...',
    className = '',
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [noteContent, setNoteContent] = useState(initialNote);
    const [isSaving, setIsSaving] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setNoteContent(initialNote);
    }, [initialNote]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isEditing]);

    const handleSave = async () => {
        if (noteContent.trim() === initialNote.trim()) {
            setIsEditing(false);
            return;
        }

        setIsSaving(true);
        try {
            await onSave(noteContent);
            setIsEditing(false);
        } catch (error) {
            console.error('Error saving note:', error);
            // Optionally handle error state here or let parent handle it via toast
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!initialNote) return; // Nothing to delete

        setIsSaving(true);
        try {
            await onSave(''); // Saving empty string effectively deletes it
            setNoteContent('');
            setIsEditing(false);
        } catch (error) {
            console.error('Error deleting note:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSave();
        } else if (e.key === 'Escape') {
            setNoteContent(initialNote);
            setIsEditing(false);
        }
    };

    if (isEditing) {
        return (
            <div className={`flex gap-2 items-center ${className}`}>
                <input
                    ref={inputRef}
                    type="text"
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isSaving}
                    className="flex-1 text-xs border border-zinc-200 dark:border-zinc-700 rounded px-2 py-1 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-500"
                    placeholder={placeholder}
                />
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="text-emerald-600 dark:text-emerald-400 p-1 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded disabled:opacity-50"
                    title="Guardar"
                >
                    <Save size={14} />
                </button>
                {initialNote && (
                    <button
                        onClick={handleDelete}
                        disabled={isSaving}
                        className="text-red-600 dark:text-red-400 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded disabled:opacity-50"
                        title="Eliminar nota"
                    >
                        <Trash2 size={14} />
                    </button>
                )}
                <button
                    onClick={() => {
                        setNoteContent(initialNote);
                        setIsEditing(false);
                    }}
                    disabled={isSaving}
                    className="text-zinc-400 dark:text-zinc-500 p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded disabled:opacity-50"
                    title="Cancelar"
                >
                    <X size={14} />
                </button>
            </div>
        );
    }

    return (
        <div
            onClick={() => {
                if (canEdit) setIsEditing(true);
            }}
            className={`group flex items-center gap-2 min-h-[20px] ${canEdit ? 'cursor-pointer' : ''} ${className}`}
            title={canEdit ? 'Haz clic para editar' : ''}
        >
            <p
                className={`text-xs ${canEdit
                        ? 'group-hover:text-zinc-900 dark:group-hover:text-zinc-200 transition-colors'
                        : ''
                    } ${initialNote
                        ? 'text-zinc-600 dark:text-zinc-400 italic'
                        : 'text-zinc-400 dark:text-zinc-600'
                    }`}
            >
                {initialNote || placeholder}
            </p>
        </div>
    );
};
