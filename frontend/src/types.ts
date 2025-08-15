
export interface User {
  id: number;
  email: string;
  role: 'admin' | 'patient';
  name: string;
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
  sender: string; // Name of the user
  senderRole: 'patient' | 'doctor' | 'system' | 'admin';
  text: string;
  timestamp: string;
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
