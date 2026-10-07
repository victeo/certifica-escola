import { computed, inject, Service, signal } from '@angular/core';
import { collection, doc, getDocs, WriteBatch } from 'firebase/firestore';
import { commitInChunks } from './batch';
import { compareText, inviteStatus } from './format';
import { db } from './firebase';
import { InviteService } from './invite.service';
import { CertificateRecord, DirectorRecord, Invite, SchoolSummary, Teacher, TeacherRow } from './models';
import { TeacherService } from './teacher.service';

export const NO_SCHOOL = '(Sem escola)';

/** Dados e operações do administrador (visão de todas as escolas). */
@Service()
export class AdminDataService {
  private readonly invitesApi = inject(InviteService);
  private readonly teachersApi = inject(TeacherService);

  readonly invites = signal<Invite[]>([]);
  readonly directors = signal<DirectorRecord[]>([]);
  readonly teachers = signal<Teacher[]>([]);
  readonly certificates = signal<CertificateRecord[]>([]);
  readonly loading = signal(false);
  readonly loaded = signal(false);
  readonly error = signal(false);

  private readonly directorsByUid = computed(() => new Map(this.directors().map((d) => [d.uid, d])));

  /** Quantidade de certificados emitidos por professor. */
  private readonly certsByTeacher = computed(() => {
    const map = new Map<string, number>();
    for (const c of this.certificates()) map.set(c.teacherId, (map.get(c.teacherId) ?? 0) + 1);
    return map;
  });

  readonly teacherRows = computed<TeacherRow[]>(() => {
    const directors = this.directorsByUid();
    const certs = this.certsByTeacher();
    return this.teachers().map((t) => {
      const director = t.directorId ? directors.get(t.directorId) : undefined;
      return {
        ...t,
        school: t.schoolName || director?.schoolName || NO_SCHOOL,
        directorName: director?.name ?? '(Diretor removido)',
        certs: certs.get(t.id) ?? 0,
      };
    });
  });

  /** Escolas = união dos nomes presentes em convites, diretores e professores. */
  readonly schools = computed<SchoolSummary[]>(() => {
    const map = new Map<string, SchoolSummary>();
    const get = (name: string) => {
      let s = map.get(name);
      if (!s) {
        s = {
          name,
          invites: [],
          directors: [],
          teachers: [],
          pendingInvites: 0,
          expiredInvites: 0,
          certificates: 0,
          teachersWithCertificate: 0,
        };
        map.set(name, s);
      }
      return s;
    };
    for (const inv of this.invites()) {
      const s = get(inv.schoolName);
      s.invites.push(inv);
      const status = inviteStatus(inv);
      if (status === 'pending') s.pendingInvites++;
      if (status === 'expired') s.expiredInvites++;
    }
    for (const d of this.directors()) get(d.schoolName).directors.push(d);
    for (const t of this.teacherRows()) {
      const s = get(t.school);
      s.teachers.push(t);
      s.certificates += t.certs;
      if (t.certs > 0) s.teachersWithCertificate++;
    }
    return [...map.values()].sort((a, b) => compareText(a.name, b.name));
  });

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(false);
    try {
      const [invites, directors, teachers, certificates] = await Promise.all([
        this.invitesApi.list(),
        this.invitesApi.listDirectors(),
        this.teachersApi.listAll(),
        getDocs(collection(db, 'certificates')),
      ]);
      this.invites.set(invites);
      this.directors.set(directors);
      this.teachers.set(teachers);
      this.certificates.set(
        certificates.docs.map((d) => ({ code: d.id, ...(d.data() as Omit<CertificateRecord, 'code'>) })),
      );
      this.loaded.set(true);
    } catch (e) {
      this.error.set(true);
      throw e;
    } finally {
      this.loading.set(false);
    }
  }

  async createInvite(schoolName: string): Promise<Invite> {
    const invite = await this.invitesApi.create(schoolName);
    await this.load();
    return invite;
  }

  async renewInvite(code: string) {
    await this.invitesApi.renew(code);
    await this.load();
  }

  async deleteInvite(code: string) {
    await this.invitesApi.remove(code);
    await this.load();
  }

  /** Renomeia a escola em convites, diretores e professores. */
  async renameSchool(oldName: string, newName: string) {
    const school = this.schools().find((s) => s.name === oldName);
    if (!school) return;
    await commitInChunks([
      ...school.invites.map((i) => (b: WriteBatch) =>
        b.update(doc(db, 'invites', i.code), { schoolName: newName })),
      ...school.directors.map((d) => (b: WriteBatch) =>
        b.update(doc(db, 'users', d.uid), { schoolName: newName })),
      ...school.teachers.map((t) => (b: WriteBatch) =>
        b.update(doc(db, 'teachers', t.id), { schoolName: newName })),
    ]);
    await this.load();
  }

  /** Edita nome/escola do diretor; a escola nova vale também para os professores dele. */
  async updateDirector(uid: string, name: string, schoolName: string) {
    const teachers = this.teachers().filter((t) => t.directorId === uid);
    const invites = this.invites().filter((i) => i.usedBy === uid);
    await commitInChunks([
      (b) => b.update(doc(db, 'users', uid), { name, schoolName }),
      ...invites.map((i) => (b: WriteBatch) =>
        b.update(doc(db, 'invites', i.code), { schoolName })),
      ...teachers.map((t) => (b: WriteBatch) =>
        b.update(doc(db, 'teachers', t.id), { schoolName })),
    ]);
    await this.load();
  }

  /** Remove o perfil do diretor (revoga o acesso). Os professores cadastrados permanecem. */
  async removeDirector(uid: string) {
    await commitInChunks([(b) => b.delete(doc(db, 'users', uid))]);
    await this.load();
  }

  async updateTeacher(id: string, data: { name: string; email: string; subject: string }) {
    await this.teachersApi.update(id, data);
    await this.load();
  }

  async deleteTeachers(ids: string[]) {
    await this.teachersApi.removeMany(ids);
    await this.load();
  }
}
