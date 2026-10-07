import { inject, Service } from '@angular/core';
import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { AuthService } from './auth.service';
import { commitInChunks } from './batch';
import { db } from './firebase';
import { CertificateRecord, Teacher, TeacherData } from './models';

@Service()
export class TeacherService {
  private readonly auth = inject(AuthService);

  private get uid(): string {
    const uid = this.auth.user()?.uid;
    if (!uid) throw new Error('not-authenticated');
    return uid;
  }

  /** Professores do diretor logado. */
  async list(): Promise<Teacher[]> {
    const snap = await getDocs(query(collection(db, 'teachers'), where('directorId', '==', this.uid)));
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Teacher, 'id'>) }));
  }

  /** Certificados emitidos pelo diretor logado. */
  async listCertificates(): Promise<CertificateRecord[]> {
    const snap = await getDocs(query(collection(db, 'certificates'), where('directorId', '==', this.uid)));
    return snap.docs.map((d) => ({ code: d.id, ...(d.data() as Omit<CertificateRecord, 'code'>) }));
  }

  /** Somente admin: todos os professores de todas as escolas. */
  async listAll(): Promise<Teacher[]> {
    const snap = await getDocs(collection(db, 'teachers'));
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Teacher, 'id'>) }));
  }

  async add(data: TeacherData): Promise<void> {
    await addDoc(collection(db, 'teachers'), {
      ...data,
      directorId: this.uid,
      schoolName: this.auth.profile()?.schoolName ?? '',
      createdAt: serverTimestamp(),
    });
  }

  update(id: string, data: TeacherData) {
    return updateDoc(doc(db, 'teachers', id), { ...data });
  }

  removeMany(ids: string[]) {
    return commitInChunks(ids.map((id) => (batch) => batch.delete(doc(db, 'teachers', id))));
  }
}
