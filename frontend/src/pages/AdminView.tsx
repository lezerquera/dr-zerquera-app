import React, { useState, useEffect, useCallback } from 'react';
import type { ClinicInfo, Service, DoctorProfile, EducationItem, Appointment, DetailedInfo, Insurance, Conversation, ChatMessage, User } from '../types';
import { PageWrapper } from '../components/PageWrapper';
import { Modal } from '../components/Modal';
import { BuildingIcon, StethoscopeIcon, UsersIcon, PlusCircleIcon, EditIcon, TrashIcon, ClockIcon, CheckCircleIcon, GraduationCapIcon, CreditCardIcon, ShieldIcon, MessageSquareIcon, SendIcon, CalendarIcon } from '../components/Icons';

interface AdminViewProps {
  user: User;
  token: string;
  clinicInfo: ClinicInfo;
  saveClinicInfo: (info: ClinicInfo) => Promise<void>;
  services: Service[];
  saveService: (service: Service) => Promise<void>;
  deleteService: (id: number) => Promise<void>;
  doctorProfile: DoctorProfile;
  saveDoctorProfile: (profile: DoctorProfile) => Promise<void>;
  appointments: Appointment[];
  confirmAppointment: (appointmentId: number, date: string, time: string) => void;
  allInsurances: Insurance[];
  acceptedInsurances: string[];
  saveAcceptedInsurances: (ids: string[]) => Promise<void>;
  sendChatMessage: (message: Omit<ChatMessage, 'id' | 'timestamp' | 'sender' | 'senderId' | 'senderRole' | 'isRead'>) => Promise<ChatMessage | null>;
  unreadChatCount: number;
  fetchUnreadCount: () => void;
  clearChatNotifications: () => void;
}

type AdminTab = 'appointments' | 'chat' | 'insurances' | 'services' | 'staff' | 'info';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const AdminView: React.FC<AdminViewProps> = (props) => {
    const [activeTab, setActiveTab] = useState<AdminTab>('appointments');

    const sortedAppointments = [...props.appointments].sort((a, b) => {
        if(a.status === 'Solicitada' && b.status !== 'Solicitada') return -1;
        if(a.status !== 'Solicitada' && b.status === 'Solicitada') return 1;
        if (a.date && b.date) {
            return new Date(b.date).getTime() - new Date(a.date).getTime();
        }
        return (b.id - a.id);
    });

    return (
        <div className="bg-bg-main dark:bg-surface-dark rounded-lg shadow-md overflow-hidden">
            <div className="border-b border-border-main dark:border-border-dark">
                <nav className="flex flex-wrap gap-2 p-2" aria-label="Tabs">
                    <AdminTabButton id="appointments" activeTab={activeTab} setActiveTab={setActiveTab} icon={<CalendarIcon className="w-5 h-5"/>}>Citas</AdminTabButton>
                    <AdminTabButton id="chat" activeTab={activeTab} setActiveTab={setActiveTab} icon={<MessageSquareIcon className="w-5 h-5"/>} notificationCount={props.unreadChatCount}>Chat</AdminTabButton>
                    <AdminTabButton id="insurances" activeTab={activeTab} setActiveTab={setActiveTab} icon={<CreditCardIcon className="w-5 h-5"/>}>Seguros</AdminTabButton>
                    <AdminTabButton id="services" activeTab={activeTab} setActiveTab={setActiveTab} icon={<StethoscopeIcon className="w-5 h-5"/>}>Servicios</AdminTabButton>
                    <AdminTabButton id="staff" activeTab={activeTab} setActiveTab={setActiveTab} icon={<UsersIcon className="w-5 h-5"/>}>Dr. Zerquera</AdminTabButton>
                    <AdminTabButton id="info" activeTab={activeTab} setActiveTab={setActiveTab} icon={<BuildingIcon className="w-5 h-5"/>}>Info Clínica</AdminTabButton>
                </nav>
            </div>
            
            <div>
                {activeTab === 'appointments' && <AppointmentsManager appointments={sortedAppointments} confirmAppointment={props.confirmAppointment} />}
                {activeTab === 'chat' && <AdminChatManager user={props.user} token={props.token} sendChatMessage={props.sendChatMessage} fetchUnreadCount={props.fetchUnreadCount} clearChatNotifications={props.clearChatNotifications} />}
                {activeTab === 'insurances' && <InsurancesManager allInsurances={props.allInsurances} acceptedInsurances={props.acceptedInsurances} saveAcceptedInsurances={props.saveAcceptedInsurances} />}
                {activeTab === 'services' && <ServicesManager services={props.services} saveService={props.saveService} deleteService={props.deleteService} />}
                {activeTab === 'staff' && <DoctorProfileManager doctorProfile={props.doctorProfile} saveDoctorProfile={props.saveDoctorProfile} />}
                {activeTab === 'info' && <ClinicInfoManager clinicInfo={props.clinicInfo} saveClinicInfo={props.saveClinicInfo} />}
            </div>
        </div>
    );
};

