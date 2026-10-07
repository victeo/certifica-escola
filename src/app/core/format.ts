import { Timestamp } from 'firebase/firestore';
import { Invite, InviteStatus } from './models';

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
