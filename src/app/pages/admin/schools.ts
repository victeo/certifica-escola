import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminDataService } from '../../core/admin-data.service';
import { formatDate, inviteStatus, inviteStatusLabel } from '../../core/format';
import { InviteService } from '../../core/invite.service';
import { DirectorRecord, Invite, SchoolSummary } from '../../core/models';
import { errorMessage } from '../../shared/error-message';
import { Modal } from '../../shared/modal';

type SchoolFilter = 'all' | 'pending' | 'no-director' | 'no-teachers';

@Component({
  selector: 'app-admin-schools',
  imports: [ReactiveFormsModule, RouterLink, Modal],
  template: `
    <section class="card" aria-labelledby="new-invite">
      <h2 id="new-invite" class="section-title"><span aria-hidden="true">💌</span> Convidar diretor(a)</h2>
      <form [formGroup]="inviteForm" (ngSubmit)="createInvite()" class="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div class="grow">
          <label for="school" class="field-label">Nome da escola</label>
          <input id="school" formControlName="schoolName" list="school-names" class="field-input" autocomplete="off" />
          <datalist id="school-names">
            @for (s of data.schools(); track s.name) { <option [value]="s.name"></option> }
          </datalist>
        </div>
        <button type="submit" [disabled]="inviteForm.invalid || busy()" class="btn-accent">Gerar convite</button>
      </form>
      <p class="mt-2 text-sm text-slate-700">Use o nome de uma escola existente para convidar outro diretor para ela.</p>
      @if (error()) {
        <p role="alert" class="alert-error mt-4">{{ error() }}</p>
      }
    </section>

    @if (revealed(); as inv) {
      <section class="alert-success" role="status" aria-label="Link do convite">
        <p class="mb-2 text-sm font-bold">Link do convite de {{ inv.schoolName }} (válido até {{ date(inv.expiresAt) }}):</p>
        <div class="flex flex-col gap-2 sm:flex-row">
          <input readonly [value]="link(inv.code)" aria-label="Link do convite" class="field-input grow text-sm"
            (focus)="$any($event.target).select()" />
          <button type="button" class="btn-primary" (click)="copy(inv)">{{ copied() === inv.code ? 'Copiado!' : 'Copiar link' }}</button>
          <button type="button" class="btn-ghost" (click)="revealedCode.set(null)">Ocultar</button>
        </div>
      </section>
    }

    <section aria-labelledby="schools-title" class="space-y-4">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <h2 id="schools-title" class="section-title !mb-0"><span aria-hidden="true">🏫</span> Escolas ({{ filtered().length }})</h2>
        <div class="grid w-full gap-3 sm:w-auto sm:grid-cols-2">
          <div>
            <label for="s-search" class="field-label">Buscar</label>
            <input id="s-search" type="search" class="field-input" placeholder="Escola, diretor ou e-mail"
              [value]="search()" (input)="search.set($any($event.target).value)" />
          </div>
          <div>
            <label for="s-filter" class="field-label">Mostrar</label>
            <select id="s-filter" class="field-input" [value]="filter()" (change)="filter.set($any($event.target).value)">
              <option value="all">Todas</option>
              <option value="pending">Com convite pendente</option>
              <option value="no-director">Sem diretor cadastrado</option>
              <option value="no-teachers">Sem professores</option>
            </select>
          </div>
        </div>
      </div>

      @if (!filtered().length) {
        <p class="empty">Nenhuma escola encontrada.</p>
      }
      @for (s of filtered(); track s.name) {
        <details class="card group" [open]="filtered().length <= 3 || !!search()">
          <summary class="flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-2">
            <span class="font-display text-lg font-semibold text-navy-900">{{ s.name }}</span>
            <span class="badge bg-navy-100 text-navy-900">{{ s.directors.length }} diretor(es)</span>
            <span class="badge bg-navy-100 text-navy-900">{{ s.teachers.length }} professor(es)</span>
            <span class="badge bg-emerald-100 text-emerald-900">{{ s.certificates }} certificado(s)</span>
            @if (s.pendingInvites) { <span class="badge bg-pencil-300 text-navy-900">{{ s.pendingInvites }} convite(s) pendente(s)</span> }
          </summary>

          <div class="mt-4 space-y-6">
            <div class="flex flex-wrap gap-2">
              <button type="button" class="btn-ghost btn-sm" (click)="openRename(s)">Renomear escola</button>
              <button type="button" class="btn-ghost btn-sm" (click)="newInviteFor(s)" [disabled]="busy()">Novo convite</button>
              <a class="btn-ghost btn-sm" routerLink="../professores" [queryParams]="{ escola: s.name }">Ver professores</a>
            </div>

            <div>
              <h3 class="mb-2 font-bold text-navy-900">Convites</h3>
              @if (!s.invites.length) {
                <p class="text-sm text-slate-700">Nenhum convite.</p>
              } @else {
                <table class="rtable">
                  <thead>
                    <tr>
                      <th scope="col">Status</th><th scope="col">Criado em</th><th scope="col">Válido até</th>
                      <th scope="col"><span class="sr-only">Ações</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (inv of s.invites; track inv.code) {
                      <tr>
                        <td data-label="Status"><span class="badge" [class]="statusClass(inv)">{{ statusLabel(inv) }}</span></td>
                        <td data-label="Criado em">{{ date(inv.createdAt) }}</td>
                        <td data-label="Válido até">{{ date(inv.expiresAt) }}</td>
                        <td class="actions">
                          <div class="flex flex-wrap justify-end gap-2">
                            @if (!inv.used) {
                              <button type="button" class="btn-primary btn-sm" (click)="revealedCode.set(inv.code)">Ver link</button>
                              <button type="button" class="btn-ghost btn-sm" (click)="renew(inv)" [disabled]="busy()">Renovar</button>
                              <button type="button" class="btn-danger btn-sm" (click)="deleteInvite(inv)">Excluir</button>
                            }
                          </div>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              }
            </div>

            <div>
              <h3 class="mb-2 font-bold text-navy-900">Diretores</h3>
              @if (!s.directors.length) {
                <p class="text-sm text-slate-700">Nenhum diretor cadastrado ainda.</p>
              } @else {
                <table class="rtable">
                  <thead>
                    <tr>
                      <th scope="col">Nome</th><th scope="col">E-mail</th><th scope="col">Professores</th>
                      <th scope="col"><span class="sr-only">Ações</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (d of s.directors; track d.uid) {
                      <tr>
                        <td data-label="Nome" class="font-bold text-navy-900">{{ d.name }}</td>
                        <td data-label="E-mail" class="break-all">{{ d.email }}</td>
                        <td data-label="Professores">{{ teachersOf(s, d) }}</td>
                        <td class="actions">
                          <div class="flex flex-wrap justify-end gap-2">
                            <button type="button" class="btn-ghost btn-sm" (click)="openDirector(d)" [attr.aria-label]="'Editar ' + d.name">Editar</button>
                            <button type="button" class="btn-danger btn-sm" (click)="removeDirector(d)" [attr.aria-label]="'Remover acesso de ' + d.name">Remover acesso</button>
                          </div>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              }
            </div>
          </div>
        </details>
      }
    </section>

    <app-modal heading="Renomear escola" [(open)]="renameOpen">
      <form [formGroup]="renameForm" (ngSubmit)="rename()" class="space-y-4">
        <p class="text-sm text-slate-700">O novo nome vale para convites, diretores e professores desta escola.</p>
        <div>
          <label for="r-name" class="field-label">Nome da escola</label>
          <input id="r-name" formControlName="name" class="field-input" autocomplete="off" />
        </div>
        @if (formError()) { <p role="alert" class="alert-error">{{ formError() }}</p> }
        <div class="flex justify-end gap-3">
          <button type="button" class="btn-ghost" (click)="renameOpen.set(false)">Cancelar</button>
          <button type="submit" class="btn-accent" [disabled]="renameForm.invalid || busy()">Salvar</button>
        </div>
      </form>
    </app-modal>

    <app-modal heading="Editar diretor(a)" [(open)]="directorOpen">
      <form [formGroup]="directorForm" (ngSubmit)="saveDirector()" class="space-y-4">
        <div>
          <label for="d-name" class="field-label">Nome</label>
          <input id="d-name" formControlName="name" class="field-input" autocomplete="off" />
        </div>
        <div>
          <label for="d-school" class="field-label">Escola</label>
          <input id="d-school" formControlName="schoolName" list="school-names" class="field-input" autocomplete="off" />
          <p class="mt-1 text-xs text-slate-700">Mudar a escola também move os professores deste diretor.</p>
        </div>
        @if (formError()) { <p role="alert" class="alert-error">{{ formError() }}</p> }
        <div class="flex justify-end gap-3">
          <button type="button" class="btn-ghost" (click)="directorOpen.set(false)">Cancelar</button>
          <button type="submit" class="btn-accent" [disabled]="directorForm.invalid || busy()">Salvar</button>
        </div>
      </form>
    </app-modal>
  `,
})
export class AdminSchools {
  protected readonly data = inject(AdminDataService);
  private readonly invites = inject(InviteService);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly formError = signal('');
  protected readonly search = signal('');
  protected readonly filter = signal<SchoolFilter>('all');
  protected readonly revealedCode = signal<string | null>(null);
  protected readonly copied = signal('');

