export interface User {
  id: number;
  email: string;
  role: 'admin' | 'patient';
  name: string;
  exp?: number;
}

export interface EducationItem {
  id: number;
  degree: string;
  institution: string;
  location: string;
}

export interface DoctorProfile {
  name: string;
  titles: string;
  photoUrl: string;
  introduction: string;
  specialties: string[];
  experience: string;
  education: EducationItem[];
}

export interface Service {
  id: number;
  name: string;
  description: string;
  imageUrl: string;
  duration: string;
  price: string;
  detailedInfo: DetailedInfo;
}

export interface DetailedInfo {
  title: string;
  benefits: string[];
  treats: string[];
  process: string[];
  frequency: string;
  safety: string;
  specialOffer?: {
    oldPrice: string;
    newPrice: string;
    description: string;
  };
}

export interface Appointment {
  id: number;
  patientId?: number;
  patientName: string;
  patientPhone: string;
  patientEmail: string;
  service: Service;
  urgency: 'Rutinaria' | 'Moderada' | 'Urgente';
  reason: string;
  date?: string;
  time?: string;
  status: 'Confirmada' | 'Pendiente' | 'Cancelada' | 'Solicitada';
}

export interface ChatMessage {
  id: number;
  sender: string; // Name of the user, e.g., "Admin User" or "John Doe"
  senderId: number;
  senderRole: 'admin' | 'patient' | 'system';
  recipientId: number;
  text: string;
  timestamp: string;
  isRead: boolean;
}

// For the admin's conversation list view
export interface Conversation {
  patientId: number;
  patientName: string;
  lastMessage: string;
  lastMessageTimestamp: string;
  unreadCount: number;
}


export interface ClinicInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
}

export type NotificationType = 'new_appointment_request' | 'appointment_confirmed' | 'new_chat_message' | 'general';

export interface Notification {
    id: number;
    userId: string; // 'admin' or a patient's user ID
    type: NotificationType;
    priority: 'high' | 'medium' | 'low';
    status: 'unread' | 'read';
    message: string;
    data?: {
        appointmentId?: number;
        chatSender?: string;
    };
    createdAt: Date;
}

export interface Insurance {
  id: string;
  name: string;
  brandColor: string;
}

// --- Nuevos tipos para Formularios Dinámicos ---

export type QuestionType = 'text' | 'textarea' | 'select' | 'checkbox' | 'radio';

export interface Question {
  id: string; // Usar string para IDs temporales como Date.now()
  type: QuestionType;
  label: string;
  options?: string[];
  required: boolean;
}

export interface FormTemplate {
  id: number;
  title: string;
  description: string;
  structure: Question[];
  formType: 'generic' | 'clinical_wizard';
}

export interface FormSubmission {
  id: number;
  template_id: number;
  patient_id: number;
  submission_date: string;
  answers: Record<string, any> | ClinicalWizardAnswers;
  priority?: 'high' | 'medium' | 'low';
}

// Tipo simplificado para la vista del paciente
export interface PatientFormSubmission {
    id: number;
    submissionDate: string;
    title: string;
    templateId: number;
}

// --- Tipos para el nuevo Asistente Clínico ---
export interface BodyPainPoint {
  bodyPart: string;
  painType: string;
  intensity: number;
  duration: string;
  view: 'front' | 'back';
}

export interface ClinicalWizardAnswers {
  generalData?: {
    fullName: string;
    age: string;
    gender: string;
    occupation: string;
    contact: string;
  };
  consultationReason?: {
    reason: string;
    duration: string;
  };
  bodyMap?: BodyPainPoint[];
  mtc?: {
    coldHeat: 'Frío' | 'Calor';
    dayNight: 'Día' | 'Noche';
    fullEmpty: 'Plenitud' | 'Vacío';
    onset: 'Agudo' | 'Crónico';
  };
  tongue?: string[];
}


// --- Nuevos tipos para la gestión de pacientes (Admin) ---

export interface Patient {
  id: number;
  name: string;
  email: string;
  insuranceName?: string;
}

export interface PatientSubmissionDetail {
    id: number;
    submissionDate: string;
    answers: Record<string, any> | ClinicalWizardAnswers;
    title: string;
    structure: Question[]; // Puede ser [] para el wizard
    priority?: 'high' | 'medium' | 'low';
}

export interface PatientDetails {
    patient: Patient;
    submissions: PatientSubmissionDetail[];
    appointments: Appointment[];
}