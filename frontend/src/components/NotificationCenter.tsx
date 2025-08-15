
import React, { useState, useEffect, useRef } from 'react';
import { Notification, NotificationType } from '../types';
import { BellIcon, CheckCircleIcon, MessageSquareIcon, CalendarIcon } from './Icons';

interface NotificationCenterProps {
  notifications: Notification[];
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
  userId: string;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ notifications, setNotifications, userId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const userNotifications = notifications.filter(n => n.userId === userId);

  const unreadCount = userNotifications.filter(n => n.status === 'unread').length;

  const sortedNotifications = [...userNotifications].sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === 'unread' ? -1 : 1;
    }
    if (a.priority !== b.priority) {
        const priorityOrder = { 'high': 1, 'medium': 2, 'low': 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  const markAsRead = (id: number) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, status: 'read' } : n))
    );
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getIconForType = (type: NotificationType) => {
    switch(type) {
        case 'new_appointment_request': return <CalendarIcon className="w-5 h-5 text-accent-red" />;
        case 'appointment_confirmed': return <CheckCircleIcon className="w-5 h-5 text-accent-turquoise" />;
        case 'new_chat_message': return <MessageSquareIcon className="w-5 h-5 text-primary-light" />;
        default: return <BellIcon className="w-5 h-5 text-muted" />;
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative text-white/80 hover:text-white p-2 rounded-full hover:bg-white/20 transition-colors"
        aria-label="Notificaciones"
      >
        <BellIcon className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 block h-4 w-4 transform -translate-y-1/2 translate-x-1/2 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-bg-main dark:bg-surface-dark rounded-lg shadow-xl border border-border-main dark:border-border-dark z-50 animate-fade-in-down">
          <div className="p-3 border-b border-border-main dark:border-border-dark">
            <h3 className="font-semibold text-main dark:text-text-main">Notificaciones</h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {sortedNotifications.length > 0 ? (
              <ul>
                {sortedNotifications.map(n => (
                  <li
                    key={n.id}
                    className={`border-b border-border-main/50 dark:border-border-dark/50 last:border-b-0 p-3 hover:bg-bg-alt dark:hover:bg-bg-alt/50 transition-colors ${n.status === 'unread' ? 'bg-accent-warm/30 dark:bg-primary-light/20' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1 flex-shrink-0">{getIconForType(n.type)}</div>
                      <div className="flex-grow">
                        <p className="text-sm text-main dark:text-text-main">{n.message}</p>
                        <span className="text-xs text-muted dark:text-text-muted">{n.createdAt.toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'})}</span>
                      </div>
                      {n.status === 'unread' && (
                        <button onClick={() => markAsRead(n.id)} title="Marcar como leída" className="p-1 rounded-full hover:bg-border-main dark:hover:bg-border-dark">
                           <CheckCircleIcon className="w-4 h-4 text-muted"/>
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="p-4 text-center text-sm text-muted">No hay notificaciones.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const styleId = 'notification-animation-styles';
if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `
    @keyframes fade-in-down {
        from {
            opacity: 0;
            transform: translateY(-10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    .animate-fade-in-down {
        animation: fade-in-down 0.2s ease-out forwards;
    }
    `;
    document.head.appendChild(style);
}
