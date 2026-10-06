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
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { Invite } from './models';

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

  remove(code: string) {
    return deleteDoc(doc(db, 'invites', code));
  }

  link(code: string): string {
    return `${location.origin}/convite/${code}`;
  }
}
