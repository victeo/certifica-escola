import { Component, inject, resource, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CertificateService } from '../../core/certificate.service';
import { Teacher } from '../../core/models';
import { TeacherService } from '../../core/teacher.service';
import { AppHeader } from '../../shared/app-header';
import { errorMessage } from '../../shared/error-message';

@Component({
  selector: 'app-director',
  imports: [ReactiveFormsModule, AppHeader],
  template: `
    <app-header />
    <main class="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      <section class="card" aria-labelledby="form-title">
        <h2 id="form-title" class="section-title">
          <span aria-hidden="true">{{ editingId() ? '✏️' : '➕' }}</span>
          {{ editingId() ? 'Editar professor(a)' : 'Adicionar professor(a)' }}
        </h2>
        <form [formGroup]="form" (ngSubmit)="save()" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          @for (f of fields; track f.name) {
            <div>
              <label [for]="f.name" class="field-label">{{ f.label }}</label>
              <input [id]="f.name" [type]="f.type" [formControlName]="f.name" [attr.inputmode]="f.inputmode" class="field-input" />
            </div>
          }
          <div class="flex flex-wrap items-end gap-3 sm:col-span-2 lg:col-span-3">
            <button type="submit" [disabled]="form.invalid || busy()" class="btn-accent">
              {{ editingId() ? 'Salvar alterações' : 'Adicionar professor' }}
            </button>
            @if (editingId()) {
              <button type="button" class="btn-ghost" (click)="cancelEdit()">Cancelar</button>
            }
          </div>
        </form>
        @if (error()) {
          <p role="alert" class="alert-error mt-4">{{ error() }}</p>
        }
      </section>

      <section class="card" aria-labelledby="list-title">
        <h2 id="list-title" class="section-title">
          <span aria-hidden="true">🧑‍🏫</span> Professores
          <span class="badge bg-navy-100 text-navy-900">{{ teachers.value()?.length ?? 0 }}</span>
        </h2>
        @if (teachers.isLoading()) {
          <p>Carregando…</p>
        } @else if (!teachers.value()?.length) {
          <p class="empty">Nenhum professor cadastrado ainda. Use o formulário acima para começar.</p>
        } @else {
          <table class="rtable">
            <thead>
              <tr>
                <th scope="col">Nome</th>
                <th scope="col">Disciplina</th>
                <th scope="col">Curso</th>
                <th scope="col"><span class="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              @for (t of teachers.value(); track t.id) {
                <tr>
                  <td data-label="Nome" class="font-bold text-navy-900">{{ t.name }}</td>
                  <td data-label="Disciplina">{{ t.subject }}</td>
                  <td data-label="Curso">{{ t.course }}</td>
                  <td class="actions">
                    <div class="flex flex-wrap justify-end gap-2">
                      <button type="button" class="btn-primary btn-sm" (click)="download(t)"
                        [attr.aria-label]="'Baixar certificado de ' + t.name">Certificado</button>
                      <button type="button" class="btn-ghost btn-sm" (click)="edit(t)"
                        [attr.aria-label]="'Editar ' + t.name">Editar</button>
                      <button type="button" class="btn-danger btn-sm" (click)="remove(t)"
                        [attr.aria-label]="'Excluir ' + t.name">Excluir</button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </section>
    </main>
  `,
})
export class Director {
  private readonly service = inject(TeacherService);
  private readonly certificates = inject(CertificateService);

  protected readonly teachers = resource({ loader: () => this.service.list() });
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly editingId = signal<string | null>(null);

  protected readonly fields = [
    { name: 'name', label: 'Nome completo', type: 'text', inputmode: null },
    { name: 'email', label: 'E-mail', type: 'email', inputmode: null },
    { name: 'subject', label: 'Disciplina', type: 'text', inputmode: null },
    { name: 'course', label: 'Curso / formação', type: 'text', inputmode: null },
  ] as const;

  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    subject: ['', Validators.required],
    course: ['', Validators.required],
  });

  protected async save() {
    if (this.form.invalid) return;
    this.busy.set(true);
    this.error.set('');
    try {
      const raw = this.form.getRawValue();
      const data = { ...raw, name: raw.name.trim() };
      const id = this.editingId();
      if (id) await this.service.update(id, data);
      else await this.service.add(data);
      this.cancelEdit();
      this.teachers.reload();
    } catch (e) {
      this.error.set(errorMessage(e));
    } finally {
      this.busy.set(false);
    }
  }

  protected edit(t: Teacher) {
    this.editingId.set(t.id);
    this.form.setValue({
      name: t.name,
      email: t.email,
      subject: t.subject,
      course: t.course,
    });
  }

  protected cancelEdit() {
    this.editingId.set(null);
    this.form.reset();
  }

  protected async remove(t: Teacher) {
    if (!confirm(`Excluir ${t.name}?`)) return;
    try {
      await this.service.remove(t.id);
      this.teachers.reload();
    } catch (e) {
      this.error.set(errorMessage(e));
    }
  }

  protected async download(t: Teacher) {
    this.error.set('');
    try {
      await this.certificates.download(t);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : errorMessage(e));
    }
  }
}
