import { Timestamp } from 'firebase/firestore';

export type Role = 'admin' | 'director';

export interface DirectorRecord extends UserProfile {
  uid: string;
}

export interface UserProfile {
  name: string;
  email: string;
  role: Role;
  schoolName: string;
}

export interface Invite {
  code: string;
  schoolName: string;
  used: boolean;
  usedBy: string | null;
  createdAt: Timestamp;
  expiresAt: Timestamp;
}

export interface TeacherData {
  name: string;
  email: string;
  subject: string;
  course: string;
  /** Legado: não é mais solicitado no cadastro. */
  cpf?: string;
  workloadHours?: number;
}

export interface Teacher extends TeacherData {
  id: string;
  directorId?: string;
}

/** Registro público de um certificado emitido, consultável pelo código de verificação. */
export interface IssuedCertificate {
  code: string;
  teacherName: string;
  subject: string;
  course: string;
  workloadHours?: number;
  schoolName: string;
  directorName: string;
  issuedAt: Timestamp;
}
