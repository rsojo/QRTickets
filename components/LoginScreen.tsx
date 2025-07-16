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

  useEffect(() => {
    if (stage === 'splash') {
      const timer = setTimeout(() => setStage('form'), 2500); // Splash screen duration
      return () => clearTimeout(timer);
    }
  }, [stage]);

  const handleLogin = async () => {
    setStage('loading');
    try {
        const user = await api.login(); // Simulate login with default user
        // Wait for a bit to show 'Authenticating...'
        setTimeout(() => {
             setStage('exiting');
             // Wait for exit animation to finish before calling onLoginSuccess
             setTimeout(() => onLoginSuccess(user), 500);
        }, 1500);
    } catch (error) {
        console.error("Login failed", error);
        setStage('form'); // Revert to form on error
    }
  };

  const isFormVisible = stage === 'form' || stage === 'loading';

  return (
    <div className={`fixed inset-0 bg-gray-900 flex flex-col items-center justify-center transition-opacity duration-500 ${stage === 'exiting' ? 'animate-fade-out-zoom' : ''}`}>
      <div className={`transition-all duration-700 ease-in-out ${isFormVisible ? '-translate-y-40 scale-75' : 'translate-y-0 scale-100'}`}>
        <div className="relative">
          <TicketIcon className="w-24 h-24 text-indigo-400" />
          {stage === 'splash' && (
            <div className="absolute inset-0 animate-pulse-glow rounded-full"></div>
          )}
        </div>
      </div>

      <div className={`text-center absolute transition-all duration-500 ease-out ${isFormVisible ? 'opacity-100' : 'opacity-0'}`}>
        <div className={isFormVisible ? 'animate-fade-in-up' : ''}>
            <h1 className="font-orbitron text-4xl sm:text-5xl font-bold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-indigo-400">
                Plataforma de Eventos
            </h1>
            <p className="mt-4 text-lg text-gray-300 max-w-2xl mx-auto">
                Tu acceso al siguiente nivel de eventos.
            </p>

            <div className="mt-12 w-64 mx-auto">
                <button
                onClick={handleLogin}
                disabled={stage === 'loading'}
                className="w-full flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 disabled:bg-indigo-500"
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
            </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;