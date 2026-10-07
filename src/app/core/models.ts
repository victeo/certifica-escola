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
  /** Opcional. */
  subject: string;
}

export interface Teacher extends TeacherData {
  id: string;
  directorId?: string;
  /** Escola gravada no cadastro (pode faltar em cadastros antigos). */
  schoolName?: string;
  createdAt?: Timestamp;
}

/** Professor com dados já resolvidos para listagens e relatórios. */
export interface TeacherRow extends Teacher {
  school: string;
  directorName: string;
  /** Quantidade de certificados emitidos para o professor. */
  certs: number;
}

/** Registro de emissão usado em contagens (um por download). */
export interface CertificateRecord {
  code: string;
  teacherId: string;
  directorId: string;
  teacherName: string;
  schoolName: string;
  directorName: string;
  issuedAt: Timestamp | null;
}

export type InviteStatus = 'pending' | 'used' | 'expired';

export interface SchoolSummary {
  name: string;
  invites: Invite[];
  directors: DirectorRecord[];
  teachers: TeacherRow[];
  pendingInvites: number;
  expiredInvites: number;
  certificates: number;
  teachersWithCertificate: number;
}

/** Registro público de um certificado emitido, consultável pelo código de verificação. */
export interface IssuedCertificate {
  code: string;
  teacherName: string;
  eventName: string;
  period: string;
  hours: number;
  schoolName: string;
  directorName: string;
  issuedAt: Timestamp;
}
