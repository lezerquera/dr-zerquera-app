import React, { useState } from 'react';
import { NavLink, Route, Routes, Link, useLocation } from 'react-router-dom';
import type { DoctorProfile, Service, Appointment, ChatMessage, ClinicInfo, Insurance, User } from '../types';
import { 
    CalendarIcon, UsersIcon, StethoscopeIcon, MessageSquareIcon, ClipboardIcon, SparklesIcon, SendIcon, 
    CheckCircleIcon, TargetIcon, RefreshCwIcon, ClockIcon, ShieldIcon, MapPinIcon, PhoneIcon,
    WhatsAppIcon, LightbulbIcon, GraduationCapIcon, BriefcaseIcon, AlertTriangleIcon
} from '../components/Icons';
import { PageWrapper } from '../components/PageWrapper';
import { Modal } from '../components/Modal';
import { generateChatSummary } from '../services/geminiService';
import { InsuranceCarousel } from '../components/InsuranceCarousel';

interface PatientViewProps {
  user: User;
  doctorProfile: DoctorProfile;
  services: Service[];
  appointments: Appointment[];
  chatMessages: ChatMessage[];
  clinicInfo: ClinicInfo;
  acceptedInsurances: Insurance[];
  requestAppointment: (appointment: Omit<Appointment, 'id' | 'status' | 'date' | 'time' | 'patientId'>) => void;
  sendChatMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
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
                    <PatientNavLink to="chat" icon={<MessageSquareIcon className="w-5 h-5"/>} label="Chat"/>
                </nav>
            </aside>
            <div className="flex-grow bg-bg-main dark:bg-surface-dark rounded-lg shadow-md overflow-hidden">
                <Routes>
                    <Route index element={<Dashboard appointments={props.appointments} clinicInfo={props.clinicInfo} acceptedInsurances={props.acceptedInsurances} />} />
                    <Route path="services" element={<ServicesList services={props.services} clinicInfo={props.clinicInfo} />} />
                    <Route path="dr-zerquera" element={<DoctorProfilePage doctorProfile={props.doctorProfile} />} />
                    <Route path="appointments" element={<AppointmentRequestForm services={props.services} requestAppointment={props.requestAppointment} clinicInfo={props.clinicInfo} user={props.user} />} />
                    <Route path="chat" element={<ChatInterface messages={props.chatMessages} onSendMessage={props.sendChatMessage} user={props.user} />} />
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
    const isBaseActive = to === '' && (location.pathname === '/' || location.pathname === '');
    const isActive = to ? location.pathname.includes(to) : isBaseActive;