  protected readonly renameOpen = signal(false);
  protected readonly directorOpen = signal(false);
  private renaming = '';
  private editingDirector: DirectorRecord | null = null;

  protected readonly inviteForm = this.fb.group({ schoolName: ['', Validators.required] });
  protected readonly renameForm = this.fb.group({ name: ['', Validators.required] });
  protected readonly directorForm = this.fb.group({ name: ['', Validators.required], schoolName: ['', Validators.required] });

  protected readonly revealed = computed<Invite | null>(
    () => this.data.invites().find((i) => i.code === this.revealedCode()) ?? null,
  );

  protected readonly filtered = computed<SchoolSummary[]>(() => {
    const q = this.search().trim().toLowerCase();
    const filter = this.filter();
    return this.data.schools().filter(
      (s) =>
        (!q ||
          s.name.toLowerCase().includes(q) ||
          s.directors.some((d) => `${d.name} ${d.email}`.toLowerCase().includes(q))) &&
        (filter === 'all' ||
          (filter === 'pending' && s.pendingInvites > 0) ||
          (filter === 'no-director' && s.directors.length === 0) ||
          (filter === 'no-teachers' && s.teachers.length === 0)),
    );
  });

  protected readonly date = formatDate;
  protected statusLabel = (inv: Invite) => inviteStatusLabel[inviteStatus(inv)];
  protected statusClass(inv: Invite): string {
    const s = inviteStatus(inv);
    if (s === 'used') return 'bg-emerald-100 text-emerald-900';
    return s === 'expired' ? 'bg-red-100 text-red-900' : 'bg-pencil-300 text-navy-900';
  }
  protected link = (code: string) => this.invites.link(code);
  protected teachersOf(s: SchoolSummary, d: DirectorRecord): number {
    return s.teachers.filter((t) => t.directorId === d.uid).length;
  }

