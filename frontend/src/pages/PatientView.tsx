
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { NavLink, Route, Routes, Link, useLocation, useParams, useNavigate } from 'react-router-dom';
import type { DoctorProfile, Service, Appointment, ChatMessage, ClinicInfo, Insurance, User, FormTemplate, PatientFormSubmission, Question, QuestionType, ClinicalWizardAnswers, BodyPainPoint } from '../types';
import { 
    CalendarIcon, UsersIcon, StethoscopeIcon, MessageSquareIcon, ClipboardIcon, SparklesIcon, SendIcon, 
    CheckCircleIcon, TargetIcon, RefreshCwIcon, ClockIcon, ShieldIcon, MapPinIcon, PhoneIcon,
    WhatsAppIcon, LightbulbIcon, GraduationCapIcon, BriefcaseIcon, AlertTriangleIcon, BuildingIcon, DesktopIcon, MailIcon, ClipboardListIcon, ChevronLeftIcon, ChevronRightIcon,
    SnowflakeIcon, FlameIcon, SunIcon, MoonIcon, ArrowHorizontalIcon, CircleDashedIcon, ZapIcon, HourglassIcon, EditIcon, TrashIcon, XIcon
} from '../components/Icons';
import { PageWrapper } from '../components/PageWrapper';
import { Modal } from '../components/Modal';
import { generateChatSummary } from '../services/geminiService';
import { InsuranceCarousel } from '../components/InsuranceCarousel';
import jsPDF from 'jspdf';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

interface PatientViewProps {
  user: User;
  token: string;
  adminId: number | null;
  doctorProfile: DoctorProfile;
  services: Service[];
  appointments: Appointment[];
  chatMessages: ChatMessage[];
  clinicInfo: ClinicInfo;
  acceptedInsurances: Insurance[];
  requestAppointment: (appointment: Omit<Appointment, 'id' | 'status' | 'date' | 'time' | 'patientId'>) => void;
  sendChatMessage: (message: Omit<ChatMessage, 'id' | 'timestamp' | 'sender' | 'senderId' | 'senderRole' | 'isRead'>) => void;
}

export const PatientView: React.FC<PatientViewProps> = (props) => {
    return (
        <div className="flex flex-col md:flex-row gap-8">
            <aside className="md:w-64 flex-shrink-0">
                <nav className="flex flex-col gap-2 p-4 bg-bg-main dark:bg-surface-dark rounded-lg shadow-md">
                    <PatientNavLink to="" icon={<ClipboardIcon className="w-5 h-5"/>} label="Panel"/>
                    <PatientNavLink to="services" icon={<StethoscopeIcon className="w-5 h-5"/>} label="Servicios"/>
                    <PatientNavLink to="dr-zerquera" icon={<UsersIcon className="w-5 h-5"/>} label="Sobre Mí"/>
                    <PatientNavLink to="appointments" icon={<CalendarIcon className="w-5 h-5"/>} label="Solicitar Cita"/>
                    <PatientNavLink to="forms" icon={<ClipboardListIcon className="w-5 h-5"/>} label="Mis Formularios"/>
                    <PatientNavLink to="chat" icon={<MessageSquareIcon className="w-5 h-5"/>} label="Chat"/>
                </nav>
            </aside>
            <div className="flex-grow bg-bg-main dark:bg-surface-dark rounded-lg shadow-md overflow-hidden">
                <Routes>
                    <Route index element={<Dashboard user={props.user} doctorProfile={props.doctorProfile} appointments={props.appointments} clinicInfo={props.clinicInfo} acceptedInsurances={props.acceptedInsurances} />} />
                    <Route path="services" element={<ServicesList services={props.services} clinicInfo={props.clinicInfo} />} />
                    <Route path="dr-zerquera" element={<DoctorProfilePage doctorProfile={props.doctorProfile} />} />
                    <Route path="appointments" element={<AppointmentRequestForm services={props.services} requestAppointment={props.requestAppointment} clinicInfo={props.clinicInfo} user={props.user} />} />
                    <Route path="forms" element={<PatientFormsManager token={props.token} />} />
                    <Route path="forms/fill/:templateId" element={<FillFormRouter token={props.token} user={props.user} />} />
                    <Route path="chat" element={<ChatInterface messages={props.chatMessages} onSendMessage={props.sendChatMessage} user={props.user} adminId={props.adminId} />} />
                </Routes>
            </div>
        </div>
    );
};

