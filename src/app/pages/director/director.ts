import { Component, computed, inject, resource, signal } from '@angular/core';
import { AuthService } from '../../core/auth.service';
import { CertificateMailer, describeMailResult } from '../../core/certificate-mailer';
import { CertificateService } from '../../core/certificate.service';
import { latestCodeByTeacher } from '../../core/format';
import { Teacher, TeacherData, TeacherRow } from '../../core/models';
import { TeacherService } from '../../core/teacher.service';
import { AppHeader } from '../../shared/app-header';
import { errorMessage } from '../../shared/error-message';
import { Modal } from '../../shared/modal';
import { StatCard } from '../../shared/stat-card';
import { TeacherForm } from '../../shared/teacher-form';
import { TeacherList } from '../../shared/teacher-list';

@Component({
  selector: 'app-director',
  imports: [AppHeader, Modal, StatCard, TeacherForm, TeacherList],
  template: `
    <app-header />
    <main class="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      <section aria-label="Resumo" class="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <app-stat label="Professores" [value]="rows().length" />
        <app-stat label="Disciplinas" [value]="subjectCount()" />
        <app-stat label="Certificados emitidos" [value]="issuedTotal()" />
        <app-stat label="Sem certificado" [value]="withoutCertificate()" hint="Professores que ainda não receberam" />
      </section>

      <section class="card" aria-labelledby="list-title">
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 id="list-title" class="section-title !mb-0"><span aria-hidden="true">🧑‍🏫</span> Professores</h2>
          <button type="button" class="btn-accent" (click)="openNew()">+ Adicionar professor</button>
        </div>
        @if (error()) {
          <p role="alert" class="alert-error mb-4">{{ error() }}</p>
        }
        @if (notice(); as n) {
          <p [class]="n.ok ? 'alert-success mb-4' : 'alert-error mb-4'" role="status">{{ n.text }}</p>
        }
        @if (!mailer.configured) {
          <p class="mb-4 rounded-xl bg-pencil-300/40 px-3 py-2 text-sm text-navy-900">
            O envio por e-mail ainda não foi configurado neste ambiente (MAIL_WORKER_URL).
          </p>
        }
        @if (data.isLoading()) {
          <p>Carregando…</p>
        } @else {
          <app-teacher-list
            [teachers]="rows()"
            [allowCertificate]="true"
            [allowEmail]="mailer.configured"
            [canIssueEmail]="true"
            [sendingIds]="mailer.sendingIds()"
            (email)="sendEmail([$event])"
            (emailMany)="sendEmail($event)"
            (edit)="openEdit($event)"
            (remove)="remove($event)"
            (certificate)="download($event)"
          />
        }
      </section>
    </main>

    <app-modal [heading]="editing() ? 'Editar professor(a)' : 'Adicionar professor(a)'" [(open)]="modalOpen">
      <app-teacher-form
        [teacher]="editing()"
        [busy]="busy()"
        [error]="formError()"
        (save)="save($event)"
        (cancel)="modalOpen.set(false)"
      />
    </app-modal>
  `,
})
export class Director {
  private readonly auth = inject(AuthService);
  private readonly service = inject(TeacherService);
  private readonly certificates = inject(CertificateService);
  protected readonly mailer = inject(CertificateMailer);

  protected readonly data = resource({
    loader: async () => {
      const [teachers, certs] = await Promise.all([this.service.list(), this.service.listCertificates()]);
      return { teachers, certs };
    },
  });

  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly formError = signal('');
  protected readonly modalOpen = signal(false);
  protected readonly editing = signal<Teacher | null>(null);
  protected readonly notice = signal<{ text: string; ok: boolean } | null>(null);

  protected readonly rows = computed<TeacherRow[]>(() => {
    const { teachers, certs } = this.data.value() ?? { teachers: [], certs: [] };
    const counts = new Map<string, number>();
    for (const c of certs) counts.set(c.teacherId, (counts.get(c.teacherId) ?? 0) + 1);
    const profile = this.auth.profile();
    const latest = latestCodeByTeacher(certs);
    return teachers.map((t) => ({
      ...t,
      latestCode: latest.get(t.id),
      school: profile?.schoolName ?? '',
      directorName: profile?.name ?? '',
      certs: counts.get(t.id) ?? 0,
    }));
  });

  protected readonly subjectCount = computed(() => new Set(this.rows().map((t) => t.subject).filter(Boolean)).size);
  protected readonly issuedTotal = computed(() => this.rows().reduce((n, t) => n + t.certs, 0));
  protected readonly withoutCertificate = computed(() => this.rows().filter((t) => t.certs === 0).length);

  protected openNew() {
    this.editing.set(null);
    this.formError.set('');
    this.modalOpen.set(true);
  }

  protected openEdit(t: Teacher) {
    this.editing.set(t);
    this.formError.set('');
    this.modalOpen.set(true);
  }

  protected async save(data: TeacherData) {
    this.busy.set(true);
    this.formError.set('');
    try {
      const current = this.editing();
      if (current) await this.service.update(current.id, data);
      else await this.service.add(data);
      this.modalOpen.set(false);
      this.data.reload();
    } catch (e) {
      this.formError.set(errorMessage(e));
    } finally {
      this.busy.set(false);
    }
  }

  protected async remove(rows: Teacher[]) {
    const label = rows.length === 1 ? rows[0].name : `${rows.length} professores`;
    if (!confirm(`Excluir ${label}? Esta ação não pode ser desfeita.`)) return;
    this.error.set('');
    try {
      await this.service.removeMany(rows.map((r) => r.id));
      this.data.reload();
    } catch (e) {
      this.error.set(errorMessage(e));
    }
  }

  protected async sendEmail(rows: TeacherRow[]) {
    if (rows.length > 1 && !confirm(`Enviar o certificado por e-mail para ${rows.length} professores?`)) return;
    this.notice.set(null);
    const result = await this.mailer.send(rows, true);
    this.notice.set(describeMailResult(result));
    this.data.reload();
  }

  protected async download(t: Teacher) {
    this.error.set('');
    try {
      await this.certificates.download(t);
      this.data.reload();
    } catch (e) {
      this.error.set(e instanceof Error && !('code' in e) ? e.message : errorMessage(e));
    }
  }
}
