import { DatePipe } from '@angular/common';
import { Component, inject, input, resource } from '@angular/core';
import { AuthShell } from '../../shared/auth-shell';
import { CertificateService } from '../../core/certificate.service';

@Component({
  selector: 'app-verify',
  imports: [DatePipe, AuthShell],
  template: `
    <app-auth-shell>
      <h1 class="mb-4 text-3xl font-semibold text-navy-900">Verificação de certificado</h1>
      @if (cert.isLoading()) {
        <p>Consultando…</p>
      } @else if (cert.value(); as c) {
        <div role="status" class="alert-success">
          <p class="mb-3 font-display text-xl font-semibold"><span aria-hidden="true">✅</span> Certificado autêntico</p>
          <dl class="space-y-1 text-sm">
            <div><dt class="inline font-bold">Professor(a): </dt><dd class="inline">{{ c.teacherName }}</dd></div>
            <div><dt class="inline font-bold">Disciplina: </dt><dd class="inline">{{ c.subject }}</dd></div>
            <div><dt class="inline font-bold">Curso: </dt><dd class="inline">{{ c.course }}</dd></div>
            @if (c.workloadHours) {
              <div><dt class="inline font-bold">Carga horária: </dt><dd class="inline">{{ c.workloadHours }} h</dd></div>
            }
            <div><dt class="inline font-bold">Escola: </dt><dd class="inline">{{ c.schoolName }}</dd></div>
            <div><dt class="inline font-bold">Diretor(a): </dt><dd class="inline">{{ c.directorName }}</dd></div>
            <div><dt class="inline font-bold">Emitido em: </dt><dd class="inline">{{ c.issuedAt?.toDate() | date: 'dd/MM/yyyy' }}</dd></div>
          </dl>
        </div>
      } @else {
        <p role="alert" class="alert-error">Código não encontrado. Confira se foi digitado corretamente.</p>
      }
    </app-auth-shell>
  `,
})
export class Verify {
  private readonly certificates = inject(CertificateService);
  readonly code = input.required<string>();
  protected readonly cert = resource({
    params: () => this.code().trim().toUpperCase(),
    loader: ({ params }) => this.certificates.getIssued(params),
  });
}
