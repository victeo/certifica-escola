import { inject, Service } from '@angular/core';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { AuthService } from './auth.service';
import { db } from './firebase';
import { Teacher, TeacherData } from './models';

@Service()
export class TeacherService {
  private readonly auth = inject(AuthService);

  private get uid(): string {
    const uid = this.auth.user()?.uid;
    if (!uid) throw new Error('not-authenticated');
    return uid;
  }

  async list(): Promise<Teacher[]> {
    const snap = await getDocs(query(collection(db, 'teachers'), where('directorId', '==', this.uid)));
    return snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as TeacherData) }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }

  /** Somente admin: todos os professores de todas as escolas. */
  async listAll(): Promise<Teacher[]> {
    const snap = await getDocs(collection(db, 'teachers'));
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as TeacherData & { directorId: string }) }));
  }

  async add(data: TeacherData): Promise<void> {
    await addDoc(collection(db, 'teachers'), { ...data, directorId: this.uid, createdAt: serverTimestamp() });
  }

  update(id: string, data: TeacherData) {
    return updateDoc(doc(db, 'teachers', id), { ...data });
  }

  remove(id: string) {
    return deleteDoc(doc(db, 'teachers', id));
  }
}
