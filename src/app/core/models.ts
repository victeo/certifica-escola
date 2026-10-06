import { Timestamp } from 'firebase/firestore';

export type Role = 'admin' | 'director';

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
  cpf: string;
  subject: string;
  course: string;
  workloadHours: number;
}

export interface Teacher extends TeacherData {
  id: string;
}
