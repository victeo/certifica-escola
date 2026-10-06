import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { errorMessage } from '../../shared/error-message';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  template: `
    <main class="mx-auto mt-16 max-w-sm px-4">
      <h1 class="mb-6 text-2xl font-semibold text-gray-900">Certifica Escola</h1>
      <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4">
        <div>
          <label for="email" class="mb-1 block text-sm font-medium text-gray-900">E-mail</label>
          <input id="email" type="email" autocomplete="username" formControlName="email"
            class="w-full rounded border border-gray-500 px-3 py-2" />
        </div>
        <div>
          <label for="password" class="mb-1 block text-sm font-medium text-gray-900">Senha</label>
          <input id="password" type="password" autocomplete="current-password" formControlName="password"
            class="w-full rounded border border-gray-500 px-3 py-2" />
        </div>
        @if (error()) {
          <p role="alert" class="text-sm text-red-700">{{ error() }}</p>
        }
        <button type="submit" [disabled]="form.invalid || loading()"
          class="w-full rounded bg-indigo-700 px-4 py-2 font-medium text-white hover:bg-indigo-800 disabled:opacity-60">
          {{ loading() ? 'Entrando…' : 'Entrar' }}
        </button>
      </form>
    </main>
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
