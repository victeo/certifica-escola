import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Timestamp } from 'firebase/firestore';
import { TeacherRow } from '../core/models';
import { TeacherList } from './teacher-list';

const row = (id: string, name: string, school: string, subject: string, certs = 0, day = 1): TeacherRow => ({
  id,
  name,
  email: `${id}@x.com`,
  subject,
  school,
  directorName: `Dir ${school}`,
  certs,
  createdAt: Timestamp.fromDate(new Date(2026, 8, day)),
});

const DATA = [
  row('1', 'Carla', 'Escola B', 'Matemática', 1, 3),
  row('2', 'Ana', 'Escola A', 'Português', 0, 1),
  row('3', 'Bruno', 'Escola A', '', 0, 2),
  row('4', 'Davi', 'Escola B', 'Matemática', 0, 4),
];

describe('TeacherList', () => {
  let fixture: ComponentFixture<TeacherList>;

  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';
  const names = () =>
    Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('td[data-label="Nome"]')).map((e) => e.textContent?.trim());
  const set = async (id: string, value: string) => {
    const el = (fixture.nativeElement as HTMLElement).querySelector<HTMLSelectElement | HTMLInputElement>(`#${id}`)!;
    el.value = value;
    el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input'));
    await fixture.whenStable();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TeacherList] }).compileComponents();
    fixture = TestBed.createComponent(TeacherList);
    fixture.componentRef.setInput('teachers', DATA);
    fixture.componentRef.setInput('showSchool', true);
    fixture.componentRef.setInput('showDirector', true);
    fixture.componentRef.setInput('allowCertificate', true);
    await fixture.whenStable();
  });

  it('lists everyone sorted by name', () => {
    expect(names()).toEqual(['Ana', 'Bruno', 'Carla', 'Davi']);
    expect(text()).toContain('4 de 4 professor(es)');
  });

  it('filters by school', async () => {
    await set('tl-school', 'Escola A');
    expect(names()).toEqual(['Ana', 'Bruno']);
    expect(text()).toContain('2 de 4');
  });

  it('applies the initial school filter', async () => {
    fixture.componentRef.setInput('initialSchool', 'Escola B');
    await fixture.whenStable();
    expect(names()).toEqual(['Carla', 'Davi']);
  });

  it('searches text and subject, including teachers without subject', async () => {
    await set('tl-search', 'matem');
    expect(names()).toEqual(['Carla', 'Davi']);
    await set('tl-search', '');
    await set('tl-subject', '(Sem disciplina)');
    expect(names()).toEqual(['Bruno']);
  });

  it('filters by certificate status', async () => {
    await set('tl-cert', 'with');
    expect(names()).toEqual(['Carla']);
    await set('tl-cert', 'without');
    expect(names()).toEqual(['Ana', 'Bruno', 'Davi']);
  });

  it('sorts by most recent registration', async () => {
    await set('tl-sort', 'recent');
    expect(names()).toEqual(['Davi', 'Carla', 'Bruno', 'Ana']);
  });

  it('groups by school with counts', async () => {
    await set('tl-group', 'school');
    const headings = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('h3')).map((h) => h.textContent?.replace(/\s+/g, ' ').trim());
    expect(headings).toEqual(['Escola A 2', 'Escola B 2']);
    expect(names()).toEqual(['Ana', 'Bruno', 'Carla', 'Davi']);
  });

  it('selects rows and emits bulk removal', async () => {
    const removed: TeacherRow[][] = [];
    fixture.componentInstance.remove.subscribe((r) => removed.push(r));
    const boxes = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLInputElement>('tbody input[type="checkbox"]');
    boxes[0].click();
    boxes[2].click();
    await fixture.whenStable();
    expect(text()).toContain('Excluir selecionados (2)');
    const bulk = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find((b) => b.textContent?.includes('Excluir selecionados'))!;
    bulk.click();
    expect(removed[0].map((t) => t.name).sort()).toEqual(['Ana', 'Carla']);
  });

  it('shows the empty state when filters match nothing', async () => {
    await set('tl-search', 'zzz');
    expect(text()).toContain('Nenhum professor encontrado');
  });
});
