import { Service } from '@angular/core';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { DirectorRecord, Invite, UserProfile } from './models';

const INVITE_VALIDITY_DAYS = 7;

@Service()
export class InviteService {
  async create(schoolName: string): Promise<Invite> {
    const code = crypto.randomUUID().replaceAll('-', '');
    const now = Timestamp.now();
    const expiresAt = Timestamp.fromMillis(now.toMillis() + INVITE_VALIDITY_DAYS * 24 * 60 * 60 * 1000);
    await setDoc(doc(db, 'invites', code), {
      schoolName,
      used: false,
      usedBy: null,
      createdBy: auth.currentUser?.uid,
      createdAt: serverTimestamp(),
      expiresAt,
    });
    return { code, schoolName, used: false, usedBy: null, createdAt: now, expiresAt };
  }

  async list(): Promise<Invite[]> {
    const snap = await getDocs(query(collection(db, 'invites'), orderBy('createdAt', 'desc')));
    return snap.docs.map((d) => ({ code: d.id, ...(d.data() as Omit<Invite, 'code'>) }));
  }

  /** Somente admin: diretores cadastrados. */
  async listDirectors(): Promise<DirectorRecord[]> {
    const snap = await getDocs(query(collection(db, 'users'), where('role', '==', 'director')));
    return snap.docs
      .map((d) => ({ uid: d.id, ...(d.data() as UserProfile) }))
      .sort((a, b) => a.schoolName.localeCompare(b.schoolName, 'pt-BR'));
  }

  /** Renova a validade do convite por mais 7 dias a partir de agora. */
  renew(code: string) {
    const expiresAt = Timestamp.fromMillis(Date.now() + INVITE_VALIDITY_DAYS * 24 * 60 * 60 * 1000);
    return updateDoc(doc(db, 'invites', code), { expiresAt });
  }

  remove(code: string) {
    return deleteDoc(doc(db, 'invites', code));
  }

  link(code: string): string {
    return `${location.origin}/convite/${code}`;
  }
}
