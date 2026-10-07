import { Component, inject, input, signal } from '@angular/core';
import { AdminDataService } from '../../core/admin-data.service';
import { TeacherData, TeacherRow } from '../../core/models';
import { errorMessage } from '../../shared/error-message';
import { Modal } from '../../shared/modal';
import { TeacherForm } from '../../shared/teacher-form';
import { TeacherList } from '../../shared/teacher-list';

@Component({
  selector: 'app-admin-teachers',
  imports: [Modal, TeacherForm, TeacherList],
  template: `
    <section class="card" aria-labelledby="t-title">
      <h2 id="t-title" class="section-title"><span aria-hidden="true">🧑‍🏫</span> Professores de todas as escolas</h2>
      @if (error()) {
        <p role="alert" class="alert-error mb-4">{{ error() }}</p>
      }
      <app-teacher-list
        [teachers]="data.teacherRows()"
        [showSchool]="true"
        [showDirector]="true"
        [allowCertificate]="true"
        [initialSchool]="escola() ?? ''"
        (edit)="openEdit($event)"
        (remove)="remove($event)"
      />
    </section>

    <app-modal heading="Editar professor(a)" [(open)]="modalOpen">
      <app-teacher-form
        [teacher]="editing()"
        [context]="editing() ? editing()!.school + ' · Diretor(a): ' + editing()!.directorName : ''"
        [busy]="busy()"
        [error]="formError()"
        (save)="save($event)"
        (cancel)="modalOpen.set(false)"
      />
    </app-modal>
  `,
})
export class AdminTeachers {
  protected readonly data = inject(AdminDataService);
  /** Escola vinda da URL (?escola=Nome), usada como filtro inicial. */
  readonly escola = input<string>();

  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly formError = signal('');
  protected readonly modalOpen = signal(false);
  protected readonly editing = signal<TeacherRow | null>(null);

  protected openEdit(t: TeacherRow) {
    this.editing.set(t);
    this.formError.set('');
    this.modalOpen.set(true);
  }

  protected async save(values: TeacherData) {
    const t = this.editing();
    if (!t) return;
    this.busy.set(true);
    this.formError.set('');
    try {
      await this.data.updateTeacher(t.id, values);
      this.modalOpen.set(false);
    } catch (e) {
      this.formError.set(errorMessage(e));
    } finally {
      this.busy.set(false);
    }
  }

  protected async remove(rows: TeacherRow[]) {
    const label = rows.length === 1 ? rows[0].name : `${rows.length} professores`;
    if (!confirm(`Excluir ${label}? Esta ação não pode ser desfeita.`)) return;
    this.error.set('');
    try {
      await this.data.deleteTeachers(rows.map((r) => r.id));
    } catch (e) {
      this.error.set(errorMessage(e));
    }
  }
}