  private async run(action: () => Promise<void>, onError: (m: string) => void = (m) => this.error.set(m)) {
    this.busy.set(true);
    onError('');
    try {
      await action();
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      this.busy.set(false);
    }
  }

  protected createInvite() {
    if (this.inviteForm.invalid) return;
    return this.run(async () => {
      const invite = await this.data.createInvite(this.inviteForm.getRawValue().schoolName.trim());
      this.revealedCode.set(invite.code);
      this.inviteForm.reset();
    });
  }

  protected newInviteFor(s: SchoolSummary) {
    return this.run(async () => {
      const invite = await this.data.createInvite(s.name);
      this.revealedCode.set(invite.code);
    });
  }

  protected renew(inv: Invite) {
    return this.run(() => this.data.renewInvite(inv.code));
  }

  protected deleteInvite(inv: Invite) {
    if (!confirm(`Excluir o convite de "${inv.schoolName}"? O link deixará de funcionar.`)) return;
    return this.run(async () => {
      await this.data.deleteInvite(inv.code);
      if (this.revealedCode() === inv.code) this.revealedCode.set(null);
    });
  }

  protected async copy(inv: Invite) {
    await navigator.clipboard.writeText(this.link(inv.code));
    this.copied.set(inv.code);
  }

  protected openRename(s: SchoolSummary) {
    this.renaming = s.name;
    this.renameForm.setValue({ name: s.name });
    this.formError.set('');
    this.renameOpen.set(true);
  }

  protected rename() {
    const name = this.renameForm.getRawValue().name.trim();
    if (!name || name === this.renaming) {
      this.renameOpen.set(false);
      return;
    }
    return this.run(async () => {
      await this.data.renameSchool(this.renaming, name);
      this.renameOpen.set(false);
    }, (m) => this.formError.set(m));
  }

  protected openDirector(d: DirectorRecord) {
    this.editingDirector = d;
    this.directorForm.setValue({ name: d.name, schoolName: d.schoolName });
    this.formError.set('');
    this.directorOpen.set(true);
  }

  protected saveDirector() {
    const d = this.editingDirector;
    if (!d || this.directorForm.invalid) return;
    const { name, schoolName } = this.directorForm.getRawValue();
    return this.run(async () => {
      await this.data.updateDirector(d.uid, name.trim(), schoolName.trim());
      this.directorOpen.set(false);
    }, (m) => this.formError.set(m));
  }

  protected removeDirector(d: DirectorRecord) {
    if (!confirm(`Remover o acesso de ${d.name}? Os professores cadastrados por esse diretor serão mantidos.`)) return;
    return this.run(() => this.data.removeDirector(d.uid));
  }
}
