import React from 'react';
import { LogOut, Clock } from 'lucide-react';
import { User } from '../types';

interface PendingApprovalProps {
    user: User;
    onLogout: () => void;
}

export const PendingApproval: React.FC<PendingApprovalProps> = ({ user, onLogout }) => {
    return (
        <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-6">
                    <Clock size={32} className="text-amber-600" />
                </div>

                <h1 className="text-2xl font-bold text-zinc-900 mb-2">Cuenta en Revisión</h1>
                <p className="text-zinc-600 mb-8 leading-relaxed">
                    Hola <strong>{user.name}</strong>, tu cuenta ha sido creada correctamente pero requiere aprobación de un administrador para acceder.
                    <br /><br />
                    Te notificaremos cuando tu cuenta esté activa.
                </p>

                <button
                    onClick={onLogout}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg transition-colors font-medium"
                >
                    <LogOut size={18} />
                    Cerrar Sesión
                </button>
            </div>
        </div>
    );
};