interface AdminTabButtonProps {
    id: AdminTab;
    activeTab: AdminTab;
    setActiveTab: (id: AdminTab) => void;
    icon: React.ReactNode;
    children?: React.ReactNode;
    notificationCount?: number;
}

const AdminTabButton = ({ id, activeTab, setActiveTab, icon, children, notificationCount }: AdminTabButtonProps) => {
    const isActive = activeTab === id;
    return (
        <button onClick={() => setActiveTab(id)} className={`relative flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${isActive ? 'bg-accent-warm text-primary font-semibold' : 'text-muted dark:text-muted hover:text-main dark:hover:text-main hover:bg-accent-warm/30 dark:hover:bg-primary/10'}`}>
            {icon}
            {children}
            {notificationCount && notificationCount > 0 && (
                <span className="absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full bg-accent-red text-xs font-bold text-white">
                    {notificationCount}
                </span>
            )}
        </button>
    );
}

const getStatusChipClasses = (status: Appointment['status']) => {
    switch (status) {
        case 'Confirmada': return 'bg-accent-turquoise/10 text-accent-turquoise';
        case 'Solicitada': return 'bg-accent-red/10 text-accent-red';
        case 'Cancelada': return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
        default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
}

const getUrgencyChipClasses = (urgency: Appointment['urgency']) => {
    switch (urgency) {
        case 'Urgente': return 'border-red-500 text-red-500';
        case 'Moderada': return 'border-yellow-500 text-yellow-500';
        default: return 'border-gray-500 text-gray-500 dark:border-gray-400 dark:text-gray-400';
    }
}

const ScheduleAppointmentModal = ({ appointment, onClose, onSave }: { appointment: Appointment; onClose: () => void; onSave: (date: string, time: string) => void; }) => {
    const [date, setDate] = useState(appointment.date || new Date().toISOString().split('T')[0]);
    const [time, setTime] = useState(appointment.time || '09:00');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(date, time);
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={`Agendar Cita para ${appointment.patientName}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="appointmentDate" className="block text-sm font-medium text-main dark:text-main">Fecha</label>
                    <input type="date" id="appointmentDate" value={date} onChange={e => setDate(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-bg-main dark:bg-bg-main border border-border-main dark:border-border-dark rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light dark:text-main"/>
                </div>
                <div>
                    <label htmlFor="appointmentTime" className="block text-sm font-medium text-main dark:text-main">Hora</label>
                    <input type="time" id="appointmentTime" value={time} onChange={e => setTime(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-bg-main dark:bg-bg-main border border-border-main dark:border-border-dark rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light dark:text-main"/>
                </div>
                <div className="flex justify-end gap-4 pt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-main dark:text-main bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">
                        Cancelar
                    </button>
                    <button type="submit" className="px-4 py-2 text-sm font-medium text-primary bg-accent-warm rounded-md hover:opacity-90">
                        Guardar Cita
                    </button>
                </div>
            </form>
        </Modal>
    );
};


const AppointmentsManager = ({ appointments, confirmAppointment }: { appointments: Appointment[]; confirmAppointment: (id: number, date: string, time: string) => void }) => {
    const [schedulingAppointment, setSchedulingAppointment] = useState<Appointment | null>(null);
    
    return (
         <PageWrapper title="Seguimiento de Citas">
             <div className="bg-bg-alt dark:bg-bg-alt/50 p-4 rounded-lg max-h-[70vh] overflow-y-auto">
                {appointments.length > 0 ? (
                     <ul className="space-y-4">
                        {appointments.map(app => (
                            <li key={app.id} className={`p-4 bg-bg-main dark:bg-bg-main rounded-lg shadow-sm border-l-4 ${app.status === 'Solicitada' ? 'border-accent-red' : 'border-accent-turquoise'}`}>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-semibold text-main dark:text-main">{app.service.name}</p>
                                        <p className="text-sm text-muted dark:text-muted">Paciente: {app.patientName}</p>
                                        <p className="text-xs text-muted dark:text-muted">
                                            <a href={`mailto:${app.patientEmail}`} className="text-primary-light dark:text-accent-turquoise hover:underline">
                                                {app.patientEmail}
                                            </a>
                                            {' | '}
                                            <a href={`tel:${app.patientPhone}`} className="text-primary-light dark:text-accent-turquoise hover:underline">
                                                {app.patientPhone}
                                            </a>
                                        </p>
                                    </div>
                                    <div className="text-right flex-shrink-0 ml-4">
                                         <span className={`mt-1 inline-block px-2 py-1 text-xs font-medium rounded-full ${getStatusChipClasses(app.status)}`}>{app.status}</span>
                                    </div>
                                </div>
                                {app.status === 'Solicitada' && (
                                    <div className="mt-3 pt-3 border-t border-border-main dark:border-border-dark">
                                        <div className="flex justify-between items-center mb-2">
                                            <h4 className="text-sm font-semibold">Motivo de la Consulta:</h4>
                                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${getUrgencyChipClasses(app.urgency)}`}>{app.urgency}</span>
                                        </div>
                                        <p className="text-sm text-muted dark:text-muted bg-bg-alt dark:bg-bg-alt p-2 rounded-md">{app.reason}</p>
                                        <div className="flex gap-2 mt-3">
                                            <button onClick={() => setSchedulingAppointment(app)} className="flex-1 text-xs px-2 py-1 bg-primary text-white rounded hover:opacity-90 flex items-center justify-center gap-1"><CheckCircleIcon className="w-4 h-4"/> Confirmar</button>
                                            <button onClick={() => setSchedulingAppointment(app)} className="flex-1 text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 flex items-center justify-center gap-1"><ClockIcon className="w-4 h-4"/> Reprogramar</button>
                                        </div>
                                    </div>
                                )}
                                {app.status === 'Confirmada' && app.date && app.time && (
                                    <div className="mt-3 pt-3 border-t border-border-main dark:border-border-dark">
                                        <p className="text-sm font-medium text-main dark:text-main">{new Date(`${app.date}T${app.time}`).toLocaleString('es-ES', { dateStyle: 'full', timeStyle: 'short' })}</p>
                                        <p className="text-sm text-muted dark:text-muted">Con: Dr. Zerquera</p>
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="text-center py-16">
                        <CalendarIcon className="w-16 h-16 mx-auto text-muted dark:text-muted mb-4" />
                        <h3 className="text-lg font-semibold text-main dark:text-main">No hay citas registradas.</h3>
                        <p className="text-muted dark:text-main/80 mt-2">Cuando un paciente solicite una nueva cita, aparecerá aquí.</p>
                    </div>
                )}
            </div>
            {schedulingAppointment && (
                <ScheduleAppointmentModal
                    appointment={schedulingAppointment}
                    onClose={() => setSchedulingAppointment(null)}
                    onSave={(date, time) => {
                        confirmAppointment(schedulingAppointment.id, date, time);
                        setSchedulingAppointment(null);
                    }}
                />
            )}
        </PageWrapper>
    );
};


