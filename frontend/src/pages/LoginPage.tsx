import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '../components/Icons';

interface LoginPageProps {
  onLogin: (token: string) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to login');
      }
      onLogin(data.token);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-alt dark:bg-bg-dark flex flex-col justify-center items-center p-4">
        <div className="max-w-md w-full bg-bg-main dark:bg-surface-dark rounded-xl shadow-2xl p-8 space-y-6">
            <div className="text-center">
                <Logo className="w-48 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-main dark:text-text-main">Iniciar Sesión</h2>
                <p className="text-muted dark:text-text-muted">Accede a tu portal de paciente o al panel de administración.</p>
            </div>

            {error && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md text-sm" role="alert">{error}</div>}
            
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-main dark:text-text-main">Correo Electrónico</label>
                    <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 bg-bg-main dark:bg-bg-main border border-border-main dark:border-border-dark rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-light focus:border-primary-light dark:text-text-main"
                        placeholder="tu@email.com"
                    />
                </div>
                <div>
                    <label htmlFor="password" className="block text-sm font-medium text-main dark:text-text-main">Contraseña</label>
                    <input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 bg-bg-main dark:bg-bg-main border border-border-main dark:border-border-dark rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-light focus:border-primary-light dark:text-text-main"
                        placeholder="••••••••"
                    />
                </div>
                <div>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-light disabled:opacity-50"
                    >
                        {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                    </button>
                </div>
            </form>
            
            <p className="text-center text-sm text-muted dark:text-text-muted">
                ¿No tienes una cuenta?{' '}
                <Link to="/register" className="font-medium text-primary-light hover:text-primary dark:text-accent-turquoise dark:hover:text-accent-warm">
                    Regístrate aquí
                </Link>
            </p>
        </div>
    </div>
  );
};

export default LoginPage;
