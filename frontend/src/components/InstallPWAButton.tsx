import React from 'react';
import { DownloadCloudIcon, XIcon } from './Icons';

interface InstallPWAButtonProps {
    onInstall: () => void;
    onDismiss: () => void;
}

export const InstallPWAButton: React.FC<InstallPWAButtonProps> = ({ onInstall, onDismiss }) => {
    return (
        <div 
            className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[95%] max-w-lg bg-gradient-to-r from-primary to-primary-light text-white p-4 rounded-lg shadow-2xl flex items-center justify-between gap-4 z-50 animate-slide-up"
            role="dialog"
            aria-labelledby="pwa-install-banner-title"
            aria-describedby="pwa-install-banner-description"
        >
            <div className="flex items-center gap-4">
                <DownloadCloudIcon className="w-8 h-8 flex-shrink-0" />
                <div>
                    <h3 id="pwa-install-banner-title" className="font-bold">Instalar la Aplicación</h3>
                    <p id="pwa-install-banner-description" className="text-sm text-white/80">Acceso más rápido y fácil a su portal.</p>
                </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
                 <button 
                    onClick={onInstall}
                    className="bg-accent-warm text-primary font-bold py-2 px-4 rounded-md hover:opacity-90 transition-opacity text-sm"
                >
                    Instalar
                </button>
                <button 
                    onClick={onDismiss}
                    className="p-2 rounded-full hover:bg-white/20 transition-colors"
                    aria-label="Descartar"
                >
                    <XIcon className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}


const styleId = 'install-pwa-animation-styles';
if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `
    @keyframes slide-up {
        from {
            opacity: 0;
            transform: translate(-50%, 20px);
        }
        to {
            opacity: 1;
            transform: translate(-50%, 0);
        }
    }
    .animate-slide-up {
        animation: slide-up 0.5s ease-out forwards;
    }
    `;
    document.head.appendChild(style);
}