const ClinicInfoManager = ({ clinicInfo, saveClinicInfo }: Pick<AdminViewProps, 'clinicInfo' | 'saveClinicInfo'>) => {
    const [info, setInfo] = useState(clinicInfo);
    const [hasChanges, setHasChanges] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInfo({ ...info, [e.target.name]: e.target.value });
        setHasChanges(true);
    };

    const handleSave = async () => {
        setIsSaving(true);
        await saveClinicInfo(info);
        setHasChanges(false);
        setIsSaving(false);
        alert("Información guardada con éxito.");
    };

    return (
        <PageWrapper title="Información de la Clínica">
           <div className="max-w-2xl mx-auto bg-bg-alt dark:bg-bg-alt/50 p-6 rounded-lg">
                <div className="space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-main dark:text-main">Nombre de la clínica</label>
                        <input type="text" name="name" id="name" value={info.name} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-bg-main dark:bg-bg-main border border-border-main dark:border-border-dark rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light dark:text-main"/>
                    </div>
                    <div>
                        <label htmlFor="address" className="block text-sm font-medium text-main dark:text-main">Dirección</label>
                        <input type="text" name="address" id="address" value={info.address} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-bg-main dark:bg-bg-main border border-border-main dark:border-border-dark rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light dark:text-main"/>
                    </div>
                     <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-main dark:text-main">Teléfono</label>
                        <input type="text" name="phone" id="phone" value={info.phone} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-bg-main dark:bg-bg-main border border-border-main dark:border-border-dark rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light dark:text-main"/>
                    </div>
                     <div>
                        <label htmlFor="email" className="block text-sm font-medium text-main dark:text-main">Email de Contacto</label>
                        <input type="email" name="email" id="email" value={info.email} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-bg-main dark:bg-bg-main border border-border-main dark:border-border-dark rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light dark:text-main"/>
                    </div>
                     <div>
                        <label htmlFor="website" className="block text-sm font-medium text-main dark:text-main">Sitio Web</label>
                        <input type="text" name="website" id="website" value={info.website} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-bg-main dark:bg-bg-main border border-border-main dark:border-border-dark rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light dark:text-main"/>
                    </div>
                    <div className="pt-4 text-right">
                        <button onClick={handleSave} disabled={!hasChanges || isSaving} className="px-4 py-2 text-sm font-medium text-primary bg-accent-warm rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed">
                            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                    </div>
                </div>
            </div>
        </PageWrapper>
    );
};

