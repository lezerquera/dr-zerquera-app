
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { DoctorProfile, Service, Appointment, ClinicInfo, ChatMessage, Notification, Insurance, User } from './types';
import PatientView from './pages/PatientView';
import AdminView from './pages/AdminView';
import { Logo, BuildingIcon, UsersIcon, LogOutIcon } from './components/Icons';
import { NotificationCenter } from './components/NotificationCenter';
import { useSound } from './hooks/useSound';
import { ThemeToggle } from './components/ThemeToggle';

// Use environment variable for the API base URL in production, fallback to proxy for development
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

interface MainAppProps {
    user: User;
    token: string;
    onLogout: () => void;
}

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
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const authHeader = useMemo(() => ({ 'Authorization': `Bearer ${token}` }), [token]);

    const fetchData = useCallback(async () => {
      try {
        const fetchOptions = { headers: authHeader };
        const [
          profileRes, servicesRes, appointmentsRes, chatRes, 
          clinicInfoRes, allInsurancesRes, acceptedInsurancesRes
        ] = await Promise.all([
          fetch(`${API_BASE_URL}/doctor-profile`),
          fetch(`${API_BASE_URL}/services`),
          user.role === 'admin' ? fetch(`${API_BASE_URL}/appointments`, fetchOptions) : Promise.resolve(null),
          fetch(`${API_BASE_URL}/chat-messages`, fetchOptions),
          fetch(`${API_BASE_URL}/clinic-info`),
          fetch(`${API_BASE_URL}/insurances/all`),
          fetch(`${API_BASE_URL}/insurances/accepted-details`),
        ]);

        if (!profileRes.ok || !servicesRes.ok || !clinicInfoRes.ok) {
          throw new Error('No se pudo cargar la información esencial de la clínica.');
        }

        setDoctorProfile(await profileRes.json());
        setServices(await servicesRes.json());
        if (appointmentsRes?.ok) {
            setAppointments(await appointmentsRes.json());
        }
        if (chatRes?.ok) {
            setChatMessages(await chatRes.json());
        }
        setClinicInfo(await clinicInfoRes.json());
        setAllInsurances(await allInsurancesRes.json());
        
        if (acceptedInsurancesRes?.ok) {
            const acceptedDetails = await acceptedInsurancesRes.json();
            setAcceptedInsuranceDetails(acceptedDetails);
            setAcceptedInsurances(acceptedDetails.map((ins: Insurance) => ins.id));
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
            // Play sound if the notification is for the current user type
            if ((isAdminView && newNotification.userId === 'admin') || (!isAdminView && newNotification.userId === user.id.toString())) {
                playNotificationSound();
            }
            return [newNotification, ...prev];
        });
    }, [playNotificationSound, isAdminView, user.id]);
    
    // --- API HANDLERS ---

    const requestAppointment = useCallback(async (appointmentRequest: Omit<Appointment, 'id' | 'status' | 'date' | 'time' | 'patientId'>) => {
        try {
            const response = await fetch(`${API_BASE_URL}/appointments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeader },
                body: JSON.stringify({ ...appointmentRequest, serviceId: appointmentRequest.service.id })
            });
            if (!response.ok) throw new Error('Failed to request appointment');
            const newAppointment = await response.json();
            // In both roles, we want to notify the admin of a new request.
            createNotification({
                userId: 'admin', type: 'new_appointment_request', priority: 'high',
                message: `Nueva solicitud de cita de ${newAppointment.patientName} para ${newAppointment.service.name}.`,
                data: { appointmentId: newAppointment.id }
            });
            // If admin made it (less likely), also update their view
             if (user.role === 'admin') {
                setAppointments(prev => [...prev, newAppointment]);
            }
        } catch (error) { console.error("Failed to request appointment:", error); }
    }, [createNotification, authHeader, user.role]);
    
    const confirmAppointment = useCallback(async (appointmentId: number) => {
        try {
            const response = await fetch(`${API_BASE_URL}/appointments/${appointmentId}/confirm`, { method: 'PUT', headers: authHeader });
            if (!response.ok) throw new Error('Failed to confirm appointment');
            const updatedAppointment = await response.json();
            setAppointments(prev => prev.map(app => (app.id === appointmentId ? updatedAppointment : app)));
            
            if (updatedAppointment.patientId) {
                 createNotification({
                    userId: updatedAppointment.patientId.toString(), 
                    type: 'appointment_confirmed', 
                    priority: 'high',
                    message: `Su cita para ${updatedAppointment.service.name} ha sido confirmada.`,
                    data: { appointmentId: updatedAppointment.id }
                });
            } else {
                console.warn("Could not send confirmation notification: patientId is missing on appointment.", updatedAppointment);
            }
        } catch (error) { console.error("Failed to confirm appointment:", error); }
    }, [createNotification, authHeader]);

    const sendChatMessage = useCallback(async (message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
        if (message.senderRole === 'system') {
            const systemMessage: ChatMessage = {
                id: Date.now(),
                ...message,
                timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
            };
            setChatMessages(prev => [...prev, systemMessage]);
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/chat-messages`, {
                method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeader }, body: JSON.stringify({ text: message.text })
            });
            if (!response.ok) throw new Error('Failed to send message');
            const newMessage = await response.json();
            setChatMessages(prev => [...prev, newMessage]);

            const recipientId = user.role === 'patient' ? 'admin' : 'some_patient_id'; // This needs logic to find the other user in a chat
            
            if (user.role === 'patient') {
                createNotification({
                    userId: 'admin', type: 'new_chat_message', priority: 'medium',
                    message: `Nuevo mensaje de ${user.name}.`
                });
            } else if (user.role === 'admin') {
                 // Here we'd need logic to find the patient's ID to notify them.
                 // This is a complex featureaddition, so for now we just log it.
                 console.log("Admin sent a message. Patient notification would be created here.");
            }
        } catch (error) { console.error("Failed to send chat message:", error); }
    }, [createNotification, user.name, user.role, authHeader]);

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
            if (!response.ok) throw new Error('Failed to delete service');
            await fetchData();
        } catch (error) { console.error("Error deleting service:", error); }
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

    const saveAcceptedInsurances = async (acceptedIds: string[]) => {
        try {
            const response = await fetch(`${API_BASE_URL}/insurances/accepted`, {
                method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeader }, body: JSON.stringify({ accepted: acceptedIds })
            });
             if (!response.ok) throw new Error('Failed to save insurances');
            await fetchData();
        } catch (error) { console.error("Error saving accepted insurances:", error); }
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-screen text-xl text-primary dark:text-text-light">Cargando clínica...</div>;
    }

    if (error || !doctorProfile || !clinicInfo) {
        return <div className="flex justify-center items-center h-screen text-xl text-red-500 p-8 text-center">{error}</div>;
    }

    const patientViewProps = {
        user, doctorProfile, services, appointments, chatMessages, clinicInfo,
        acceptedInsurances: acceptedInsuranceDetails,
        requestAppointment, sendChatMessage
    };
    
    const adminViewProps = {
        doctorProfile, saveDoctorProfile, services, saveService, deleteService,
        clinicInfo, saveClinicInfo, appointments, confirmAppointment,
        allInsurances, acceptedInsurances, saveAcceptedInsurances
    };

    return (
        <div className="min-h-screen flex flex-col">
            <header className="bg-primary text-white shadow-md sticky top-0 z-40">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-20">
                        <Link to="/" className="flex items-center gap-3">
                            <Logo className="h-20 w-auto" />
                            <span className="hidden sm:block font-bold text-base md:text-lg text-white leading-tight">
                                ZERQUERA INTEGRATIVE MEDICAL INSTITUTE
                            </span>
                        </Link>
                        <div className="flex items-center gap-2 sm:gap-4">
                           <div className="text-sm">
                                <span className="font-semibold">{user.name}</span> ({user.role})
                           </div>
                            <div className="border-l border-white/20 h-8"></div>
                            <ThemeToggle />
                            <NotificationCenter notifications={notifications} setNotifications={setNotifications} userId={isAdminView ? 'admin' : user.id.toString()} />
                             <button onClick={onLogout} title="Cerrar Sesión" className="text-white/80 hover:text-white p-2 rounded-full hover:bg-white/20 transition-colors">
                                <LogOutIcon className="h-6 w-6" />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                 {isAdminView ? (
                     <AdminView {...adminViewProps}/>
                ) : (
                    <Routes>
                       <Route path="/*" element={<PatientView {...patientViewProps} />} />
                    </Routes>
                )}
            </main>
            
            <footer className="bg-slate-800 text-text-light">
                <div className="container mx-auto py-4 px-4 sm:px-6 lg:px-8 text-center text-sm text-slate-300">
                    <p>&copy; {new Date().getFullYear()} Dr. Zerquera. Todos los derechos reservados.</p>
                    <p>Desarrollado con fines de demostración.</p>
                </div>
            </footer>
        </div>
    );
};

export default MainApp;
