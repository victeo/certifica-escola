import { Component, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Teacher, TeacherData } from '../core/models';

/** Formulário de professor (novo ou edição), usado dentro de um modal. */
@Component({
  selector: 'app-teacher-form',
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4">
      @if (context()) {
        <p class="rounded-xl bg-navy-50 px-3 py-2 text-sm text-navy-900">{{ context() }}</p>
      }
      <div>
        <label for="tf-name" class="field-label">Nome completo</label>
        <input id="tf-name" formControlName="name" autocomplete="off" class="field-input" />
      </div>
      <div>
        <label for="tf-email" class="field-label">E-mail</label>
        <input id="tf-email" type="email" formControlName="email" autocomplete="off" class="field-input" />
      </div>
      <div>
        <label for="tf-subject" class="field-label">Disciplina (opcional)</label>
        <input id="tf-subject" formControlName="subject" autocomplete="off" class="field-input" />
      </div>
      @if (error()) {
        <p role="alert" class="alert-error">{{ error() }}</p>
      }
      <div class="flex flex-wrap justify-end gap-3 pt-2">
        <button type="button" class="btn-ghost" (click)="cancel.emit()">Cancelar</button>
        <button type="submit" class="btn-accent" [disabled]="form.invalid || busy()">
          {{ busy() ? 'Salvando…' : teacher() ? 'Salvar alterações' : 'Adicionar professor' }}
        </button>
      </div>
    </form>
  `,
})
export class TeacherForm {
  readonly teacher = input<Teacher | null>(null);
  readonly context = input('');
  readonly busy = input(false);
  readonly error = input('');
  readonly save = output<TeacherData>();
  readonly cancel = output<void>();

  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    subject: [''],
  });

  constructor() {
    effect(() => {
      const t = this.teacher();
      this.form.reset({ name: t?.name ?? '', email: t?.email ?? '', subject: t?.subject ?? '' });
    });
  }

  protected submit() {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    this.save.emit({ name: v.name.trim(), email: v.email.trim(), subject: v.subject.trim() });
  }
}
