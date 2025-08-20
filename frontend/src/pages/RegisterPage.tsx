import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '../components/Icons.tsx';

interface RegisterPageProps {
  onRegister: (token: string) => void;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const RegisterPage: React.FC<RegisterPageProps> = ({ onRegister }) => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to register');
      }
      
      onRegister(data.token);
      navigate('/', { replace: true }); // Redirige al panel principal

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
                <h2 className="text-2xl font-bold text-main dark:text-main">Crear Cuenta de Paciente</h2>
                <p className="text-muted dark:text-muted">Regístrese para gestionar sus citas y comunicarse con nosotros.</p>
            </div>

            {error && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md text-sm" role="alert">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-main dark:text-main">Nombre Completo</label>
                    <input
                        id="name"
                        name="name"
                        type="text"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        className="mt-1 block w-full px-3 py-2 bg-bg-main dark:bg-bg-main border border-border-main dark:border-border-dark rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-light focus:border-primary-light dark:text-main"
                        placeholder="Nombre y Apellido"
                    />
                </div>
                 <div>
                    <label htmlFor="email" className="block text-sm font-medium text-main dark:text-main">Correo Electrónico</label>
                    <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        className="mt-1 block w-full px-3 py-2 bg-bg-main dark:bg-bg-main border border-border-main dark:border-border-dark rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-light focus:border-primary-light dark:text-main"
                        placeholder="tu@email.com"
                    />
                </div>
                 <div>
                    <label htmlFor="password" className="block text-sm font-medium text-main dark:text-main">Contraseña</label>
                    <input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="new-password"
                        required
                        value={formData.password}
                        onChange={handleChange}
                        className="mt-1 block w-full px-3 py-2 bg-bg-main dark:bg-bg-main border border-border-main dark:border-border-dark rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-light focus:border-primary-light dark:text-main"
                        placeholder="Mínimo 8 caracteres"
                    />
                </div>
                <div>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-light disabled:opacity-50"
                    >
                        {isLoading ? 'Registrando...' : 'Crear Cuenta'}
                    </button>
                </div>
            </form>
            
            <p className="text-center text-sm text-muted dark:text-muted">
                ¿Ya tienes una cuenta?{' '}
                <Link to="/login" className="font-medium text-primary-light hover:text-primary dark:text-primary dark:hover:text-primary-light">
                    Inicia sesión
                </Link>
            </p>
        </div>
    </div>
  );
};

export default RegisterPage;