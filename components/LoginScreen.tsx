import React, { useState, useEffect } from 'react';
import { TicketIcon, SpinnerIcon } from './IconComponents';
import type { FakeApi } from '../api';
import type { User } from '../types';

interface LoginScreenProps {
  api: FakeApi;
  onLoginSuccess: (user: User) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ api, onLoginSuccess }) => {
  const [stage, setStage] = useState<'splash' | 'form' | 'loading' | 'exiting'>('splash');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);


  useEffect(() => {
    if (stage === 'splash') {
      const timer = setTimeout(() => setStage('form'), 2500); // Splash screen duration
      return () => clearTimeout(timer);
    }
  }, [stage]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStage('loading');
    try {
        const user = await api.login(username, password);
        // Wait for a bit to show 'Authenticating...'
        setTimeout(() => {
             setStage('exiting');
             // Wait for exit animation to finish before calling onLoginSuccess
             setTimeout(() => onLoginSuccess(user), 500);
        }, 1500);
    } catch (err: any) {
        console.error("Login failed", err);
        setError(err.message || 'Error al iniciar sesión.');
        setStage('form'); // Revert to form on error
    }
  };

  const isFormVisible = stage === 'form' || stage === 'loading';

  return (
    <div className={`fixed inset-0 bg-gray-900 flex flex-col items-center justify-center transition-opacity duration-500 ${stage === 'exiting' ? 'animate-fade-out-zoom' : ''}`}>
      <div className={`transition-all duration-700 ease-in-out ${isFormVisible ? '-translate-y-56 scale-75' : 'translate-y-0 scale-100'}`}>
        <div className="relative">
          <TicketIcon className="w-24 h-24 text-indigo-400" />
          {stage === 'splash' && (
            <div className="absolute inset-0 animate-pulse-glow rounded-full"></div>
          )}
        </div>
      </div>

      <div className={`text-center absolute transition-all duration-500 ease-out ${isFormVisible ? 'opacity-100' : 'opacity-0'}`}>
        <div className={isFormVisible ? 'animate-fade-in-up' : ''}>
            <h1 className="font-orbitron text-3xl sm:text-4xl font-bold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-indigo-400">
                Plataforma de Eventos
            </h1>
            <p className="mt-4 text-lg text-gray-300 max-w-2xl mx-auto">
                Tu acceso al siguiente nivel de eventos.
            </p>

            <form onSubmit={handleLogin} className="mt-12 w-80 mx-auto space-y-4">
                <div>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Usuario (ej. Alex Doe)"
                        className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                        required
                        autoComplete="username"
                    />
                </div>
                <div>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Contraseña (password)"
                        className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                        required
                        autoComplete="current-password"
                    />
                </div>

                {error && (
                    <p className="text-red-400 text-sm pt-2">{error}</p>
                )}

                <button
                    type="submit"
                    disabled={stage === 'loading' || !username || !password}
                    className="w-full flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 disabled:bg-indigo-500 disabled:cursor-not-allowed"
                >
                    {stage === 'loading' ? (
                        <>
                            <SpinnerIcon className="w-5 h-5" />
                            <span>Autenticando...</span>
                        </>
                    ) : (
                        <span>Entrar</span>
                    )}
                </button>
                <p className="text-xs text-gray-500 !mt-2">Usuarios: Alex Doe / Jane Smith. Contraseña: password</p>
            </form>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;