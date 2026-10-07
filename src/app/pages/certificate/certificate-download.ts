import { Component, inject, input, resource, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CertificateService } from '../../core/certificate.service';
import { eventFullName } from '../../core/event.config';
import { AuthShell } from '../../shared/auth-shell';

/** Página pública aberta pelo link do e-mail: gera e baixa o PDF a partir do registro da emissão. */
@Component({
  selector: 'app-certificate-download',
  imports: [AuthShell, RouterLink],
  template: `
    <app-auth-shell>
      <h1 class="mb-2 text-3xl font-semibold text-navy-900">Seu certificado</h1>
      @if (issued.isLoading()) {
        <p>Carregando…</p>
      } @else if (issued.value(); as c) {
        <p class="mb-1 text-slate-800"><strong class="text-navy-900">{{ c.teacherName }}</strong></p>
        <p class="mb-6 text-sm text-slate-700">{{ event }}</p>
        @if (error()) {
          <p role="alert" class="alert-error mb-4">{{ error() }}</p>
        }
        <button type="button" class="btn-accent w-full" (click)="download()" [disabled]="busy()">
          {{ busy() ? 'Gerando PDF…' : 'Baixar certificado (PDF)' }}
        </button>
        <p class="mt-4 text-center text-sm">
          <a [routerLink]="['/verificar', c.code]" class="font-bold text-navy-700 underline">Verificar autenticidade</a>
        </p>
      } @else {
        <p role="alert" class="alert-error">Certificado não encontrado. Confira o link recebido.</p>
      }
    </app-auth-shell>
  `,
})
export class CertificateDownload {
  private readonly certificates = inject(CertificateService);
  readonly code = input.required<string>();
  protected readonly event = eventFullName;
  protected readonly busy = signal(false);
  protected readonly error = signal('');

  protected readonly issued = resource({
    params: () => this.code().trim().toUpperCase(),
    loader: ({ params }) => this.certificates.getIssued(params),
  });

  protected async download() {
    const c = this.issued.value();
    if (!c) return;
    this.busy.set(true);
    this.error.set('');
    try {
      await this.certificates.downloadIssued(c);
    } catch {
      this.error.set('Não foi possível gerar o PDF. Tente novamente.');
    } finally {
      this.busy.set(false);
    }
  }
}