const PatientNavLink = ({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) => {
    const baseClasses = 'flex items-center p-3 text-sm font-medium rounded-md transition-colors duration-200';
    const activeClasses = 'bg-accent-warm text-primary font-semibold';
    const inactiveClasses = 'text-muted dark:text-muted hover:text-main dark:hover:text-main hover:bg-accent-warm/30 dark:hover:bg-primary/10';
    const location = useLocation();
    
    // Check if the current path exactly matches the `to` prop.
    // For the dashboard (to=""), we check if the path is exactly the base patient path.
    // The patient base path in MainApp is `/`.
    // We use `end` prop in NavLink to ensure this matching behavior.
    const isActive = location.pathname === (to === '' ? '/' : `/${to}`);

    return (
        <NavLink to={to} end className={`${baseClasses} ${location.pathname.startsWith('/' + to) && to !== '' ? activeClasses : (to === '' && location.pathname === '/' ? activeClasses : inactiveClasses)}`}>
            {icon}
            <span className="ml-3">{label}</span>
        </NavLink>
    );
};

// Helper component for quick actions
const QuickActionCard = ({ to, icon, title, description }: { to: string; icon: React.ReactNode; title: string; description: string }) => (
    <Link to={to} className="group block p-6 bg-bg-alt dark:bg-bg-alt rounded-xl shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
        <div className="flex items-center justify-center w-12 h-12 bg-accent-warm/80 rounded-lg mb-4 group-hover:bg-accent-warm transition-colors">
            {icon}
        </div>
        <h3 className="font-bold text-main dark:text-main mb-1">{title}</h3>
        <p className="text-sm text-muted dark:text-main/80">{description}</p>
    </Link>
);

const AppointmentHistory = ({ appointments }: { appointments: Appointment[] }) => {
    const requested = appointments.filter(a => a.status === 'Solicitada');
    const confirmed = appointments.filter(a => a.status === 'Confirmada');
    const past = appointments.filter(a => a.status !== 'Solicitada' && a.status !== 'Confirmada');

    const formatDate = (dateString: string) => {
        const parts = dateString.split('-');
        if (parts.length !== 3) return "Fecha inválida";
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // JS months are 0-indexed
        const day = parseInt(parts[2], 10);
        const date = new Date(Date.UTC(year, month, day));
        return date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: 'UTC' // Important to match the UTC creation
        });
    };

    const AppointmentCard: React.FC<{ app: Appointment }> = ({ app }) => {
        const getStatusChip = (status: Appointment['status']) => {
            switch (status) {
                case 'Confirmada': return 'bg-accent-turquoise/10 text-accent-turquoise border-accent-turquoise';
                case 'Solicitada': return 'bg-accent-red/10 text-accent-red border-accent-red';
                default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border-gray-400';
            }
        }
        return (
             <li className="p-4 bg-bg-main dark:bg-border-dark rounded-lg shadow-sm">
                <div className="flex justify-between items-start">
                    <p className="font-bold text-main dark:text-text-light">{app.service?.name || "Servicio no especificado"}</p>
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${getStatusChip(app.status)}`}>{app.status}</span>
                </div>
                 <div className="mt-3 pt-3 border-t border-border-main dark:border-border-dark text-sm space-y-2">
                    {app.status === 'Confirmada' ? (
                        <>
                            <div className="flex items-center gap-2 text-muted dark:text-text-muted-dark">
                                <CalendarIcon className="w-4 h-4" />
                                <span>{app.date ? formatDate(app.date) : 'Fecha por confirmar'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted dark:text-text-muted-dark">
                                <ClockIcon className="w-4 h-4" />
                                <span>{app.time || 'Hora por confirmar'}</span>
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center gap-2 text-muted dark:text-text-muted-dark">
                             <p className="italic">Nuestro equipo se pondrá en contacto pronto para confirmar los detalles.</p>
                        </div>
                    )}
                </div>
            </li>
        )
    };

    return (
         <div className="bg-bg-alt dark:bg-bg-alt p-6 rounded-xl shadow-md">
            <h3 className="text-xl font-semibold mb-4 text-accent-turquoise dark:text-primary flex items-center gap-2"><CalendarIcon className="w-6 h-6" /> Mis Citas</h3>
            {appointments.length === 0 ? (
                 <div className="text-center flex-grow flex flex-col items-center justify-center p-4 border-2 border-dashed border-border-main dark:border-border-dark rounded-lg">
                    <CalendarIcon className="w-12 h-12 text-muted dark:text-muted mb-3" />
                    <p className="text-muted dark:text-muted mb-4 font-medium">No tiene citas registradas.</p>
                    <Link to="appointments" className="bg-primary hover:opacity-90 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-opacity text-sm">
                        Solicitar una Cita
                    </Link>
                </div>
            ) : (
                 <div className="space-y-6">
                    {requested.length > 0 && (
                        <div>
                            <h4 className="font-bold text-main dark:text-main mb-2">Solicitudes Pendientes</h4>
                            <ul className="space-y-3"><AppointmentCard app={requested[0]}/></ul>
                        </div>
                    )}
                    {confirmed.length > 0 && (
                        <div>
                            <h4 className="font-bold text-main dark:text-main mb-2">Próximas Citas</h4>
                            <ul className="space-y-3">{confirmed.map(app => <AppointmentCard key={app.id} app={app}/>)}</ul>
                        </div>
                    )}
                     {past.length > 0 && (
                        <div>
                            <h4 className="font-bold text-main dark:text-main mb-2">Historial</h4>
                            <ul className="space-y-3">{past.map(app => <AppointmentCard key={app.id} app={app}/>)}</ul>
                        </div>
                    )}
                </div>
            )}
         </div>
    )
};

const ClinicContactInfo = ({ clinicInfo }: { clinicInfo: ClinicInfo }) => {
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clinicInfo.address)}`;
    
    return (
        <div className="bg-bg-alt dark:bg-bg-alt p-6 rounded-xl shadow-md">
            <h3 className="text-xl font-semibold mb-4 text-accent-turquoise dark:text-primary flex items-center gap-2">
                <BuildingIcon className="w-6 h-6" /> Información de Contacto
            </h3>
            <div className="space-y-4 text-main dark:text-main">
                <div className="flex items-start gap-3">
                    <MapPinIcon className="w-5 h-5 mt-1 text-muted dark:text-muted flex-shrink-0" />
                    <div>
                        <p className="font-semibold">Ubicación</p>
                        <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className="text-muted dark:text-main/80 hover:text-primary dark:hover:text-accent-turquoise hover:underline">
                            {clinicInfo.address}
                        </a>
                    </div>
                </div>
                <div className="flex items-start gap-3">
                    <PhoneIcon className="w-5 h-5 mt-1 text-muted dark:text-muted flex-shrink-0" />
                    <div>
                        <p className="font-semibold">Teléfono</p>
                        <a href={`tel:${clinicInfo.phone.replace(/\D/g, '')}`} className="text-muted dark:text-main/80 hover:text-primary dark:hover:text-accent-turquoise hover:underline">
                            {clinicInfo.phone}
                        </a>
                    </div>
                </div>
                <div className="flex items-start gap-3">
                    <MailIcon className="w-5 h-5 mt-1 text-muted dark:text-muted flex-shrink-0" />
                    <div>
                        <p className="font-semibold">Correo Electrónico</p>
                        <a href={`mailto:${clinicInfo.email}`} className="text-muted dark:text-main/80 hover:text-primary dark:hover:text-accent-turquoise hover:underline">
                            {clinicInfo.email}
                        </a>
                    </div>
                </div>
                <div className="flex items-start gap-3">
                    <DesktopIcon className="w-5 h-5 mt-1 text-muted dark:text-muted flex-shrink-0" />
                    <div>
                        <p className="font-semibold">Sitio Web</p>
                        <a href={`https://${clinicInfo.website}`} target="_blank" rel="noopener noreferrer" className="text-muted dark:text-main/80 hover:text-primary dark:hover:text-accent-turquoise hover:underline">
                            {clinicInfo.website}
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

const Dashboard = ({ user, doctorProfile, appointments, clinicInfo, acceptedInsurances }: { user: User, doctorProfile: DoctorProfile, appointments: Appointment[], clinicInfo: ClinicInfo, acceptedInsurances: Insurance[] }) => {
    
    return (
        <PageWrapper title="Panel del Paciente">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Main Content Area */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Welcome Banner */}
                    <div className="relative bg-gradient-to-br from-primary to-primary-light text-white p-8 rounded-xl shadow-lg overflow-hidden">
                        <div className="absolute -right-10 -top-10 w-48 h-48 bg-white/10 rounded-full"></div>
                        <div className="absolute -left-12 -bottom-16 w-40 h-40 bg-white/10 rounded-full"></div>
                        <div className="relative z-10 flex items-center gap-6">
                            <img src={doctorProfile.photoUrl} alt="Dr. Zerquera" className="w-24 h-24 rounded-full border-4 border-white/50 shadow-lg object-cover hidden sm:block"/>
                            <div>
                                <h2 className="text-3xl font-bold mb-2">Hola {user.name.split(' ')[0]},</h2>
                                <p className="max-w-md">Te doy la bienvenida a tu espacio personal de bienestar. Soy el Dr. Zerquera y estoy aquí para ayudarte en tu camino hacia la salud.</p>
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <QuickActionCard to="appointments" icon={<CalendarIcon className="w-6 h-6 text-primary"/>} title="Agendar Cita Conmigo" description="Programe su próxima visita." />
                        <QuickActionCard to="forms" icon={<ClipboardListIcon className="w-6 h-6 text-primary"/>} title="Prepara tu Consulta" description="Vea y rellene sus formularios." />
                        <QuickActionCard to="chat" icon={<MessageSquareIcon className="w-6 h-6 text-primary"/>} title="Habla con mi Equipo" description="Comuníquese con la clínica." />
                    </div>
                     
                    {/* Philosophy */}
                    <div className="text-center py-6 bg-accent-warm/30 dark:bg-primary/10 rounded-xl">
                        <p className="text-xl italic text-primary dark:text-accent-turquoise px-4">"Tratamos la causa, no solo el síntoma, para una salud integral y duradera."</p>
                        <p className="mt-2 font-semibold text-main dark:text-main">- Dr. Pablo J. Zerquera</p>
                    </div>

                    {/* Appointment History */}
                    <AppointmentHistory appointments={appointments} />
                </div>

                {/* Sidebar with Clinic Info */}
                <div className="space-y-8">
                    <ClinicContactInfo clinicInfo={clinicInfo} />
                </div>

            </div>

             {/* Accepted Insurances Carousel */}
            <div className="mt-12">
                <InsuranceCarousel insurances={acceptedInsurances} />
            </div>
        </PageWrapper>
    );
};

const ServicesList = ({ services, clinicInfo }: { services: Service[], clinicInfo: ClinicInfo }) => {
    const [selectedService, setSelectedService] = useState<Service | null>(null);

    return (
        <PageWrapper title="Nuestros Servicios">
            <p className="text-muted dark:text-main/80 mb-8 max-w-3xl">
                En {clinicInfo.name}, ofrecemos un enfoque integrador para su bienestar. Explore nuestros servicios para encontrar el tratamiento adecuado para usted, combinando la sabiduría de la medicina tradicional con enfoques modernos.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {services.map(service => (
                    <div key={service.id} className="bg-bg-alt dark:bg-bg-alt rounded-lg shadow-md overflow-hidden flex flex-col group">
                        <img src={service.imageUrl} alt={service.name} className="w-full h-48 object-cover group-hover:opacity-90 transition-opacity" />
                        <div className="p-6 flex flex-col flex-grow">
                            <h3 className="text-xl font-bold text-main dark:text-main mb-2">{service.name}</h3>
                            <p className="text-muted dark:text-main/80 text-sm flex-grow">{service.description}</p>
                            <button onClick={() => setSelectedService(service)} className="mt-4 w-full bg-accent-warm text-primary font-bold py-2 px-4 rounded-lg hover:bg-opacity-80 transition-opacity text-sm">
                                Más Información
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            {selectedService && <ServiceDetailModal service={selectedService} onClose={() => setSelectedService(null)} />}
        </PageWrapper>
    );
};

const ServiceDetailModal = ({ service, onClose }: { service: Service, onClose: () => void }) => {
    const { detailedInfo, name, price, duration } = service;

    const DetailSection = ({ title, items, icon }: { title: string, items: string[], icon: React.ReactNode }) => (
        <div>
            <h4 className="text-lg font-semibold text-accent-turquoise dark:text-primary mb-3 flex items-center gap-2">{icon} {title}</h4>
            <ul className="list-disc list-inside space-y-2 text-muted dark:text-main/80 pl-2">
                {items.map((item, index) => <li key={index}>{item}</li>)}
            </ul>
        </div>
    );
    
    return (
         <Modal isOpen={true} onClose={onClose} title={detailedInfo.title || name}>
             <div className="max-h-[70vh] overflow-y-auto pr-4 -mr-4 space-y-6">
                <div className="flex flex-wrap gap-4 text-sm mb-4 border-b border-border-main dark:border-border-dark pb-4">
                     <div className="flex items-center gap-2 text-main dark:text-main font-medium"><ClockIcon className="w-5 h-5 text-muted dark:text-muted"/> Duración: {duration}</div>
                     <div className="flex items-center gap-2 text-main dark:text-main font-medium"><ShieldIcon className="w-5 h-5 text-muted dark:text-muted"/> Seguridad: {detailedInfo.safety}</div>
                     <div className="flex items-center gap-2 text-main dark:text-main font-medium"><RefreshCwIcon className="w-5 h-5 text-muted dark:text-muted"/> Frecuencia: {detailedInfo.frequency}</div>
                </div>

                {detailedInfo.specialOffer && (
                    <div className="bg-accent-warm/50 dark:bg-primary/10 border-l-4 border-accent-red p-4 rounded-md">
                        <h4 className="font-bold text-accent-red">¡Oferta Especial!</h4>
                        <p className="text-main dark:text-main">{detailedInfo.specialOffer.description}</p>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-2xl font-bold text-main dark:text-main">${detailedInfo.specialOffer.newPrice}</span>
                            <span className="line-through text-muted dark:text-muted">${detailedInfo.specialOffer.oldPrice}</span>
                        </div>
                    </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <DetailSection title="Beneficios Clave" items={detailedInfo.benefits} icon={<CheckCircleIcon className="w-5 h-5"/>} />
                    <DetailSection title="Ideal Para Tratar" items={detailedInfo.treats} icon={<TargetIcon className="w-5 h-5"/>} />
                </div>
                 <div>
                    <h4 className="text-lg font-semibold text-accent-turquoise dark:text-primary mb-3 flex items-center gap-2"><SparklesIcon className="w-5 h-5"/> ¿Cómo es el Proceso?</h4>
                    <ol className="list-decimal list-inside space-y-2 text-muted dark:text-main/80 pl-2">
                         {detailedInfo.process.map((item, index) => <li key={index}>{item}</li>)}
                    </ol>
                 </div>
                 <div className="flex justify-end pt-6">
                     <Link to="/appointments" className="bg-primary hover:opacity-90 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2 transition-opacity">
                        Solicitar Cita
                    </Link>
                 </div>
            </div>
        </Modal>
    );
};

const DoctorProfilePage = ({ doctorProfile }: { doctorProfile: DoctorProfile }) => {
    return (
        <PageWrapper title="Sobre Mí">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div className="lg:col-span-1">
                    <div className="sticky top-24">
                        <img src={doctorProfile.photoUrl} alt={`Foto de ${doctorProfile.name}`} className="rounded-lg shadow-xl w-full object-cover aspect-square mb-6"/>
                        <h2 className="text-2xl font-bold text-main dark:text-main">{doctorProfile.name}</h2>
                        <p className="text-primary-light dark:text-accent-turquoise font-medium mb-4">{doctorProfile.titles}</p>
                         <div className="bg-bg-alt dark:bg-bg-alt p-4 rounded-lg">
                            <h3 className="font-semibold text-main dark:text-main mb-3 flex items-center gap-2"><SparklesIcon className="w-5 h-5 text-muted dark:text-muted"/> Especialidades</h3>
                            <div className="flex flex-wrap gap-2">
                                {doctorProfile.specialties.map((spec, i) => (
                                    <span key={i} className="bg-accent-warm text-primary text-xs font-semibold px-2 py-1 rounded-full">{spec}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="lg:col-span-2 space-y-8">
                    <div>
                        <h3 className="text-xl font-semibold mb-3 flex items-center gap-2 text-accent-turquoise dark:text-primary"><LightbulbIcon className="w-5 h-5"/> Introducción</h3>
                        <p className="text-muted dark:text-main/80 whitespace-pre-line leading-relaxed">{doctorProfile.introduction}</p>
                    </div>
                     <div>
                        <h3 className="text-xl font-semibold mb-3 flex items-center gap-2 text-accent-turquoise dark:text-primary"><BriefcaseIcon className="w-5 h-5"/> Experiencia Profesional</h3>
                        <p className="text-muted dark:text-main/80 whitespace-pre-line leading-relaxed">{doctorProfile.experience}</p>
                    </div>
                     <div>
                        <h3 className="text-xl font-semibold mb-3 flex items-center gap-2 text-accent-turquoise dark:text-primary"><GraduationCapIcon className="w-5 h-5"/> Formación Académica</h3>
                        <ul className="space-y-3">
                            {doctorProfile.education.map(edu => (
                                <li key={edu.id} className="p-4 bg-bg-alt dark:bg-bg-alt rounded-lg">
                                    <p className="font-bold text-main dark:text-main">{edu.degree}</p>
                                    <p className="text-sm text-muted dark:text-main/80">{edu.institution}</p>
                                    <p className="text-xs text-muted dark:text-muted">{edu.location}</p>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </PageWrapper>
    );
};

const AppointmentRequestForm = ({ services, requestAppointment, clinicInfo, user }: { services: Service[], requestAppointment: (appointment: any) => void, clinicInfo: ClinicInfo, user: User }) => {
    const [formData, setFormData] = useState({
        patientName: user.name,
        patientPhone: '',
        patientEmail: user.email,
        service: services.length > 0 ? services[0] : null,
        urgency: 'Rutinaria' as 'Rutinaria' | 'Moderada' | 'Urgente',
        reason: ''
    });
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        if (name === 'service') {
            const selectedService = services.find(s => s.id === parseInt(value)) || null;
            setFormData(prev => ({ ...prev, service: selectedService }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.service) {
            alert("Por favor, seleccione un servicio.");
            return;
        }
        requestAppointment(formData);
        setIsSubmitted(true);
    };

    if (isSubmitted) {
        return (
            <PageWrapper title="Solicitud Enviada">
                 <div className="text-center max-w-lg mx-auto py-12">
                     <CheckCircleIcon className="w-24 h-24 text-accent-turquoise mx-auto mb-6"/>
                    <h2 className="text-2xl font-bold text-main dark:text-main mb-2">¡Gracias por su solicitud!</h2>
                    <p className="text-muted dark:text-main/80">
                        Hemos recibido su petición de cita. Nuestro equipo se pondrá en contacto con usted a la brevedad para confirmar la fecha y hora.
                        Recibirá una notificación en este portal una vez confirmada.
                    </p>
                    <Link to="/" className="mt-8 inline-block bg-primary hover:opacity-90 text-white font-bold py-2 px-6 rounded-lg transition-opacity">
                        Volver al Panel
                    </Link>
                </div>
            </PageWrapper>
        );
    }
    
    return (
        <PageWrapper title="Solicitar una Cita">
            <div className="max-w-2xl mx-auto bg-bg-alt dark:bg-bg-alt p-8 rounded-xl shadow-lg">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="patientName" className="block text-sm font-medium text-main dark:text-main">Nombre Completo</label>
                        <input type="text" name="patientName" id="patientName" value={formData.patientName} onChange={handleChange} required className="mt-1 block w-full input-style"/>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                         <div>
                            <label htmlFor="patientPhone" className="block text-sm font-medium text-main dark:text-main">Teléfono de Contacto</label>
                            <input type="tel" name="patientPhone" id="patientPhone" value={formData.patientPhone} onChange={handleChange} required className="mt-1 block w-full input-style"/>
                        </div>
                        <div>
                            <label htmlFor="patientEmail" className="block text-sm font-medium text-main dark:text-main">Correo Electrónico</label>
                            <input type="email" name="patientEmail" id="patientEmail" value={formData.patientEmail} onChange={handleChange} required className="mt-1 block w-full input-style"/>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="service" className="block text-sm font-medium text-main dark:text-main">Servicio Deseado</label>
                        <select name="service" id="service" value={formData.service?.id || ''} onChange={handleChange} required className="mt-1 block w-full input-style">
                            {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>

                     <div>
                        <label className="block text-sm font-medium text-main dark:text-main">Nivel de Urgencia</label>
                        <div className="mt-2 flex gap-4">
                            {(['Rutinaria', 'Moderada', 'Urgente'] as const).map(level => (
                                <label key={level} className="flex items-center">
                                    <input type="radio" name="urgency" value={level} checked={formData.urgency === level} onChange={handleChange} className="h-4 w-4"/>
                                    <span className="ml-2 text-sm text-muted dark:text-main/80">{level}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label htmlFor="reason" className="block text-sm font-medium text-main dark:text-main">Motivo de la Consulta</label>
                        <textarea name="reason" id="reason" rows={4} value={formData.reason} onChange={handleChange} required className="mt-1 block w-full input-style" placeholder="Por favor, describa brevemente sus síntomas o el motivo de su visita."></textarea>
                    </div>

                    <div className="pt-4 text-right">
                        <button type="submit" className="bg-primary hover:opacity-90 text-white font-bold py-2 px-6 rounded-lg transition-opacity">
                            Enviar Solicitud
                        </button>
                    </div>
                </form>
            </div>
             <style>{`
                .input-style {
                    padding: 8px 12px;
                    background-color: white;
                    border: 1px solid #E9DFD3;
                    border-radius: 6px;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                }
                .dark .input-style {
                    background-color: #0A192F;
                    border-color: #243A59;
                    color: #E6F1FF;
                }
            `}</style>
        </PageWrapper>
    );
};

// --- START OF FORMS SECTION ---

const PatientFormsManager = ({ token }: { token: string }) => {
    const [submissions, setSubmissions] = useState<PatientFormSubmission[]>([]);
    const [availableTemplates, setAvailableTemplates] = useState<FormTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const authHeader = useMemo(() => ({ 'Authorization': `Bearer ${token}` }), [token]);

    useEffect(() => {
        const fetchFormsData = async () => {
            try {
                const [submissionsRes, templatesRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/forms/my-submissions`, { headers: authHeader }),
                    fetch(`${API_BASE_URL}/forms/templates`, { headers: authHeader })
                ]);
                if (!submissionsRes.ok || !templatesRes.ok) throw new Error('Failed to fetch forms data');
                
                const submissionsData = await submissionsRes.json();
                const templatesData = await templatesRes.json();
                
                setSubmissions(submissionsData);
                // Filter out templates that have already been submitted
                const submittedTemplateIds = new Set(submissionsData.map((s: PatientFormSubmission) => s.templateId));
                setAvailableTemplates(templatesData.filter((t: FormTemplate) => !submittedTemplateIds.has(t.id)));

            } catch (error) {
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchFormsData();
    }, [token, authHeader]);
    
    if (isLoading) return <PageWrapper title="Mis Formularios"><p>Cargando...</p></PageWrapper>;

    return (
        <PageWrapper title="Mis Formularios">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <h2 className="text-xl font-semibold text-main dark:text-main mb-4">Formularios por Completar</h2>
                    {availableTemplates.length > 0 ? (
                        <ul className="space-y-3">
                            {availableTemplates.map(template => (
                                <li key={template.id} className="p-4 bg-bg-alt dark:bg-bg-alt rounded-lg shadow-sm flex justify-between items-center">
                                    <div>
                                        <h3 className="font-bold text-main dark:text-main">{template.title}</h3>
                                        <p className="text-sm text-muted dark:text-main/80">{template.description}</p>
                                    </div>
                                    <Link to={`/forms/fill/${template.id}`} className="bg-primary text-white font-bold py-2 px-4 rounded-lg hover:opacity-90 text-sm">
                                        Completar
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-muted dark:text-main/80 p-4 border-2 border-dashed rounded-lg text-center">No tiene formularios pendientes por completar.</p>
                    )}
                </div>
                <div>
                    <h2 className="text-xl font-semibold text-main dark:text-main mb-4">Formularios Enviados</h2>
                    {submissions.length > 0 ? (
                        <ul className="space-y-3">
                            {submissions.map(sub => (
                                <li key={sub.id} className="p-4 bg-bg-alt dark:bg-bg-alt rounded-lg shadow-sm flex justify-between items-center">
                                    <div>
                                        <h3 className="font-bold text-main dark:text-main">{sub.title}</h3>
                                        <p className="text-sm text-muted dark:text-main/80">Enviado: {new Date(sub.submissionDate).toLocaleDateString('es-ES')}</p>
                                    </div>
                                    <CheckCircleIcon className="w-6 h-6 text-accent-turquoise" />
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-muted dark:text-main/80 p-4 border-2 border-dashed rounded-lg text-center">Aún no ha enviado ningún formulario.</p>
                    )}
                </div>
            </div>
        </PageWrapper>
    );
};

const FillFormRouter = ({ token, user }: { token: string; user: User }) => {
    const { templateId } = useParams();
    const [template, setTemplate] = useState<FormTemplate | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchTemplate = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/forms/templates/${templateId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!res.ok) throw new Error('Template not found');
                setTemplate(await res.json());
            } catch (error) {
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchTemplate();
    }, [templateId, token]);

    const handleSubmitSuccess = () => {
        navigate('/forms');
    };

    if (isLoading) return <PageWrapper title="Cargando Formulario..."><p>Por favor, espere...</p></PageWrapper>;
    if (!template) return <PageWrapper title="Error"><p>No se encontró el formulario solicitado.</p></PageWrapper>;
    
    if (template.formType === 'clinical_wizard') {
        return <ClinicalWizard template={template} user={user} token={token} onSubmitSuccess={handleSubmitSuccess} />;
    }

    return <GenericFormFiller template={template} token={token} onSubmitSuccess={handleSubmitSuccess} />;
};

const GenericFormFiller = ({ template, token, onSubmitSuccess }: { template: FormTemplate, token: string, onSubmitSuccess: () => void }) => {
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleAnswerChange = (questionId: string, value: any, type: QuestionType) => {
        setAnswers(prev => {
            const newAnswers = { ...prev };
            if (type === 'checkbox') {
                const current = newAnswers[questionId] || [];
                if (current.includes(value)) {
                    newAnswers[questionId] = current.filter((item: string) => item !== value);
                } else {
                    newAnswers[questionId] = [...current, value];
                }
            } else {
                newAnswers[questionId] = value;
            }
            return newAnswers;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const response = await fetch(`${API_BASE_URL}/forms/submissions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ templateId: template.id, answers }),
            });
            if (!response.ok) throw new Error('Failed to submit form');
            alert('Formulario enviado con éxito!');
            onSubmitSuccess();
        } catch (error) {
            console.error(error);
            alert('Hubo un error al enviar el formulario.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <PageWrapper title={template.title}>
            <p className="text-muted dark:text-main/80 mb-6">{template.description}</p>
            <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto bg-bg-alt dark:bg-bg-alt/50 p-6 rounded-lg">
                {template.structure.map(q => (
                    <div key={q.id}>
                        <label className="block text-sm font-medium text-main dark:text-main">
                            {q.label} {q.required && <span className="text-red-500">*</span>}
                        </label>
                        {q.type === 'text' && <input type="text" required={q.required} onChange={e => handleAnswerChange(q.id, e.target.value, q.type)} className="mt-1 block w-full input-style" />}
                        {q.type === 'textarea' && <textarea required={q.required} onChange={e => handleAnswerChange(q.id, e.target.value, q.type)} rows={4} className="mt-1 block w-full input-style" />}
                        {q.type === 'select' && (
                            <select required={q.required} onChange={e => handleAnswerChange(q.id, e.target.value, q.type)} className="mt-1 block w-full input-style">
                                <option value="">Seleccione una opción</option>
                                {q.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        )}
                        {q.type === 'radio' && (
                            <div className="mt-2 space-y-2">
                                {q.options?.map(opt => (
                                    <label key={opt} className="flex items-center">
                                        <input type="radio" name={q.id} value={opt} required={q.required} onChange={e => handleAnswerChange(q.id, e.target.value, q.type)} className="h-4 w-4"/>
                                        <span className="ml-2 text-sm text-muted dark:text-main/80">{opt}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                        {q.type === 'checkbox' && (
                            <div className="mt-2 space-y-2">
                                {q.options?.map(opt => (
                                    <label key={opt} className="flex items-center">
                                        <input type="checkbox" value={opt} onChange={e => handleAnswerChange(q.id, e.target.value, q.type)} className="h-4 w-4 rounded"/>
                                        <span className="ml-2 text-sm text-muted dark:text-main/80">{opt}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
                <div className="pt-4 text-right">
                    <button type="submit" disabled={isSubmitting} className="bg-primary hover:opacity-90 text-white font-bold py-2 px-6 rounded-lg transition-opacity">
                        {isSubmitting ? 'Enviando...' : 'Enviar Formulario'}
                    </button>
                </div>
            </form>
        </PageWrapper>
    );
};

// --- START OF CLINICAL WIZARD (NEW VERSION) ---

// Types
type Sex = 'male' | 'female';

type PainFinding = {
  region: RegionKey;
  side: 'izquierdo' | 'derecho' | 'ambos' | 'medio';
  quality: 'punzante' | 'quemante' | 'presion' | 'intermitente' | 'ardor' | 'calambre';
  intensity: number; // 0..10
  factors?: string[]; // ej: movimiento, reposo, frío, calor
};

type RegionKey =
  | 'cabeza' | 'cuello'
  | 'hombro_izq' | 'hombro_der'
  | 'brazo_sup_izq' | 'brazo_sup_der'
  | 'codo_izq' | 'codo_der'
  | 'antebrazo_izq' | 'antebrazo_der'
  | 'mano_izq' | 'mano_der'
  | 'pecho' | 'mama_izq' | 'mama_der'
  | 'abdomen' | 'pelvis'
  | 'muslo_izq' | 'muslo_der'
  | 'rodilla_izq' | 'rodilla_der'
  | 'pierna_izq' | 'pierna_der'
  | 'pie_izq' | 'pie_der';

const wizardSteps = [
  { number: 1, title: 'Bienvenida' },
  { number: 2, title: 'Datos Generales' },
  { number: 3, title: 'Motivo de Consulta' },
  { number: 4, title: 'Mapa de Dolor (Híbrido)' },
  { number: 5, title: 'Principios MTC' },
  { number: 6, title: 'Evaluación de Lengua' },
  { number: 7, title: 'Resumen y Envío' },
];

const ClinicalWizard = ({ template, user, token, onSubmitSuccess }: { template: FormTemplate, user: User, token: string, onSubmitSuccess: () => void }) => {
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<any>({
    generalData: {
      fullName: user?.name || '', age: '', gender: '', occupation: '', contact: '',
      antecedentes: '', familiares: '', habitos: '', alergias: '', medicacion: ''
    },
    consultationReason: { reason: '', duration: '', severity: 5, expectations: '', associated: [] as string[] },
    painFindings: [] as PainFinding[],
    mtc: { apetito: '', sueno: '', emociones: '', sudor: '', sed: '' },
    tongue: [] as string[],
    sex: 'female' as Sex,
  });

  const totalSteps = wizardSteps.length;
  const handleNext = () => setStep((p) => Math.min(p + 1, totalSteps));
  const handleBack = () => setStep((p) => Math.max(p - 1, 1));
  
  const updateSection = (section: string, field: string, value: any) => {
    setAnswers((prev: any) => ({ ...prev, [section]: { ...prev[section], [field]: value } }));
  };

  const exportPDF = () => {
    const doc = new jsPDF({ unit: 'px', format: 'a4' });
    
    const { generalData, consultationReason, painFindings, mtc, tongue } = answers;
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 30; // in px
    let y = margin + 10; // Vertical cursor

    // Helper to add text and handle page breaks
    const addText = (text: string | string[], x: number, options: any = {}) => {
        const textY = y;
        const lineHeight = doc.getLineHeight() * 0.5;
        const textHeight = Array.isArray(text) ? text.length * lineHeight : lineHeight;

        if (textY + textHeight > pageHeight - margin) {
            doc.addPage();
            y = margin;
        }
        doc.text(text, x, y, options);
        y += textHeight + 5;
    };
    
    // Helper for sections
    const addSection = (title: string, content: () => void) => {
      if (y > pageHeight - margin - 30) { // Check if space for title + content
          doc.addPage();
          y = margin;
      }
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      addText(title, margin);
      y += 5; 
      doc.setLineWidth(0.5);
      doc.line(margin, y - 4, pageWidth - margin, y - 4);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      content();
      y += 15; // space after section
    };
    
    const addKeyValue = (key: string, value: string | undefined | null) => {
        if (!value || value.trim() === '') return;
        
        const keyText = `${key}:`;
        const valueText = value;
        const keyWidth = doc.getTextWidth(keyText) + 2;

        doc.setFont('helvetica', 'bold');
        const splitKey = doc.splitTextToSize(keyText, pageWidth - margin * 2);
        
        doc.setFont('helvetica', 'normal');
        const splitValue = doc.splitTextToSize(valueText, pageWidth - margin * 2 - keyWidth);

        const totalHeight = Math.max(splitKey.length, splitValue.length) * doc.getLineHeight() * 0.5;
        
        if (y + totalHeight > pageHeight - margin) {
            doc.addPage();
            y = margin;
        }
        
        doc.setFont('helvetica', 'bold');
        doc.text(keyText, margin + 5, y);
        
        doc.setFont('helvetica', 'normal');
        doc.text(splitValue, margin + 5 + keyWidth, y);
        y += totalHeight + 5;
    };

    // --- PDF Header ---
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumen de Consulta Inicial', pageWidth / 2, y, { align: 'center' });
    y += 15;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Paciente: ${generalData.fullName || 'No especificado'}`, margin, y);
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, pageWidth - margin, y, { align: 'right' });
    y += 15;
    doc.setLineWidth(1);
    doc.line(margin, y - 5, pageWidth - margin, y - 5);
    y += 10;

    // --- SECTIONS ---
    if (generalData) {
        addSection('Datos Generales', () => {
            addKeyValue('Nombre Completo', generalData.fullName);
            addKeyValue('Edad', generalData.age);
            addKeyValue('Sexo', generalData.gender);
            addKeyValue('Ocupación', generalData.occupation);
            addKeyValue('Teléfono', generalData.contact);
            addKeyValue('Antecedentes Médicos', generalData.antecedentes);
            addKeyValue('Antecedentes Familiares', generalData.familiares);
            addKeyValue('Hábitos de Vida', generalData.habitos);
            addKeyValue('Alergias', generalData.alergias);
            addKeyValue('Medicación Actual', generalData.medicacion);
        });
    }
    
    if (consultationReason) {
         addSection('Motivo de Consulta', () => {
            addKeyValue('Motivo Principal', consultationReason.reason);
            addKeyValue('Duración de Síntomas', consultationReason.duration);
            addKeyValue('Severidad', `${consultationReason.severity}/10`);
            addKeyValue('Expectativas', consultationReason.expectations);
            if (consultationReason.associated && consultationReason.associated.length > 0) {
                 addKeyValue('Síntomas Asociados', consultationReason.associated.join(', '));
            }
        });
    }

    if (painFindings && painFindings.length > 0) {
         addSection('Hallazgos de Dolor (Mapa Corporal)', () => {
            painFindings.forEach((finding: PainFinding) => {
                 const aggravates = (finding.factors || [])
                    .filter(f => f.startsWith('empeora_'))
                    .map(f => f.replace('empeora_', ''))
                    .join(', ');
                const alleviates = (finding.factors || [])
                    .filter(f => f.startsWith('alivia_'))
                    .map(f => f.replace('alivia_', ''))
                    .join(', ');

                let factorsText = '';
                if (aggravates) factorsText += `Empeora: ${aggravates}. `;
                if (alleviates) factorsText += `Alivia: ${alleviates}.`;
                
                const findingText = `· ${labelRegion(finding.region)} (${finding.side}): ${finding.quality}, Intensidad ${finding.intensity}/10. ${factorsText}`;
                
                const splitText = doc.splitTextToSize(findingText, pageWidth - (margin*2) - 5);
                addText(splitText, margin + 5);
            });
        });
    }
    
    if (mtc) {
        addSection('Principios MTC', () => {
            addKeyValue('Apetito/Digestión', mtc.apetito);
            addKeyValue('Sueño', mtc.sueno);
            addKeyValue('Emociones', mtc.emociones);
            addKeyValue('Sudoración', mtc.sudor);
            addKeyValue('Sed y Preferencias', mtc.sed);
        });
    }
    
     if (tongue && tongue.length > 0) {
        addSection('Evaluación de Lengua', () => {
            const tongueText = tongue.join(', ');
            addText(doc.splitTextToSize(tongueText, pageWidth - (margin*2) - 5), margin + 5);
        });
    }

    doc.save(`Resumen_${(generalData.fullName || 'Paciente').replace(/\s/g, '_')}.pdf`);
  };

  const submit = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/forms/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ templateId: template.id, answers }),
      });
      if (!res.ok) throw new Error('Error al enviar');
      alert('Formulario enviado con éxito');
      onSubmitSuccess?.();
    } catch (e) {
      console.error(e);
      alert('Error al enviar formulario');
    }
  };

  return (
    <PageWrapper title={template.title}>
        <div className="max-w-5xl mx-auto">
            <WizardProgress currentStep={step} totalSteps={totalSteps} />
            <div className="mt-6 min-h-[400px]">
                {step === 1 && (
                <StepWelcome onNext={handleNext} description={template?.description} onSexChange={(sex)=>setAnswers((p:any)=>({...p, sex}))} sex={answers.sex} />
                )}
                {step === 2 && (
                <StepGeneralData answers={answers.generalData} onChange={updateSection} />
                )}
                {step === 3 && (
                <StepReason answers={answers.consultationReason} onChange={updateSection} />
                )}
                {step === 4 && (
                <StepBodyMapHybrid
                    sex={answers.sex}
                    findings={answers.painFindings}
                    onAdd={(f)=>setAnswers((p:any)=>({...p, painFindings:[...p.painFindings, f]}))}
                    onRemoveIndex={(i)=>setAnswers((p:any)=>({...p, painFindings:p.painFindings.filter((_:any,idx:number)=>idx!==i)}))}
                />
                )}
                {step === 5 && (
                <StepMTC answers={answers.mtc} onChange={updateSection} />
                )}
                {step === 6 && (
                <StepTongue answers={answers.tongue} onToggle={(val)=>setAnswers((p:any)=>({...p, tongue: p.tongue.includes(val)? p.tongue.filter((x:string)=>x!==val): [...p.tongue, val]}))} />
                )}
                {step === 7 && (
                <StepSummary answers={answers} onExport={exportPDF} />
                )}
            </div>
            <div className="mt-8 pt-4 border-t border-border-main dark:border-border-dark flex justify-between">
                <button onClick={handleBack} disabled={step===1} className="btn-secondary disabled:opacity-50">← Anterior</button>
                {step < totalSteps ? (
                <button onClick={handleNext} className="btn-primary">Siguiente →</button>
                ) : (
                <div className="flex gap-3">
                    <button onClick={exportPDF} className="btn-secondary">Descargar PDF</button>
                    <button onClick={submit} className="btn-primary">Finalizar y Enviar</button>
                </div>
                )}
            </div>
        </div>
        <style>{`
            .btn-primary { padding: 10px 20px; font-weight: 600; color: #FFFFFF; background-color: #083C70; border-radius: 8px; transition: all 0.2s; }
            .btn-primary:hover { opacity: 0.9; }
            .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
            .btn-secondary { padding: 10px 20px; font-weight: 600; background-color: #e5e7eb; border-radius: 8px; transition: all 0.2s; }
            .dark .btn-secondary { background-color: #4b5563; color: #E6F1FF; }
            .btn-ghost { background-color: transparent; border: none; color: #C62828; padding: 8px; border-radius: 4px; transition: all 0.2s; }
            .btn-ghost:hover { background-color: rgba(200, 0, 0, 0.1); }
            .input-style {
                padding: 8px 12px;
                background-color: white;
                border: 1px solid #E9DFD3;
                border-radius: 6px;
                box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                width: 100%;
            }
            .dark .input-style {
                background-color: #0A192F;
                border-color: #243A59;
                color: #E6F1FF;
            }
        `}</style>
    </PageWrapper>
  );
}

function WizardProgress({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  return (
    <div>
      <div className="text-xs font-semibold text-blue-600">PASO {currentStep} DE {totalSteps}</div>
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-2 bg-blue-500" style={{ width: `${(currentStep / totalSteps) * 100}%`, transition: 'width 0.3s ease-in-out' }} />
      </div>
      <div className="text-lg font-semibold mt-1">{wizardSteps.find(s => s.number === currentStep)?.title}</div>
    </div>
  );
}

function StepWelcome({ onNext, description, sex, onSexChange }: { onNext: () => void; description?: string; sex: Sex; onSexChange: (s: Sex) => void }) {
  return (
    <div className="text-center">
      <div className="text-2xl font-semibold mb-2">{description || 'Consulta inicial'}</div>
      <div className="inline-flex gap-2 p-2 bg-gray-100 dark:bg-bg-dark rounded-xl mb-4">
        <button className={`btn-secondary ${sex === 'female' ? 'ring-2 ring-primary' : ''}`} onClick={() => onSexChange('female')}>Mujer</button>
        <button className={`btn-secondary ${sex === 'male' ? 'ring-2 ring-primary' : ''}`} onClick={() => onSexChange('male')}>Hombre</button>
      </div>
      <div className="text-gray-600 dark:text-text-muted-dark">Selecciona tu sexo para ajustar las regiones anatómicas visibles.</div>
      <button onClick={onNext} className="btn-primary mt-6">Comenzar</button>
    </div>
  );
}

function StepGeneralData({ answers, onChange }: { answers: any, onChange: Function }) {
  const h = (e: any) => onChange('generalData', e.target.name, e.target.value);
  return (
    <div className="grid sm:grid-cols-2 gap-3 max-w-3xl mx-auto">
      <input className="input-style" name="fullName" placeholder="Nombre Completo" value={answers.fullName} onChange={h} />
      <input className="input-style" name="age" type="number" placeholder="Edad" value={answers.age} onChange={h} />
      <input className="input-style" name="gender" placeholder="Sexo biológico" value={answers.gender} onChange={h} />
      <input className="input-style" name="occupation" placeholder="Ocupación" value={answers.occupation} onChange={h} />
      <input className="input-style" name="contact" placeholder="Teléfono" value={answers.contact} onChange={h} />
      <textarea className="input-style sm:col-span-2" name="antecedentes" placeholder="Antecedentes médicos personales" value={answers.antecedentes} onChange={h} />
      <textarea className="input-style sm:col-span-2" name="familiares" placeholder="Antecedentes familiares" value={answers.familiares} onChange={h} />
      <textarea className="input-style sm:col-span-2" name="habitos" placeholder="Hábitos de vida" value={answers.habitos} onChange={h} />
      <textarea className="input-style" name="alergias" placeholder="Alergias" value={answers.alergias} onChange={h} />
      <textarea className="input-style" name="medicacion" placeholder="Medicación actual" value={answers.medicacion} onChange={h} />
    </div>
  );
}

function StepReason({ answers, onChange }: { answers: any, onChange: Function }) {
  const h = (e: any) => onChange('consultationReason', e.target.name, e.target.value);
  const toggle = (opt: string) => {
    const arr = answers.associated.includes(opt) ? answers.associated.filter((x: string) => x !== opt) : [...answers.associated, opt];
    onChange('consultationReason', 'associated', arr);
  };
  return (
    <div className="space-y-3 max-w-3xl mx-auto">
      <textarea className="input-style" name="reason" placeholder="Motivo principal" value={answers.reason} onChange={h} />
      <input className="input-style" name="duration" placeholder="Duración de síntomas" value={answers.duration} onChange={h} />
      <label className="block text-main dark:text-main">Severidad: {answers.severity}/10
        <input className="w-full" type="range" min={0} max={10} name="severity" value={answers.severity} onChange={(e) => onChange('consultationReason', 'severity', parseInt(e.target.value))} />
      </label>
      <textarea className="input-style" name="expectations" placeholder="Expectativas del paciente" value={answers.expectations} onChange={h} />
      <div>
        <div className="mb-1 font-medium text-main dark:text-main">Síntomas asociados</div>
        {['Fatiga', 'Insomnio', 'Estrés', 'Problemas digestivos'].map((opt) => (
          <label key={opt} className="inline-flex items-center gap-2 mr-4 mb-2">
            <input type="checkbox" checked={answers.associated.includes(opt)} onChange={() => toggle(opt)} /> {opt}
          </label>
        ))}
      </div>
    </div>
  );
}

function StepBodyMapHybrid({ sex, findings, onAdd, onRemoveIndex }: { sex: Sex; findings: PainFinding[]; onAdd: (f: PainFinding) => void; onRemoveIndex: (i: number) => void }) {
  const [overlay, setOverlay] = useState<{ open: boolean; region: RegionKey | null }>({ open: false, region: null });

  const openRegion = (region: RegionKey) => setOverlay({ open: true, region });
  const close = () => setOverlay({ open: false, region: null });
  
  const formatFactors = (factors: string[] = []): string => {
      if (factors.length === 0) return '';
      
      const aggravates = factors
          .filter(f => f.startsWith('empeora_'))
          .map(f => f.replace('empeora_', ''))
          .join(', ');
          
      const alleviates = factors
          .filter(f => f.startsWith('alivia_'))
          .map(f => f.replace('alivia_', ''))
          .join(', ');
  
      let parts = [];
      if (aggravates) parts.push(`Empeora: ${aggravates}`);
      if (alleviates) parts.push(`Alivia: ${alleviates}`);
      
      return parts.length > 0 ? `· ${parts.join('; ')}` : '';
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div>
        <AnatomicalSVG sex={sex} onRegionClick={openRegion} />
        <p className="text-xs text-gray-500 dark:text-text-muted-dark mt-2">Toca una zona para describir el dolor. Regiones grandes y botones grandes: ideal para adultos mayores.</p>
      </div>
      <div>
        <h4 className="font-semibold mb-2 text-main dark:text-main">Zonas seleccionadas</h4>
        {findings.length === 0 && <div className="text-sm text-gray-500 dark:text-text-muted-dark">Nada aún. Toca el cuerpo para agregar.</div>}
        <ul className="space-y-2">
          {findings.map((f, i) => (
            <li key={i} className="border border-border-main dark:border-border-dark rounded-lg p-3 flex items-center justify-between">
              <div className="text-sm">
                <div className="font-medium text-main dark:text-main capitalize">{labelRegion(f.region)} ({f.side})</div>
                <div className="text-gray-600 dark:text-text-muted-dark capitalize">{f.quality} · Intensidad {f.intensity}/10 {formatFactors(f.factors)}</div>
              </div>
              <button className="btn-ghost" onClick={() => onRemoveIndex(i)}>Eliminar</button>
            </li>
          ))}
        </ul>
      </div>

      {overlay.open && overlay.region && (
        <MiniQuestionnaire
          region={overlay.region}
          onCancel={close}
          onConfirm={(payload) => { onAdd(payload); close(); }}
        />
      )}
    </div>
  );
}

function labelRegion(k: RegionKey) {
  const map: Record<RegionKey, string> = {
    cabeza: 'Cabeza', cuello: 'Cuello', pecho: 'Pecho', abdomen: 'Abdomen', pelvis: 'Pelvis',
    mama_izq: 'Mama izquierda', mama_der: 'Mama derecha',
    hombro_izq: 'Hombro izquierdo', hombro_der: 'Hombro derecho',
    brazo_sup_izq: 'Brazo izq.', brazo_sup_der: 'Brazo der.',
    codo_izq: 'Codo izq.', codo_der: 'Codo der.',
    antebrazo_izq: 'Antebrazo izq.', antebrazo_der: 'Antebrazo der.',
    mano_izq: 'Mano izq.', mano_der: 'Mano der.',
    muslo_izq: 'Muslo izq.', muslo_der: 'Muslo der.',
    rodilla_izq: 'Rodilla izq.', rodilla_der: 'Rodilla der.',
    pierna_izq: 'Pierna izq.', pierna_der: 'Pierna der.',
    pie_izq: 'Pie izq.', pie_der: 'Pie der.',
  };
  return map[k];
}

function AnatomicalSVG({ sex, onRegionClick }: { sex: Sex; onRegionClick: (r: RegionKey) => void }) {
  const R = ({ id, d, fill, label, onClick }: any) => (
    <path
      d={d}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick()}
      aria-label={label}
      className="transition-all outline-none focus:ring-2 focus:ring-offset-1"
      style={{ fill, cursor: 'pointer', opacity: 0.85 }}
    />
  );

  return (
    <svg viewBox="0 0 260 640" className="w-full h-auto bg-white rounded-xl shadow-sm">
      <g fill="none" stroke="#1f2937" strokeOpacity="0.15" strokeWidth="2">
        <path d="M130 30c-18 0-30 14-30 28v16c-16 10-26 28-30 52-2 15-10 28-20 40-10 12-16 26-16 42 0 14 4 28 10 40 3 6 6 12 6 18v46c0 22 10 36 30 44 8 4 12 10 14 18l8 44c4 16 16 28 32 28s28-12 32-28l8-44c2-8 6-14 14-18 20-8 30-22 30-44v-46c0-6 3-12 6-18 6-12 10-26 10-40 0-16-6-30-16-42-10-12-18-25-20-40-4-24-14-42-30-52V58c0-14-12-28-30-28z" />
      </g>
      <R id="cabeza" label="Cabeza" fill="#cbd5e1" onClick={() => onRegionClick('cabeza')}
        d="M130 36c-14 0-24 10-24 22s10 22 24 22 24-10 24-22-10-22-24-22z" />
      <R id="cuello" label="Cuello" fill="#cbd5e1" onClick={() => onRegionClick('cuello')}
        d="M116 80h28c2 0 4 2 4 4v14c0 6-8 10-18 10s-18-4-18-10V84c0-2 2-4 4-4z" />
      <R id="pecho" label="Pecho" fill="#cbd5e1" onClick={() => onRegionClick('pecho')}
        d="M84 108c14-8 32-12 46-12s32 4 46 12c8 4 12 12 12 20v18c0 12-10 22-22 22H94c-12 0-22-10-22-22v-18c0-8 4-16 12-20z" />
      {sex === 'female' && (
        <>
          <R id="mama_izq" label="Mama izquierda" fill="#cbd5e1" onClick={() => onRegionClick('mama_izq')}
            d="M98 142c-10 0-16 8-16 16s6 16 16 16 16-8 16-16-6-16-16-16z" />
          <R id="mama_der" label="Mama derecha" fill="#cbd5e1" onClick={() => onRegionClick('mama_der')}
            d="M162 142c10 0 16 8 16 16s-6 16-16 16-16-8-16-16 6-16 16-16z" />
        </>
      )}
      <R id="abdomen" label="Abdomen" fill="#cbd5e1" onClick={() => onRegionClick('abdomen')}
        d="M92 170h76c6 0 10 4 10 10v30c0 16-14 28-30 28h-36c-16 0-30-12-30-28v-30c0-6 4-10 10-10z" />
      <R id="pelvis" label="Pelvis" fill="#cbd5e1" onClick={() => onRegionClick('pelvis')}
        d="M98 238h64c6 0 10 4 10 10v16c0 10-10 20-22 20h-40c-12 0-22-10-22-20v-16c0-6 4-10 10-10z" />
      <R id="hombro_izq" label="Hombro izquierdo" fill="#cbd5e1" onClick={() => onRegionClick('hombro_izq')}
        d="M76 118c-10 0-18 8-24 16s-10 16-10 22 10 10 18 8 18-8 22-16 6-16 2-22-4-8-8-8z" />
      <R id="hombro_der" label="Hombro derecho" fill="#cbd5e1" onClick={() => onRegionClick('hombro_der')}
        d="M184 118c10 0 18 8 24 16s10 16 10 22-10 10-18 8-18-8-22-16-6-16-2-22 4-8 8-8z" />
      <R id="brazo_sup_izq" label="Brazo superior izquierdo" fill="#cbd5e1" onClick={() => onRegionClick('brazo_sup_izq')}
        d="M60 152c-6 0-12 6-14 12-6 18-6 38 2 56 4 10 16 14 22 10 10-6 12-18 12-28 0-12-2-24-6-36-2-8-8-14-16-14z" />
      <R id="brazo_sup_der" label="Brazo superior derecho" fill="#cbd5e1" onClick={() => onRegionClick('brazo_sup_der')}
        d="M200 152c6 0 12 6 14 12 6 18 6 38-2 56-4 10-16 14-22 10-10-6-12-18-12-28 0-12 2-24 6-36 2-8 8-14 16-14z" />
      <R id="codo_izq" label="Codo izquierdo" fill="#cbd5e1" onClick={() => onRegionClick('codo_izq')}
        d="M62 224c-10 2-18 16-12 26 4 8 12 10 22 8 8-2 14-10 12-18-2-10-14-18-22-16z" />
      <R id="codo_der" label="Codo derecho" fill="#cbd5e1" onClick={() => onRegionClick('codo_der')}
        d="M198 224c10 2 18 16 12 26-4 8-12 10-22 8-8-2-14-10-12-18 2-10 14-18 22-16z" />
      <R id="antebrazo_izq" label="Antebrazo izquierdo" fill="#cbd5e1" onClick={() => onRegionClick('antebrazo_izq')}
        d="M54 248c-10 0-14 12-14 22 0 18 4 36 14 50 6 8 18 8 24 0 6-10 6-22 4-32s-4-22-10-32c-4-6-10-8-18-8z" />
      <R id="antebrazo_der" label="Antebrazo derecho" fill="#cbd5e1" onClick={() => onRegionClick('antebrazo_der')}
        d="M206 248c10 0 14 12 14 22 0 18-4 36-14 50-6 8-18 8-24 0-6-10-6-22-4-32s4-22 10-32c4-6 10-8 18-8z" />
      <R id="mano_izq" label="Mano izquierda" fill="#cbd5e1" onClick={() => onRegionClick('mano_izq')}
        d="M60 322c-10 0-18 8-18 18 0 10 8 18 18 18 12 0 20-8 20-18s-8-18-20-18z" />
      <R id="mano_der" label="Mano derecha" fill="#cbd5e1" onClick={() => onRegionClick('mano_der')}
        d="M200 322c10 0 18 8 18 18 0 10-8 18-18 18-12 0-20-8-20-18s8-18 20-18z" />
      <R id="muslo_izq" label="Muslo izquierdo" fill="#cbd5e1" onClick={() => onRegionClick('muslo_izq')}
        d="M106 274c-16 0-28 10-30 26-2 18 0 40 6 60 4 12 12 20 24 20h10c8 0 12-8 12-16v-80c0-6-8-10-22-10z" />
      <R id="muslo_der" label="Muslo derecho" fill="#cbd5e1" onClick={() => onRegionClick('muslo_der')}
        d="M154 274c16 0 28 10 30 26 2 18 0 40-6 60-4 12-12 20-24 20h-10c-8 0-12-8-12-16v-80c0-6 8-10 22-10z" />
      <R id="rodilla_izq" label="Rodilla izquierda" fill="#cbd5e1" onClick={() => onRegionClick('rodilla_izq')}
        d="M110 384c-10 0-18 8-18 18s8 18 18 18 18-8 18-18-8-18-18-18z" />
      <R id="rodilla_der" label="Rodilla derecha" fill="#cbd5e1" onClick={() => onRegionClick('rodilla_der')}
        d="M150 384c10 0 18 8 18 18s-8 18-18 18-18-8-18-18 8-18 18-18z" />
      <R id="pierna_izq" label="Pierna izquierda" fill="#cbd5e1" onClick={() => onRegionClick('pierna_izq')}
        d="M106 416c-12 0-20 8-20 20v64c0 12 8 22 20 22h10c8 0 12-6 12-14v-80c0-6-10-12-22-12z" />
      <R id="pierna_der" label="Pierna derecha" fill="#cbd5e1" onClick={() => onRegionClick('pierna_der')}
        d="M154 416c12 0 20 8 20 20v64c0 12-8 22-20 22h-10c-8 0-12-6-12-14v-80c0-6 10-12 22-12z" />
      <R id="pie_izq" label="Pie izquierdo" fill="#cbd5e1" onClick={() => onRegionClick('pie_izq')}
        d="M104 524c-16 0-28 8-28 16 0 8 10 12 24 12h18c8 0 14-6 14-12 0-8-8-16-28-16z" />
      <R id="pie_der" label="Pie derecho" fill="#cbd5e1" onClick={() => onRegionClick('pie_der')}
        d="M156 524c16 0 28 8 28 16 0 8-10 12-24 12h-18c-8 0-14-6-14-12 0-8 8-16 28-16z" />
    </svg>
  );
}

function MiniQuestionnaire({ region, onCancel, onConfirm }: { region: RegionKey; onCancel: () => void; onConfirm: (f: PainFinding) => void }) {
  const [side, setSide] = useState<'izquierdo' | 'derecho' | 'ambos' | 'medio'>(defaultSide(region));
  const [quality, setQuality] = useState<PainFinding['quality']>('punzante');
  const [intensity, setIntensity] = useState(5);
  const [factors, setFactors] = useState<string[]>([]);

  const toggleFactor = (prefix: 'empeora' | 'alivia', factor: string) => {
    const key = `${prefix}_${factor}`;
    setFactors(currentFactors =>
      currentFactors.includes(key)
        ? currentFactors.filter(f => f !== key)
        : [...currentFactors, key]
    );
  };
  
  const factorOptions = [
      { key: 'movimiento', label: 'Con Movimiento' },
      { key: 'reposo', label: 'Con Reposo' },
      { key: 'frío', label: 'Con el Frío' },
      { key: 'calor', label: 'Con el Calor' },
      { key: 'presión', label: 'Al Presionar' },
  ];
  
  const FactorButton = ({ label, isSelected, onToggle }: { label: string, isSelected: boolean, onToggle: () => void }) => (
      <label className={`cursor-pointer p-2 px-3 rounded-full border text-sm font-medium transition-colors ${isSelected ? 'bg-primary text-white border-primary' : 'bg-bg-main dark:bg-surface-dark border-border-main dark:border-border-dark'}`}>
          <input type="checkbox" checked={isSelected} onChange={onToggle} className="sr-only" />
          {label}
      </label>
  );

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white dark:bg-bg-dark w-full max-w-md rounded-2xl shadow-lg p-4 space-y-4">
        <div className="text-lg font-semibold capitalize text-main dark:text-main">{labelRegion(region)}</div>

        {showsSide(region) && (
          <div>
            <div className="text-sm text-gray-600 dark:text-text-muted-dark mb-1">¿De qué lado?</div>
            <div className="grid grid-cols-3 gap-2">
              {(['izquierdo', 'derecho', 'ambos'] as const).map((s) => (
                <button key={s} onClick={() => setSide(s)} className={`btn-secondary ${side === s ? 'ring-2 ring-primary' : ''}`}>{s}</button>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="text-sm text-gray-600 dark:text-text-muted-dark mb-1">¿Cómo es el dolor?</div>
          <div className="grid grid-cols-3 gap-2">
            {qualityOptions.map((q) => (
              <button key={q.key} onClick={() => setQuality(q.key)} className={`btn-secondary flex items-center justify-center gap-2 ${quality === q.key ? 'ring-2 ring-primary' : ''}`}>
                <span aria-hidden>{q.emoji}</span> {q.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-text-muted-dark">
            <span>Intensidad</span><span>{intensity}/10</span>
          </div>
          <input type="range" min={0} max={10} value={intensity} onChange={(e) => setIntensity(parseInt(e.target.value))} className="w-full" />
          <div className="flex justify-between text-xs mt-1"><span>🙂</span><span>😖</span></div>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-text-muted-dark mb-2">¿Qué EMPEORA el dolor?</h4>
          <div className="flex flex-wrap gap-2">
            {factorOptions.map(f => (
              <FactorButton key={`empeora_${f.key}`} label={f.label} isSelected={factors.includes(`empeora_${f.key}`)} onToggle={() => toggleFactor('empeora', f.key)} />
            ))}
             <FactorButton key="empeora_nocturno" label="Por la Noche" isSelected={factors.includes('empeora_nocturno')} onToggle={() => toggleFactor('empeora', 'nocturno')} />
          </div>
        </div>
        
        <div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-text-muted-dark mb-2">¿Qué ALIVIA el dolor?</h4>
           <div className="flex flex-wrap gap-2">
            {factorOptions.map(f => (
              <FactorButton key={`alivia_${f.key}`} label={f.label} isSelected={factors.includes(`alivia_${f.key}`)} onToggle={() => toggleFactor('alivia', f.key)} />
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-border-main dark:border-border-dark">
          <button className="btn-secondary" onClick={onCancel}>Cancelar</button>
          <button className="btn-primary" onClick={() => onConfirm({ region, side, quality, intensity, factors })}>Guardar</button>
        </div>
      </div>
    </div>
  );
}

const qualityOptions: { key: PainFinding['quality']; label: string; emoji: string }[] = [
  { key: 'punzante', label: 'Punzante', emoji: '⚡' },
  { key: 'quemante', label: 'Quemante', emoji: '🔥' },
  { key: 'presion', label: 'Presión', emoji: '🔒' },
  { key: 'intermitente', label: 'Intermitente', emoji: '🌊' },
  { key: 'ardor', label: 'Ardor', emoji: '💥' },
  { key: 'calambre', label: 'Calambre', emoji: '🌀' },
];

function showsSide(region: RegionKey) {
  const unilateral: RegionKey[] = ['cabeza', 'cuello', 'pecho', 'abdomen', 'pelvis'];
  return !unilateral.includes(region);
}

function defaultSide(region: RegionKey): 'izquierdo' | 'derecho' | 'ambos' | 'medio' {
  if (region.endsWith('_izq') || region.endsWith('_der')) {
      return region.includes('_izq') ? 'izquierdo' : 'derecho';
  }
  return showsSide(region) ? 'izquierdo' : 'medio';
}

function StepMTC({ answers, onChange }: { answers: any, onChange: Function }) {
  const h = (e: any) => onChange('mtc', e.target.name, e.target.value);
  return (
    <div className="grid sm:grid-cols-2 gap-3 max-w-3xl mx-auto">
      <input className="input-style" name="apetito" placeholder="Apetito/Digestión" value={answers.apetito} onChange={h} />
      <input className="input-style" name="sueno" placeholder="Sueño" value={answers.sueno} onChange={h} />
      <input className="input-style" name="emociones" placeholder="Emociones predominantes" value={answers.emociones} onChange={h} />
      <input className="input-style" name="sudor" placeholder="Sudoración" value={answers.sudor} onChange={h} />
      <input className="input-style sm:col-span-2" name="sed" placeholder="Sed y preferencias" value={answers.sed} onChange={h} />
    </div>
  );
}

const tongueFeatures = ['Pálida', 'Roja', 'Púrpura', 'Saburra Blanca', 'Saburra Amarilla', 'Saburra Gruesa', 'Grietas', 'Marcas Dentales', 'Punta Roja', 'Hincha', 'Delgada', 'Seca', 'Húmeda'];

function StepTongue({ answers, onToggle }: { answers: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2 max-w-3xl mx-auto">
      {tongueFeatures.map((f) => (
        <label key={f} className={`px-3 py-1 rounded-full border cursor-pointer ${answers.includes(f) ? 'bg-primary text-white border-primary' : 'bg-white dark:bg-bg-alt border-border-main dark:border-border-dark'}`}>
          <input type="checkbox" className="hidden" checked={answers.includes(f)} onChange={() => onToggle(f)} /> {f}
        </label>
      ))}
    </div>
  );
}

function StepSummary({ answers, onExport }: { answers: any; onExport: () => void }) {
  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <h4 className="text-lg font-semibold text-main dark:text-main">Resumen</h4>
      <section className="bg-gray-50 dark:bg-bg-dark p-3 rounded">
        <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(answers, null, 2)}</pre>
      </section>
      <div className="flex gap-2">
        <button onClick={onExport} className="btn-secondary">Descargar PDF</button>
        <button className="btn-secondary" onClick={() => navigator.share?.({ title: 'Consulta Inicial', text: 'Resumen', url: window.location.href })}>Compartir</button>
      </div>
    </div>
  );
}

// --- END OF CLINICAL WIZARD ---

const ChatInterface = ({ messages, onSendMessage, user, adminId }: { messages: ChatMessage[], onSendMessage: Function, user: User, adminId: number | null }) => {
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = () => {
        if (newMessage.trim() && adminId) {
            onSendMessage({ text: newMessage, recipientId: adminId });
            setNewMessage('');
        }
    };
    return <PageWrapper title="Chat con la Clínica">
        <div className="flex flex-col h-[65vh] bg-bg-alt dark:bg-bg-alt/50 rounded-lg">
            <div className="flex-grow p-4 overflow-y-auto space-y-4">
                {messages.map(msg => (
                    <div key={msg.id} className={`flex items-end gap-2 ${msg.senderId === user.id ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-md p-3 rounded-lg ${msg.senderId === user.id ? 'bg-accent-warm text-primary rounded-br-none' : 'bg-white dark:bg-border-dark text-main dark:text-white rounded-bl-none'}`}>
                            <p className="text-sm">{msg.text}</p>
                            <p className={`text-xs mt-1 ${msg.senderId === user.id ? 'text-primary/70' : 'text-muted dark:text-white/70'}`}>{msg.timestamp}</p>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <div className="p-4 border-t border-border-main dark:border-border-dark bg-bg-main dark:bg-surface-dark">
                <div className="flex items-center gap-2">
                    <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSendMessage()} placeholder="Escriba su mensaje..." className="flex-grow px-3 py-2 bg-bg-main dark:bg-bg-main dark:text-main border border-border-main dark:border-border-dark rounded-full focus:outline-none focus:ring-2 focus:ring-primary-light"/>
                    <button onClick={handleSendMessage} className="bg-primary text-white p-3 rounded-full hover:opacity-90 transition-opacity">
                        <SendIcon className="w-5 h-5"/>
                    </button>
                </div>
            </div>
        </div>
    </PageWrapper>;
};