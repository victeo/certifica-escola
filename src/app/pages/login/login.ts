import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { AuthShell } from '../../shared/auth-shell';
import { errorMessage } from '../../shared/error-message';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, AuthShell],
  template: `
    <app-auth-shell>
      <h1 class="mb-1 text-3xl font-semibold text-navy-900">Bem-vindo(a)!</h1>
      <p class="mb-6 text-slate-700">Entre para gerenciar seus professores e certificados.</p>
      <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4">
        <div>
          <label for="email" class="field-label">E-mail</label>
          <input id="email" type="email" autocomplete="username" formControlName="email" class="field-input" />
        </div>
        <div>
          <label for="password" class="field-label">Senha</label>
          <input id="password" type="password" autocomplete="current-password" formControlName="password" class="field-input" />
        </div>
        @if (error()) {
          <p role="alert" class="alert-error">{{ error() }}</p>
        }
        <button type="submit" [disabled]="form.invalid || loading()" class="btn-primary w-full">
          {{ loading() ? 'Entrando…' : 'Entrar' }}
        </button>
      </form>
    </app-auth-shell>
  `,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  protected async submit() {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set('');
    try {
      const { email, password } = this.form.getRawValue();
      const profile = await this.auth.login(email, password);
      await this.router.navigateByUrl(profile.role === 'admin' ? '/admin' : '/diretor');
    } catch (e) {
      this.error.set(errorMessage(e));
    } finally {
      this.loading.set(false);
    }
  }
}