const InsurancesManager = ({ allInsurances, acceptedInsurances, saveAcceptedInsurances }: Pick<AdminViewProps, 'allInsurances' | 'acceptedInsurances' | 'saveAcceptedInsurances'>) => {
    const [localAccepted, setLocalAccepted] = useState<string[]>(acceptedInsurances);
    const [hasChanges, setHasChanges] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const handleToggle = (id: string) => {
        setHasChanges(true);
        setLocalAccepted(prev => 
            prev.includes(id) ? prev.filter(insId => insId !== id) : [...prev, id]
        );
    };

    const handleSave = async () => {
        setIsSaving(true);
        await saveAcceptedInsurances(localAccepted);
        setHasChanges(false);
        setIsSaving(false);
        alert("Lista de seguros guardada con éxito.");
    };
    
    return (
        <PageWrapper title="Gestionar Seguros Aceptados">
            <p className="text-muted dark:text-main/80 mb-6 max-w-2xl">
                Active o desactive los seguros que su clínica acepta. Los cambios se reflejarán en la página principal para los pacientes después de guardar.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {allInsurances.map(insurance => (
                    <div key={insurance.id} className="border border-border-main dark:border-border-dark rounded-lg p-4 flex flex-col items-center justify-between shadow-sm bg-bg-main dark:bg-bg-main">
                        <div 
                            className="w-full h-24 flex flex-col items-center justify-between p-2 rounded-md mb-4 bg-bg-alt dark:bg-bg-alt border-b-4"
                            style={{ borderColor: insurance.brandColor }}
                        >
                            <ShieldIcon className="w-8 h-8 text-muted dark:text-main/80" />
                            <p className="text-sm font-bold text-main dark:text-main text-center leading-tight">{insurance.name}</p>
                        </div>
                        
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                className="sr-only peer" 
                                checked={localAccepted.includes(insurance.id)}
                                onChange={() => handleToggle(insurance.id)}
                            />
                            <div className="w-11 h-6 bg-gray-200 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-accent-turquoise"></div>
                            <span className="ml-3 text-sm font-medium text-gray-900 dark:text-gray-300 sr-only">Aceptar</span>
                        </label>
                    </div>
                ))}
            </div>
            <div className="mt-8 flex justify-end">
                <button onClick={handleSave} disabled={!hasChanges || isSaving} className="px-6 py-2 text-sm font-medium text-primary bg-accent-warm rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed">
                    {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
            </div>
        </PageWrapper>
    );
};


const ServicesManager = ({ services, saveService, deleteService }: Pick<AdminViewProps, 'services' | 'saveService' | 'deleteService'>) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingService, setEditingService] = useState<Service | null>(null);

    const handleOpenModal = (service: Service | null = null) => {
        setEditingService(service);
        setIsModalOpen(true);
    };

    const handleSaveService = async (service: Service) => {
        await saveService(service);
        setIsModalOpen(false);
    };
    
    const handleDeleteService = async (id: number) => {
        if(window.confirm("¿Está seguro de que desea eliminar este servicio?")){
            await deleteService(id);
        }
    };

    return (
        <PageWrapper title="Gestionar Servicios">
            <div className="flex justify-end mb-6">
                <button onClick={() => handleOpenModal()} className="bg-primary hover:opacity-90 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-opacity">
                    <PlusCircleIcon className="w-5 h-5"/> Añadir Servicio
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-muted dark:text-main/80">
                    <thead className="text-xs text-main uppercase bg-bg-alt dark:text-main dark:bg-bg-alt">
                        <tr>
                            <th scope="col" className="px-6 py-3">Nombre</th>
                            <th scope="col" className="px-6 py-3">Duración</th>
                            <th scope="col" className="px-6 py-3 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {services.map(service => (
                            <tr key={service.id} className="bg-bg-main border-b dark:bg-bg-main dark:border-border-dark hover:bg-bg-alt dark:hover:bg-bg-alt">
                                <td className="px-6 py-4 font-medium text-main whitespace-nowrap dark:text-main">{service.name}</td>
                                <td className="px-6 py-4">{service.duration}</td>
                                <td className="px-6 py-4 text-right space-x-2">
                                    <button onClick={() => handleOpenModal(service)} className="text-primary dark:text-accent-turquoise hover:opacity-80 p-1"><EditIcon className="w-5 h-5"/></button>
                                    <button onClick={() => handleDeleteService(service.id)} className="text-red-500 hover:text-red-700 p-1"><TrashIcon className="w-5 h-5"/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {isModalOpen && <ServiceFormModal service={editingService} onSave={handleSaveService} onClose={() => setIsModalOpen(false)} />}
        </PageWrapper>
    );
};

