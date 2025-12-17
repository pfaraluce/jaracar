import React, { useState } from 'react';
import { ViewState, User } from '../types';
import { authService } from '../services/auth';
import { Button } from './ui/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { Car, Mail, Lock, User as UserIcon, ArrowRight, Loader2 } from 'lucide-react';
import { ForgotPassword } from './ForgotPassword';
import { ResetPassword } from './ResetPassword';
import { InviteSignup } from './InviteSignup';
import { Logo } from './Logo';

interface AuthProps {
  setViewState: (view: ViewState) => void;
  setUser: (user: User) => void;
  currentView: ViewState;
  inviteEmail?: string; // Email del usuario invitado
}

export const AuthLayout: React.FC<AuthProps> = ({ setViewState, setUser, currentView, inviteEmail }) => {
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
  const isReset = currentView === 'RESET_PASSWORD';
  const isInvite = currentView === 'INVITE_SIGNUP';

  // Si estamos en el flujo de reset password, mostrar ese componente
  if (isReset) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-black p-4 transition-colors duration-300">
        <div className="w-full max-w-sm bg-white dark:bg-zinc-900 p-8 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm transition-colors duration-300">
          <div className="mb-8 text-center">
            <div className="flex justify-center mb-2">
              <Logo size="lg" />
            </div>
          </div>
          <ResetPassword onSuccess={() => setViewState('DASHBOARD')} />
        </div>
      </div>
    );
  }

  // Si estamos en el flujo de invitación, mostrar el componente de invite signup
  if (isInvite && inviteEmail) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-black p-4 transition-colors duration-300">
        <div className="w-full max-w-sm bg-white dark:bg-zinc-900 p-8 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm transition-colors duration-300">
          <div className="mb-8 text-center">
            <div className="flex justify-center mb-2">
              <Logo size="lg" />
            </div>
          </div>
          <InviteSignup inviteEmail={inviteEmail} onSuccess={() => setViewState('DASHBOARD')} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-black p-4 transition-colors duration-300">
      <div className="w-full max-w-sm bg-white dark:bg-zinc-900 p-8 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm transition-colors duration-300">
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-4">
            <Logo size="lg" />
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {isLogin ? 'Inicia sesión en tu cuenta' : isSignup ? 'Crea una nueva cuenta' : 'Restablece tu contraseña'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignup && (
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Nombre Completo</label>
              <input
                type="text"
                required
                className="w-full h-9 px-3 rounded-md border border-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Correo electrónico</label>
            <input
              type="email"
              required
              className="w-full h-9 px-3 rounded-md border border-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
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
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Contraseña</label>
              <input
                type="password"
                required
                className="w-full h-9 px-3 rounded-md border border-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          )}

          {error && <p className="text-xs text-rose-500">{error}</p>}
          {success && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-lg">
              <p className="text-xs text-emerald-700 dark:text-emerald-400 text-center">{success}</p>
            </div>
          )}

          <Button type="submit" className="w-full" isLoading={loading}>
            {isLogin ? 'Entrar' : isSignup ? 'Registrarse' : 'Enviar enlace'}
          </Button>

          {(isLogin || isSignup) && (
            <>
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-200 dark:border-zinc-700"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white dark:bg-zinc-900 px-2 text-zinc-500 dark:text-zinc-400">O continúa con</span>
                </div>
              </div>

              <button
                type="button"
                onClick={async () => {
                  try {
                    await authService.loginWithGoogle();
                  } catch (err) {
                    if (err instanceof Error) {
                      setError(err.message);
                    } else {
                      setError("Error al iniciar sesión con Google");
                    }
                  }
                }}
                className="w-full flex items-center justify-center gap-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 h-9 px-3 rounded-md text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Google
              </button>
            </>
          )}
        </form>

        <div className="mt-6 text-center space-y-2">
          {isLogin && (
            <>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer" onClick={() => setViewState('FORGOT_PASSWORD')}>
                ¿Olvidaste tu contraseña?
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                ¿No tienes cuenta? <span className="text-zinc-900 dark:text-white font-medium cursor-pointer" onClick={() => setViewState('SIGNUP')}>Regístrate</span>
              </p>
            </>
          )}
          {isSignup && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              ¿Ya tienes cuenta? <span className="text-zinc-900 dark:text-white font-medium cursor-pointer" onClick={() => setViewState('LOGIN')}>Inicia sesión</span>
            </p>
          )}
          {isForgot && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 cursor-pointer hover:text-zinc-800 dark:hover:text-zinc-200" onClick={() => setViewState('LOGIN')}>
              Volver al inicio de sesión
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
