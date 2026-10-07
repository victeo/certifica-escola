import { Component, computed, inject, signal } from '@angular/core';
import { AdminDataService } from '../../core/admin-data.service';
import { downloadCsv } from '../../core/csv';
import { compareText, formatDate, inviteStatus, inviteStatusLabel } from '../../core/format';
import { Timestamp } from 'firebase/firestore';

interface Report {
  id: string;
  title: string;
  description: string;
  header: string[];
  rows: (string | number)[][];
}

const NO_SUBJECT = '(Sem disciplina)';

@Component({
  selector: 'app-admin-reports',
  template: `
    <section class="card" aria-labelledby="rep-title">
      <div class="mb-4 flex flex-wrap items-end justify-between gap-3 print:hidden">
        <h2 id="rep-title" class="section-title !mb-0"><span aria-hidden="true">📑</span> Relatórios</h2>
        <div class="flex flex-wrap items-end gap-3">
          <div>
            <label for="rep-select" class="field-label">Relatório</label>
            <select id="rep-select" class="field-input" [value]="selectedId()" (change)="selectedId.set($any($event.target).value)">
              @for (r of reports(); track r.id) { <option [value]="r.id" [selected]="r.id === selectedId()">{{ r.title }}</option> }
            </select>
          </div>
          <button type="button" class="btn-ghost" (click)="exportCsv()" [disabled]="!report().rows.length">Exportar CSV</button>
          <button type="button" class="btn-ghost" (click)="print()">Imprimir</button>
        </div>
      </div>

      <h3 class="font-display text-xl font-semibold text-navy-900">{{ report().title }}</h3>
      <p class="mb-4 text-sm text-slate-700">{{ report().description }} · {{ report().rows.length }} linha(s) · gerado em {{ today }}</p>

      @if (!report().rows.length) {
        <p class="empty">Nenhum dado para este relatório.</p>
      } @else {
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead>
              <tr class="border-b-2 border-navy-100 text-navy-900">
                @for (h of report().header; track h) { <th scope="col" class="px-3 py-2 font-bold">{{ h }}</th> }
              </tr>
            </thead>
            <tbody>
              @for (row of report().rows; track $index) {
                <tr class="border-b border-slate-200">
                  @for (cell of row; track $index) { <td class="px-3 py-2">{{ cell }}</td> }
                </tr>
              }
            </tbody>
            @if (totals(); as t) {
              <tfoot>
                <tr class="border-t-2 border-navy-100 font-bold text-navy-900">
                  <td class="px-3 py-2">Total</td>
                  @for (v of t; track $index) { <td class="px-3 py-2">{{ v }}</td> }
                </tr>
              </tfoot>
            }
          </table>
        </div>
      }
    </section>
  `,
})
export class AdminReports {
  private readonly data = inject(AdminDataService);
  protected readonly selectedId = signal('escolas');
  protected readonly today = new Date().toLocaleDateString('pt-BR');

