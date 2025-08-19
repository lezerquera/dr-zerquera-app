import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { NavLink, Route, Routes, Link, useLocation, useParams, useNavigate } from 'react-router-dom';
import type { DoctorProfile, Service, Appointment, ChatMessage, ClinicInfo, Insurance, User, FormTemplate, PatientFormSubmission, Question, ClinicalWizardAnswers, BodyPainPoint } from '../types';
import { 
    CalendarIcon, UsersIcon, StethoscopeIcon, MessageSquareIcon, ClipboardIcon, SparklesIcon, SendIcon, 
    CheckCircleIcon, TargetIcon, RefreshCwIcon, ClockIcon, ShieldIcon, MapPinIcon, PhoneIcon,
    WhatsAppIcon, LightbulbIcon, GraduationCapIcon, BriefcaseIcon, AlertTriangleIcon, BuildingIcon, DesktopIcon, MailIcon, ClipboardListIcon, ChevronLeftIcon, ChevronRightIcon,
    SnowflakeIcon, FlameIcon, SunIcon, MoonIcon, ArrowHorizontalIcon, CircleDashedIcon, ZapIcon, HourglassIcon, EditIcon, TrashIcon
} from '../components/Icons';
import { PageWrapper } from '../components/PageWrapper';
import { Modal } from '../components/Modal';
import { generateChatSummary } from '../services/geminiService';
import { InsuranceCarousel } from '../components/InsuranceCarousel';

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

