import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { DoctorProfile, Service, Appointment, ClinicInfo, ChatMessage, Notification, Insurance, User } from './types';
import PatientView from './pages/PatientView';
import AdminView from './pages/AdminView';
import { Logo, LogOutIcon } from './components/Icons';
import { NotificationCenter } from './components/NotificationCenter';
import { useSound } from './hooks/useSound';
import { ThemeToggle } from './components/ThemeToggle';
import { InstallPWAButton } from './components/InstallPWAButton';

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
                            <span className="hidden sm:inline-block text-sm">
                                {isAdmin ? "Admin" : user.name}
                            </span>
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

const Footer = ({ clinicInfo }: { clinicInfo: ClinicInfo }) => (
    <footer className="bg-primary text-white/80 mt-auto">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center text-sm">
            &copy; {new Date().getFullYear()} {clinicInfo.name}. Todos los derechos reservados.
        </div>
    </footer>
);


const MainApp: React.FC<MainAppProps> = ({ user, token, onLogout }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [clinicInfo, setClinicInfo] = useState<ClinicInfo>({ name: 'Cargando...', address: '', phone: '', email: '', website: '' });
    const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);
    const [services, setServices] = useState<Service[]>([]);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [adminId, setAdminId] = useState<number | null>(null);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [allInsurances, setAllInsurances] = useState<Insurance[]>([]);
    const [acceptedInsurances, setAcceptedInsurances] = useState<string[]>([]);
    const [acceptedInsurancesDetails, setAcceptedInsurancesDetails] = useState<Insurance[]>([]);
    const [unreadChatCount, setUnreadChatCount] = useState(0);

    const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<any>(null);
    const [showInstallPrompt, setShowInstallPrompt] = useState(false);

    const playNotificationSound = useSound();
    const isAdmin = user.role === 'admin';

    const authHeader = useMemo(() => ({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }), [token]);

    const fetchWithAuth = useCallback((url: string, options?: RequestInit) => {
        return fetch(url, { ...options, headers: { ...authHeader, ...options?.headers } });
    }, [authHeader]);

    const fetchAppointments = useCallback(async () => {
        try {
            const url = isAdmin ? `${API_BASE_URL}/appointments` : `${API_BASE_URL}/appointments/my-appointments`;
            const res = await fetchWithAuth(url);
            if (res.ok) {
                const data = await res.json();
                setAppointments(data);
            }
        } catch (e) {
            console.error("Failed to fetch appointments:", e);
        }
    }, [isAdmin, fetchWithAuth]);

    const fetchPatientChat = useCallback(async () => {
        if (isAdmin) return;
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/chat/my-conversation`);
            if (res.ok) {
                const newMessages = await res.json();
                setChatMessages(prevMessages => {
                    // Simple check to see if new messages have arrived to avoid re-renders
                    if (JSON.stringify(prevMessages) !== JSON.stringify(newMessages)) {
                        return newMessages;
                    }
                    return prevMessages;
                });
            }
        } catch(e) {
            console.error("Failed to fetch patient chat:", e);
        }
    }, [isAdmin, fetchWithAuth]);

    const fetchData = useCallback(async () => {
        try {
            const [
                clinicInfoRes, doctorProfileRes, servicesRes, allInsurancesRes, 
                acceptedInsurancesRes, acceptedInsurancesDetailsRes, adminIdRes
            ] = await Promise.all([
                fetch(`${API_BASE_URL}/clinic-info`),
                fetch(`${API_BASE_URL}/doctor-profile`),
                fetch(`${API_BASE_URL}/services`),
                fetch(`${API_BASE_URL}/insurances/all`),
                fetch(`${API_BASE_URL}/insurances/accepted`),
                fetch(`${API_BASE_URL}/insurances/accepted-details`),
                fetchWithAuth(`${API_BASE_URL}/users/admin-id`)
            ]);
            
            setClinicInfo(await clinicInfoRes.json());
            setDoctorProfile(await doctorProfileRes.json());
            setServices(await servicesRes.json());
            setAllInsurances(await allInsurancesRes.json());
            setAcceptedInsurances((await acceptedInsurancesRes.json()));
            setAcceptedInsurancesDetails(await acceptedInsurancesDetailsRes.json());
            setAdminId((await adminIdRes.json()).adminId);
            
            await fetchAppointments();

            if (isAdmin) {
                fetchUnreadCount();
            } else {
                await fetchPatientChat();
            }

        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
        } finally {
            setIsLoading(false);
        }
    }, [fetchWithAuth, isAdmin, fetchAppointments, fetchPatientChat]);
    
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Polling for real-time updates
    useEffect(() => {
        if (isAdmin) {
            // Admin polls for new appointment requests
            const appointmentInterval = setInterval(fetchAppointments, 30000); // every 30 seconds
            return () => clearInterval(appointmentInterval);
        } else {
            // Patient polls for new chat messages
            const chatInterval = setInterval(fetchPatientChat, 10000); // every 10 seconds
            return () => clearInterval(chatInterval);
        }
    }, [isAdmin, fetchAppointments, fetchPatientChat]);


    useEffect(() => {
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
            // No mostrar el banner de instalación en iOS, ya que no es compatible con el flujo estándar.
            if (isIOS) return;

            setDeferredInstallPrompt(e);
            if (localStorage.getItem('pwaInstallDismissed') !== 'true') {
                setShowInstallPrompt(true);
            }
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }, []);

    const handleInstallClick = () => {
        if (deferredInstallPrompt) {
            deferredInstallPrompt.prompt();
            deferredInstallPrompt.userChoice.then(() => {
                setShowInstallPrompt(false);
                setDeferredInstallPrompt(null);
            });
        }
    };
    
    const handleDismissInstall = () => {
        setShowInstallPrompt(false);
        localStorage.setItem('pwaInstallDismissed', 'true');
    };

    const addNotification = useCallback((notification: Omit<Notification, 'id' | 'createdAt'>) => {
        setNotifications(prev => [
            ...prev,
            { ...notification, id: Date.now(), createdAt: new Date() }
        ]);
        playNotificationSound();
    }, [playNotificationSound]);

    const fetchUnreadCount = useCallback(async () => {
        if (!isAdmin) return;
        try {
            const res = await fetch(`${API_BASE_URL}/chat/unread-count`, { headers: authHeader });
            const data = await res.json();
            setUnreadChatCount(data.unreadCount);
        } catch (error) {
            console.error("Failed to fetch unread count", error);
        }
    }, [isAdmin, authHeader]);

    // Define API interaction functions
    const saveClinicInfo = useCallback(async (info: ClinicInfo) => {
        await fetchWithAuth(`${API_BASE_URL}/clinic-info`, { method: 'POST', body: JSON.stringify(info) });
        setClinicInfo(info);
    }, [fetchWithAuth]);

    const saveService = useCallback(async (service: Service) => {
        const url = service.id ? `${API_BASE_URL}/services/${service.id}` : `${API_BASE_URL}/services`;
        const method = service.id ? 'PUT' : 'POST';
        const response = await fetchWithAuth(url, { method, body: JSON.stringify(service) });
        const savedService = await response.json();
        setServices(prev => service.id ? prev.map(s => s.id === service.id ? savedService : s) : [...prev, savedService]);
    }, [fetchWithAuth]);
    
    const deleteService = useCallback(async (id: number) => {
        await fetchWithAuth(`${API_BASE_URL}/services/${id}`, { method: 'DELETE' });
        setServices(prev => prev.filter(s => s.id !== id));
    }, [fetchWithAuth]);
    
    const saveDoctorProfile = useCallback(async (profile: DoctorProfile) => {
        await fetchWithAuth(`${API_BASE_URL}/doctor-profile`, { method: 'POST', body: JSON.stringify(profile) });
        setDoctorProfile(profile);
    }, [fetchWithAuth]);

    const requestAppointment = useCallback(async (appointmentData: Omit<Appointment, 'id' | 'status' | 'date' | 'time' | 'patientId'>) => {
        const response = await fetchWithAuth(`${API_BASE_URL}/appointments`, { method: 'POST', body: JSON.stringify({ ...appointmentData, serviceId: appointmentData.service.id }) });
        const newAppointment = await response.json();
        // Update patient's local state immediately
        setAppointments(prev => [newAppointment, ...prev]);
        // Add notification for admin
        addNotification({
            userId: 'admin',
            type: 'new_appointment_request',
            priority: 'high',
            status: 'unread',
            message: `Nueva solicitud de cita de ${newAppointment.patientName} para ${newAppointment.service.name}.`
        });
    }, [fetchWithAuth, addNotification]);

    const confirmAppointment = useCallback(async (appointmentId: number, date: string, time: string) => {
        const response = await fetchWithAuth(`${API_BASE_URL}/appointments/${appointmentId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status: 'Confirmada', date, time })
        });
        const updatedAppointment = await response.json();
        setAppointments(prev => prev.map(a => a.id === appointmentId ? updatedAppointment : a));
        addNotification({
            userId: updatedAppointment.patientId.toString(),
            type: 'appointment_confirmed',
            priority: 'medium',
            status: 'unread',
            message: `Su cita para ${updatedAppointment.service.name} ha sido confirmada.`
        });
    }, [fetchWithAuth, addNotification]);

    const sendChatMessage = useCallback(async (message: Omit<ChatMessage, 'id' | 'timestamp' | 'sender' | 'senderId' | 'senderRole' | 'isRead'>): Promise<ChatMessage | null> => {
        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/chat/messages`, {
                method: 'POST',
                body: JSON.stringify(message)
            });
            if (!response.ok) return null;
            const newMessage: ChatMessage = await response.json();
            
            if (isAdmin) {
                // Admin is sending, no local state change needed here, handled in AdminChatManager
            } else {
                 setChatMessages(prev => [...prev, newMessage]);
            }

            addNotification({
                userId: message.recipientId.toString() === adminId?.toString() ? 'admin' : message.recipientId.toString(),
                type: 'new_chat_message',
                priority: 'medium',
                status: 'unread',
                message: `Nuevo mensaje de chat de ${user.name}.`
            });

            return newMessage;
        } catch (error) {
            console.error("Error sending message", error);
            return null;
        }
    }, [fetchWithAuth, addNotification, adminId, user.name, isAdmin]);

    const saveAcceptedInsurances = useCallback(async (ids: string[]) => {
        await fetchWithAuth(`${API_BASE_URL}/insurances/accepted`, { method: 'POST', body: JSON.stringify({ accepted: ids }) });
        setAcceptedInsurances(ids);
        // Refresh public details after saving
        const res = await fetch(`${API_BASE_URL}/insurances/accepted-details`);
        setAcceptedInsurancesDetails(await res.json());
    }, [fetchWithAuth]);

    const clearChatNotifications = useCallback(() => {
        setNotifications(prev => prev.filter(n => n.type !== 'new_chat_message' || n.userId !== 'admin'));
    }, []);

    if (isLoading) {
        return <div className="flex justify-center items-center h-screen text-xl text-primary dark:text-text-light">Cargando datos de la clínica...</div>;
    }
    if (error) {
        return <div className="flex justify-center items-center h-screen text-xl text-red-500">Error: {error}</div>;
    }

    return (
        <div className="min-h-screen flex flex-col bg-bg-alt dark:bg-bg-dark">
            <Header user={user} onLogout={onLogout} clinicInfo={clinicInfo} notifications={notifications} setNotifications={setNotifications} />
            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow">
                {isAdmin ? (
                    <AdminView 
                        user={user}
                        token={token}
                        clinicInfo={clinicInfo}
                        saveClinicInfo={saveClinicInfo}
                        services={services}
                        saveService={saveService}
                        deleteService={deleteService}
                        doctorProfile={doctorProfile!}
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
                        token={token}
                        adminId={adminId}
                        doctorProfile={doctorProfile!}
                        services={services}
                        appointments={appointments}
                        chatMessages={chatMessages}
                        clinicInfo={clinicInfo}
                        acceptedInsurances={acceptedInsurancesDetails}
                        requestAppointment={requestAppointment}
                        sendChatMessage={sendChatMessage}
                    />
                )}
            </main>
            <Footer clinicInfo={clinicInfo} />
            {showInstallPrompt && <InstallPWAButton onInstall={handleInstallClick} onDismiss={handleDismissInstall} />}
        </div>
    );
};

export default MainApp;