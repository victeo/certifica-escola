import { Timestamp } from 'firebase/firestore';
import { CertificateRecord, Invite, InviteStatus } from './models';

export function inviteStatus(inv: Invite): InviteStatus {
  if (inv.used) return 'used';
  return inv.expiresAt.toMillis() < Date.now() ? 'expired' : 'pending';
}

export const inviteStatusLabel: Record<InviteStatus, string> = {
  pending: 'Pendente',
  used: 'Utilizado',
  expired: 'Expirado',
};

export function formatDate(ts: Timestamp | null | undefined): string {
  return ts ? ts.toDate().toLocaleDateString('pt-BR') : '';
}

export function formatMonth(ts: Timestamp | null | undefined): string {
  if (!ts) return 'Sem data';
  const d = ts.toDate();
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export function compareText(a: string, b: string): number {
  return a.localeCompare(b, 'pt-BR', { sensitivity: 'base' });
}

/** Código da emissão mais recente de cada professor (teacherId → código). */
export function latestCodeByTeacher(records: CertificateRecord[]): Map<string, string> {
  const latest = new Map<string, CertificateRecord>();
  for (const r of records) {
    const current = latest.get(r.teacherId);
    if (!current || (r.issuedAt?.toMillis() ?? 0) > (current.issuedAt?.toMillis() ?? 0)) latest.set(r.teacherId, r);
  }
  return new Map([...latest].map(([id, r]) => [id, r.code]));
}
