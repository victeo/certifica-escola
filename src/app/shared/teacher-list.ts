import { Component, computed, effect, input, output, signal } from '@angular/core';
import { downloadCsv } from '../core/csv';
import { compareText, formatDate } from '../core/format';
import { TeacherRow } from '../core/models';

type SortKey = 'name' | 'subject' | 'school' | 'recent';
type GroupKey = 'none' | 'school' | 'director' | 'subject';
type CertFilter = 'all' | 'with' | 'without';

interface Group {
  key: string;
  label: string;
  rows: TeacherRow[];
}

const NO_SUBJECT = '(Sem disciplina)';

/**
 * Lista de professores com busca, filtros, ordenação, agrupamento, seleção em lote e exportação.
 * Usada pelo diretor (só os dele) e pelo administrador (todas as escolas).
 */
@Component({
  selector: 'app-teacher-list',
  template: `
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div class="sm:col-span-2">
        <label for="tl-search" class="field-label">Buscar</label>
        <input id="tl-search" type="search" class="field-input" placeholder="Nome, e-mail, disciplina…"
          [value]="search()" (input)="search.set($any($event.target).value)" />
      </div>
      @if (showSchool()) {
        <div>
          <label for="tl-school" class="field-label">Escola</label>
          <select id="tl-school" class="field-input" [value]="school()" (change)="school.set($any($event.target).value)">
            <option value="">Todas</option>
            @for (s of schools(); track s) { <option [value]="s" [selected]="s === school()">{{ s }}</option> }
          </select>
        </div>
      }
      <div>
        <label for="tl-subject" class="field-label">Disciplina</label>
        <select id="tl-subject" class="field-input" [value]="subject()" (change)="subject.set($any($event.target).value)">
          <option value="">Todas</option>
          @for (s of subjects(); track s) { <option [value]="s" [selected]="s === subject()">{{ s }}</option> }
        </select>
      </div>
      @if (allowCertificate()) {
        <div>
          <label for="tl-cert" class="field-label">Certificado</label>
          <select id="tl-cert" class="field-input" [value]="cert()" (change)="cert.set($any($event.target).value)">
            <option value="all">Todos</option>
            <option value="with">Já emitido</option>
            <option value="without">Ainda não emitido</option>
          </select>
        </div>
      }
      <div>
        <label for="tl-sort" class="field-label">Ordenar por</label>
        <select id="tl-sort" class="field-input" [value]="sort()" (change)="sort.set($any($event.target).value)">
          <option value="name">Nome</option>
          <option value="subject">Disciplina</option>
          @if (showSchool()) { <option value="school">Escola</option> }
          <option value="recent">Cadastro mais recente</option>
        </select>
      </div>
      <div>
        <label for="tl-group" class="field-label">Agrupar por</label>
        <select id="tl-group" class="field-input" [value]="group()" (change)="group.set($any($event.target).value)">
          <option value="none">Sem agrupamento</option>
          @if (showSchool()) { <option value="school">Escola</option> }
          @if (showDirector()) { <option value="director">Diretor(a)</option> }
          <option value="subject">Disciplina</option>
        </select>
      </div>
    </div>

    <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p class="text-sm text-slate-800" role="status">
        {{ filtered().length }} de {{ teachers().length }} professor(es)
        @if (hasFilters()) {
          · <button type="button" class="font-bold text-navy-700 underline" (click)="clearFilters()">limpar filtros</button>
        }
      </p>
      <div class="flex flex-wrap gap-2">
        @if (selectedRows().length) {
          <button type="button" class="btn-danger btn-sm" (click)="remove.emit(selectedRows())">
            Excluir selecionados ({{ selectedRows().length }})
          </button>
        }
        <button type="button" class="btn-ghost btn-sm" (click)="exportCsv()" [disabled]="!filtered().length">
          Exportar CSV
        </button>
      </div>
    </div>

    @if (!teachers().length) {
      <p class="empty mt-4">Nenhum professor cadastrado ainda.</p>
    } @else if (!filtered().length) {
      <p class="empty mt-4">Nenhum professor encontrado com esses filtros.</p>
    } @else {
      @for (g of groups(); track g.key) {
        <section class="mt-5" [attr.aria-label]="g.label">
          @if (group() !== 'none') {
            <h3 class="mb-2 flex items-center gap-2 font-display text-lg font-semibold text-navy-800">
              {{ g.label }} <span class="badge bg-navy-100 text-navy-900">{{ g.rows.length }}</span>
            </h3>
          }
          <table class="rtable">
            <thead>
              <tr>
                <th scope="col" class="w-10">
                  <input type="checkbox" class="size-4" [checked]="allSelected(g.rows)"
                    (change)="toggleGroup(g.rows, $any($event.target).checked)"
                    [attr.aria-label]="'Selecionar todos de ' + g.label" />
                </th>
                <th scope="col">Nome</th>
                <th scope="col">E-mail</th>
                <th scope="col">Disciplina</th>
                @if (showSchool() && group() !== 'school') { <th scope="col">Escola</th> }
                @if (showDirector() && group() !== 'director') { <th scope="col">Diretor(a)</th> }
                @if (allowCertificate()) { <th scope="col">Certificados</th> }
                <th scope="col"><span class="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              @for (t of g.rows; track t.id) {
                <tr>
                  <td class="actions"><input type="checkbox" class="size-4" [checked]="selected().has(t.id)"
                    (change)="toggle(t.id, $any($event.target).checked)" [attr.aria-label]="'Selecionar ' + t.name" /></td>
                  <td data-label="Nome" class="font-bold text-navy-900">{{ t.name }}</td>
                  <td data-label="E-mail" class="break-all">{{ t.email }}</td>
                  <td data-label="Disciplina">{{ t.subject || '—' }}</td>
                  @if (showSchool() && group() !== 'school') { <td data-label="Escola">{{ t.school }}</td> }
                  @if (showDirector() && group() !== 'director') { <td data-label="Diretor(a)">{{ t.directorName }}</td> }
                  @if (allowCertificate()) {
                    <td data-label="Certificados">
                      @if (t.certs) { <span class="badge bg-emerald-100 text-emerald-900">{{ t.certs }} emitido(s)</span> }
                      @else { <span class="badge bg-slate-100 text-slate-800">Nenhum</span> }
                    </td>
                  }
                  <td class="actions">
                    <div class="flex flex-wrap justify-end gap-2">
                      @if (allowCertificate()) {
                        <button type="button" class="btn-primary btn-sm" (click)="certificate.emit(t)"
                          [attr.aria-label]="'Baixar certificado de ' + t.name">Certificado</button>
                      }
                      <button type="button" class="btn-ghost btn-sm" (click)="edit.emit(t)"
                        [attr.aria-label]="'Editar ' + t.name">Editar</button>
                      <button type="button" class="btn-danger btn-sm" (click)="remove.emit([t])"
                        [attr.aria-label]="'Excluir ' + t.name">Excluir</button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </section>
      }
    }
  `,
})
export class TeacherList {
  readonly teachers = input.required<TeacherRow[]>();
  readonly showSchool = input(false);
  readonly showDirector = input(false);
  readonly allowCertificate = input(false);
  /** Filtro de escola inicial (ex.: vindo da tela de escolas). */
  readonly initialSchool = input('');

