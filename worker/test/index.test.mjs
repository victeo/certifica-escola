import assert from 'node:assert/strict';
import { test } from 'node:test';
import { handle } from '../src/index.mjs';

const env = {
  FIREBASE_PROJECT_ID: 'proj',
  ALLOWED_ORIGINS: 'https://site.web.app',
  SITE_URL: 'https://site.web.app',
  FROM_EMAIL: 'Escola <notificacao@osceia.org.br>',
  BCC_DIRECTOR: 'true',
  RESEND_API_KEY: 're_secret',
  EVENT_NAME: '5861º Encontro Fraterno Auta de Souza',
  TRAINING_TITLE: 'Treinamento Escola Espírita',
  EVENT_PLACE: 'Goiânia-GO',
  EVENT_PERIOD: '18 a 20/09/2026',
  QUOTE_TEXT: 'Poderoso é o sol da verdade',
  QUOTE_AUTHOR: 'Eurípedes Barsanulfo',
};
const jwt = (uid) => `x.${Buffer.from(JSON.stringify({ user_id: uid })).toString('base64url')}.y`;
const s = (v) => ({ stringValue: v });

function setup({ docs, resendStatus = 200 }) {
  const calls = { resend: null };
  const fetchImpl = async (url, init) => {
    if (url.startsWith('https://api.resend.com')) {
      calls.resend = { init, body: JSON.parse(init.body) };
      return new Response(JSON.stringify({ id: 'mail_1' }), { status: resendStatus });
    }
    const path = url.split('/documents/')[1];
    const d = docs[path];
    if (d === 'forbidden') return new Response('{}', { status: 403 });
    if (!d) return new Response('{}', { status: 404 });
    return new Response(JSON.stringify({ fields: Object.fromEntries(Object.entries(d).map(([k, v]) => [k, s(v)])) }), { status: 200 });
  };
  return { calls, fetchImpl };
}

const req = (body, { token = jwt('dir1'), origin = 'https://site.web.app', method = 'POST' } = {}) =>
  new Request('https://worker.dev/send', {
    method,
    headers: { Origin: origin, 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });

const docs = {
  'teachers/t12345': { name: 'Ana <b>Silva</b>', email: 'ana@exemplo.com', directorId: 'dir1' },
  'certificates/ABCD234XYZ': { teacherId: 't12345' },
  'users/dir1': { name: 'Diretora', email: 'diretora@escola.org' },
};

test('sends to the registered e-mail (not to anything from the request) with link, reply-to and bcc', async () => {
  const { calls, fetchImpl } = setup({ docs });
  const res = await handle(req({ teacherId: 't12345', certificateCode: 'ABCD234XYZ', to: 'atacante@x.com' }), env, fetchImpl);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), 'https://site.web.app');
  const { body, init } = calls.resend;
  assert.deepEqual(body.to, ['ana@exemplo.com']);
  assert.equal(body.reply_to, 'diretora@escola.org');
  assert.deepEqual(body.bcc, ['diretora@escola.org']);
  assert.equal(body.from, env.FROM_EMAIL);
  assert.match(body.html, /https:\/\/site\.web\.app\/certificado\/ABCD234XYZ/);
  assert.ok(!body.html.includes('<b>Silva</b>'), 'nome deve ser escapado no HTML');
  assert.match(body.html, /Ana &lt;b&gt;Silva&lt;\/b&gt;/);
  assert.match(body.text, /Poderoso é o sol da verdade/);
  assert.equal(init.headers.Authorization, 'Bearer re_secret');
});

test('rejects origins that are not allowed', async () => {
  const { fetchImpl } = setup({ docs });
  const res = await handle(req({ teacherId: 't12345', certificateCode: 'ABCD234XYZ' }, { origin: 'https://evil.com' }), env, fetchImpl);
  assert.equal(res.status, 403);
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), null);
});

test('answers the CORS preflight', async () => {
  const { fetchImpl } = setup({ docs });
  const res = await handle(req({}, { method: 'OPTIONS' }), env, fetchImpl);
  assert.equal(res.status, 204);
});

test('requires a token', async () => {
  const { calls, fetchImpl } = setup({ docs });
  const res = await handle(req({ teacherId: 't12345', certificateCode: 'ABCD234XYZ' }, { token: null }), env, fetchImpl);
  assert.equal(res.status, 401);
  assert.equal(calls.resend, null);
});

test('forbids when Firestore rules deny the teacher (not the owner director)', async () => {
  const { calls, fetchImpl } = setup({ docs: { ...docs, 'teachers/t12345': 'forbidden' } });
  const res = await handle(req({ teacherId: 't12345', certificateCode: 'ABCD234XYZ' }, { token: jwt('dir2') }), env, fetchImpl);
  assert.equal(res.status, 403);
  assert.equal(calls.resend, null);
});

test('rejects a certificate that belongs to another teacher', async () => {
  const { calls, fetchImpl } = setup({ docs: { ...docs, 'certificates/ABCD234XYZ': { teacherId: 'outro1' } } });
  const res = await handle(req({ teacherId: 't12345', certificateCode: 'ABCD234XYZ' }), env, fetchImpl);
  assert.equal(res.status, 400);
  assert.equal(calls.resend, null);
});

test('validates request ids and the recipient', async () => {
  const { fetchImpl } = setup({ docs: { ...docs, 'teachers/t12345': { name: 'Ana', email: 'sem-arroba' } } });
  assert.equal((await handle(req({ teacherId: '../x', certificateCode: 'ABCD234XYZ' }), env, fetchImpl)).status, 400);
  assert.equal((await handle(req({ teacherId: 't12345', certificateCode: 'ABCD234XYZ' }), env, fetchImpl)).status, 422);
});

test('maps provider quota errors', async () => {
  const { fetchImpl } = setup({ docs, resendStatus: 429 });
  const res = await handle(req({ teacherId: 't12345', certificateCode: 'ABCD234XYZ' }), env, fetchImpl);
  assert.equal(res.status, 429);
  assert.deepEqual(await res.json(), { error: 'quota-exceeded' });
});
