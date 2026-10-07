import { inject, Service, signal } from '@angular/core';
import { CertificateService } from './certificate.service';
import { EmailError, emailErrorMessage, EmailService } from './email.service';
import { TeacherRow } from './models';

export interface MailResult {
  sent: number;
  failed: { name: string; message: string }[];
  /** Professores sem certificado emitido (quando quem envia não pode emitir). */
  skipped: string[];
  /** Interrompido por limite do provedor ou da sessão: os demais não foram tentados. */
  stoppedEarly: boolean;
}

const STOP_CODES = new Set(['quota-exceeded', 'rate-limited', 'unauthenticated', 'not-configured']);

/** Envia os certificados um a um, reaproveitando a emissão mais recente (ou emitindo, se permitido). */
@Service()
export class CertificateMailer {
  private readonly email = inject(EmailService);
  private readonly certificates = inject(CertificateService);

  readonly configured = this.email.configured;
  readonly sendingIds = signal<ReadonlySet<string>>(new Set());

  async send(rows: TeacherRow[], canIssue: boolean): Promise<MailResult> {
    const result: MailResult = { sent: 0, failed: [], skipped: [], stoppedEarly: false };
    for (const row of rows) {
      this.mark(row.id, true);
      try {
        const code = row.latestCode ?? (canIssue ? await this.certificates.issue(row) : null);
        if (!code) {
          result.skipped.push(row.name);
          continue;
        }
        await this.email.send(row.id, code);
        result.sent++;
      } catch (e) {
        result.failed.push({ name: row.name, message: emailErrorMessage(e) });
        if (e instanceof EmailError && STOP_CODES.has(e.code)) {
          result.stoppedEarly = true;
          break;
        }
      } finally {
        this.mark(row.id, false);
      }
    }
    return result;
  }

  private mark(id: string, on: boolean) {
    this.sendingIds.update((s) => {
      const next = new Set(s);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }
}

/** Mensagem curta para o usuário a partir do resultado. */
export function describeMailResult(r: MailResult): { text: string; ok: boolean } {
  const parts: string[] = [];
  if (r.sent) parts.push(`${r.sent} e-mail(s) enviado(s)`);
  if (r.skipped.length) parts.push(`${r.skipped.length} sem certificado emitido (${r.skipped.join(', ')}): o diretor precisa emitir antes`);
  if (r.failed.length) {
    const first = r.failed[0];
    parts.push(`${r.failed.length} falha(s): ${first.name} — ${first.message}${r.failed.length > 1 ? ' (e outros)' : ''}`);
  }
  if (r.stoppedEarly) parts.push('envio interrompido; os demais não foram tentados');
  return { text: parts.join('. ') + '.', ok: !r.failed.length && !r.skipped.length };
}