  readonly edit = output<TeacherRow>();
  readonly remove = output<TeacherRow[]>();
  readonly certificate = output<TeacherRow>();

  protected readonly search = signal('');
  protected readonly school = signal('');
  protected readonly subject = signal('');
  protected readonly cert = signal<CertFilter>('all');
  protected readonly sort = signal<SortKey>('name');
  protected readonly group = signal<GroupKey>('none');
  protected readonly selected = signal<ReadonlySet<string>>(new Set());

  protected readonly schools = computed(() => this.distinct(this.teachers().map((t) => t.school)));
  protected readonly subjects = computed(() => this.distinct(this.teachers().map((t) => t.subject || NO_SUBJECT)));

  protected readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const school = this.school();
    const subject = this.subject();
    const cert = this.cert();
    const rows = this.teachers().filter(
      (t) =>
        (!q || `${t.name} ${t.email} ${t.subject} ${t.school} ${t.directorName}`.toLowerCase().includes(q)) &&
        (!school || t.school === school) &&
        (!subject || (t.subject || NO_SUBJECT) === subject) &&
        (cert === 'all' || (cert === 'with' ? t.certs > 0 : t.certs === 0)),
    );
    const key = this.sort();
    return rows.sort((a, b) => {
      if (key === 'recent') return (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0);
      const primary = key === 'subject' ? compareText(a.subject, b.subject) : key === 'school' ? compareText(a.school, b.school) : 0;
      return primary || compareText(a.name, b.name);
    });
  });

  protected readonly groups = computed<Group[]>(() => {
    const by = this.group();
    if (by === 'none') return [{ key: 'all', label: 'Professores', rows: this.filtered() }];
    const label = (t: TeacherRow) =>
      by === 'school' ? t.school : by === 'director' ? `${t.directorName} (${t.school})` : t.subject || NO_SUBJECT;
    const map = new Map<string, TeacherRow[]>();
    for (const t of this.filtered()) map.set(label(t), [...(map.get(label(t)) ?? []), t]);
    return [...map.entries()]
      .sort(([a], [b]) => compareText(a, b))
      .map(([key, rows]) => ({ key, label: key, rows }));
  });

  protected readonly selectedRows = computed(() => this.teachers().filter((t) => this.selected().has(t.id)));
  protected readonly hasFilters = computed(
    () => !!(this.search() || this.school() || this.subject() || this.cert() !== 'all'),
  );

  constructor() {
    effect(() => this.school.set(this.initialSchool()));
    // Descarta da seleção quem não existe mais (ex.: após excluir).
    effect(() => {
      const ids = new Set(this.teachers().map((t) => t.id));
      this.selected.update((s) => new Set([...s].filter((id) => ids.has(id))));
    });
  }

  protected toggle(id: string, on: boolean) {
    this.selected.update((s) => {
      const next = new Set(s);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  protected allSelected(rows: TeacherRow[]): boolean {
    return rows.length > 0 && rows.every((t) => this.selected().has(t.id));
  }

  protected toggleGroup(rows: TeacherRow[], on: boolean) {
    this.selected.update((s) => {
      const next = new Set(s);
      for (const t of rows) {
        if (on) next.add(t.id);
        else next.delete(t.id);
      }
      return next;
    });
  }

  protected clearFilters() {
    this.search.set('');
    this.school.set('');
    this.subject.set('');
    this.cert.set('all');
  }

  protected exportCsv() {
    downloadCsv(
      'professores',
      ['Nome', 'E-mail', 'Disciplina', 'Escola', 'Diretor(a)', 'Certificados emitidos', 'Cadastrado em'],
      this.filtered().map((t) => [t.name, t.email, t.subject, t.school, t.directorName, t.certs, formatDate(t.createdAt)]),
    );
  }

  private distinct(values: string[]): string[] {
    return [...new Set(values)].sort(compareText);
  }
}
