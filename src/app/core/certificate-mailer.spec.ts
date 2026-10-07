import { TestBed } from '@angular/core/testing';
import { CertificateMailer, describeMailResult } from './certificate-mailer';
import { CertificateService } from './certificate.service';
import { EmailError, EmailService } from './email.service';
import { TeacherRow } from './models';

const row = (id: string, latestCode?: string): TeacherRow => ({
  id, name: `Prof ${id}`, email: `${id}@x.com`, subject: '', school: 'Escola', directorName: 'Dir', certs: latestCode ? 1 : 0, latestCode,
});

describe('CertificateMailer', () => {
  let sent: [string, string][];
  let issued: string[];
  let failWith: Record<string, string>;
  let mailer: CertificateMailer;

  beforeEach(() => {
    sent = [];
    issued = [];
    failWith = {};
    TestBed.configureTestingModule({
      providers: [
        {
          provide: EmailService,
          useValue: {
            configured: true,
            send: async (id: string, code: string) => {
              if (failWith[id]) throw new EmailError(failWith[id]);
              sent.push([id, code]);
            },
          },
        },
        { provide: CertificateService, useValue: { issue: async (t: TeacherRow) => (issued.push(t.id), `NEW${t.id}`) } },
      ],
    });
    mailer = TestBed.inject(CertificateMailer);
  });

  it('reuses the latest certificate code and does not issue a new one', async () => {
    const r = await mailer.send([row('a', 'CODEA')], true);
    expect(sent).toEqual([['a', 'CODEA']]);
    expect(issued).toEqual([]);
    expect(r.sent).toBe(1);
  });

  it('issues a certificate first when the teacher has none and the sender may issue', async () => {
    await mailer.send([row('b')], true);
    expect(issued).toEqual(['b']);
    expect(sent).toEqual([['b', 'NEWb']]);
  });

  it('skips teachers without certificate when the sender cannot issue (admin)', async () => {
    const r = await mailer.send([row('c'), row('d', 'CODED')], false);
    expect(r.skipped).toEqual(['Prof c']);
    expect(r.sent).toBe(1);
    expect(describeMailResult(r).ok).toBe(false);
  });

  it('keeps going after a regular failure but stops on quota errors', async () => {
    failWith = { b: 'invalid-recipient', c: 'quota-exceeded' };
    const r = await mailer.send([row('a', 'A'), row('b', 'B'), row('c', 'C'), row('d', 'D')], true);
    expect(sent.map(([id]) => id)).toEqual(['a']);
    expect(r.failed.map((f) => f.name)).toEqual(['Prof b', 'Prof c']);
    expect(r.stoppedEarly).toBe(true); // "d" não foi tentado
    expect(describeMailResult(r).text).toContain('interrompido');
  });

  it('clears the sending indicator when done', async () => {
    await mailer.send([row('a', 'A')], true);
    expect(mailer.sendingIds().size).toBe(0);
  });
});

describe('describeMailResult', () => {
  it('reports plain success', () => {
    expect(describeMailResult({ sent: 3, failed: [], skipped: [], stoppedEarly: false })).toEqual({ text: '3 e-mail(s) enviado(s).', ok: true });
  });
});
