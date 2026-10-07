import { DatePipe } from '@angular/common';
import { Component, computed, inject, resource, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { InviteService } from '../../core/invite.service';
import { Invite } from '../../core/models';
import { TeacherService } from '../../core/teacher.service';
import { AppHeader } from '../../shared/app-header';
import { errorMessage } from '../../shared/error-message';

@Component({
  selector: 'app-admin',
  imports: [ReactiveFormsModule, DatePipe, AppHeader],
  template: `
    <app-header />
    <main class="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      <section class="card" aria-labelledby="new-invite">
        <h2 id="new-invite" class="section-title"><span aria-hidden="true">💌</span> Convidar diretor(a)</h2>
        <form [formGroup]="form" (ngSubmit)="create()" class="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div class="grow">
            <label for="school" class="field-label">Nome da escola</label>
            <input id="school" formControlName="schoolName" class="field-input" />
          </div>
          <button type="submit" [disabled]="form.invalid || busy()" class="btn-accent">Gerar convite</button>
        </form>
        @if (error()) {
          <p role="alert" class="alert-error mt-4">{{ error() }}</p>
        }
        @if (lastLink(); as link) {
          <div class="alert-success mt-4" role="status">
            <p class="mb-2 text-sm font-bold">Envie este link ao diretor (válido por 7 dias):</p>
            <div class="flex flex-col gap-2 sm:flex-row">
              <input readonly [value]="link" aria-label="Link do convite" class="field-input grow text-sm" (focus)="$any($event.target).select()" />
              <button type="button" class="btn-primary" (click)="copy(link)">{{ copied() ? 'Copiado!' : 'Copiar link' }}</button>
            </div>
          </div>
        }
      </section>

      <section class="card" aria-labelledby="invites">
        <h2 id="invites" class="section-title"><span aria-hidden="true">📨</span> Convites</h2>
        @if (invites.isLoading()) {
          <p>Carregando…</p>
        } @else if (!invites.value()?.length) {
          <p class="empty">Nenhum convite criado ainda.</p>
        } @else {
          <table class="rtable">
            <thead>
              <tr>
                <th scope="col">Escola</th>
                <th scope="col">Criado em</th>
                <th scope="col">Status</th>
                <th scope="col"><span class="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              @for (inv of invites.value(); track inv.code) {
                <tr>
                  <td data-label="Escola" class="font-bold text-navy-900">{{ inv.schoolName }}</td>
                  <td data-label="Criado em">{{ inv.createdAt.toDate() | date: 'dd/MM/yyyy' }}</td>
                  <td data-label="Status">
                    <span class="badge" [class]="statusClass(inv)">{{ status(inv) }}</span>
                  </td>
                  <td class="actions">
                    @if (!inv.used) {
                      <div class="flex flex-wrap justify-end gap-2">
                        <button type="button" class="btn-ghost btn-sm" (click)="copy(service.link(inv.code))">Copiar link</button>
                        <button type="button" class="btn-danger btn-sm" (click)="revoke(inv)">Revogar</button>
                      </div>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </section>

      <section class="card" aria-labelledby="directors">
        <h2 id="directors" class="section-title"><span aria-hidden="true">🏫</span> Diretores</h2>
        @if (!directors.value()?.length) {
          <p class="empty">Nenhum diretor cadastrado ainda.</p>
        } @else {
          <table class="rtable">
            <thead>
              <tr>
                <th scope="col">Escola</th>
                <th scope="col">Diretor(a)</th>
                <th scope="col">E-mail</th>
                <th scope="col">Professores</th>
              </tr>
            </thead>
            <tbody>
              @for (d of directors.value(); track d.uid) {
                <tr>
                  <td data-label="Escola" class="font-bold text-navy-900">{{ d.schoolName }}</td>
                  <td data-label="Diretor(a)">{{ d.name }}</td>
                  <td data-label="E-mail">{{ d.email }}</td>
                  <td data-label="Professores">{{ teacherCount().get(d.uid) ?? 0 }}</td>
                </tr>
              }
            </tbody>
          </table>
        }
      </section>

      <section class="card" aria-labelledby="teachers">
        <h2 id="teachers" class="section-title"><span aria-hidden="true">🧑‍🏫</span> Professores de todas as escolas</h2>
        @if (!teachers.value()?.length) {
          <p class="empty">Nenhum professor cadastrado ainda.</p>
        } @else {
          <table class="rtable">
            <thead>
              <tr>
                <th scope="col">Professor(a)</th>
                <th scope="col">Escola</th>
                <th scope="col">Disciplina</th>
                <th scope="col">Curso</th>
              </tr>
            </thead>
            <tbody>
              @for (t of teachers.value(); track t.id) {
                <tr>
                  <td data-label="Professor(a)" class="font-bold text-navy-900">{{ t.name }}</td>
                  <td data-label="Escola">{{ schoolOf(t.directorId) }}</td>
                  <td data-label="Disciplina">{{ t.subject }}</td>
                  <td data-label="Curso">{{ t.course }}</td>
                </tr>
              }
            </tbody>
          </table>
        }
      </section>
    </main>
  `,
})
export class Admin {
  protected readonly service = inject(InviteService);

  protected readonly invites = resource({ loader: () => this.service.list() });
  private readonly teacherService = inject(TeacherService);
  protected readonly directors = resource({ loader: () => this.service.listDirectors() });
  protected readonly teachers = resource({
    loader: async () => (await this.teacherService.listAll()).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
  });
  protected readonly teacherCount = computed(() => {
    const counts = new Map<string, number>();
    for (const t of this.teachers.value() ?? []) {
      if (t.directorId) counts.set(t.directorId, (counts.get(t.directorId) ?? 0) + 1);
    }
    return counts;
  });

  protected schoolOf(directorId?: string): string {
    return this.directors.value()?.find((d) => d.uid === directorId)?.schoolName ?? '—';
  }

  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly lastLink = signal('');
  protected readonly copied = signal(false);
  protected readonly form = inject(FormBuilder).nonNullable.group({
    schoolName: ['', Validators.required],
  });

  protected status(inv: Invite): string {
    if (inv.used) return 'Utilizado';
    return inv.expiresAt.toMillis() < Date.now() ? 'Expirado' : 'Pendente';
  }

  protected statusClass(inv: Invite): string {
    const s = this.status(inv);
    if (s === 'Utilizado') return 'bg-emerald-100 text-emerald-900';
    return s === 'Expirado' ? 'bg-red-100 text-red-900' : 'bg-pencil-300 text-navy-900';
  }

  protected async create() {
    if (this.form.invalid) return;
    this.busy.set(true);
    this.error.set('');
    try {
      const invite = await this.service.create(this.form.getRawValue().schoolName.trim());
      this.lastLink.set(this.service.link(invite.code));
      this.copied.set(false);
      this.form.reset();
      this.invites.reload();
    } catch (e) {
      this.error.set(errorMessage(e));
    } finally {
      this.busy.set(false);
    }
  }

  protected async copy(link: string) {
    await navigator.clipboard.writeText(link);
    this.copied.set(true);
  }

  protected async revoke(inv: Invite) {
    if (!confirm(`Revogar o convite de "${inv.schoolName}"?`)) return;
    try {
      await this.service.remove(inv.code);
      this.invites.reload();
    } catch (e) {
      this.error.set(errorMessage(e));
    }
  }
}
