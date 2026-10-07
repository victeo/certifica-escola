import { inject, Service } from '@angular/core';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { AuthService } from './auth.service';
import { db } from './firebase';
import { mailWorkerUrl } from './mail.config';

export class EmailError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

const MESSAGES: Record<string, string> = {
  'not-configured': 'O envio por e-mail ainda não foi configurado (MAIL_WORKER_URL).',
  unauthenticated: 'Sua sessão expirou. Entre novamente.',
  forbidden: 'Você não tem permissão para enviar este certificado.',
  'not-found': 'Professor ou certificado não encontrado.',
  'invalid-recipient': 'O e-mail cadastrado do professor é inválido. Corrija o cadastro.',
  'rate-limited': 'Muitos envios seguidos. Aguarde um minuto.',
  'quota-exceeded': 'O limite de envios do provedor de e-mail foi atingido. Tente mais tarde.',
  network: 'Não foi possível falar com o servidor de e-mail. Verifique a conexão.',
};

export function emailErrorMessage(error: unknown): string {
  const code = error instanceof EmailError ? error.code : '';
  return MESSAGES[code] ?? 'Não foi possível enviar o e-mail. Tente novamente.';
}

@Service()
export class EmailService {
  private readonly auth = inject(AuthService);

  readonly configured = mailWorkerUrl.length > 0;

  /** Pede ao Worker para enviar o certificado ao e-mail cadastrado do professor e registra o envio. */
  async send(teacherId: string, certificateCode: string): Promise<void> {
    if (!this.configured) throw new EmailError('not-configured');
    const token = await this.auth.user()?.getIdToken();
    if (!token) throw new EmailError('unauthenticated');

    let res: Response;
    try {
      res = await fetch(`${mailWorkerUrl}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ teacherId, certificateCode }),
      });
    } catch {
      throw new EmailError('network');
    }
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      throw new EmailError(body.error ?? 'send-failed');
    }
    // Informativo (a regra só aceita a hora do servidor); falhar aqui não desfaz o envio.
    await updateDoc(doc(db, 'teachers', teacherId), { lastEmailedAt: serverTimestamp() }).catch(() => undefined);
  }
}
