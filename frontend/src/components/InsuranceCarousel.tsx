import React, { useRef } from 'react';
import type { Insurance } from '../types';
import { ShieldIcon, ChevronLeftIcon, ChevronRightIcon } from './Icons';

interface InsuranceCarouselProps {
    insurances: Insurance[];
}

export const InsuranceCarousel: React.FC<InsuranceCarouselProps> = ({ insurances }) => {
    const scrollRef = useRef<HTMLUListElement>(null);

    if (!insurances || insurances.length === 0) {
        return null;
    }

    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const scrollAmount = direction === 'left' ? -300 : 300;
            scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    };

    return (
        <div className="py-8 bg-bg-alt dark:bg-bg-alt/50">
            <h2 className="text-2xl font-bold text-center text-main dark:text-text-main mb-8">Seguros que Aceptamos</h2>
            <div className="relative w-full max-w-6xl mx-auto px-12">
                <div className="overflow-hidden">
                    <ul ref={scrollRef} className="flex items-stretch gap-8 overflow-x-auto pb-4 scroll-smooth snap-x snap-mandatory no-scrollbar">
                        {insurances.map((insurance) => (
                            <li
                                key={insurance.id}
                                className="flex flex-col items-center justify-between text-center w-44 h-32 bg-bg-main dark:bg-bg-main rounded-xl shadow-lg p-3 transition-transform duration-300 hover:scale-105 border-b-4 flex-shrink-0 snap-center"
                                style={{ borderColor: insurance.brandColor }}
                            >
                                <ShieldIcon className="w-10 h-10 text-muted dark:text-text-muted opacity-75" />
                                <p className="text-sm font-bold text-main dark:text-text-main text-center leading-tight">{insurance.name}</p>
                            </li>
                        ))}
                    </ul>
                </div>
                {/* Navigation Buttons */}
                <button
                    onClick={() => scroll('left')}
                    className="absolute top-1/2 left-0 -translate-y-1/2 bg-white/70 dark:bg-black/50 p-2 rounded-full shadow-md hover:bg-white dark:hover:bg-black/70 transition-colors z-10"
                    aria-label="Anterior"
                >
                    <ChevronLeftIcon className="w-6 h-6 text-main dark:text-text-light" />
                </button>
                 <button
                    onClick={() => scroll('right')}
                    className="absolute top-1/2 right-0 -translate-y-1/2 bg-white/70 dark:bg-black/50 p-2 rounded-full shadow-md hover:bg-white dark:hover:bg-black/70 transition-colors z-10"
                    aria-label="Siguiente"
                >
                    <ChevronRightIcon className="w-6 h-6 text-main dark:text-text-light" />
                </button>
            </div>
        </div>
    );
};

// Add a helper class to hide scrollbars
const styleId = 'carousel-styles';
if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `
    .no-scrollbar::-webkit-scrollbar {
        display: none;
    }
    .no-scrollbar {
        -ms-overflow-style: none;
        scrollbar-width: none;
    }
    `;
    document.head.appendChild(style);
}