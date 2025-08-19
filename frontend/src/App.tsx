import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import type { User } from './types';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import MainApp from './MainApp';
import { Logo } from './components/Icons';

const App: React.FC = () => {
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
    const [user, setUser] = useState<User | null>(null);
    const [isAuthLoading, setIsAuthLoading] = useState(true);
    const location = useLocation();

    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        if (storedToken) {
            try {
                const decodedUser: User = jwtDecode(storedToken);
                // Check if token is expired
                const isExpired = decodedUser.exp ? decodedUser.exp * 1000 < Date.now() : false;
                if(isExpired) {
                    handleLogout();
                } else {
                    setToken(storedToken);
                    setUser(decodedUser);
                }
            } catch (error) {
                console.error("Invalid token:", error);
                handleLogout(); // Clear invalid token
            }
        }
        setIsAuthLoading(false);
    }, [location.key]); // Rerun on navigation to re-check token

    const handleLogin = (newToken: string) => {
        localStorage.setItem('token', newToken);
        setToken(newToken);
        const decodedUser: User = jwtDecode(newToken);
        setUser(decodedUser);
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
    };

    if (isAuthLoading) {
        return (
             <div className="flex flex-col justify-center items-center h-screen bg-bg-main dark:bg-bg-dark">
                <Logo className="w-48 mx-auto mb-4" />
                <p className="text-xl text-primary dark:text-text-light animate-pulse">Verificando sesión...</p>
            </div>
        );
    }
    
    return (
        <Routes>
            {/* --- Rutas Públicas Adicionales --- */}
            
            {token && user ? (
                // --- Rutas Privadas ---
                // Si hay un token válido, se renderiza la aplicación principal.
                // Todas las rutas internas (paciente/admin) se manejan dentro de MainApp.
                <Route path="/*" element={<MainApp user={user} token={token} onLogout={handleLogout} />} />
            ) : (
                // --- Rutas Públicas (Autenticación) ---
                // Si no hay token, solo se puede acceder a login o register.
                <>
                    <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
                    <Route path="/register" element={<RegisterPage onRegister={handleLogin} />} />
                    {/* Cualquier otra ruta redirige al login si no hay token */}
                    <Route path="*" element={<Navigate to="/login" replace />} />
                </>
            )}
        </Routes>
    );
};

export default App;