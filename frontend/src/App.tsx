
import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import type { User } from './types';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import MainApp from './MainApp';

const App: React.FC = () => {
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
    const [user, setUser] = useState<User | null>(null);
    const [isAuthLoading, setIsAuthLoading] = useState(true);

    useEffect(() => {
        if (token) {
            try {
                const decodedUser: User = jwtDecode(token);
                setUser(decodedUser);
            } catch (error) {
                console.error("Invalid token:", error);
                handleLogout();
            }
        }
        setIsAuthLoading(false);
    }, [token]);

    const handleLogin = (newToken: string) => {
        localStorage.setItem('token', newToken);
        setToken(newToken);
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
    };

    if (isAuthLoading) {
        return <div className="flex justify-center items-center h-screen text-xl text-primary dark:text-text-light">Verificando sesión...</div>;
    }

    return (
        <Routes>
            {!token ? (
                <>
                    <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
                    <Route path="/register" element={<RegisterPage onRegister={handleLogin} />} />
                    <Route path="*" element={<Navigate to="/login" />} />
                </>
            ) : (
                <>
                    <Route path="/*" element={<MainApp user={user!} token={token} onLogout={handleLogout} />} />
                    <Route path="/login" element={<Navigate to="/" />} />
                    <Route path="/register" element={<Navigate to="/" />} />
                </>
            )}
        </Routes>
    );
};

export default App;
