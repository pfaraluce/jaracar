import React, { useState } from 'react';
import { ViewState, User } from '../types';
import { authService } from '../services/auth';
import { Button } from './ui/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { Car, Mail, Lock, User as UserIcon, ArrowRight, Loader2 } from 'lucide-react';
import { ForgotPassword } from './ForgotPassword';

interface AuthProps {
  setViewState: (view: ViewState) => void;
  setUser: (user: User) => void;
  currentView: ViewState;
}

export const AuthLayout: React.FC<AuthProps> = ({ setViewState, setUser, currentView }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCheckEmail, setShowCheckEmail] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (currentView === 'LOGIN') {
        const user = await authService.login(email, password);
        setUser(user);
        setViewState('DASHBOARD');
      } else if (currentView === 'SIGNUP') {
        const user = await authService.signup(email, name, password);
        // Check if we have a session (if not, email confirmation is likely required)
        const session = await authService.getSession();

        if (!session) {
          setShowCheckEmail(true);
        } else {
          setUser(user);
          setViewState('DASHBOARD');
        }
      } else if (currentView === 'FORGOT_PASSWORD') {
        await authService.resetPassword(email);
        setSuccess('Si este correo existe, se ha enviado un enlace de recuperación.');
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Ha ocurrido un error inesperado");
      }
    } finally {
      setLoading(false);
    }
  };

  const isLogin = currentView === 'LOGIN';
  const isSignup = currentView === 'SIGNUP';
  const isForgot = currentView === 'FORGOT_PASSWORD';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 p-4">
      <div className="w-full max-w-sm bg-white p-8 rounded-xl border border-zinc-200 shadow-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 mb-2">JaraCar</h1>
          <p className="text-sm text-zinc-500">
            {isLogin ? 'Inicia sesión en tu cuenta' : isSignup ? 'Crea una nueva cuenta' : 'Restablece tu contraseña'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignup && (
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Nombre Completo</label>
              <input
                type="text"
                required
                className="w-full h-9 px-3 rounded-md border border-zinc-200 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">Correo electrónico</label>
            <input
              type="email"
              required
              className="w-full h-9 px-3 rounded-md border border-zinc-200 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {isLogin && (
              <div className="text-right mt-2">
              </div>
            )}
          </div>

          {!isForgot && (
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Contraseña</label>
              <input
                type="password"
                required
                className="w-full h-9 px-3 rounded-md border border-zinc-200 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          )}

          {error && <p className="text-xs text-rose-500">{error}</p>}
          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
              <p className="text-xs text-emerald-700 text-center">{success}</p>
            </div>
          )}

          <Button type="submit" className="w-full" isLoading={loading}>
            {isLogin ? 'Entrar' : isSignup ? 'Registrarse' : 'Enviar enlace'}
          </Button>
        </form>

        <div className="mt-6 text-center space-y-2">
          {isLogin && (
            <>
              <p className="text-xs text-zinc-500 hover:text-zinc-800 cursor-pointer" onClick={() => setViewState('FORGOT_PASSWORD')}>
                ¿Olvidaste tu contraseña?
              </p>
              <p className="text-xs text-zinc-500">
                ¿No tienes cuenta? <span className="text-zinc-900 font-medium cursor-pointer" onClick={() => setViewState('SIGNUP')}>Regístrate</span>
              </p>
            </>
          )}
          {isSignup && (
            <p className="text-xs text-zinc-500">
              ¿Ya tienes cuenta? <span className="text-zinc-900 font-medium cursor-pointer" onClick={() => setViewState('LOGIN')}>Inicia sesión</span>
            </p>
          )}
          {isForgot && (
            <p className="text-xs text-zinc-500 cursor-pointer hover:text-zinc-800" onClick={() => setViewState('LOGIN')}>
              Volver al inicio de sesión
            </p>
          )}
        </div>
      </div>
    </div>
  );
};