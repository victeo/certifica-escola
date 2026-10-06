import { DatePipe } from '@angular/common';
import { Component, inject, resource, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { InviteService } from '../../core/invite.service';
import { Invite } from '../../core/models';
import { AppHeader } from '../../shared/app-header';
import { errorMessage } from '../../shared/error-message';

@Component({
  selector: 'app-admin',
  imports: [ReactiveFormsModule, DatePipe, AppHeader],
  template: `
    <app-header />
    <main class="mx-auto max-w-5xl space-y-8 px-4 py-6">
      <section aria-labelledby="new-invite">
        <h2 id="new-invite" class="mb-3 text-xl font-semibold text-gray-900">Convidar diretor(a)</h2>
        <form [formGroup]="form" (ngSubmit)="create()" class="flex flex-wrap items-end gap-3">
          <div class="grow">
            <label for="school" class="mb-1 block text-sm font-medium text-gray-900">Nome da escola</label>
            <input id="school" formControlName="schoolName" class="w-full rounded border border-gray-500 px-3 py-2" />
          </div>
          <button type="submit" [disabled]="form.invalid || busy()"
            class="rounded bg-indigo-700 px-4 py-2 font-medium text-white hover:bg-indigo-800 disabled:opacity-60">
            Gerar convite
          </button>
        </form>
        @if (error()) {
          <p role="alert" class="mt-2 text-sm text-red-700">{{ error() }}</p>
        }
        @if (lastLink(); as link) {
          <div class="mt-4 rounded border border-green-700 bg-green-50 p-3" role="status">
            <p class="mb-1 text-sm text-gray-900">Envie este link ao diretor (válido por 7 dias):</p>
            <input readonly [value]="link" aria-label="Link do convite" class="w-full rounded border border-gray-500 bg-white px-2 py-1 text-sm" (focus)="$any($event.target).select()" />
            <button type="button" class="mt-2 text-sm font-medium text-indigo-800 underline" (click)="copy(link)">
              {{ copied() ? 'Copiado!' : 'Copiar link' }}
            </button>
          </div>
        }
      </section>

      <section aria-labelledby="invites">
        <h2 id="invites" class="mb-3 text-xl font-semibold text-gray-900">Convites</h2>
        @if (invites.isLoading()) {
          <p>Carregando…</p>
        } @else if (!invites.value()?.length) {
          <p class="text-gray-700">Nenhum convite criado ainda.</p>
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead>
                <tr class="border-b border-gray-400 text-gray-900">
                  <th scope="col" class="py-2 pr-4">Escola</th>
                  <th scope="col" class="py-2 pr-4">Criado em</th>
                  <th scope="col" class="py-2 pr-4">Status</th>
                  <th scope="col" class="py-2"><span class="sr-only">Ações</span></th>
                </tr>
              </thead>
              <tbody>
                @for (inv of invites.value(); track inv.code) {
                  <tr class="border-b border-gray-200">
                    <td class="py-2 pr-4">{{ inv.schoolName }}</td>
                    <td class="py-2 pr-4">{{ inv.createdAt.toDate() | date: 'dd/MM/yyyy' }}</td>
                    <td class="py-2 pr-4">{{ status(inv) }}</td>
                    <td class="py-2 text-right">
                      @if (!inv.used) {
                        <button type="button" class="mr-3 text-indigo-800 underline" (click)="copy(service.link(inv.code))">Copiar link</button>
                        <button type="button" class="text-red-700 underline" (click)="revoke(inv)">Revogar</button>
                      }
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
export class Admin {
  protected readonly service = inject(InviteService);

  protected readonly invites = resource({ loader: () => this.service.list() });
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