const ServiceFormModal = ({ service, onSave, onClose }: { service: Service | null, onSave: (service: Service) => void, onClose: () => void }) => {
    const [formData, setFormData] = useState<Service>(
        service || { id: 0, name: '', description: '', imageUrl: '', duration: '', price: '', detailedInfo: { title: '', benefits: [], treats: [], process: [], frequency: '', safety: '' } }
    );
    const [isSaving, setIsSaving] = useState(false);
    
    const isNew = !service;
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleDetailedInfoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        const isArray = ['benefits', 'treats', 'process'].includes(name);

        setFormData(prev => ({
            ...prev,
            detailedInfo: {
                ...prev.detailedInfo,
                [name]: isArray ? value.split('\n') : value
            }
        }));
    };
    
    const handleSpecialOfferChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            detailedInfo: {
                ...prev.detailedInfo,
                specialOffer: {
                    ...(prev.detailedInfo.specialOffer || { oldPrice: '', newPrice: '', description: '' }),
                    [name]: value,
                },
            },
        }));
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        
        // Cleanup empty special offer before saving
        const finalFormData = { ...formData };
        const offer = finalFormData.detailedInfo.specialOffer;
        if (offer && !offer.oldPrice && !offer.newPrice && !offer.description) {
            delete finalFormData.detailedInfo.specialOffer;
        }

        await onSave(finalFormData);
        setIsSaving(false);
    };

    const arrayToString = (arr: string[]) => arr.join('\n');

    return (
        <Modal isOpen={true} onClose={onClose} title={isNew ? 'Añadir Servicio' : 'Editar Servicio'}>
             <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
                <h3 className="text-lg font-semibold text-accent-turquoise dark:text-primary">Información Básica</h3>
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-main dark:text-main">Nombre del Servicio</label>
                    <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-bg-main dark:bg-bg-main border border-border-main dark:border-border-dark rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light dark:text-main"/>
                </div>
                <div>
                    <label htmlFor="description" className="block text-sm font-medium text-main dark:text-main">Descripción Breve</label>
                    <textarea name="description" id="description" rows={2} value={formData.description} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-bg-main dark:bg-bg-main border border-border-main dark:border-border-dark rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light dark:text-main"/>
                </div>
                 <div>
                    <label htmlFor="imageUrl" className="block text-sm font-medium text-main dark:text-main">URL de la Imagen</label>
                    <input type="text" name="imageUrl" id="imageUrl" value={formData.imageUrl} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-bg-main dark:bg-bg-main border border-border-main dark:border-border-dark rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light dark:text-main"/>
                </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="duration" className="block text-sm font-medium text-main dark:text-main">Duración</label>
                        <input type="text" name="duration" id="duration" value={formData.duration} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-bg-main dark:bg-bg-main border border-border-main dark:border-border-dark rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light dark:text-main"/>
                    </div>
                    <div>
                        <label htmlFor="price" className="block text-sm font-medium text-main dark:text-main">Precio</label>
                        <input type="text" name="price" id="price" value={formData.price} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-bg-main dark:bg-bg-main border border-border-main dark:border-border-dark rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light dark:text-main"/>
                    </div>
                 </div>

                <h3 className="text-lg font-semibold text-accent-turquoise dark:text-primary pt-4 border-t border-border-main dark:border-border-dark">Información Detallada (Para el Modal)</h3>
                
                <div>
                    <label htmlFor="title" className="block text-sm font-medium text-main dark:text-main">Título Detallado</label>
                    <input type="text" name="title" id="title" value={formData.detailedInfo.title} onChange={handleDetailedInfoChange} className="mt-1 block w-full px-3 py-2 bg-bg-main dark:bg-bg-main border border-border-main dark:border-border-dark rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light dark:text-main"/>
                </div>
                <div>
                    <label htmlFor="benefits" className="block text-sm font-medium text-main dark:text-main">Beneficios (uno por línea)</label>
                    <textarea name="benefits" id="benefits" rows={3} value={arrayToString(formData.detailedInfo.benefits)} onChange={handleDetailedInfoChange} className="mt-1 block w-full px-3 py-2 bg-bg-main dark:bg-bg-main border border-border-main dark:border-border-dark rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light dark:text-main"/>
                </div>
                <div>
                    <label htmlFor="treats" className="block text-sm font-medium text-main dark:text-main">Condiciones que trata (uno por línea)</label>
                    <textarea name="treats" id="treats" rows={3} value={arrayToString(formData.detailedInfo.treats)} onChange={handleDetailedInfoChange} className="mt-1 block w-full px-3 py-2 bg-bg-main dark:bg-bg-main border border-border-main dark:border-border-dark rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light dark:text-main"/>
                </div>
                <div>
                    <label htmlFor="process" className="block text-sm font-medium text-main dark:text-main">Proceso (uno por línea)</label>
                    <textarea name="process" id="process" rows={3} value={arrayToString(formData.detailedInfo.process)} onChange={handleDetailedInfoChange} className="mt-1 block w-full px-3 py-2 bg-bg-main dark:bg-bg-main border border-border-main dark:border-border-dark rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light dark:text-main"/>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="frequency" className="block text-sm font-medium text-main dark:text-main">Frecuencia</label>
                        <input type="text" name="frequency" id="frequency" value={formData.detailedInfo.frequency} onChange={handleDetailedInfoChange} className="mt-1 block w-full px-3 py-2 bg-bg-main dark:bg-bg-main border border-border-main dark:border-border-dark rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light dark:text-main"/>
                    </div>
                    <div>
                        <label htmlFor="safety" className="block text-sm font-medium text-main dark:text-main">Seguridad</label>
                        <input type="text" name="safety" id="safety" value={formData.detailedInfo.safety} onChange={handleDetailedInfoChange} className="mt-1 block w-full px-3 py-2 bg-bg-main dark:bg-bg-main border border-border-main dark:border-border-dark rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light dark:text-main"/>
                    </div>
                </div>

                <h3 className="text-lg font-semibold text-accent-turquoise dark:text-primary pt-4 border-t border-border-main dark:border-border-dark">Oferta Especial (Opcional)</h3>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="oldPrice" className="block text-sm font-medium text-main dark:text-main">Precio Anterior</label>
                        <input type="text" name="oldPrice" id="oldPrice" placeholder="Ej: 300" value={formData.detailedInfo.specialOffer?.oldPrice || ''} onChange={handleSpecialOfferChange} className="mt-1 block w-full px-3 py-2 bg-bg-main dark:bg-bg-main border border-border-main dark:border-border-dark rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light dark:text-main"/>
                    </div>
                    <div>
                        <label htmlFor="newPrice" className="block text-sm font-medium text-main dark:text-main">Precio Nuevo</label>
                        <input type="text" name="newPrice" id="newPrice" placeholder="Ej: 240" value={formData.detailedInfo.specialOffer?.newPrice || ''} onChange={handleSpecialOfferChange} className="mt-1 block w-full px-3 py-2 bg-bg-main dark:bg-bg-main border border-border-main dark:border-border-dark rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light dark:text-main"/>
                    </div>
                </div>
                <div>
                    <label htmlFor="offerDescription" className="block text-sm font-medium text-main dark:text-main">Descripción de la Oferta</label>
                    <input type="text" name="description" id="offerDescription" placeholder="Ej: Paquete de 6 Sesiones" value={formData.detailedInfo.specialOffer?.description || ''} onChange={handleSpecialOfferChange} className="mt-1 block w-full px-3 py-2 bg-bg-main dark:bg-bg-main border border-border-main dark:border-border-dark rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light dark:text-main"/>
                </div>

                <div className="flex justify-end gap-4 pt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-main dark:text-main bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">
                        Cancelar
                    </button>
                    <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm font-medium text-primary bg-accent-warm rounded-md hover:opacity-90 disabled:opacity-50">
                        {isSaving ? 'Guardando...' : 'Guardar'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

const DoctorProfileManager = ({ doctorProfile, saveDoctorProfile }: Pick<AdminViewProps, 'doctorProfile' | 'saveDoctorProfile'>) => {
    const [profile, setProfile] = useState(doctorProfile);
    const [hasChanges, setHasChanges] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setProfile({ ...profile, [e.target.name]: e.target.value });
        setHasChanges(true);
    };

    const handleSpecialtiesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setProfile({ ...profile, specialties: e.target.value.split(',').map(s => s.trim()) });
        setHasChanges(true);
    };
    
    const handleEducationChange = (id: number, field: keyof Omit<EducationItem, 'id'>, value: string) => {
        setProfile(prev => ({
            ...prev,
            education: prev.education.map(edu => edu.id === id ? { ...edu, [field]: value } : edu)
        }));
        setHasChanges(true);
    };

    const handleSave = async () => {
        setIsSaving(true);
        await saveDoctorProfile(profile);
        setHasChanges(false);
        setIsSaving(false);
        alert("Perfil del doctor guardado con éxito.");
    };

    return (
        <PageWrapper title="Gestionar Perfil del Dr. Zerquera">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-4">
                     <div className="p-4 bg-bg-alt dark:bg-bg-alt/50 rounded-lg">
                        <h3 className="font-semibold text-lg mb-2 flex items-center gap-2 text-accent-turquoise dark:text-primary"><UsersIcon className="w-5 h-5"/>Identidad</h3>
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-main dark:text-main">Nombre</label>
                            <input type="text" name="name" value={profile.name} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-bg-main dark:bg-bg-main border border-border-main dark:border-border-dark rounded-md shadow-sm dark:text-main"/>
                        </div>
                         <div>
                            <label htmlFor="titles" className="block text-sm font-medium text-main dark:text-main">Títulos</label>
                            <input type="text" name="titles" value={profile.titles} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-bg-main dark:bg-bg-main border border-border-main dark:border-border-dark rounded-md shadow-sm dark:text-main"/>
                        </div>
                         <div>
                            <label htmlFor="photoUrl" className="block text-sm font-medium text-main dark:text-main">URL de la Foto</label>
                            <input type="text" name="photoUrl" value={profile.photoUrl} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-bg-main dark:bg-bg-main border border-border-main dark:border-border-dark rounded-md shadow-sm dark:text-main"/>
                        </div>
                         <img src={profile.photoUrl} alt="Preview" className="mt-4 w-32 h-32 rounded-full mx-auto object-cover"/>
                    </div>
                </div>
                <div className="lg:col-span-2 space-y-6">
                    <div className="p-4 bg-bg-alt dark:bg-bg-alt/50 rounded-lg">
                        <h3 className="font-semibold text-lg mb-2 flex items-center gap-2 text-accent-turquoise dark:text-primary"><StethoscopeIcon className="w-5 h-5"/>Contenido del Perfil</h3>
                        <div>
                            <label htmlFor="introduction" className="block text-sm font-medium text-main dark:text-main">Introducción</label>
                            <textarea name="introduction" rows={4} value={profile.introduction} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-bg-main dark:bg-bg-main border border-border-main dark:border-border-dark rounded-md shadow-sm dark:text-main"/>
                        </div>
                         <div>
                            <label htmlFor="experience" className="block text-sm font-medium text-main dark:text-main">Experiencia Profesional</label>
                            <textarea name="experience" rows={3} value={profile.experience} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-bg-main dark:bg-bg-main border border-border-main dark:border-border-dark rounded-md shadow-sm dark:text-main"/>
                        </div>
                        <div>
                            <label htmlFor="specialties" className="block text-sm font-medium text-main dark:text-main">Especialidades (separadas por coma)</label>
                            <input type="text" name="specialties" value={profile.specialties.join(', ')} onChange={handleSpecialtiesChange} className="mt-1 block w-full px-3 py-2 bg-bg-main dark:bg-bg-main border border-border-main dark:border-border-dark rounded-md shadow-sm dark:text-main"/>
                        </div>
                    </div>
                    
                    <div className="p-4 bg-bg-alt dark:bg-bg-alt/50 rounded-lg">
                         <h3 className="font-semibold text-lg mb-2 flex items-center gap-2 text-accent-turquoise dark:text-primary"><GraduationCapIcon className="w-5 h-5"/>Educación</h3>
                         <div className="space-y-4">
                             {profile.education.map(edu => (
                                <div key={edu.id} className="p-3 bg-bg-main dark:bg-bg-main rounded-md border border-border-main dark:border-border-dark grid grid-cols-1 md:grid-cols-3 gap-2">
                                     <input type="text" placeholder="Título" value={edu.degree} onChange={e => handleEducationChange(edu.id, 'degree', e.target.value)} className="w-full px-2 py-1 bg-bg-alt dark:bg-bg-alt rounded-md text-sm dark:text-main"/>
                                     <input type="text" placeholder="Institución" value={edu.institution} onChange={e => handleEducationChange(edu.id, 'institution', e.target.value)} className="w-full px-2 py-1 bg-bg-alt dark:bg-bg-alt rounded-md text-sm dark:text-main"/>
                                     <input type="text" placeholder="Ubicación" value={edu.location} onChange={e => handleEducationChange(edu.id, 'location', e.target.value)} className="w-full px-2 py-1 bg-bg-alt dark:bg-bg-alt rounded-md text-sm dark:text-main"/>
                                </div>
                            ))}
                         </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button onClick={handleSave} disabled={!hasChanges || isSaving} className="px-6 py-2 text-sm font-medium text-primary bg-accent-warm rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed">
                             {isSaving ? 'Guardando...' : 'Guardar Cambios del Perfil'}
                        </button>
                    </div>
                </div>
            </div>
        </PageWrapper>
    );
};

