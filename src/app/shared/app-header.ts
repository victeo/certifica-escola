import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-header',
  template: `
    <header class="bg-indigo-800 text-white">
      <div class="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <div>
          <p class="text-lg font-semibold">Certifica Escola</p>
          <p class="text-sm text-indigo-100">{{ auth.profile()?.name }} · {{ auth.profile()?.schoolName }}</p>
        </div>
        <button type="button" class="rounded border border-white px-3 py-1.5 text-sm hover:bg-indigo-700" (click)="logout()">
          Sair
        </button>
      </div>
    </header>
  `,
})
export class AppHeader {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected async logout() {
    await this.auth.logout();
    await this.router.navigateByUrl('/login');
  }
}
