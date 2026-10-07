import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { eventFullName, quote, siteName } from '../core/event.config';

@Component({
  selector: 'app-header',
  template: `
    <header class="border-b-4 border-pencil-400 bg-navy-800 text-white shadow">
      <div class="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div class="min-w-0">
          <p class="font-display text-lg sm:text-xl">{{ siteName }}</p>
          <p class="truncate text-sm text-navy-100">{{ auth.profile()?.name }} · {{ auth.profile()?.schoolName }}</p>
        </div>
        <button type="button" class="btn btn-sm shrink-0 border-2 border-white/40 text-white hover:bg-white/10" (click)="logout()">
          Sair
        </button>
      </div>
    </header>
    <p class="bg-pencil-400 px-4 py-1.5 text-center text-sm font-semibold text-navy-900">
      {{ eventFullName }} · “{{ quote.text }}” — {{ quote.author }}
    </p>
  `,
})
export class AppHeader {
  protected readonly siteName = siteName;
  protected readonly auth = inject(AuthService);
  protected readonly eventFullName = eventFullName;
  protected readonly quote = quote;
  private readonly router = inject(Router);

  protected async logout() {
    await this.auth.logout();
    await this.router.navigateByUrl('/login');
  }
}
