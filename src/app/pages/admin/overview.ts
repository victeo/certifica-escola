import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminDataService } from '../../core/admin-data.service';
import { BarList } from '../../shared/bar-list';
import { StatCard } from '../../shared/stat-card';

@Component({
  selector: 'app-admin-overview',
  imports: [RouterLink, BarList, StatCard],
  template: `
    <section aria-label="Resumo" class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <app-stat label="Escolas" [value]="schools().length" />
      <app-stat label="Diretores" [value]="data.directors().length" />
      <app-stat label="Professores" [value]="data.teachers().length" [hint]="'Média de ' + average() + ' por escola'" />
      <app-stat label="Certificados emitidos" [value]="data.certificates().length" [hint]="coverage() + '% dos professores já receberam'" />
    </section>

    <div class="grid gap-6 lg:grid-cols-3">
      <section class="card lg:col-span-2" aria-labelledby="per-school">
        <h2 id="per-school" class="section-title"><span aria-hidden="true">📊</span> Professores por escola</h2>
        @if (bars().length) {
          <app-bar-list [items]="bars()" />
          @if (schools().length > bars().length) {
            <p class="mt-3 text-sm text-slate-700">Mostrando as {{ bars().length }} maiores. Veja todas em
              <a routerLink="../relatorios" class="font-bold text-navy-700 underline">Relatórios</a>.</p>
          }
        } @else {
          <p class="empty">Ainda não há professores cadastrados.</p>
        }
      </section>

      <section class="card" aria-labelledby="attention">
        <h2 id="attention" class="section-title"><span aria-hidden="true">🔔</span> Atenção</h2>
        <ul class="space-y-2 text-sm">
          <li>
            <a routerLink="escolas" class="font-bold text-navy-700 underline">{{ pending() }}</a> convite(s) aguardando o diretor
          </li>
          <li>
            <a routerLink="escolas" class="font-bold text-navy-700 underline">{{ expired() }}</a> convite(s) expirado(s)
          </li>
          <li>
            <a routerLink="escolas" class="font-bold text-navy-700 underline">{{ withoutTeachers() }}</a> escola(s) sem professores
          </li>
          <li>
            <a routerLink="relatorios" class="font-bold text-navy-700 underline">{{ withoutCertificate() }}</a> professor(es) sem certificado
          </li>
        </ul>
      </section>
    </div>
  `,
})
export class AdminOverview {
  protected readonly data = inject(AdminDataService);
  protected readonly schools = this.data.schools;

  protected readonly bars = computed(() =>
    [...this.schools()]
      .filter((s) => s.teachers.length)
      .sort((a, b) => b.teachers.length - a.teachers.length)
      .slice(0, 10)
      .map((s) => ({ label: s.name, value: s.teachers.length })),
  );
  protected readonly average = computed(() =>
    this.schools().length ? (this.data.teachers().length / this.schools().length).toFixed(1).replace('.', ',') : '0',
  );
  protected readonly coverage = computed(() => {
    const rows = this.data.teacherRows();
    return rows.length ? Math.round((rows.filter((t) => t.certs > 0).length / rows.length) * 100) : 0;
  });
  protected readonly pending = computed(() => this.schools().reduce((n, s) => n + s.pendingInvites, 0));
  protected readonly expired = computed(() => this.schools().reduce((n, s) => n + s.expiredInvites, 0));
  protected readonly withoutTeachers = computed(() => this.schools().filter((s) => !s.teachers.length).length);
  protected readonly withoutCertificate = computed(() => this.data.teacherRows().filter((t) => t.certs === 0).length);
}
