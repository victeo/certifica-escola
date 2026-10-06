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
    <main class="mx-auto max-w-5xl space-y-8 px-4 py-6">
      <section aria-labelledby="form-title">
        <h2 id="form-title" class="mb-3 text-xl font-semibold text-gray-900">
          {{ editingId() ? 'Editar professor(a)' : 'Adicionar professor(a)' }}
        </h2>
        <form [formGroup]="form" (ngSubmit)="save()" class="grid gap-4 sm:grid-cols-2">
          @for (f of fields; track f.name) {
            <div>
              <label [for]="f.name" class="mb-1 block text-sm font-medium text-gray-900">{{ f.label }}</label>
              <input [id]="f.name" [type]="f.type" [formControlName]="f.name" [attr.inputmode]="f.inputmode"
                class="w-full rounded border border-gray-500 px-3 py-2" />
            </div>
          }
          <div class="flex items-end gap-3 sm:col-span-2">
            <button type="submit" [disabled]="form.invalid || busy()"
              class="rounded bg-indigo-700 px-4 py-2 font-medium text-white hover:bg-indigo-800 disabled:opacity-60">
              {{ editingId() ? 'Salvar alterações' : 'Adicionar' }}
            </button>
            @if (editingId()) {
              <button type="button" class="px-3 py-2 text-gray-900 underline" (click)="cancelEdit()">Cancelar</button>
            }
          </div>
        </form>
        @if (error()) {
          <p role="alert" class="mt-2 text-sm text-red-700">{{ error() }}</p>
        }
      </section>

      <section aria-labelledby="list-title">
        <h2 id="list-title" class="mb-3 text-xl font-semibold text-gray-900">Professores</h2>
        @if (teachers.isLoading()) {
          <p>Carregando…</p>
        } @else if (!teachers.value()?.length) {
          <p class="text-gray-700">Nenhum professor cadastrado ainda.</p>
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead>
                <tr class="border-b border-gray-400 text-gray-900">
                  <th scope="col" class="py-2 pr-4">Nome</th>
                  <th scope="col" class="py-2 pr-4">Disciplina</th>
                  <th scope="col" class="py-2 pr-4">Curso</th>
                  <th scope="col" class="py-2 pr-4">Carga horária</th>
                  <th scope="col" class="py-2"><span class="sr-only">Ações</span></th>
                </tr>
              </thead>
              <tbody>
                @for (t of teachers.value(); track t.id) {
                  <tr class="border-b border-gray-200">
                    <td class="py-2 pr-4">{{ t.name }}</td>
                    <td class="py-2 pr-4">{{ t.subject }}</td>
                    <td class="py-2 pr-4">{{ t.course }}</td>
                    <td class="py-2 pr-4">{{ t.workloadHours }} h</td>
                    <td class="py-2 text-right whitespace-nowrap">
                      <button type="button" class="mr-3 font-medium text-indigo-800 underline" (click)="download(t)"
                        [attr.aria-label]="'Baixar certificado de ' + t.name">Baixar certificado</button>
                      <button type="button" class="mr-3 text-gray-900 underline" (click)="edit(t)"
                        [attr.aria-label]="'Editar ' + t.name">Editar</button>
                      <button type="button" class="text-red-700 underline" (click)="remove(t)"
                        [attr.aria-label]="'Excluir ' + t.name">Excluir</button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
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
    { name: 'cpf', label: 'CPF', type: 'text', inputmode: 'numeric' },
    { name: 'subject', label: 'Disciplina', type: 'text', inputmode: null },
    { name: 'course', label: 'Curso / formação', type: 'text', inputmode: null },
    { name: 'workloadHours', label: 'Carga horária (horas)', type: 'number', inputmode: 'numeric' },
  ] as const;

  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    cpf: ['', [Validators.required, Validators.pattern(/^(\d{11}|\d{3}\.\d{3}\.\d{3}-\d{2})$/)]],
    subject: ['', Validators.required],
    course: ['', Validators.required],
    workloadHours: [0, [Validators.required, Validators.min(1)]],
  });

  protected async save() {
    if (this.form.invalid) return;
    this.busy.set(true);
    this.error.set('');
    try {
      const raw = this.form.getRawValue();
      const data = { ...raw, name: raw.name.trim(), workloadHours: Number(raw.workloadHours) };
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
      cpf: t.cpf,
      subject: t.subject,
      course: t.course,
      workloadHours: t.workloadHours,
    });
  }

  protected cancelEdit() {
    this.editingId.set(null);
    this.form.reset({ workloadHours: 0 });
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
