import { Component, inject, input, resource, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { AuthShell } from '../../shared/auth-shell';
import { errorMessage } from '../../shared/error-message';

@Component({
  selector: 'app-accept-invite',
  imports: [ReactiveFormsModule, AuthShell],
  template: `
    <app-auth-shell>
      <h1 class="mb-1 text-3xl font-semibold text-navy-900">Convite para diretor(a)</h1>
      @if (invite.isLoading()) {
        <p class="mt-4">Verificando convite…</p>
      } @else if (invite.value(); as inv) {
        @if (auth.isInviteUsable(inv)) {
          <p class="mb-6 text-slate-700">Você foi convidado(a) para administrar a escola <strong class="text-navy-900">{{ inv.schoolName }}</strong>. Crie seu acesso:</p>
          <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4">
            <div>
              <label for="name" class="field-label">Seu nome</label>
              <input id="name" formControlName="name" autocomplete="name" class="field-input" />
            </div>
            <div>
              <label for="email" class="field-label">E-mail</label>
              <input id="email" type="email" formControlName="email" autocomplete="username" class="field-input" />
            </div>
            <div>
              <label for="password" class="field-label">Senha (mín. 6 caracteres)</label>
              <input id="password" type="password" formControlName="password" autocomplete="new-password" class="field-input" />
            </div>
            @if (error()) {
              <p role="alert" class="alert-error">{{ error() }}</p>
            }
            <button type="submit" [disabled]="form.invalid || loading()" class="btn-primary w-full">
              {{ loading() ? 'Criando conta…' : 'Criar conta' }}
            </button>
          </form>
        } @else {
          <p role="alert" class="alert-error mt-4">Este convite já foi utilizado ou expirou. Peça um novo ao administrador.</p>
        }
      } @else {
        <p role="alert" class="alert-error mt-4">Convite não encontrado.</p>
      }
    </app-auth-shell>
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
