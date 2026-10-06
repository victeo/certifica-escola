import { DatePipe } from '@angular/common';
import { Component, inject, input, resource } from '@angular/core';
import { CertificateService } from '../../core/certificate.service';

@Component({
  selector: 'app-verify',
  imports: [DatePipe],
  template: `
    <main class="mx-auto mt-16 max-w-lg px-4">
      <h1 class="mb-6 text-2xl font-semibold text-gray-900">Verificação de certificado</h1>
      @if (cert.isLoading()) {
        <p>Consultando…</p>
      } @else if (cert.value(); as c) {
        <div role="status" class="rounded border border-green-700 bg-green-50 p-4 text-gray-900">
          <p class="mb-2 font-semibold text-green-900">Certificado autêntico</p>
          <dl class="space-y-1 text-sm">
            <div><dt class="inline font-medium">Professor(a): </dt><dd class="inline">{{ c.teacherName }}</dd></div>
            <div><dt class="inline font-medium">Disciplina: </dt><dd class="inline">{{ c.subject }}</dd></div>
            <div><dt class="inline font-medium">Curso: </dt><dd class="inline">{{ c.course }}</dd></div>
            <div><dt class="inline font-medium">Carga horária: </dt><dd class="inline">{{ c.workloadHours }} h</dd></div>
            <div><dt class="inline font-medium">Escola: </dt><dd class="inline">{{ c.schoolName }}</dd></div>
            <div><dt class="inline font-medium">Diretor(a): </dt><dd class="inline">{{ c.directorName }}</dd></div>
            <div><dt class="inline font-medium">Emitido em: </dt><dd class="inline">{{ c.issuedAt?.toDate() | date: 'dd/MM/yyyy' }}</dd></div>
          </dl>
        </div>
      } @else {
        <p role="alert" class="text-red-700">Código não encontrado. Confira se foi digitado corretamente.</p>
      }
    </main>
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