  protected readonly reports = computed<Report[]>(() => {
    const schools = this.data.schools();
    const teachers = this.data.teacherRows();
    const directors = this.data.directors();

    const bySubject = new Map<string, { n: number; schools: Set<string> }>();
    for (const t of teachers) {
      const key = t.subject || NO_SUBJECT;
      const e = bySubject.get(key) ?? { n: 0, schools: new Set<string>() };
      e.n++;
      e.schools.add(t.school);
      bySubject.set(key, e);
    }

    const byMonth = new Map<string, number>();
    for (const t of teachers) {
      const d = t.createdAt?.toDate();
      const key = d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` : '0000-00';
      byMonth.set(key, (byMonth.get(key) ?? 0) + 1);
    }

    return [
      {
        id: 'escolas',
        title: 'Professores por escola',
        description: 'Quantidade de professores, certificados e convites de cada escola',
        header: ['Escola', 'Diretores', 'Professores', 'Com certificado', 'Sem certificado', 'Certificados emitidos', 'Convites pendentes'],
        rows: [...schools]
          .sort((a, b) => b.teachers.length - a.teachers.length || compareText(a.name, b.name))
          .map((s) => [
            s.name, s.directors.length, s.teachers.length, s.teachersWithCertificate,
            s.teachers.length - s.teachersWithCertificate, s.certificates, s.pendingInvites,
          ]),
      },
      {
        id: 'disciplinas',
        title: 'Professores por disciplina',
        description: 'Distribuição dos professores por disciplina',
        header: ['Disciplina', 'Professores', 'Escolas'],
        rows: [...bySubject.entries()].sort((a, b) => b[1].n - a[1].n || compareText(a[0], b[0])).map(([k, v]) => [k, v.n, v.schools.size]),
      },
      {
        id: 'diretores',
        title: 'Diretores e seus professores',
        description: 'Cada diretor com a quantidade de professores cadastrados',
        header: ['Diretor(a)', 'E-mail', 'Escola', 'Professores'],
        rows: directors.map((d) => [d.name, d.email, d.schoolName, teachers.filter((t) => t.directorId === d.uid).length]),
      },
      {
        id: 'sem-professores',
        title: 'Escolas sem professores',
        description: 'Escolas que ainda não cadastraram nenhum professor',
        header: ['Escola', 'Diretores', 'Convites pendentes'],
        rows: schools.filter((s) => !s.teachers.length).map((s) => [s.name, s.directors.length, s.pendingInvites]),
      },
      {
        id: 'sem-certificado',
        title: 'Professores sem certificado',
        description: 'Professores que ainda não tiveram certificado emitido',
        header: ['Professor(a)', 'E-mail', 'Escola', 'Diretor(a)'],
        rows: teachers.filter((t) => t.certs === 0).sort((a, b) => compareText(a.school, b.school) || compareText(a.name, b.name))
          .map((t) => [t.name, t.email, t.school, t.directorName]),
      },
      {
        id: 'certificados',
        title: 'Certificados emitidos',
        description: 'Histórico de emissões (cada download gera um registro com código de verificação)',
        header: ['Código', 'Professor(a)', 'Escola', 'Diretor(a)', 'Emitido em'],
        rows: [...this.data.certificates()]
          .sort((a, b) => (b.issuedAt?.toMillis() ?? 0) - (a.issuedAt?.toMillis() ?? 0))
          .map((c) => [c.code, c.teacherName, c.schoolName, c.directorName, formatDate(c.issuedAt as Timestamp | null)]),
      },
      {
        id: 'enviados',
        title: 'Certificados enviados por e-mail',
        description: 'Professores que já receberam o certificado por e-mail (data do último envio)',
        header: ['Professor(a)', 'E-mail', 'Escola', 'Último envio'],
        rows: teachers
          .filter((t) => t.lastEmailedAt)
          .sort((a, b) => (b.lastEmailedAt?.toMillis() ?? 0) - (a.lastEmailedAt?.toMillis() ?? 0))
          .map((t) => [t.name, t.email, t.school, formatDate(t.lastEmailedAt)]),
      },
      {
        id: 'nao-enviados',
        title: 'Certificados ainda não enviados',
        description: 'Professores que ainda não receberam o certificado por e-mail',
        header: ['Professor(a)', 'E-mail', 'Escola', 'Certificado emitido'],
        rows: teachers
          .filter((t) => !t.lastEmailedAt)
          .sort((a, b) => compareText(a.school, b.school) || compareText(a.name, b.name))
          .map((t) => [t.name, t.email, t.school, t.certs ? 'Sim' : 'Não']),
      },
      {
        id: 'convites',
        title: 'Convites',
        description: 'Situação de todos os convites enviados',
        header: ['Escola', 'Situação', 'Criado em', 'Válido até'],
        rows: this.data.invites().map((i) => [i.schoolName, inviteStatusLabel[inviteStatus(i)], formatDate(i.createdAt), formatDate(i.expiresAt)]),
      },
      {
        id: 'cadastros',
        title: 'Cadastros por mês',
        description: 'Professores cadastrados em cada mês',
        header: ['Mês', 'Professores cadastrados'],
        rows: [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, n]) => [k === '0000-00' ? 'Sem data' : `${k.slice(5)}/${k.slice(0, 4)}`, n]),
      },
    ];
  });

  protected readonly report = computed(() => this.reports().find((r) => r.id === this.selectedId()) ?? this.reports()[0]);

  /** Totais para relatórios cujas colunas numéricas são somáveis. */
  protected readonly totals = computed<number[] | null>(() => {
    const r = this.report();
    if (!['escolas', 'cadastros'].includes(r.id) || !r.rows.length) return null;
    return r.header.slice(1).map((_, i) => r.rows.reduce((n, row) => n + Number(row[i + 1]), 0));
  });

  protected exportCsv() {
    const r = this.report();
    downloadCsv(`relatorio-${r.id}`, r.header, r.rows);
  }

  protected print() {
    window.print();
  }
}
