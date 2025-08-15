
import React, { ReactNode } from 'react';

interface PageWrapperProps {
    title: string;
    children: ReactNode;
}

export const PageWrapper = ({ title, children }: PageWrapperProps) => {
    return (
        <div className="p-4 sm:p-6 lg:p-8 animate-fade-in">
            <h1 className="text-2xl sm:text-3xl font-bold text-main dark:text-text-light mb-6 border-b border-border-main dark:border-border-dark pb-4">{title}</h1>
            {children}
        </div>
    );
};


const styleId = 'pagewrapper-animation-styles';
if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `
    @keyframes fade-in {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    .animate-fade-in {
        animation: fade-in 0.5s ease-in-out forwards;
    }
    `;
    document.head.appendChild(style);
}