const PatientView: React.FC<PatientViewProps> = (props) => {
    return (
        <div className="flex flex-col md:flex-row gap-8">
            <aside className="md:w-64 flex-shrink-0">
                <nav className="flex flex-col gap-2 p-4 bg-bg-main dark:bg-surface-dark rounded-lg shadow-md">
                    <PatientNavLink to="" icon={<ClipboardIcon className="w-5 h-5"/>} label="Panel"/>
                    <PatientNavLink to="services" icon={<StethoscopeIcon className="w-5 h-5"/>} label="Servicios"/>
                    <PatientNavLink to="dr-zerquera" icon={<UsersIcon className="w-5 h-5"/>} label="Dr. Zerquera"/>
                    <PatientNavLink to="appointments" icon={<CalendarIcon className="w-5 h-5"/>} label="Solicitar Cita"/>
                    <PatientNavLink to="forms" icon={<ClipboardListIcon className="w-5 h-5"/>} label="Mis Formularios"/>
                    <PatientNavLink to="chat" icon={<MessageSquareIcon className="w-5 h-5"/>} label="Chat"/>
                </nav>
            </aside>
            <div className="flex-grow bg-bg-main dark:bg-surface-dark rounded-lg shadow-md overflow-hidden">
                <Routes>
                    <Route index element={<Dashboard appointments={props.appointments} clinicInfo={props.clinicInfo} acceptedInsurances={props.acceptedInsurances} />} />
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

const Dashboard = ({ appointments, clinicInfo, acceptedInsurances }: { appointments: Appointment[], clinicInfo: ClinicInfo, acceptedInsurances: Insurance[] }) => {
    
    return (
        <PageWrapper title="Panel del Paciente">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Main Content Area */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Welcome Banner */}
                    <div className="relative bg-gradient-to-br from-primary to-primary-light text-white p-8 rounded-xl shadow-lg overflow-hidden">
                        <div className="absolute -right-10 -top-10 w-48 h-48 bg-white/10 rounded-full"></div>
                        <div className="absolute -left-12 -bottom-16 w-40 h-40 bg-white/10 rounded-full"></div>
                        <h2 className="text-3xl font-bold mb-2 z-10 relative">Bienvenido a su Portal</h2>
                        <p className="max-w-md z-10 relative">Desde aquí puede gestionar sus citas, comunicarse con nosotros y rellenar formularios para agilizar su consulta.</p>
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <QuickActionCard to="appointments" icon={<CalendarIcon className="w-6 h-6 text-primary"/>} title="Solicitar Cita" description="Programe su próxima visita." />
                        <QuickActionCard to="forms" icon={<ClipboardListIcon className="w-6 h-6 text-primary"/>} title="Formularios" description="Vea y rellene sus formularios." />
                        <QuickActionCard to="chat" icon={<MessageSquareIcon className="w-6 h-6 text-primary"/>} title="Chat" description="Comuníquese con la clínica." />
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
        <PageWrapper title="Conozca al Dr. Zerquera">
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
        return <ClinicalWizard template={template} user={user} onSubmitSuccess={handleSubmitSuccess} />;
    }

    return <GenericFormFiller template={template} token={token} onSubmitSuccess={handleSubmitSuccess} />;
};

// --- START OF NEW CLINICAL WIZARD ---
const wizardSteps = [
    { number: 1, title: "Bienvenida" },
    { number: 2, title: "Datos Generales" },
    { number: 3, title: "Motivo de Consulta" },
    { number: 4, title: "Mapa Corporal del Dolor" },
    { number: 5, title: "Principios MTC" },
    { number: 6, title: "Evaluación de Lengua" },
    { number: 7, title: "Resumen y Envío" },
];

const ClinicalWizard = ({ template, user, onSubmitSuccess }: { template: FormTemplate, user: User, onSubmitSuccess: () => void }) => {
    const [step, setStep] = useState(1);
    const [answers, setAnswers] = useState<ClinicalWizardAnswers>({
        generalData: { fullName: user.name, age: '', gender: '', occupation: '', contact: '' },
        consultationReason: { reason: '', duration: '' },
        bodyMap: [],
        mtc: { coldHeat: 'Frío', dayNight: 'Día', fullEmpty: 'Plenitud', onset: 'Agudo' },
        tongue: []
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const navigate = useNavigate();
    
    const totalSteps = wizardSteps.length;

    const handleNext = () => setStep(prev => Math.min(prev + 1, totalSteps));
    const handleBack = () => setStep(prev => Math.max(prev - 1, 1));
    const goToStep = (stepNumber: number) => setStep(stepNumber);

    const handleAnswerChange = (section: keyof ClinicalWizardAnswers, field: string, value: any) => {
        setAnswers(prev => ({
            ...prev,
            [section]: {
                ...(prev[section] as object),
                [field]: value,
            },
        }));
    };
    
    const handleMTCChange = (field: keyof NonNullable<ClinicalWizardAnswers['mtc']>, value: string) => {
         setAnswers(prev => ({ ...prev, mtc: { ...(prev.mtc!), [field]: value } }));
    }
    
    const handleTongueChange = (value: string) => {
        setAnswers(prev => {
            const currentTongue = prev.tongue || [];
            const newTongue = currentTongue.includes(value)
                ? currentTongue.filter(item => item !== value)
                : [...currentTongue, value];
            return { ...prev, tongue: newTongue };
        });
    }

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const response = await fetch(`${API_BASE_URL}/forms/submissions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
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

    const renderStepContent = () => {
        switch (step) {
            case 1: return <StepWelcome onNext={handleNext} description={template.description} />;
            case 2: return <StepGeneralData answers={answers.generalData!} onChange={handleAnswerChange} />;
            case 3: return <StepReason answers={answers.consultationReason!} onChange={handleAnswerChange} />;
            case 4: return <StepBodyMap answers={answers} setAnswers={setAnswers} />;
            case 5: return <StepMTC answers={answers.mtc!} onChange={handleMTCChange} />;
            case 6: return <StepTongue answers={answers.tongue!} onChange={handleTongueChange} />;
            case 7: return <StepSummary answers={answers} goToStep={goToStep} onSubmit={handleSubmit} isSubmitting={isSubmitting} />;
            default: return null;
        }
    };

    return (
        <PageWrapper title={template.title}>
            <div className="bg-bg-alt dark:bg-bg-alt/50 p-4 sm:p-8 rounded-xl shadow-lg">
                <WizardProgress currentStep={step} totalSteps={totalSteps} />
                <div className="mt-8">
                    {renderStepContent()}
                </div>
                <div className="mt-8 pt-6 border-t border-border-main dark:border-border-dark flex justify-between items-center">
                    <button onClick={handleBack} disabled={step === 1} className="btn-secondary disabled:opacity-50">
                        <ChevronLeftIcon className="w-4 h-4 mr-1 inline"/> Anterior
                    </button>
                    {step < totalSteps ? (
                         <button onClick={handleNext} className="btn-primary">
                            Siguiente <ChevronRightIcon className="w-4 h-4 ml-1 inline"/>
                        </button>
                    ) : (
                         <button onClick={handleSubmit} disabled={isSubmitting} className="btn-primary bg-accent-turquoise text-white">
                            {isSubmitting ? 'Enviando...' : 'Finalizar y Enviar'}
                        </button>
                    )}
                </div>
            </div>
            <style>{`
                .btn-primary { padding: 10px 20px; font-weight: 600; color: #FFFFFF; background-color: #083C70; border-radius: 8px; transition: opacity 0.2s; }
                .btn-primary:hover { opacity: 0.9; }
                .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
                .btn-secondary { padding: 10px 20px; font-weight: 600; background-color: #e5e7eb; border-radius: 8px; }
                .dark .btn-secondary { background-color: #4b5563; color: #E6F1FF; }
            `}</style>
        </PageWrapper>
    );
};

const WizardProgress = ({ currentStep, totalSteps }: { currentStep: number, totalSteps: number }) => (
    <div>
        <p className="text-sm font-semibold text-accent-turquoise dark:text-primary mb-2">PASO {currentStep} DE {totalSteps}</p>
        <div className="bg-border-main dark:bg-border-dark rounded-full h-2.5">
            <div className="bg-primary h-2.5 rounded-full" style={{ width: `${(currentStep / totalSteps) * 100}%`, transition: 'width 0.3s ease-in-out' }}></div>
        </div>
        <h3 className="text-xl font-bold mt-2 text-main dark:text-main">{wizardSteps.find(s => s.number === currentStep)?.title}</h3>
    </div>
);

const WizardInput = ({ name, label, value, onChange, placeholder, type = "text" }: { name: string, label: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, placeholder?: string, type?: string }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-main dark:text-main mb-1">{label}</label>
        <input type={type} id={name} name={name} value={value} onChange={onChange} placeholder={placeholder} className="w-full p-2 border border-border-main dark:border-border-dark rounded-md bg-bg-main dark:bg-surface-dark" />
    </div>
);

const WizardTextarea = ({ name, label, value, onChange, placeholder }: { name: string, label: string, value: string, onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void, placeholder?: string }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-main dark:text-main mb-1">{label}</label>
        <textarea id={name} name={name} value={value} onChange={onChange} rows={4} placeholder={placeholder} className="w-full p-2 border border-border-main dark:border-border-dark rounded-md bg-bg-main dark:bg-surface-dark" />
    </div>
);

const StepWelcome = ({ onNext, description }: { onNext: () => void, description: string }) => (
    <div className="text-center">
        <SparklesIcon className="w-16 h-16 text-primary mx-auto mb-4" />
        <p className="text-lg text-muted dark:text-main/80 max-w-2xl mx-auto">{description}</p>
        <button onClick={onNext} className="mt-8 btn-primary">Comenzar</button>
    </div>
);

const StepGeneralData = ({ answers, onChange }: { answers: NonNullable<ClinicalWizardAnswers['generalData']>, onChange: Function }) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => onChange('generalData', e.target.name, e.target.value);
    return (
        <div className="max-w-xl mx-auto space-y-4">
            <p className="text-sm text-muted dark:text-main/80 mb-4">Por favor, confirma o completa tus datos personales.</p>
            <WizardInput name="fullName" label="Nombre Completo" value={answers.fullName} onChange={handleChange} />
            <div className="grid grid-cols-2 gap-4">
                <WizardInput name="age" label="Edad" value={answers.age} onChange={handleChange} type="number"/>
                <WizardInput name="gender" label="Sexo" value={answers.gender} onChange={handleChange} />
            </div>
            <WizardInput name="occupation" label="Ocupación" value={answers.occupation} onChange={handleChange} />
            <WizardInput name="contact" label="Teléfono de Contacto" value={answers.contact} onChange={handleChange} />
        </div>
    );
};

const StepReason = ({ answers, onChange }: { answers: NonNullable<ClinicalWizardAnswers['consultationReason']>, onChange: Function }) => {
    const handleReasonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => onChange('consultationReason', e.target.name, e.target.value);
    return (
        <div className="max-w-xl mx-auto space-y-6">
            <p className="text-sm text-muted dark:text-main/80 mb-4">Ayúdanos a entender mejor qué te trae a la consulta.</p>
            <WizardTextarea name="reason" label="¿Cuál es el motivo principal de tu consulta? Cuéntame qué te trae por aquí." value={answers.reason} onChange={handleReasonChange} placeholder="Ej: Dolor de espalda baja, migrañas, problemas digestivos..." />
            <WizardTextarea name="duration" label="¿Desde cuándo vienes sintiendo esto?" value={answers.duration} onChange={handleReasonChange} placeholder="Ej: Desde hace 2 semanas, unos 3 meses, varios años..." />
        </div>
    );
};

const SPECIFIC_AREAS_MAP: Record<string, string[]> = {
    "cabeza": ["Frente", "Sien Izquierda", "Sien Derecha", "Nuca", "Mandíbula Izquierda", "Mandíbula Derecha"],
    "cuello": ["Garganta", "Lado Izquierdo del Cuello", "Lado Derecho del Cuello", "Cervicales"],
    "pecho": ["Pecho Izquierdo", "Pecho Derecho", "Esternón"],
    "abdomen": ["Abdomen Superior", "Abdomen Inferior"],
    "costado-izquierdo": ["Costado Superior Izquierdo", "Costado Inferior Izquierdo"],
    "costado-derecho": ["Costado Superior Derecho", "Costado Inferior Derecho"],
    "brazo-izquierdo": ["Hombro Izquierdo", "Bícep/Trícep Izquierdo", "Codo Izquierdo", "Antebrazo Izquierdo", "Muñeca Izquierda"],
    "brazo-derecho": ["Hombro Derecho", "Bícep/Trícep Derecho", "Codo Derecho", "Antebrazo Derecho", "Muñeca Derecha"],
    "espalda-alta": ["Omóplato Izquierdo", "Omóplato Derecho", "Columna Dorsal"],
    "espalda-baja": ["Zona Lumbar Izquierda", "Zona Lumbar Derecha", "Zona Lumbar Central"],
    "pelvis": ["Ingle Izquierda", "Ingle Derecha", "Pubis"],
    "gluteos": ["Glúteo Izquierdo", "Glúteo Derecho", "Sacro"],
    "pierna-izquierda": ["Cadera Izquierda", "Muslo Izquierdo", "Rodilla Izquierda", "Espinilla Izquierda", "Pantorrilla Izquierda", "Tobillo Izquierdo"],
    "pierna-derecha": ["Cadera Derecha", "Muslo Derecho", "Rodilla Derecha", "Espinilla Derecha", "Pantorrilla Derecha", "Tobillo Derecho"],
};

const SpecificityModal = ({ isOpen, onClose, generalPartLabel, specificParts, onSelect }: { isOpen: boolean, onClose: () => void, generalPartLabel: string, specificParts: string[], onSelect: (part: string) => void }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Ha seleccionado '${generalPartLabel}'. ¿Puede ser más específico?`}>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {specificParts.map(part => (
                    <button
                        key={part}
                        onClick={() => onSelect(part)}
                        className="p-3 text-center bg-bg-alt dark:bg-surface-dark/50 rounded-lg shadow-sm hover:bg-accent-warm hover:text-primary transition-colors duration-200"
                    >
                        {part}
                    </button>
                ))}
            </div>
        </Modal>
    );
};

const BodyMapPart = ({ id, d, selected, onClick, label }: { id: string, d: string, selected: boolean, onClick: (id: string) => void, label: string }) => (
    <path
        id={id}
        d={d}
        className={`body-part ${selected ? 'selected' : ''}`}
        onClick={() => onClick(id)}
        aria-label={label}
    >
        <title>{label}</title>
    </path>
);

const BodyMapFront = ({ selectedParts, onClick }: { selectedParts: string[], onClick: (id: string) => void }) => (
    <svg viewBox="0 0 300 600" className="w-full h-auto max-w-sm mx-auto" aria-labelledby="body-map-front-title">
        <title id="body-map-front-title">Mapa corporal - Vista frontal</title>
        <g>
            <BodyMapPart id="cabeza" label="Cabeza" d="M120 70 a 30 35 0 1 1 60 0 a 30 35 0 1 1 -60 0" onClick={onClick} selected={selectedParts.includes('cabeza')} />
            <BodyMapPart id="cuello" label="Cuello" d="M140 105 L 140 125 L 160 125 L 160 105 Z" onClick={onClick} selected={selectedParts.includes('cuello')} />
            <BodyMapPart id="pecho" label="Pecho" d="M110 125 L 190 125 L 195 210 L 105 210 Z" onClick={onClick} selected={selectedParts.includes('pecho')} />
            <BodyMapPart id="abdomen" label="Abdomen" d="M105 210 L 195 210 L 185 290 L 115 290 Z" onClick={onClick} selected={selectedParts.includes('abdomen')} />
            <BodyMapPart id="pelvis" label="Pelvis" d="M115 290 L 185 290 L 175 340 L 125 340 Z" onClick={onClick} selected={selectedParts.includes('pelvis')} />
            <BodyMapPart id="brazo-izquierdo" label="Brazo Izquierdo" d="M90 135 L 80 270 L 100 275 L 110 125 Z" onClick={onClick} selected={selectedParts.includes('brazo-izquierdo')} />
            <BodyMapPart id="brazo-derecho" label="Brazo Derecho" d="M210 135 L 220 270 L 200 275 L 190 125 Z" onClick={onClick} selected={selectedParts.includes('brazo-derecho')} />
            <BodyMapPart id="mano-izquierda" label="Mano Izquierda" d="M80 270 C 70 280, 75 295, 85 295 L 100 275 Z" onClick={onClick} selected={selectedParts.includes('mano-izquierda')} />
            <BodyMapPart id="mano-derecha" label="Mano Derecha" d="M220 270 C 230 280, 225 295, 215 295 L 200 275 Z" onClick={onClick} selected={selectedParts.includes('mano-derecha')} />
            <BodyMapPart id="pierna-izquierda" label="Pierna Izquierda" d="M125 340 L 110 520 L 135 520 L 145 340 Z" onClick={onClick} selected={selectedParts.includes('pierna-izquierda')} />
            <BodyMapPart id="pierna-derecha" label="Pierna Derecha" d="M175 340 L 190 520 L 165 520 L 155 340 Z" onClick={onClick} selected={selectedParts.includes('pierna-derecha')} />
            <BodyMapPart id="pie-izquierdo" label="Pie Izquierdo" d="M110 520 L 95 535 L 135 535 L 135 520 Z" onClick={onClick} selected={selectedParts.includes('pie-izquierdo')} />
            <BodyMapPart id="pie-derecho" label="Pie Derecho" d="M190 520 L 205 535 L 165 535 L 165 520 Z" onClick={onClick} selected={selectedParts.includes('pie-derecho')} />
        </g>
    </svg>
);

const BodyMapBack = ({ selectedParts, onClick }: { selectedParts: string[], onClick: (id: string) => void }) => (
    <svg viewBox="0 0 300 600" className="w-full h-auto max-w-sm mx-auto" aria-labelledby="body-map-back-title">
        <title id="body-map-back-title">Mapa corporal - Vista trasera</title>
        <g>
            <BodyMapPart id="cabeza" label="Cabeza" d="M120 70 a 30 35 0 1 1 60 0 a 30 35 0 1 1 -60 0" onClick={onClick} selected={selectedParts.includes('cabeza')} />
            <BodyMapPart id="cuello" label="Cuello" d="M140 105 L 140 125 L 160 125 L 160 105 Z" onClick={onClick} selected={selectedParts.includes('cuello')} />
            <BodyMapPart id="espalda-alta" label="Espalda Alta" d="M110 125 L 190 125 L 195 210 L 105 210 Z" onClick={onClick} selected={selectedParts.includes('espalda-alta')} />
            <BodyMapPart id="espalda-baja" label="Espalda Baja" d="M105 210 L 195 210 L 185 290 L 115 290 Z" onClick={onClick} selected={selectedParts.includes('espalda-baja')} />
            <BodyMapPart id="gluteos" label="Glúteos" d="M115 290 L 185 290 L 175 340 L 125 340 Z" onClick={onClick} selected={selectedParts.includes('gluteos')} />
            <BodyMapPart id="brazo-izquierdo" label="Brazo Izquierdo" d="M90 135 L 80 270 L 100 275 L 110 125 Z" onClick={onClick} selected={selectedParts.includes('brazo-izquierdo')} />
            <BodyMapPart id="brazo-derecho" label="Brazo Derecho" d="M210 135 L 220 270 L 200 275 L 190 125 Z" onClick={onClick} selected={selectedParts.includes('brazo-derecho')} />
            <BodyMapPart id="mano-izquierda" label="Mano Izquierda" d="M80 270 C 70 280, 75 295, 85 295 L 100 275 Z" onClick={onClick} selected={selectedParts.includes('mano-izquierda')} />
            <BodyMapPart id="mano-derecha" label="Mano Derecha" d="M220 270 C 230 280, 225 295, 215 295 L 200 275 Z" onClick={onClick} selected={selectedParts.includes('mano-derecha')} />
            <BodyMapPart id="pierna-izquierda" label="Pierna Izquierda" d="M125 340 L 110 520 L 135 520 L 145 340 Z" onClick={onClick} selected={selectedParts.includes('pierna-izquierda')} />
            <BodyMapPart id="pierna-derecha" label="Pierna Derecha" d="M175 340 L 190 520 L 165 520 L 155 340 Z" onClick={onClick} selected={selectedParts.includes('pierna-derecha')} />
            <BodyMapPart id="pie-izquierdo" label="Pie Izquierdo" d="M110 520 L 95 535 L 135 535 L 135 520 Z" onClick={onClick} selected={selectedParts.includes('pie-izquierdo')} />
            <BodyMapPart id="pie-derecho" label="Pie Derecho" d="M190 520 L 205 535 L 165 535 L 165 520 Z" onClick={onClick} selected={selectedParts.includes('pie-derecho')} />
        </g>
    </svg>
);

const PainDetailModal = ({ bodyPart, onClose, onSave }: { bodyPart: string, onClose: () => void, onSave: (details: Omit<BodyPainPoint, 'bodyPart' | 'view'>) => void }) => {
    const [details, setDetails] = useState({ painType: 'Constante', intensity: 5, duration: '' });
    const painTypes = ['Constante', 'Punzante', 'Quemante', 'Palpitante', 'Irradiante', 'Sordo'];

    const handleSave = () => {
        onSave(details);
        onClose();
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={`Detalles del Dolor en ${bodyPart}`}>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium">Tipo de Dolor</label>
                    <select value={details.painType} onChange={e => setDetails(d => ({ ...d, painType: e.target.value }))} className="w-full p-2 border rounded-md bg-bg-main dark:bg-surface-dark">
                        {painTypes.map(type => <option key={type} value={type}>{type}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium">Intensidad (0-10)</label>
                    <div className="flex items-center gap-2">
                        <input type="range" min="0" max="10" value={details.intensity} onChange={e => setDetails(d => ({ ...d, intensity: parseInt(e.target.value) }))} className="w-full" />
                        <span className="font-bold text-lg">{details.intensity}</span>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium">Duración / Frecuencia</label>
                    <input type="text" value={details.duration} onChange={e => setDetails(d => ({ ...d, duration: e.target.value }))} placeholder="Ej: Ocurre por las mañanas" className="w-full p-2 border rounded-md bg-bg-main dark:bg-surface-dark" />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                    <button onClick={onClose} className="btn-secondary">Cancelar</button>
                    <button onClick={handleSave} className="btn-primary">Guardar</button>
                </div>
            </div>
        </Modal>
    );
};


const StepBodyMap = ({ answers, setAnswers }: { answers: ClinicalWizardAnswers, setAnswers: React.Dispatch<React.SetStateAction<ClinicalWizardAnswers>> }) => {
    const [view, setView] = useState<'front' | 'back'>('front');
    const [selectedPart, setSelectedPart] = useState<string | null>(null);
    const [refiningPart, setRefiningPart] = useState<string | null>(null);

    const SPECIFIC_TO_GENERAL_MAP: Record<string, string> = useMemo(() => {
        return Object.entries(SPECIFIC_AREAS_MAP).reduce((acc, [general, specifics]) => {
            specifics.forEach(specific => {
                acc[specific] = general;
            });
            return acc;
        }, {} as Record<string, string>);
    }, []);

    const handlePartClick = (partId: string) => {
        if (SPECIFIC_AREAS_MAP[partId]) {
            setRefiningPart(partId);
        } else {
            const isAlreadyAdded = (answers.bodyMap || []).some(p => p.bodyPart.toLowerCase() === partId.replace(/-/g, ' ') && p.view === view);
            if (isAlreadyAdded) {
                alert("Esta zona ya ha sido añadida. Puede eliminarla desde la lista de abajo.");
                return;
            }
            setSelectedPart(partId.replace(/-/g, ' '));
        }
    };
    
    const handleSelectSpecificPart = (specificPart: string) => {
        setRefiningPart(null);
        setSelectedPart(specificPart);
    };

    const handleSavePainDetails = (details: Omit<BodyPainPoint, 'bodyPart' | 'view'>) => {
        if (selectedPart) {
            const newPoint: BodyPainPoint = { ...details, bodyPart: selectedPart, view };
            setAnswers(prev => ({ ...prev, bodyMap: [...(prev.bodyMap || []), newPoint] }));
            setSelectedPart(null);
        }
    };

    const selectedPartsInView = (answers.bodyMap || [])
        .filter(p => p.view === view)
        .map(p => SPECIFIC_TO_GENERAL_MAP[p.bodyPart] || p.bodyPart.replace(/ /g, '-').toLowerCase());

    const removePainPoint = (indexToRemove: number) => {
        setAnswers(prev => ({
            ...prev,
            bodyMap: (prev.bodyMap || []).filter((_, index) => index !== indexToRemove)
        }));
    };

    return (
        <div className="max-w-2xl mx-auto">
            <style>{`
                .body-part { fill: #E9DFD3; stroke: #083C70; stroke-width: 1.5; cursor: pointer; transition: fill 0.2s; }
                .body-part:hover { fill: #1E5FA8; }
                .body-part.selected { fill: #C62828; }
                .dark .body-part { fill: #243A59; stroke: #C3EDF7; }
                .dark .body-part:hover { fill: #1E5FA8; }
                .dark .body-part.selected { fill: #C62828; }
            `}</style>
            
            <p className="text-sm text-muted dark:text-main/80 mb-4 text-center">Seleccione las áreas donde siente dolor o molestias. Puede seleccionar múltiples puntos.</p>
            
            <div className="flex justify-center items-center mb-4">
                <span className={`font-semibold ${view === 'front' ? 'text-primary' : 'text-muted'}`}>Frontal</span>
                <label className="relative inline-flex items-center cursor-pointer mx-4">
                    <input type="checkbox" checked={view === 'back'} onChange={() => setView(v => v === 'front' ? 'back' : 'front')} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                </label>
                <span className={`font-semibold ${view === 'back' ? 'text-primary' : 'text-muted'}`}>Trasera</span>
            </div>

            {view === 'front' ? <BodyMapFront selectedParts={selectedPartsInView} onClick={handlePartClick} /> : <BodyMapBack selectedParts={selectedPartsInView} onClick={handlePartClick} />}
            
            {refiningPart && (
                <SpecificityModal
                    isOpen={!!refiningPart}
                    onClose={() => setRefiningPart(null)}
                    generalPartLabel={refiningPart.replace(/-/g, ' ')}
                    specificParts={SPECIFIC_AREAS_MAP[refiningPart] || []}
                    onSelect={handleSelectSpecificPart}
                />
            )}
            
            {selectedPart && (
                <PainDetailModal
                    bodyPart={selectedPart}
                    onClose={() => setSelectedPart(null)}
                    onSave={handleSavePainDetails}
                />
            )}
            
            <div className="mt-6">
                <h4 className="font-semibold text-main dark:text-main">Puntos de Dolor Registrados:</h4>
                <ul className="mt-2 text-sm text-muted dark:text-main/80 space-y-2">
                    {(answers.bodyMap || []).length === 0 && <li className="italic">Ninguno</li>}
                    {answers.bodyMap?.map((point, index) => (
                        <li key={index} className="capitalize flex justify-between items-center p-2 bg-bg-main dark:bg-surface-dark/50 rounded-md">
                            <span>
                                {point.bodyPart} ({point.view === 'front' ? 'Frontal' : 'Trasero'}) - Intensidad: {point.intensity}/10
                            </span>
                            <button onClick={() => removePainPoint(index)} className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-full">
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

const MTC_OPTIONS = {
    coldHeat: { title: "Sensación Frío / Calor", icon1: <SnowflakeIcon className="w-8 h-8"/>, label1: "Frío", icon2: <FlameIcon className="w-8 h-8"/>, label2: "Calor" },
    dayNight: { title: "Predominio Día / Noche", icon1: <SunIcon className="w-8 h-8"/>, label1: "Día", icon2: <MoonIcon className="w-8 h-8"/>, label2: "Noche" },
    fullEmpty: { title: "Naturaleza Plenitud / Vacío", icon1: <ArrowHorizontalIcon className="w-8 h-8"/>, label1: "Plenitud", icon2: <CircleDashedIcon className="w-8 h-8"/>, label2: "Vacío" },
    onset: { title: "Inicio Agudo / Crónico", icon1: <ZapIcon className="w-8 h-8"/>, label1: "Agudo", icon2: <HourglassIcon className="w-8 h-8"/>, label2: "Crónico" },
};

const StepMTC = ({ answers, onChange }: { answers: NonNullable<ClinicalWizardAnswers['mtc']>, onChange: Function }) => (
    <div className="max-w-2xl mx-auto">
        <p className="text-sm text-muted dark:text-main/80 mb-6 text-center">Seleccione la opción que mejor describa sus síntomas según los principios de la Medicina Tradicional China (Bā Gāng).</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {Object.entries(MTC_OPTIONS).map(([key, opts]) => (
                <div key={key} className="bg-bg-main dark:bg-surface-dark p-4 rounded-lg shadow-sm">
                    <h4 className="text-center font-semibold text-main dark:text-main mb-3">{opts.title}</h4>
                    <div className="flex justify-around items-center">
                         <button type="button" onClick={() => onChange(key, opts.label1)} className={`p-3 flex flex-col items-center gap-1 rounded-lg transition-all ${answers[key as keyof typeof answers] === opts.label1 ? 'bg-primary text-white scale-105 shadow-md' : 'hover:bg-accent-warm/50'}`}>
                            {opts.icon1}
                            <span className="text-sm">{opts.label1}</span>
                         </button>
                         <button type="button" onClick={() => onChange(key, opts.label2)} className={`p-3 flex flex-col items-center gap-1 rounded-lg transition-all ${answers[key as keyof typeof answers] === opts.label2 ? 'bg-primary text-white scale-105 shadow-md' : 'hover:bg-accent-warm/50'}`}>
                            {opts.icon2}
                            <span className="text-sm">{opts.label2}</span>
                        </button>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const TONGUE_OPTIONS = [
  "Pálida", "Roja", "Púrpura", "Hinchada",
  "Fisurada", "Marcas dentales", "Saburra blanca", "Saburra amarilla",
  "Saburra espesa", "Saburra ausente", "Venas sublinguales oscuras"
];

const StepTongue = ({ answers, onChange }: { answers: string[], onChange: (value: string) => void }) => (
    <div className="max-w-xl mx-auto">
        <p className="text-sm text-muted dark:text-main/80 mb-4 text-center">Observe su lengua en un espejo y seleccione todas las características que correspondan.</p>
        <div className="flex flex-wrap gap-3 justify-center">
            {TONGUE_OPTIONS.map(opt => (
                <button
                    key={opt}
                    type="button"
                    onClick={() => onChange(opt)}
                    className={`px-4 py-2 text-sm font-medium rounded-full border-2 transition-colors ${answers.includes(opt) ? 'bg-primary text-white border-primary' : 'bg-transparent border-border-main dark:border-border-dark hover:border-primary'}`}
                >
                    {opt}
                </button>
            ))}
        </div>
    </div>
);

const StepSummary = ({ answers, goToStep, onSubmit, isSubmitting }: { answers: ClinicalWizardAnswers, goToStep: (n: number) => void, onSubmit: () => void, isSubmitting: boolean }) => {
    const SummarySection = ({ title, step, children }: { title: string, step: number, children: React.ReactNode }) => (
        <div className="bg-bg-main dark:bg-surface-dark p-4 rounded-lg shadow-sm">
            <div className="flex justify-between items-center mb-2">
                <h4 className="font-bold text-lg text-main dark:text-main">{title}</h4>
                <button onClick={() => goToStep(step)} className="text-sm text-primary dark:text-accent-turquoise font-semibold flex items-center gap-1"><EditIcon className="w-4 h-4"/> Editar</button>
            </div>
            <div className="text-muted dark:text-main/80 text-sm space-y-1">{children}</div>
        </div>
    );
    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <p className="text-center text-muted dark:text-main/80">Por favor, revise la información que ha proporcionado. Si todo es correcto, puede enviar el formulario.</p>
            <SummarySection title="Datos Generales" step={2}>
                <p><strong>Nombre:</strong> {answers.generalData?.fullName}</p>
                <p><strong>Edad:</strong> {answers.generalData?.age}, <strong>Sexo:</strong> {answers.generalData?.gender}</p>
                <p><strong>Ocupación:</strong> {answers.generalData?.occupation}</p>
            </SummarySection>
            <SummarySection title="Motivo de Consulta" step={3}>
                <p><strong>Razón:</strong> {answers.consultationReason?.reason}</p>
                <p><strong>Desde hace:</strong> {answers.consultationReason?.duration}</p>
            </SummarySection>
            {answers.bodyMap && answers.bodyMap.length > 0 && (
                 <SummarySection title="Mapa Corporal" step={4}>
                    <ul className="list-disc pl-4">
                        {answers.bodyMap.map((p, i) => (
                           <li key={i}><span className="capitalize">{p.bodyPart}</span> ({p.view === 'front' ? 'Frontal' : 'Trasero'}): {p.painType}, Intensidad {p.intensity}/10, {p.duration}</li>
                        ))}
                    </ul>
                </SummarySection>
            )}
            <SummarySection title="Principios MTC" step={5}>
                <p><strong>Sensación:</strong> {answers.mtc?.coldHeat}, <strong>Predominio:</strong> {answers.mtc?.dayNight}, <strong>Naturaleza:</strong> {answers.mtc?.fullEmpty}, <strong>Inicio:</strong> {answers.mtc?.onset}</p>
            </SummarySection>
             {answers.tongue && answers.tongue.length > 0 && (
                <SummarySection title="Evaluación de Lengua" step={6}>
                   <p>{answers.tongue.join(', ')}</p>
                </SummarySection>
             )}
        </div>
    );
};

// --- END OF NEW CLINICAL WIZARD ---

const GenericFormFiller = ({ template, token, onSubmitSuccess }: { template: FormTemplate, token: string, onSubmitSuccess: () => void }) => {
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleAnswerChange = (questionId: string, value: any) => {
        setAnswers(prev => ({ ...prev, [questionId]: value }));
    };

    const handleCheckboxChange = (questionId: string, option: string) => {
        const currentAnswers = answers[questionId] || [];
        const newAnswers = currentAnswers.includes(option)
            ? currentAnswers.filter((item: string) => item !== option)
            : [...currentAnswers, option];
        handleAnswerChange(questionId, newAnswers);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const response = await fetch(`${API_BASE_URL}/forms/submissions`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
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

    const renderQuestion = (q: Question) => {
        switch (q.type) {
            case 'text':
            case 'textarea':
                const InputComponent = q.type === 'text' ? 'input' : 'textarea';
                return <InputComponent value={answers[q.id] || ''} onChange={e => handleAnswerChange(q.id, e.target.value)} required={q.required} className="w-full p-2 border rounded-md" rows={q.type === 'textarea' ? 4 : undefined} />;
            case 'select':
                return (
                    <select value={answers[q.id] || ''} onChange={e => handleAnswerChange(q.id, e.target.value)} required={q.required} className="w-full p-2 border rounded-md">
                        <option value="">Seleccione...</option>
                        {q.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                );
            case 'radio':
                return (
                    <div className="space-y-2">
                        {q.options?.map(opt => (
                            <label key={opt} className="flex items-center">
                                <input type="radio" name={q.id} value={opt} checked={answers[q.id] === opt} onChange={e => handleAnswerChange(q.id, e.target.value)} required={q.required} className="h-4 w-4"/>
                                <span className="ml-2">{opt}</span>
                            </label>
                        ))}
                    </div>
                );
            case 'checkbox':
                 return (
                    <div className="space-y-2">
                        {q.options?.map(opt => (
                            <label key={opt} className="flex items-center">
                                <input type="checkbox" checked={(answers[q.id] || []).includes(opt)} onChange={() => handleCheckboxChange(q.id, opt)} className="h-4 w-4 rounded"/>
                                <span className="ml-2">{opt}</span>
                            </label>
                        ))}
                    </div>
                );
            default: return null;
        }
    }

    return (
        <PageWrapper title={`Rellenar: ${template.title}`}>
            <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6 bg-bg-alt dark:bg-bg-alt/50 p-6 rounded-lg">
                <p className="text-muted dark:text-main/80">{template.description}</p>
                {template.structure.map(q => (
                    <div key={q.id}>
                        <label className="block font-medium mb-2">{q.label} {q.required && <span className="text-red-500">*</span>}</label>
                        {renderQuestion(q)}
                    </div>
                ))}
                <div className="text-right">
                    <button type="submit" disabled={isSubmitting} className="bg-primary hover:opacity-90 text-white font-bold py-2 px-4 rounded-lg">
                        {isSubmitting ? 'Enviando...' : 'Enviar'}
                    </button>
                </div>
            </form>
        </PageWrapper>
    );
};

const PatientFormsManager = ({ token }: { token: string }) => {
    const [availableForms, setAvailableForms] = useState<FormTemplate[]>([]);
    const [submittedForms, setSubmittedForms] = useState<PatientFormSubmission[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [templatesRes, submissionsRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/forms/templates`, { headers: { 'Authorization': `Bearer ${token}` } }),
                    fetch(`${API_BASE_URL}/forms/my-submissions`, { headers: { 'Authorization': `Bearer ${token}` } })
                ]);
                if (!templatesRes.ok || !submissionsRes.ok) throw new Error('Failed to fetch form data');
                setAvailableForms(await templatesRes.json());
                setSubmittedForms(await submissionsRes.json());
            } catch (error) {
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [token]);

    const isSubmitted = (templateId: number) => submittedForms.some(sub => sub.templateId === templateId);

    return (
        <PageWrapper title="Mis Formularios">
            {isLoading ? <p>Cargando...</p> : (
                <div className="space-y-8">
                    <div>
                        <h3 className="text-xl font-semibold mb-4 text-accent-turquoise dark:text-primary">Formularios Disponibles</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {availableForms.map(form => (
                                <div key={form.id} className="p-4 bg-bg-alt dark:bg-bg-alt rounded-lg shadow-sm flex justify-between items-center">
                                    <div>
                                        <p className="font-bold text-main dark:text-main">{form.title}</p>
                                        <p className="text-sm text-muted dark:text-main/80">{form.description}</p>
                                    </div>
                                    <Link to={`/forms/fill/${form.id}`} className={`px-4 py-2 text-sm font-semibold rounded-lg ${isSubmitted(form.id) ? 'bg-gray-200 text-gray-600' : 'bg-primary text-white'}`}>
                                        {isSubmitted(form.id) ? 'Ver/Editar' : 'Rellenar'}
                                    </Link>
                                </div>
                            ))}
                        </div>
                    </div>
                     <div>
                        <h3 className="text-xl font-semibold mb-4 text-accent-turquoise dark:text-primary">Mis Envíos</h3>
                        {submittedForms.length > 0 ? (
                             <ul className="space-y-3">
                                {submittedForms.map(sub => (
                                    <li key={sub.id} className="p-4 bg-bg-alt dark:bg-bg-alt rounded-lg shadow-sm">
                                        <p className="font-bold text-main dark:text-main">{sub.title}</p>
                                        <p className="text-sm text-muted dark:text-main/80">Enviado el: {new Date(sub.submissionDate).toLocaleString('es-ES')}</p>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-muted dark:text-main/80">Aún no has enviado ningún formulario.</p>
                        )}
                    </div>
                </div>
            )}
        </PageWrapper>
    );
};

const ChatInterface = ({ messages, onSendMessage, user, adminId }: { messages: ChatMessage[], onSendMessage: PatientViewProps['sendChatMessage'], user: User, adminId: number | null }) => {
    const [newMessage, setNewMessage] = useState('');
    const [summary, setSummary] = useState<string | null>(null);
    const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const [hasNewMessage, setHasNewMessage] = useState(false);
    const prevMessagesLength = useRef(messages.length);

    useEffect(() => {
        if (messages.length > prevMessagesLength.current) {
            setHasNewMessage(true);
        }
        prevMessagesLength.current = messages.length;
    }, [messages.length]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, hasNewMessage]);
    
    const handleSendMessage = () => {
        if (!newMessage.trim() || !adminId) return;
        onSendMessage({
            text: newMessage,
            recipientId: adminId,
        });
        setNewMessage('');
    };

    const handleGenerateSummary = async () => {
        setIsGeneratingSummary(true);
        setSummary(null);
        try {
            const result = await generateChatSummary(messages);
            setSummary(result);
        } catch (error) {
            console.error("Error generating summary:", error);
            setSummary("No se pudo generar el resumen en este momento.");
        } finally {
            setIsGeneratingSummary(false);
        }
    };
    
    return (
        <PageWrapper title="Chat con la Clínica">
            <div className="flex flex-col h-[70vh] bg-bg-alt dark:bg-bg-alt/50 rounded-lg shadow-inner">
                <div className="flex justify-between items-center p-4 border-b border-border-main dark:border-border-dark">
                    <h3 className="font-semibold text-main dark:text-main">Conversación con el Dr. Zerquera</h3>
                     <button onClick={handleGenerateSummary} disabled={isGeneratingSummary || messages.length === 0} className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-primary bg-accent-warm rounded-full hover:opacity-90 disabled:opacity-50">
                        <SparklesIcon className="w-4 h-4"/>
                        {isGeneratingSummary ? "Generando..." : "Resumir Chat"}
                    </button>
                </div>
                {summary && (
                    <div className="p-4 bg-accent-warm/30 dark:bg-primary/10 border-b border-border-main dark:border-border-dark">
                        <h4 className="font-bold text-sm mb-2 text-primary dark:text-accent-turquoise">Resumen de la IA:</h4>
                        <p className="text-sm text-muted dark:text-main/80 whitespace-pre-wrap">{summary}</p>
                    </div>
                )}
                <div className="flex-grow overflow-y-auto p-4 space-y-4">
                    {messages.map(msg => (
                        <div key={msg.id} className={`flex items-end gap-2 ${msg.senderId === user.id ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-md p-3 rounded-lg shadow-sm ${msg.senderId === user.id ? 'bg-accent-warm text-primary rounded-br-none' : 'bg-bg-main dark:bg-surface-dark text-main dark:text-main rounded-bl-none'}`}>
                                <p className="text-sm">{msg.text}</p>
                                <p className={`text-xs mt-1 ${msg.senderId === user.id ? 'text-primary/70' : 'text-muted'}`}>{msg.timestamp}</p>
                            </div>
                        </div>
                    ))}
                    <div ref={chatEndRef}></div>
                </div>
                <div className="p-4 border-t border-border-main dark:border-border-dark bg-bg-main dark:bg-surface-dark">
                    <div className="flex items-center gap-2">
                        <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSendMessage()} placeholder="Escriba su mensaje..." className="flex-grow px-3 py-2 bg-bg-alt dark:bg-bg-main border border-border-main dark:border-border-dark rounded-full focus:outline-none focus:ring-2 focus:ring-primary-light dark:text-main"/>
                        <button onClick={handleSendMessage} className="bg-primary text-white p-3 rounded-full hover:opacity-90 transition-opacity">
                            <SendIcon className="w-5 h-5"/>
                        </button>
                    </div>
                </div>
            </div>
        </PageWrapper>
    );
};

export default PatientView;
