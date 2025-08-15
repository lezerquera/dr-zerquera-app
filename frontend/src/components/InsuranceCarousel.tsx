
import React from 'react';
import type { Insurance } from '../types';
import { ShieldIcon } from './Icons';

interface InsuranceCarouselProps {
    insurances: Insurance[];
}

export const InsuranceCarousel: React.FC<InsuranceCarouselProps> = ({ insurances }) => {
    if (!insurances || insurances.length === 0) {
        return null;
    }
    
    // Duplicate the array to create a seamless loop, only if there are enough items to scroll
    const extendedInsurances = insurances.length > 4 ? [...insurances, ...insurances] : insurances;

    return (
        <div className="py-8 bg-bg-alt dark:bg-bg-alt/50">
            <h2 className="text-2xl font-bold text-center text-main dark:text-text-main mb-8">Seguros que Aceptamos</h2>
            <div className="w-full inline-flex flex-nowrap overflow-hidden [mask-image:_linear-gradient(to_right,transparent_0,_black_128px,_black_calc(100%-128px),transparent_100%)]">
                <ul className="flex items-stretch justify-center md:justify-start animate-infinite-scroll hover:[animation-play-state:paused]">
                    {extendedInsurances.map((insurance, index) => (
                        <li
                            key={`${insurance.id}-${index}`}
                            className="flex flex-col items-center justify-between text-center w-44 h-32 bg-bg-main dark:bg-bg-main rounded-xl shadow-lg p-3 mx-4 transition-transform duration-300 hover:scale-105 border-b-4"
                            style={{ borderColor: insurance.brandColor }}
                        >
                            <ShieldIcon className="w-10 h-10 text-muted dark:text-text-muted opacity-75" />
                            <p className="text-sm font-bold text-main dark:text-text-main text-center leading-tight">{insurance.name}</p>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

const styleId = 'carousel-animation-styles';
if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `
    @keyframes infinite-scroll {
      from { transform: translateX(0); }
      to { transform: translateX(-50%); }
    }

    .animate-infinite-scroll {
      animation: infinite-scroll 40s linear infinite;
    }
    `;
    document.head.appendChild(style);
}
