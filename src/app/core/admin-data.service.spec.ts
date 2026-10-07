import { TestBed } from '@angular/core/testing';
import { Timestamp } from 'firebase/firestore';
import { AdminDataService, NO_SCHOOL } from './admin-data.service';
import { DirectorRecord, Invite, Teacher } from './models';

const ts = (offsetDays: number) => Timestamp.fromMillis(Date.now() + offsetDays * 86_400_000);
const invite = (code: string, schoolName: string, used: boolean, exp: number): Invite => ({
  code, schoolName, used, usedBy: used ? 'd1' : null, createdAt: ts(-10), expiresAt: ts(exp),
});
const director = (uid: string, schoolName: string): DirectorRecord => ({
  uid, name: `Dir ${uid}`, email: `${uid}@x.com`, role: 'director', schoolName,
});
const teacher = (id: string, directorId: string, schoolName?: string, subject = 'Arte'): Teacher => ({
  id, directorId, schoolName, name: id, email: `${id}@x.com`, subject,
});

describe('AdminDataService', () => {
  let svc: AdminDataService;

  beforeEach(() => {
    svc = TestBed.inject(AdminDataService);
    svc.invites.set([invite('a', 'Escola A', true, 5), invite('b', 'Escola A', false, 5), invite('c', 'Escola B', false, -1)]);
    svc.directors.set([director('d1', 'Escola A')]);
    svc.teachers.set([
      teacher('t1', 'd1', 'Escola A'),
      teacher('t2', 'd1'), // cadastro antigo, sem schoolName: usa a escola do diretor
      teacher('t3', 'removido', 'Escola C'), // diretor removido, escola gravada no cadastro
      teacher('t4', 'removido'),
    ]);
    svc.certificates.set([
      { code: 'X1', teacherId: 't1', directorId: 'd1', teacherName: 't1', schoolName: 'Escola A', directorName: 'Dir', issuedAt: null },
      { code: 'X2', teacherId: 't1', directorId: 'd1', teacherName: 't1', schoolName: 'Escola A', directorName: 'Dir', issuedAt: null },
    ]);
  });

  it('resolves the school of each teacher', () => {
    const schools = Object.fromEntries(svc.teacherRows().map((t) => [t.id, t.school]));
    expect(schools).toEqual({ t1: 'Escola A', t2: 'Escola A', t3: 'Escola C', t4: NO_SCHOOL });
  });

  it('counts certificates per teacher', () => {
    expect(svc.teacherRows().find((t) => t.id === 't1')?.certs).toBe(2);
    expect(svc.teacherRows().find((t) => t.id === 't2')?.certs).toBe(0);
  });

  it('summarizes every school (invites, directors, teachers, certificates)', () => {
    const byName = Object.fromEntries(svc.schools().map((s) => [s.name, s]));
    expect(Object.keys(byName).sort()).toEqual(['Escola A', 'Escola B', 'Escola C', NO_SCHOOL].sort());
    const a = byName['Escola A'];
    expect([a.invites.length, a.directors.length, a.teachers.length, a.pendingInvites]).toEqual([2, 1, 2, 1]);
    expect([a.certificates, a.teachersWithCertificate]).toEqual([2, 1]);
    expect(byName['Escola B'].expiredInvites).toBe(1);
    expect(byName['Escola B'].teachers.length).toBe(0);
  });
});
