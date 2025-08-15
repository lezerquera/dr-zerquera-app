import React, { useState } from 'react';
import type { ClinicInfo, Service, DoctorProfile, EducationItem, Appointment, DetailedInfo, Insurance } from '../types';
import { PageWrapper } from '../components/PageWrapper';
import { Modal } from '../components/Modal';
import { BuildingIcon, StethoscopeIcon, UsersIcon, PlusCircleIcon, EditIcon, TrashIcon, ClockIcon, CheckCircleIcon, GraduationCapIcon, CreditCardIcon, ShieldIcon } from '../components/Icons';

interface AdminViewProps {
  clinicInfo: ClinicInfo;
  saveClinicInfo: (info: ClinicInfo) => Promise<void>;
  services: Service[];
  saveService: (service: Service) => Promise<void>;
  deleteService: (id: number) => Promise<void>;
  doctorProfile: DoctorProfile;
  saveDoctorProfile: (profile: DoctorProfile) => Promise<void>;
  appointments: Appointment[];
  confirmAppointment: (appointmentId: number) => void;
  allInsurances: Insurance[];
  acceptedInsurances: string[];
  saveAcceptedInsurances: (ids: string[]) => Promise<void>;
}

type AdminTab = 'info' | 'services' | 'staff' | 'insurances';

const AdminView: React.FC<AdminViewProps> = (props) => {
    const [activeTab, setActiveTab] = useState<AdminTab>('info');

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
                    <AdminTabButton id="info" activeTab={activeTab} setActiveTab={setActiveTab} icon={<BuildingIcon className="w-5 h-5"/>}>Info y Citas</AdminTabButton>
                    <AdminTabButton id="services" activeTab={activeTab} setActiveTab={setActiveTab} icon={<StethoscopeIcon className="w-5 h-5"/>}>Servicios</AdminTabButton>
                    <AdminTabButton id="insurances" activeTab={activeTab} setActiveTab={setActiveTab} icon={<CreditCardIcon className="w-5 h-5"/>}>Seguros</AdminTabButton>
                    <AdminTabButton id="staff" activeTab={activeTab} setActiveTab={setActiveTab} icon={<UsersIcon className="w-5 h-5"/>}>Dr. Zerquera</AdminTabButton>
                </nav>
            </div>
            
            <div>
                {activeTab === 'info' && <ClinicInfoManager clinicInfo={props.clinicInfo} saveClinicInfo={props.saveClinicInfo} appointments={sortedAppointments} confirmAppointment={props.confirmAppointment} />}
                {activeTab === 'services' && <ServicesManager services={props.services} saveService={props.saveService} deleteService={props.deleteService} />}
                {activeTab === 'insurances' && <InsurancesManager allInsurances={props.allInsurances} acceptedInsurances={props.acceptedInsurances} saveAcceptedInsurances={props.saveAcceptedInsurances} />}
                {activeTab === 'staff' && <DoctorProfileManager doctorProfile={props.doctorProfile} saveDoctorProfile={props.saveDoctorProfile} />}
            </div>
        </div>
    );
};

interface AdminTabButtonProps {
    id: AdminTab;
    activeTab: AdminTab;
    setActiveTab: (id: AdminTab) => void;
    icon: React.ReactNode;
    children: React.ReactNode;
}

const AdminTabButton = ({ id, activeTab, setActiveTab, icon, children }: AdminTabButtonProps) => {
    const isActive = activeTab === id;
    return (
        <button onClick={() => setActiveTab(id)} className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${isActive ? 'bg-accent-warm text-primary font-semibold' : 'text-muted dark:text-muted hover:text-main dark:hover:text-main hover:bg-accent-warm/30 dark:hover:bg-primary/10'}`}>
            {icon}
            {children}
        </button>
    );
}

const ClinicInfoManager = ({ clinicInfo, saveClinicInfo, appointments, confirmAppointment }: Pick<AdminViewProps, 'clinicInfo' | 'saveClinicInfo' | 'appointments' | 'confirmAppointment'>) => {
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
    
    const getStatusChip = (status: Appointment['status']) => {
        switch (status) {
            case 'Confirmada': return 'bg-accent-turquoise/10 text-accent-turquoise';
            case 'Solicitada': return 'bg-accent-red/10 text-accent-red';
            case 'Cancelada': return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
        }
    }

    const getUrgencyChip = (urgency: Appointment['urgency']) => {
        switch (urgency) {
            case 'Urgente': return 'border-red-500 text-red-500';
            case 'Moderada': return 'border-yellow-500 text-yellow-500';
            default: return 'border-gray-500 text-gray-500 dark:border-gray-400 dark:text-gray-400';
        }
    }


    return (
        <PageWrapper title="Panel de Administración">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                    <h2 className="text-xl font-semibold mb-4 text-accent-turquoise dark:text-primary">Información General</h2>
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
                        <div className="pt-4">
                            <button onClick={handleSave} disabled={!hasChanges || isSaving} className="px-4 py-2 text-sm font-medium text-primary bg-accent-warm rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed">
                                {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                            </button>
                        </div>
                    </div>
                </div>
                <div>
                     <h2 className="text-xl font-semibold mb-4 text-accent-turquoise dark:text-primary">Seguimiento de Citas</h2>
                     <div className="bg-bg-alt dark:bg-bg-alt/50 p-4 rounded-lg max-h-[500px] overflow-y-auto">
                        {appointments.length > 0 ? (
                             <ul className="space-y-4">
                                {appointments.map(app => (
                                    <li key={app.id} className={`p-4 bg-bg-main dark:bg-bg-main rounded-lg shadow-sm border-l-4 ${app.status === 'Solicitada' ? 'border-accent-red' : 'border-accent-turquoise'}`}>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-semibold text-main dark:text-main">{app.service.name}</p>
                                                <p className="text-sm text-muted dark:text-muted">Paciente: {app.patientName}</p>
                                                <p className="text-xs text-muted dark:text-muted">{app.patientEmail} | {app.patientPhone}</p>
                                            </div>
                                            <div className="text-right flex-shrink-0 ml-4">
                                                 <span className={`mt-1 inline-block px-2 py-1 text-xs font-medium rounded-full ${getStatusChip(app.status)}`}>{app.status}</span>
                                            </div>
                                        </div>
                                        {app.status === 'Solicitada' && (
                                            <div className="mt-3 pt-3 border-t border-border-main dark:border-border-dark">
                                                <div className="flex justify-between items-center mb-2">
                                                    <h4 className="text-sm font-semibold">Motivo de la Consulta:</h4>
                                                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${getUrgencyChip(app.urgency)}`}>{app.urgency}</span>
                                                </div>
                                                <p className="text-sm text-muted dark:text-muted bg-bg-alt dark:bg-bg-alt p-2 rounded-md">{app.reason}</p>
                                                <div className="flex gap-2 mt-3">
                                                    <button onClick={() => confirmAppointment(app.id)} className="flex-1 text-xs px-2 py-1 bg-primary text-white rounded hover:opacity-90 flex items-center justify-center gap-1"><CheckCircleIcon className="w-4 h-4"/> Confirmar</button>
                                                    <button className="flex-1 text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 flex items-center justify-center gap-1"><ClockIcon className="w-4 h-4"/> Reprogramar</button>
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
                            <p className="text-muted dark:text-main/80 text-center py-8">No hay citas registradas.</p>
                        )}
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

export default AdminView;