import { Component, inject, input, resource, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { errorMessage } from '../../shared/error-message';

@Component({
  selector: 'app-accept-invite',
  imports: [ReactiveFormsModule],
  template: `
    <main class="mx-auto mt-16 max-w-sm px-4">
      <h1 class="mb-6 text-2xl font-semibold text-gray-900">Convite para diretor(a)</h1>
      @if (invite.isLoading()) {
        <p>Verificando convite…</p>
      } @else if (invite.value(); as inv) {
        @if (auth.isInviteUsable(inv)) {
          <p class="mb-4 text-gray-900">Escola: <strong>{{ inv.schoolName }}</strong></p>
          <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4">
            <div>
              <label for="name" class="mb-1 block text-sm font-medium text-gray-900">Seu nome</label>
              <input id="name" formControlName="name" autocomplete="name" class="w-full rounded border border-gray-500 px-3 py-2" />
            </div>
            <div>
              <label for="email" class="mb-1 block text-sm font-medium text-gray-900">E-mail</label>
              <input id="email" type="email" formControlName="email" autocomplete="username" class="w-full rounded border border-gray-500 px-3 py-2" />
            </div>
            <div>
              <label for="password" class="mb-1 block text-sm font-medium text-gray-900">Senha (mín. 6 caracteres)</label>
              <input id="password" type="password" formControlName="password" autocomplete="new-password" class="w-full rounded border border-gray-500 px-3 py-2" />
            </div>
            @if (error()) {
              <p role="alert" class="text-sm text-red-700">{{ error() }}</p>
            }
            <button type="submit" [disabled]="form.invalid || loading()"
              class="w-full rounded bg-indigo-700 px-4 py-2 font-medium text-white hover:bg-indigo-800 disabled:opacity-60">
              {{ loading() ? 'Criando conta…' : 'Criar conta' }}
            </button>
          </form>
        } @else {
          <p role="alert" class="text-red-700">Este convite já foi utilizado ou expirou. Peça um novo ao administrador.</p>
        }
      } @else {
        <p role="alert" class="text-red-700">Convite não encontrado.</p>
      }
    </main>
  `,
})
export class AcceptInvite {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly code = input.required<string>();

  protected readonly invite = resource({
    params: () => this.code(),
    loader: ({ params }) => this.auth.getInvite(params),
  });

  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  protected async submit() {
    const invite = this.invite.value();
    if (!invite || this.form.invalid) return;
    this.loading.set(true);
    this.error.set('');
    try {
      const { name, email, password } = this.form.getRawValue();
      await this.auth.registerWithInvite(invite, name.trim(), email, password);
      await this.router.navigateByUrl('/diretor');
    } catch (e) {
      this.error.set(errorMessage(e));
    } finally {
      this.loading.set(false);
    }
  }
}