const AdminChatManager = ({ user, token, sendChatMessage, fetchUnreadCount, clearChatNotifications }: Pick<AdminViewProps, 'user' | 'token' | 'sendChatMessage' | 'fetchUnreadCount' | 'clearChatNotifications'>) => {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
    const [currentMessages, setCurrentMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const authHeader = { 'Authorization': `Bearer ${token}` };

    const fetchConversations = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/chat/conversations`, { headers: authHeader });
            if (!res.ok) throw new Error('Failed to fetch conversations');
            setConversations(await res.json());
        } catch (error) {
            console.error(error);
        }
    }, [token]);

    const fetchMessages = useCallback(async (patientId: number) => {
        try {
            const res = await fetch(`${API_BASE_URL}/chat/conversation/${patientId}`, { headers: authHeader });
            if (!res.ok) throw new Error('Failed to fetch messages');
            setCurrentMessages(await res.json());
            // Refetch conversations and total unread count to update UI
            fetchConversations();
            fetchUnreadCount();
            clearChatNotifications();
        } catch (error) {
            console.error(error);
        }
    }, [token, fetchConversations, fetchUnreadCount, clearChatNotifications]);

    useEffect(() => {
        setIsLoading(true);
        fetchConversations().finally(() => setIsLoading(false));
    }, [fetchConversations]);

    const handleSelectConversation = (patientId: number) => {
        setSelectedPatientId(patientId);
        fetchMessages(patientId);
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !selectedPatientId) return;

        const sentMessage = await sendChatMessage({ text: newMessage, recipientId: selectedPatientId });
        if(sentMessage) {
            setCurrentMessages(prev => [...prev, sentMessage]);
            setNewMessage('');
            fetchConversations();
        }
    };
    
    const selectedPatientName = conversations.find(c => c.patientId === selectedPatientId)?.patientName;

    return (
        <PageWrapper title="Chat con Pacientes">
            <div className="flex border border-border-main dark:border-border-dark rounded-lg h-[75vh]">
                {/* Left Panel: Conversation List */}
                <div className="w-1/3 border-r border-border-main dark:border-border-dark flex flex-col">
                    <div className="p-4 border-b border-border-main dark:border-border-dark">
                        <h3 className="font-semibold text-main dark:text-main">Conversaciones</h3>
                    </div>
                    <ul className="overflow-y-auto flex-grow">
                        {isLoading && <li className="p-4 text-center text-muted">Cargando...</li>}
                        {!isLoading && conversations.map(convo => (
                            <li key={convo.patientId}>
                                <button 
                                    onClick={() => handleSelectConversation(convo.patientId)}
                                    className={`w-full text-left p-4 hover:bg-bg-alt dark:hover:bg-bg-alt/50 ${selectedPatientId === convo.patientId ? 'bg-accent-warm/50 dark:bg-primary/10' : ''}`}
                                >
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-main dark:text-main">{convo.patientName}</span>
                                        {convo.unreadCount > 0 && <span className="bg-accent-red text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">{convo.unreadCount}</span>}
                                    </div>
                                    <p className="text-sm text-muted dark:text-muted truncate">{convo.lastMessage}</p>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
                {/* Right Panel: Chat Window */}
                <div className="w-2/3 flex flex-col">
                    {selectedPatientId ? (
                        <>
                           <div className="p-4 border-b border-border-main dark:border-border-dark">
                                <h3 className="font-semibold text-main dark:text-main">Chat con {selectedPatientName}</h3>
                           </div>
                           <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-bg-alt dark:bg-bg-main">
                                {currentMessages.map(msg => (
                                    <div key={msg.id} className={`flex items-end gap-2 ${msg.senderId === user.id ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-md p-3 rounded-lg ${msg.senderId === user.id ? 'bg-accent-warm text-primary rounded-br-none' : 'bg-bg-alt dark:bg-border-dark text-main dark:text-white rounded-bl-none'}`}>
                                            <p className="text-sm">{msg.text}</p>
                                            <p className={`text-xs mt-1 ${msg.senderId === user.id ? 'text-primary/70' : 'text-muted dark:text-white/70'}`}>{msg.timestamp}</p>
                                        </div>
                                    </div>
                                ))}
                           </div>
                           <div className="p-4 border-t border-border-main dark:border-border-dark bg-bg-main dark:bg-surface-dark">
                                <div className="flex items-center gap-2">
                                    <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSendMessage()} placeholder="Escriba su mensaje..." className="flex-grow px-3 py-2 bg-bg-main dark:bg-bg-main dark:text-main border border-border-main dark:border-border-dark rounded-full focus:outline-none focus:ring-2 focus:ring-primary-light"/>
                                    <button onClick={handleSendMessage} className="bg-primary text-white p-3 rounded-full hover:opacity-90 transition-opacity">
                                        <SendIcon className="w-5 h-5"/>
                                    </button>
                                </div>
                           </div>
                        </>
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <p className="text-muted dark:text-muted">Seleccione una conversación para comenzar a chatear.</p>
                        </div>
                    )}
                </div>
            </div>
        </PageWrapper>
    );
};

export default AdminView;