    return (
        <NavLink to={to} end className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}>
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


const Dashboard = ({ appointments, clinicInfo, acceptedInsurances }: { appointments: Appointment[], clinicInfo: ClinicInfo, acceptedInsurances: Insurance[] }) => {
    const upcomingAppointments = appointments.filter(a => a.date && new Date(a.date) >= new Date() && a.status === 'Confirmada');
    
    return (
        <PageWrapper title="Panel del Paciente">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Main Content Area */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Welcome Banner */}
                    <div className="relative bg-gradient-to-br from-primary to-primary-light text-white p-8 rounded-xl shadow-lg overflow-hidden">
                        <div className="absolute -right-10 -top-10 w-32 h-32 bg-white/10 rounded-full z-0"></div>
                        <div className="absolute -left-16 -bottom-16 w-48 h-48 bg-white/10 rounded-full z-0"></div>
                        <div className="relative z-10">
                            <h2 className="text-3xl font-bold mb-2">¡Bienvenido de vuelta!</h2>
                            <p className="text-lg text-white/80 max-w-xl">
                                Gestione sus citas y comuníquese con nosotros fácilmente desde su panel de paciente.
                            </p>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div>
                        <h3 className="text-xl font-semibold mb-4 text-main dark:text-main">Acciones Rápidas</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <QuickActionCard 
                                to="appointments"
                                icon={<CalendarIcon className="w-6 h-6 text-primary" />}
                                title="Agendar Cita"
                                description="Solicite una nueva consulta con el Dr. Zerquera."
                            />
                            <QuickActionCard 
                                to="services"
                                icon={<StethoscopeIcon className="w-6 h-6 text-primary" />}
                                title="Ver Servicios"
                                description="Explore los tratamientos que ofrecemos para su bienestar."
                            />
                            <QuickActionCard 
                                to="chat"
                                icon={<MessageSquareIcon className="w-6 h-6 text-primary" />}
                                title="Contactar"
                                description="Envíe un mensaje seguro a nuestro equipo médico."
                            />
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="lg:col-span-1 space-y-8">
                    {/* Upcoming Appointments */}
                    <div className="bg-bg-alt dark:bg-bg-alt p-6 rounded-xl shadow-md h-full flex flex-col">
                        <h3 className="text-xl font-semibold mb-4 text-accent-turquoise dark:text-primary flex items-center gap-2"><CalendarIcon className="w-6 h-6" /> Próximas Citas</h3>
                        {upcomingAppointments.length > 0 ? (
                            <ul className="space-y-4">
                                {upcomingAppointments.map(app => (
                                    <li key={app.id} className="p-4 bg-bg-main dark:bg-border-dark rounded-lg shadow-sm border-l-4 border-accent-turquoise">
                                        <p className="font-bold text-main dark:text-text-light">{app.service.name}</p>
                                        <div className="mt-3 pt-3 border-t border-border-main dark:border-border-dark text-sm space-y-2">
                                            <div className="flex items-center gap-2 text-muted dark:text-text-muted-dark">
                                                <CalendarIcon className="w-4 h-4" />
                                                <span>{app.date ? new Date(`${app.date}T00:00:00`).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Fecha por confirmar'}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-muted dark:text-text-muted-dark">
                                                <ClockIcon className="w-4 h-4" />
                                                <span>{app.time || 'Hora por confirmar'}</span>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="text-center flex-grow flex flex-col items-center justify-center p-4 border-2 border-dashed border-border-main dark:border-border-dark rounded-lg">
                                <CalendarIcon className="w-12 h-12 text-muted dark:text-muted mb-3" />
                                <p className="text-muted dark:text-muted mb-4 font-medium">No tiene citas próximas.</p>
                                <Link to="appointments" className="bg-primary hover:opacity-90 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-opacity text-sm">
                                    Solicitar una Cita
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="mt-12">
               {acceptedInsurances.length > 0 && <InsuranceCarousel insurances={acceptedInsurances} />}
            </div>

            <div className="mt-12 max-w-4xl mx-auto">
                <div className="p-6 border-2 border-accent-red rounded-xl bg-accent-red/10">
                    <h3 className="flex items-center justify-center sm:justify-start gap-2 text-xl font-bold text-accent-red">
                        <AlertTriangleIcon className="w-6 h-6" />
                        Atención Urgente
                    </h3>
                    <p className="mt-3 text-center sm:text-left text-main dark:text-main/90">
                        Si está experimentando una <strong>emergencia médica</strong>, por favor llame inmediatamente al <strong>911</strong>. Para consultas urgentes con nuestra clínica, puede contactarnos directamente a través de los siguientes medios:
                    </p>
                    <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
                        <a href={`tel:${clinicInfo.phone}`} className="inline-flex items-center gap-2 text-primary dark:text-accent-turquoise font-semibold hover:underline text-lg transition-transform hover:scale-105">
                            <PhoneIcon className="w-5 h-5"/>
                            <span>Llamar a la Clínica</span>
                        </a>
                        <a href={`https://wa.me/${clinicInfo.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-green-600 font-semibold hover:underline text-lg transition-transform hover:scale-105">
                            <WhatsAppIcon className="w-6 h-6"/>
                            <span>Enviar un WhatsApp</span>
                        </a>
                    </div>
                </div>
            </div>
        </PageWrapper>
    );
};

const ServicesList = ({ services, clinicInfo }: { services: Service[], clinicInfo: ClinicInfo }) => {
    const [selectedService, setSelectedService] = useState<Service | null>(null);

    return (
        <PageWrapper title="Nuestros Servicios">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {services.map(service => (
                    <div key={service.id} className="bg-bg-main dark:bg-surface-dark/80 rounded-xl shadow-lg overflow-hidden flex flex-col transform hover:-translate-y-2 transition-transform duration-300 ease-in-out">
                        <img src={service.imageUrl} alt={service.name} className="w-full h-48 object-cover dark:brightness-110" />
                        <div className="p-6 flex flex-col flex-grow">
                            <h3 className="font-bold text-xl text-accent-turquoise dark:text-primary mb-2">{service.name}</h3>
                            <p className="text-sm text-muted dark:text-text-muted-dark mb-4 flex-grow">{service.description}</p>
                            
                            <div className="border-t border-border-main dark:border-border-dark my-4"></div>

                            <div className="space-y-3 text-sm mb-6">
                                <div className="flex items-center justify-between">
                                    <span className="text-muted dark:text-text-muted-dark font-medium">Duración:</span>
                                    <span className="font-semibold text-main dark:text-text-light">{service.duration}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-muted dark:text-text-muted-dark font-medium">Precio:</span>
                                    <span className="font-semibold text-main dark:text-text-light">{service.price}</span>
                                </div>
                            </div>

                            <div className="mt-auto pt-4 flex gap-4">
                                <Link to="/appointments" state={{ serviceId: service.id }} className="flex-1 bg-primary hover:opacity-90 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-opacity">
                                    <CalendarIcon className="w-5 h-5"/> Agendar
                                </Link>
                                <button onClick={() => setSelectedService(service)} className="flex-1 border border-primary dark:border-primary text-primary dark:text-primary hover:bg-primary dark:hover:bg-primary hover:text-white dark:hover:text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors">
                                    <ClipboardIcon className="w-5 h-5"/> Info
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {selectedService && <ServiceDetailModal service={selectedService} clinicInfo={clinicInfo} onClose={() => setSelectedService(null)} />}
        </PageWrapper>
    );
}

const ServiceDetailModal = ({ service, clinicInfo, onClose }: { service: Service; clinicInfo: ClinicInfo; onClose: () => void; }) => {
    const { detailedInfo } = service;
    const offer = detailedInfo.specialOffer;
    const savings = offer && offer.oldPrice && offer.newPrice && !isNaN(parseFloat(offer.oldPrice)) && !isNaN(parseFloat(offer.newPrice))
        ? parseFloat(offer.oldPrice) - parseFloat(offer.newPrice)
        : 0;

    return (
        <Modal isOpen={true} onClose={onClose} title={service.name}>
             <div className="p-2 sm:p-4 max-h-[85vh] overflow-y-auto">
                <h2 className="text-2xl sm:text-3xl font-bold text-center mb-6 text-accent-turquoise dark:text-primary">{detailedInfo.title}</h2>
                
                <div className="space-y-8 text-left">
                    <div>
                        <h3 className="flex items-center gap-2 font-bold text-lg mb-3 text-primary dark:text-primary"><SparklesIcon className="w-6 h-6"/>Beneficios</h3>
                        <ul className="space-y-2 pl-2">
                            {detailedInfo.benefits.map((item, index) => (
                                <li key={index} className="flex items-start gap-3">
                                    <span className="text-accent-turquoise mt-1 font-bold">✓</span>
                                    <span className="text-muted dark:text-main/80">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    
                    <div>
                        <h3 className="flex items-center gap-2 font-bold text-lg mb-3 text-primary dark:text-primary"><TargetIcon className="w-6 h-6"/>Tratamos</h3>
                        <ul className="space-y-2 pl-2">
                            {detailedInfo.treats.map((item, index) => (
                                <li key={index} className="flex items-start gap-3">
                                    <span className="text-muted mt-2 text-xs">•</span>
                                    <span className="text-muted dark:text-main/80">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h3 className="flex items-center gap-2 font-bold text-lg mb-3 text-primary dark:text-primary"><RefreshCwIcon className="w-6 h-6"/>Proceso de Tratamiento</h3>
                        <ol className="space-y-2 pl-2">
                            {detailedInfo.process.map((item, index) => (
                                <li key={index} className="flex items-start gap-3">
                                    <span className="text-primary dark:text-accent-turquoise font-bold">{index + 1}.</span>
                                    <span className="text-muted dark:text-main/80">{item}</span>
                                </li>
                            ))}
                        </ol>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-8 text-center">
                    <div className="p-4 bg-bg-alt dark:bg-bg-alt rounded-lg flex flex-col items-center justify-center">
                        <ClockIcon className="w-8 h-8 mb-2 text-accent-turquoise"/>
                        <h4 className="font-bold">Duración</h4>
                        <p className="text-muted dark:text-main/80">{service.duration}</p>
                    </div>
                    <div className="p-4 bg-bg-alt dark:bg-bg-alt rounded-lg flex flex-col items-center justify-center">
                        <CalendarIcon className="w-8 h-8 mb-2 text-accent-turquoise"/>
                        <h4 className="font-bold">Frecuencia</h4>
                        <p className="text-muted dark:text-main/80">{detailedInfo.frequency}</p>
                    </div>
                    <div className="p-4 bg-bg-alt dark:bg-bg-alt rounded-lg flex flex-col items-center justify-center">
                        <ShieldIcon className="w-8 h-8 mb-2 text-accent-turquoise"/>
                        <h4 className="font-bold">Seguridad</h4>
                        <p className="text-muted dark:text-main/80">{detailedInfo.safety}</p>
                    </div>
                </div>

                {offer && offer.newPrice && (
                    <div className="mb-8 border-2 border-accent-red rounded-lg p-6 text-center bg-accent-red/10">
                        <h3 className="text-xl font-bold text-accent-red tracking-wider">OFERTA ESPECIAL</h3>
                        <div className="flex items-baseline justify-center flex-wrap gap-x-4 gap-y-2 my-3">
                            {offer.oldPrice && <span className="text-2xl text-muted line-through">${offer.oldPrice}</span>}
                            <span className="text-5xl font-bold text-primary dark:text-main">${offer.newPrice}</span>
                            {savings > 0 && <span className="text-lg font-semibold text-accent-turquoise bg-accent-turquoise/10 px-2 py-1 rounded">Ahorra ${savings}</span>}
                        </div>
                        <p className="text-lg font-semibold text-main dark:text-main">{offer.description}</p>
                        <p className="text-sm text-muted mt-2">¡Oferta limitada! Contacte ahora</p>
                    </div>
                )}
                
                <div className="text-center text-muted dark:text-main/80 space-y-2 my-8 border-t border-border-main dark:border-border-dark pt-6">
                     <div className="flex items-center justify-center gap-2"><MapPinIcon className="w-5 h-5 text-muted-dark"/><p>{clinicInfo.address}</p></div>
                     <div className="flex items-center justify-center gap-2"><PhoneIcon className="w-5 h-5 text-muted-dark"/><p>{clinicInfo.phone}</p></div>
                     <a href={`https://${clinicInfo.website}`} target="_blank" rel="noopener noreferrer" className="text-primary dark:text-accent-turquoise hover:underline">{clinicInfo.website}</a>
                </div>

                <div className="flex flex-col gap-4">
                     <Link to="/appointments" state={{ serviceId: service.id }} className="w-full bg-primary hover:opacity-90 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-opacity text-lg" onClick={onClose}>
                        <CalendarIcon className="w-6 h-6"/> Agendar Consulta de {service.name}
                    </Link>
                    <button onClick={onClose} className="w-full border border-border-main dark:border-border-dark text-main dark:text-main hover:bg-slate-100 dark:hover:bg-bg-alt/50 font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors">
                        ← Volver a Servicios
                    </button>
                </div>
            </div>
        </Modal>
    )
}

const DoctorProfilePage = ({ doctorProfile }: { doctorProfile: DoctorProfile }) => (
    <PageWrapper title="Conozca a nuestro especialista">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">
            <div className="lg:w-1/3 w-full flex flex-col items-center flex-shrink-0 text-center">
                <img src={doctorProfile.photoUrl} alt={doctorProfile.name} className="w-48 h-48 rounded-full object-cover border-4 border-accent-turquoise shadow-lg" />
                <h2 className="text-2xl font-bold text-primary dark:text-main mt-4">{doctorProfile.name}</h2>
                <p className="text-md text-muted dark:text-muted">{doctorProfile.titles}</p>
            </div>
            <div className="lg:w-2/3 w-full space-y-8">
                <div className="p-6 bg-bg-alt dark:bg-bg-alt rounded-lg shadow-sm">
                    <p className="text-main dark:text-main/90 leading-relaxed">{doctorProfile.introduction}</p>
                </div>

                <div className="space-y-8">
                    <div>
                        <h3 className="flex items-center gap-3 font-bold text-xl mb-4 text-accent-turquoise dark:text-primary"><StethoscopeIcon className="w-6 h-6"/>Especialidades Médicas</h3>
                        <div className="flex flex-wrap gap-3">
                            {doctorProfile.specialties.map((spec, index) => (
                                <span key={index} className="bg-accent-warm/80 text-primary font-medium px-3 py-1.5 rounded-full text-sm">
                                    {spec}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h3 className="flex items-center gap-3 font-bold text-xl mb-4 text-accent-turquoise dark:text-primary"><GraduationCapIcon className="w-6 h-6"/>Formación Académica</h3>
                        <ul className="space-y-4">
                            {doctorProfile.education.map(edu => (
                                <li key={edu.id} className="flex items-start gap-4 p-4 bg-bg-alt dark:bg-bg-main rounded-lg shadow-sm">
                                    <GraduationCapIcon className="w-8 h-8 text-primary dark:text-accent-turquoise flex-shrink-0 mt-1"/>
                                    <div>
                                        <p className="font-semibold text-main dark:text-main">{edu.degree}</p>
                                        <p className="text-sm text-muted dark:text-muted">{edu.institution}</p>
                                        <p className="text-xs text-muted dark:text-muted italic">{edu.location}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h3 className="flex items-center gap-3 font-bold text-xl mb-4 text-accent-turquoise dark:text-primary"><BriefcaseIcon className="w-6 h-6"/>Experiencia Profesional</h3>
                        <div className="p-4 bg-bg-alt dark:bg-bg-alt rounded-lg shadow-sm">
                           <p className="text-main dark:text-main/90 leading-relaxed">{doctorProfile.experience}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </PageWrapper>
);

const AppointmentRequestForm = ({ services, requestAppointment, clinicInfo, user }: { services: Service[], requestAppointment: PatientViewProps['requestAppointment'], clinicInfo: ClinicInfo, user: User }) => {
    const location = useLocation();
    const serviceIdFromState = location.state?.serviceId;
    
    const [formData, setFormData] = useState({ 
        patientName: user.name, 
        patientPhone: '', 
        patientEmail: user.email, 
        serviceId: serviceIdFromState?.toString() || '', 
        urgency: '', 
        reason: '' 
    });
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleRequest = (e: React.FormEvent) => {
        e.preventDefault();
        const service = services.find(s => s.id === parseInt(formData.serviceId));
        if (service) {
            requestAppointment({ 
                patientName: formData.patientName,
                patientPhone: formData.patientPhone,
                patientEmail: formData.patientEmail,
                service,
                urgency: formData.urgency as any,
                reason: formData.reason
            });
            setIsSubmitted(true);
        }
    };

    if (isSubmitted) {
        return (
            <PageWrapper title="Solicitud Enviada">
                <div className="text-center p-8">
                    <CheckCircleIcon className="w-16 h-16 text-accent-turquoise mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-main dark:text-main mb-2">¡Gracias! Hemos recibido su solicitud.</h2>
                    <p className="text-muted dark:text-main/80 max-w-2xl mx-auto">
                        El Dr. Pablo Zerquera evaluará personalmente su solicitud y nuestro equipo le contactará en las próximas 24-48 horas para confirmar la fecha y hora de su cita.
                    </p>
                    <Link to="/" className="mt-6 inline-block bg-primary hover:opacity-90 text-white font-bold py-2 px-4 rounded-lg transition-opacity">
                        ← Volver al Inicio
                    </Link>
                </div>
            </PageWrapper>
        );
    }
    
    return (
        <PageWrapper title="Solicitud de Consulta Profesional">
            <div className="max-w-4xl mx-auto">
                <p className="text-center text-muted dark:text-main/80 mb-8">El Dr. Pablo Zerquera evaluará personalmente su solicitud y le asignará la fecha más apropiada según su condición médica y urgencia. Recibirá confirmación detallada en 24-48 horas con toda la información necesaria.</p>

                <form onSubmit={handleRequest} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Columna Izquierda: Formulario */}
                    <div className="space-y-6">
                        {/* Paciente */}
                        <div>
                            <h3 className="text-lg font-semibold flex items-center gap-2 mb-3 text-accent-turquoise dark:text-primary"><UsersIcon className="w-6 h-6" /> Información del Paciente</h3>
                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="patientName" className="block text-sm font-medium text-main dark:text-main">Nombre Completo *</label>
                                    <input type="text" id="patientName" placeholder="Nombre y apellidos completos" value={formData.patientName} onChange={e => setFormData({...formData, patientName: e.target.value})} required className="mt-1 block w-full px-3 py-2 bg-bg-main dark:bg-bg-main dark:text-text-light border border-border-main dark:border-border-dark rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light"/>
                                </div>
                                <div>
                                    <label htmlFor="patientPhone" className="block text-sm font-medium text-main dark:text-main">Teléfono de Contacto *</label>
                                    <input type="tel" id="patientPhone" placeholder="+1-305-274-4351" value={formData.patientPhone} onChange={e => setFormData({...formData, patientPhone: e.target.value})} required className="mt-1 block w-full px-3 py-2 bg-bg-main dark:bg-bg-main dark:text-text-light border border-border-main dark:border-border-dark rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light"/>
                                </div>
                                <div>
                                    <label htmlFor="patientEmail" className="block text-sm font-medium text-main dark:text-main">Correo Electrónico *</label>
                                    <input type="email" id="patientEmail" placeholder="su-email@ejemplo.com" value={formData.patientEmail} onChange={e => setFormData({...formData, patientEmail: e.target.value})} required className="mt-1 block w-full px-3 py-2 bg-bg-main dark:bg-bg-main dark:text-text-light border border-border-main dark:border-border-dark rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light"/>
                                </div>
                            </div>
                        </div>
                        {/* Info Medica */}
                        <div>
                            <h3 className="text-lg font-semibold flex items-center gap-2 mb-3 text-accent-turquoise dark:text-primary"><StethoscopeIcon className="w-6 h-6" /> Información Médica</h3>
                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="service" className="block text-sm font-medium text-main dark:text-main">Tipo de Servicio Requerido *</label>
                                    <select id="service" value={formData.serviceId} onChange={e => setFormData({...formData, serviceId: e.target.value})} required className="mt-1 block w-full px-3 py-2 bg-bg-main dark:bg-bg-main dark:text-text-light border border-border-main dark:border-border-dark rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light">
                                        <option value="">Seleccione el tipo de consulta</option>
                                        {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="urgency" className="block text-sm font-medium text-main dark:text-main">Nivel de Urgencia *</label>
                                    <select id="urgency" value={formData.urgency} onChange={e => setFormData({...formData, urgency: e.target.value})} required className="mt-1 block w-full px-3 py-2 bg-bg-main dark:bg-bg-main dark:text-text-light border border-border-main dark:border-border-dark rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light">
                                        <option value="">Seleccione nivel de urgencia</option>
                                        <option value="Rutinaria">Rutinaria</option>
                                        <option value="Moderada">Moderada</option>
                                        <option value="Urgente">Urgente</option>
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="reason" className="block text-sm font-medium text-main dark:text-main">Motivo de la Consulta *</label>
                                    <textarea id="reason" rows={5} placeholder="Describa detalladamente su condición, síntomas, duración y cualquier información relevante para el Dr. Zerquera..." value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} required className="mt-1 block w-full px-3 py-2 bg-bg-main dark:bg-bg-main dark:text-text-light border border-border-main dark:border-border-dark rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light"/>
                                </div>
                                <div className="bg-accent-red/10 text-accent-red/80 p-3 rounded-lg flex gap-3">
                                    <LightbulbIcon className="w-8 h-8 flex-shrink-0 text-accent-red" />
                                    <p className="text-xs"><strong>Tip:</strong> Mientras más información proporcione, mejor podrá el doctor asignar el tiempo apropiado para su consulta.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Columna Derecha: Info adicional */}
                    <div className="space-y-6">
                         <div>
                            <h3 className="text-lg font-semibold flex items-center gap-2 mb-3 text-primary dark:text-primary"><ShieldIcon className="w-6 h-6" /> Compromiso Profesional</h3>
                            <ul className="space-y-2 text-sm text-muted dark:text-main/80">
                                <li className="flex items-center gap-2"><CheckCircleIcon className="w-5 h-5 text-accent-turquoise" /> El Dr. Zerquera revisará personalmente su solicitud</li>
                                <li className="flex items-center gap-2"><CheckCircleIcon className="w-5 h-5 text-accent-turquoise" /> Se le asignará la fecha más conveniente para su condición</li>
                                <li className="flex items-center gap-2"><CheckCircleIcon className="w-5 h-5 text-accent-turquoise" /> Recibirá confirmación con todos los detalles necesarios</li>
                                <li className="flex items-center gap-2"><CheckCircleIcon className="w-5 h-5 text-accent-turquoise" /> Si es urgente o emergencia, se priorizará su atención</li>
                            </ul>
                        </div>
                        <div className="md:col-span-2">
                             <button type="submit" className="w-full bg-primary hover:opacity-90 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-opacity text-lg">
                                <ClipboardIcon className="w-6 h-6" /> Enviar Solicitud de Consulta
                            </button>
                        </div>
                        <div className="text-center p-4 bg-bg-alt dark:bg-bg-alt/50 rounded-lg">
                            <h4 className="font-semibold mb-2">¿Necesita ayuda inmediata?</h4>
                            <div className="flex justify-center items-center gap-4">
                                <a href={`tel:${clinicInfo.phone}`} className="flex items-center gap-2 text-primary dark:text-accent-turquoise hover:underline">
                                    <PhoneIcon className="w-5 h-5"/>
                                    <span>{clinicInfo.phone}</span>
                                </a>
                                 <a href={`https://wa.me/${clinicInfo.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-green-600 hover:underline">
                                    <WhatsAppIcon className="w-6 h-6"/>
                                    <span>WhatsApp</span>
                                </a>
                            </div>
                        </div>
                         <Link to="/" className="text-sm text-muted dark:text-muted hover:underline text-center block">
                            ← Volver al Inicio
                        </Link>
                    </div>
                </form>
            </div>
        </PageWrapper>
    );
};

const ChatInterface = ({ messages, onSendMessage, user }: { messages: ChatMessage[], onSendMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => void, user: User }) => {
    const [newMessage, setNewMessage] = useState('');
    const [isSummarizing, setIsSummarizing] = useState(false);
    
    const handleSend = () => {
        if (newMessage.trim()) {
            onSendMessage({ sender: user.name, senderRole: 'patient', text: newMessage });
            setNewMessage('');
        }
    };
    
    const handleSummary = async () => {
        setIsSummarizing(true);
        const summary = await generateChatSummary(messages);
        onSendMessage({ sender: 'system', senderRole: 'system', text: summary });
        setIsSummarizing(false);
    };

    return (
        <PageWrapper title="Chat con su Médico">
            <div className="flex flex-col h-[60vh]">
                <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-bg-alt dark:bg-bg-main rounded-t-lg">
                    {messages.map(msg => <ChatMessageBubble key={msg.id} message={msg} />)}
                </div>
                <div className="p-4 border-t border-border-main dark:border-border-dark">
                    <div className="flex items-center gap-2 mb-2">
                        <button onClick={handleSummary} disabled={isSummarizing} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-accent-red bg-accent-red/10 rounded-md hover:bg-accent-red/20 disabled:opacity-50 disabled:cursor-wait">
                           <SparklesIcon className="w-5 h-5" />
                           {isSummarizing ? 'Generando...' : 'Resumir con IA'}
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSend()} placeholder="Escriba su mensaje..." className="flex-grow px-3 py-2 bg-bg-main dark:bg-bg-main dark:text-text-light border border-border-main dark:border-border-dark rounded-full focus:outline-none focus:ring-2 focus:ring-primary-light"/>
                        <button onClick={handleSend} className="bg-primary text-white p-3 rounded-full hover:opacity-90 transition-opacity">
                            <SendIcon className="w-5 h-5"/>
                        </button>
                    </div>
                </div>
            </div>
        </PageWrapper>
    );
};

const ChatMessageBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
    const isPatient = message.senderRole === 'patient';
    const isSystem = message.senderRole === 'system';

    if (isSystem) {
        return (
            <div className="my-2 p-4 bg-accent-red/10 border-l-4 border-accent-red rounded-r-lg">
                <h4 className="font-bold text-accent-red flex items-center gap-2"><SparklesIcon className="w-5 h-5"/>Resumen de la Conversación</h4>
                <p className="text-sm text-main dark:text-main whitespace-pre-wrap">{message.text}</p>
            </div>
        );
    }
    
    return (
        <div className={`flex items-end gap-2 ${isPatient ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-md p-3 rounded-lg ${isPatient ? 'bg-accent-warm text-primary rounded-br-none' : 'bg-bg-alt dark:bg-border-dark text-main dark:text-white rounded-bl-none'}`}>
                <p className="text-sm">{message.text}</p>
                <p className={`text-xs mt-1 ${isPatient ? 'text-primary/70' : 'text-muted dark:text-white/70'}`}>{message.timestamp}</p>
            </div>
        </div>
    );
};

export default PatientView;