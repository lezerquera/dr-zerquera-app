import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { DoctorProfile, Service, Appointment, ClinicInfo, ChatMessage, Notification, Insurance, User } from './types';
import PatientView from './pages/PatientView';
import AdminView from './pages/AdminView';
import { Logo, BuildingIcon, UsersIcon, LogOutIcon } from './components/Icons';
import { NotificationCenter } from './components/NotificationCenter';
import { useSound } from './hooks/useSound';
import { ThemeToggle } from './components/ThemeToggle';
import { InstallPWAButton } from './components/InstallPWAButton';

// Use environment variable for the API base URL in production, fallback to proxy for development
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

interface MainAppProps {
    user: User;
    token: string;
    onLogout: () => void;
}

const Header = ({ user, onLogout, clinicInfo, notifications, setNotifications }: { user: User, onLogout: () => void, clinicInfo: ClinicInfo, notifications: Notification[], setNotifications: React.Dispatch<React.SetStateAction<Notification[]>> }) => {
    const isAdmin = user.role === 'admin';
    return (
        <header className="bg-primary text-white shadow-md sticky top-0 z-40">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center gap-4">
                        <Link to="/" className="flex items-center gap-2">
                            <Logo className="h-10 w-auto" />
                            <span className="hidden sm:inline-block font-bold text-xl">{clinicInfo.name}</span>
                        </Link>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4">
                        <ThemeToggle />
                        <NotificationCenter notifications={notifications} setNotifications={setNotifications} userId={isAdmin ? 'admin' : user.id.toString()} />
                        <div className="flex items-center gap-2">
                            <span className="hidden sm:inline text-white/80 text-sm font-medium">{user.name}</span>
                            <button onClick={onLogout} className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/20 transition-colors" aria-label="Cerrar sesión">
                                <LogOutIcon className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

const MainApp: React.FC<MainAppProps> = ({ user, token, onLogout }) => {
    const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);
    const [services, setServices] = useState<Service[]>([]);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [clinicInfo, setClinicInfo] = useState<ClinicInfo | null>(null);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [allInsurances, setAllInsurances] = useState<Insurance[]>([]);
    const [acceptedInsurances, setAcceptedInsurances] = useState<string[]>([]);
    const [acceptedInsuranceDetails, setAcceptedInsuranceDetails] = useState<Insurance[]>([]);
    const [adminId, setAdminId] = useState<number | null>(null);
    const [unreadChatCount, setUnreadChatCount] = useState<number>(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [installPromptEvent, setInstallPromptEvent] = useState<any>(null);


    const authHeader = useMemo(() => ({ 'Authorization': `Bearer ${token}` }), [token]);

    // This single effect now handles all PWA lifecycle events and diagnostics
    useEffect(() => {
        // Diagnostic: Check if Service Worker is active
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then((registration) => {
                console.log('✅ [PWA] Service Worker está registrado y activo:', registration);
            }).catch(error => {
                console.error('❌ [PWA] Fallo en la registración del Service Worker:', error);
            });
        } else {
            console.warn('ℹ️ [PWA] Service Worker no es soportado en este navegador.');
        }

        // Listener for the install prompt
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            console.log('✅ [PWA] "beforeinstallprompt" event detectado. El banner de instalación debería mostrarse.');
            setInstallPromptEvent(e);
        };
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Listener for when the app is successfully installed
        const handleAppInstalled = () => {
            console.log('✅ [PWA] La aplicación ha sido instalada.');
            setInstallPromptEvent(null); // Hide the button after installation
        };
        window.addEventListener('appinstalled', handleAppInstalled);

        // Cleanup listeners on component unmount
        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []); // Empty dependency array ensures this runs only once.


    const handleInstallClick = async () => {
        if (!installPromptEvent) {
            console.error('[PWA] Intento de instalar sin un evento válido.');
            return;
        }
        installPromptEvent.prompt();
        const { outcome } = await installPromptEvent.userChoice;
        if (outcome === 'accepted') {
            console.log('✅ [PWA] El usuario aceptó la instalación.');
        } else {
            console.log('ℹ️ [PWA] El usuario descartó la instalación.');
        }
        setInstallPromptEvent(null);
    };

    const handleDismissInstall = () => {
        console.log('ℹ️ [PWA] El usuario descartó el banner personalizado.');
        setInstallPromptEvent(null);
    };


    const fetchData = useCallback(async () => {
      try {
        const fetchOptions = { headers: authHeader };
        
        const [
          profileRes, servicesRes, clinicInfoRes, allInsurancesRes, 
          acceptedInsurancesRes, adminIdRes,
        ] = await Promise.all([
          fetch(`${API_BASE_URL}/doctor-profile`),
          fetch(`${API_BASE_URL}/services`),
          fetch(`${API_BASE_URL}/clinic-info`),
          fetch(`${API_BASE_URL}/insurances/all`),
          fetch(`${API_BASE_URL}/insurances/accepted-details`),
          fetch(`${API_BASE_URL}/users/admin-id`, fetchOptions),
        ]);

        if (!profileRes.ok || !servicesRes.ok || !clinicInfoRes.ok || !adminIdRes.ok) {
          throw new Error('No se pudo cargar la información esencial de la clínica.');
        }

        // Set base data
        setDoctorProfile(await profileRes.json());
        setServices(await servicesRes.json());
        setClinicInfo(await clinicInfoRes.json());
        setAllInsurances(await allInsurancesRes.json());
        const adminData = await adminIdRes.json();
        setAdminId(adminData.adminId);
        
        if (acceptedInsurancesRes.ok) {
            const acceptedDetails = await acceptedInsurancesRes.json();
            setAcceptedInsuranceDetails(acceptedDetails);
            setAcceptedInsurances(acceptedDetails.map((ins: Insurance) => ins.id));
        }

        // Fetch role-specific data
        if (user.role === 'admin') {
            const [appointmentsRes, unreadCountRes] = await Promise.all([
                fetch(`${API_BASE_URL}/appointments`, fetchOptions),
                fetch(`${API_BASE_URL}/chat/unread-count`, fetchOptions)
            ]);
            if (appointmentsRes.ok) setAppointments(await appointmentsRes.json());
            if (unreadCountRes.ok) {
                const data = await unreadCountRes.json();
                setUnreadChatCount(data.unreadCount);
            }
        } else { // Patient
            const [appointmentsRes, chatRes] = await Promise.all([
                fetch(`${API_BASE_URL}/appointments/my-appointments`, fetchOptions),
                fetch(`${API_BASE_URL}/chat/my-conversation`, fetchOptions)
            ]);
            if (appointmentsRes.ok) setAppointments(await appointmentsRes.json());
            if (chatRes.ok) setChatMessages(await chatRes.json());
        }

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ocurrió un error desconocido.');
      } finally {
        setIsLoading(false);
      }
    }, [user.role, authHeader]);

    useEffect(() => {
        setIsLoading(true);
        fetchData();
    }, [fetchData]);

    const isAdminView = user.role === 'admin';
    const playNotificationSound = useSound();

    const createNotification = useCallback((notificationData: Omit<Notification, 'id' | 'createdAt' | 'status'>) => {
        setNotifications(prev => {
            const newNotification: Notification = {
                ...notificationData,
                id: Date.now(),
                createdAt: new Date(),
                status: 'unread'
            }
            if ((isAdminView && newNotification.userId === 'admin') || (!isAdminView && newNotification.userId === user.id.toString())) {
                playNotificationSound();
            }
            return [newNotification, ...prev];
        });
    }, [playNotificationSound, isAdminView, user.id]);

    // Polling effect for PATIENT
    useEffect(() => {
        if (user.role !== 'patient') return;

        const pollData = async () => {
            try {
                const fetchOptions = { headers: authHeader };
                const [appointmentsRes, chatRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/appointments/my-appointments`, fetchOptions),
                    fetch(`${API_BASE_URL}/chat/my-conversation`, fetchOptions)
                ]);

                if (appointmentsRes.ok) {
                    const newAppointments: Appointment[] = await appointmentsRes.json();
                    setAppointments(currentAppointments => {
                        // Compare new with current state to find changes
                        newAppointments.forEach(newApp => {
                            const oldApp = currentAppointments.find(a => a.id === newApp.id);
                            if (oldApp && oldApp.status === 'Solicitada' && newApp.status === 'Confirmada') {
                                createNotification({
                                    userId: user.id.toString(),
                                    type: 'appointment_confirmed',
                                    priority: 'high',
                                    message: `Su cita para "${newApp.service.name}" ha sido confirmada para el ${newApp.date}.`,
                                });
                            }
                        });
                        return newAppointments;
                    });
                }

                if (chatRes.ok) {
                    const newMessages: ChatMessage[] = await chatRes.json();
                    setChatMessages(currentMessages => {
                        if (newMessages.length > currentMessages.length) {
                             // Assuming new messages are always at the end
                            const lastNewMessage = newMessages[newMessages.length - 1];
                            if(lastNewMessage.senderRole === 'admin') {
                                createNotification({
                                    userId: user.id.toString(),
                                    type: 'new_chat_message',
                                    priority: 'medium',
                                    message: `Tiene un nuevo mensaje del Dr. Zerquera.`
                                });
                            }
                            return newMessages;
                        }
                        return currentMessages;
                    });
                }
            } catch (error) {
                console.error("Patient polling error:", error);
            }
        };

        const intervalId = setInterval(pollData, 15000); 
        return () => clearInterval(intervalId);
    }, [user.role, authHeader, createNotification, user.id]);
    
    // Polling effect for ADMIN
    useEffect(() => {
        if (user.role !== 'admin') return;

        const pollData = async () => {
            try {
                const fetchOptions = { headers: authHeader };
                const [appointmentsRes, unreadCountRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/appointments`, fetchOptions),
                    fetch(`${API_BASE_URL}/chat/unread-count`, fetchOptions)
                ]);

                if (appointmentsRes.ok) {
                    const newAppointments: Appointment[] = await appointmentsRes.json();
                    setAppointments(currentAppointments => {
                        if (newAppointments.length > currentAppointments.length) {
                             createNotification({
                                userId: 'admin',
                                type: 'new_appointment_request',
                                priority: 'high',
                                message: `Tiene una nueva solicitud de cita.`,
                            });
                        }
                        return newAppointments;
                    });
                }
                
                if (unreadCountRes.ok) {
                    const data = await unreadCountRes.json();
                    setUnreadChatCount(prevCount => {
                        if (data.unreadCount > prevCount) {
                             createNotification({
                                userId: 'admin',
                                type: 'new_chat_message',
                                priority: 'medium',
                                message: 'Ha recibido un nuevo mensaje de un paciente.'
                            });
                        }
                        return data.unreadCount;
                    });
                }

            } catch (error) {
                console.error("Admin polling error:", error);
            }
        };

        const intervalId = setInterval(pollData, 15000);
        return () => clearInterval(intervalId);

    }, [user.role, authHeader, createNotification]);

    const fetchUnreadCount = useCallback(async () => {
        if (user.role !== 'admin') return;
        try {
            const res = await fetch(`${API_BASE_URL}/chat/unread-count`, { headers: authHeader });
            if(res.ok) {
                const data = await res.json();
                setUnreadChatCount(data.unreadCount);
            }
        } catch (error) {
            console.error("Failed to fetch unread count:", error);
        }
    }, [user.role, authHeader]);

    const clearChatNotifications = useCallback(() => {
        if (user.role !== 'admin') return;
        setNotifications(prev =>
            prev.filter(n => n.type !== 'new_chat_message' || n.userId !== 'admin')
        );
    }, [user.role]);

    const requestAppointment = useCallback(async (appointmentRequest: Omit<Appointment, 'id' | 'status' | 'date' | 'time' | 'patientId'>) => {
        try {
            const response = await fetch(`${API_BASE_URL}/appointments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeader },
                body: JSON.stringify({ ...appointmentRequest, serviceId: appointmentRequest.service.id })
            });
            if (!response.ok) throw new Error('No se pudo enviar la solicitud de cita.');
            const newAppointment = await response.json();
            
            // Both roles should update their list if they make an appointment
            setAppointments(prev => [newAppointment, ...prev]);
            
            createNotification({
                userId: 'admin', type: 'new_appointment_request', priority: 'high',
                message: `Nueva solicitud de cita de ${newAppointment.patientName} para ${newAppointment.service.name}.`,
                data: { appointmentId: newAppointment.id }
            });

        } catch (error) {
            console.error("Failed to request appointment:", error);
            alert(`Error al solicitar cita: ${error instanceof Error ? error.message : 'Ocurrió un error desconocido.'}`);
        }
    }, [createNotification, authHeader]);
    
    const confirmAppointment = useCallback(async (appointmentId: number, date: string, time: string) => {
        try {
            const response = await fetch(`${API_BASE_URL}/appointments/${appointmentId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', ...authHeader },
                body: JSON.stringify({ status: 'Confirmada', date, time })
            });
            if (!response.ok) throw new Error('Failed to confirm appointment');
            const updatedAppointment = await response.json();
            setAppointments(prev => prev.map(app => (app.id === appointmentId ? updatedAppointment : app)));
            
            // Note: The patient will get their notification via polling, not a direct push here.
            // This is more reliable as it doesn't depend on the admin's client.

        } catch (error) {
            console.error("Failed to confirm appointment:", error);
            alert(`Error al confirmar la cita: ${error instanceof Error ? error.message : 'Ocurrió un error desconocido.'}`);
        }
    }, [authHeader]);

    const sendChatMessage = useCallback(async (message: Omit<ChatMessage, 'id' | 'timestamp' | 'sender' | 'senderId' | 'senderRole' | 'isRead'>): Promise<ChatMessage | null> => {
        try {
            const response = await fetch(`${API_BASE_URL}/chat/messages`, {
                method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeader }, body: JSON.stringify(message)
            });
            if (!response.ok) throw new Error('No se pudo enviar el mensaje.');
            const newMessage: ChatMessage = await response.json();
            
            if(user.role === 'patient') {
                setChatMessages(prev => [...prev, newMessage]);
            }

            // The recipient will get their notification via polling.
            // This avoids creating duplicate notifications.

            return newMessage;
        } catch (error) { 
            console.error("Failed to send chat message:", error);
            alert(`Error al enviar mensaje: ${error instanceof Error ? error.message : 'Ocurrió un error desconocido.'}`);
            return null;
         }
    }, [user.role, authHeader]);

    const saveService = async (service: Service) => {
        const isNew = !services.some(s => s.id === service.id);
        const url = isNew ? `${API_BASE_URL}/services` : `${API_BASE_URL}/services/${service.id}`;
        const method = isNew ? 'POST' : 'PUT';
        try {
            const response = await fetch(url, {
                method, headers: { 'Content-Type': 'application/json', ...authHeader }, body: JSON.stringify(service)
            });
            if (!response.ok) throw new Error('Failed to save service');
            await fetchData();
        } catch (error) { console.error("Error saving service:", error); }
    };

    const deleteService = async (id: number) => {
        try {
            const response = await fetch(`${API_BASE_URL}/services/${id}`, { method: 'DELETE', headers: authHeader });
            if (!response.ok) {
                 const errorData = await response.json().catch(() => null);
                 const errorMessage = errorData?.error || 'No se pudo eliminar el servicio.';
                 throw new Error(errorMessage);
            }
            await fetchData();
        } catch (error) { 
            console.error("Error deleting service:", error); 
            alert(`Error al eliminar el servicio: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        }
    };

    const saveDoctorProfile = async (profile: DoctorProfile) => {
         try {
            const response = await fetch(`${API_BASE_URL}/doctor-profile`, {
                method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeader }, body: JSON.stringify(profile)
            });
            if (!response.ok) throw new Error('Failed to save profile');
            await fetchData();
        } catch (error) { console.error("Error saving profile:", error); }
    };
    
    const saveClinicInfo = async (info: ClinicInfo) => {
        try {
            const response = await fetch(`${API_BASE_URL}/clinic-info`, {
                method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeader }, body: JSON.stringify(info)
            });
            if (!response.ok) throw new Error('Failed to save clinic info');
            await fetchData();
        } catch (error) { console.error("Error saving clinic info:", error); }
    };

    const saveAcceptedInsurances = async (ids: string[]) => {
        try {
            const response = await fetch(`${API_BASE_URL}/insurances/accepted`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeader },
                body: JSON.stringify({ accepted: ids })
            });
            if (!response.ok) throw new Error('Failed to save accepted insurances');
            await fetchData();
        } catch (error) {
            console.error("Error saving accepted insurances:", error);
        }
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-screen text-xl text-primary dark:text-text-light">Cargando datos de la clínica...</div>;
    }

    if (error) {
        return <div className="flex justify-center items-center h-screen text-xl text-red-500">Error: {error}</div>;
    }

    if (!doctorProfile || !clinicInfo) {
        return <div className="flex justify-center items-center h-screen text-xl text-primary dark:text-text-light">Inicializando aplicación...</div>;
    }

    return (
        <div className="flex flex-col min-h-screen bg-bg-alt dark:bg-bg-dark">
            <Header user={user} onLogout={onLogout} clinicInfo={clinicInfo} notifications={notifications} setNotifications={setNotifications} />
            {installPromptEvent && <InstallPWAButton onInstall={handleInstallClick} onDismiss={handleDismissInstall} />}
            <main className="flex-grow p-4 sm:p-6 lg:p-8">
                {isAdminView ? (
                    <AdminView
                        user={user}
                        token={token}
                        clinicInfo={clinicInfo}
                        saveClinicInfo={saveClinicInfo}
                        services={services}
                        saveService={saveService}
                        deleteService={deleteService}
                        doctorProfile={doctorProfile}
                        saveDoctorProfile={saveDoctorProfile}
                        appointments={appointments}
                        confirmAppointment={confirmAppointment}
                        allInsurances={allInsurances}
                        acceptedInsurances={acceptedInsurances}
                        saveAcceptedInsurances={saveAcceptedInsurances}
                        sendChatMessage={sendChatMessage}
                        unreadChatCount={unreadChatCount}
                        fetchUnreadCount={fetchUnreadCount}
                        clearChatNotifications={clearChatNotifications}
                    />
                ) : (
                    <PatientView
                        user={user}
                        adminId={adminId}
                        doctorProfile={doctorProfile}
                        services={services}
                        appointments={appointments}
                        chatMessages={chatMessages}
                        clinicInfo={clinicInfo}
                        acceptedInsurances={acceptedInsuranceDetails}
                        requestAppointment={requestAppointment}
                        sendChatMessage={sendChatMessage}
                    />
                )}
            </main>
        </div>
    );
};

export default MainApp;