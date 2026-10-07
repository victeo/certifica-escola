import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AdminDataService } from '../../core/admin-data.service';
import { AppHeader } from '../../shared/app-header';

/** Estrutura da área do administrador: menu + páginas filhas. Os dados são carregados uma vez e compartilhados. */
@Component({
  selector: 'app-admin-shell',
  imports: [AppHeader, RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="print:hidden"><app-header /></div>
    <nav aria-label="Administração" class="border-b border-navy-100 bg-white print:hidden">
      <ul class="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 sm:px-6">
        @for (item of items; track item.path) {
          <li>
            <a [routerLink]="item.path" routerLinkActive="border-navy-700 text-navy-900"
              [routerLinkActiveOptions]="{ exact: item.path === '.' }"
              class="block whitespace-nowrap border-b-4 border-transparent px-3 py-3 text-sm font-bold text-slate-700 hover:text-navy-900">
              {{ item.label }}
            </a>
          </li>
        }
      </ul>
    </nav>
    <main class="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      @if (loadError()) {
        <p role="alert" class="alert-error">
          Não foi possível carregar os dados. Confira se as regras do Firestore foram publicadas.
          <button type="button" class="ml-2 underline" (click)="reload()">Tentar de novo</button>
        </p>
      } @else if (!data.loaded()) {
        <p>Carregando…</p>
      } @else {
        <router-outlet />
      }
    </main>
  `,
})
export class AdminShell implements OnInit {
  protected readonly data = inject(AdminDataService);
  protected readonly loadError = signal(false);
  protected readonly items = [
    { path: '.', label: 'Visão geral' },
    { path: 'escolas', label: 'Escolas e convites' },
    { path: 'professores', label: 'Professores' },
    { path: 'relatorios', label: 'Relatórios' },
  ];

  ngOnInit() {
    void this.reload();
  }

  protected async reload() {
    this.loadError.set(false);
    try {
      await this.data.load();
    } catch {
      this.loadError.set(true);
    }
  }
}
