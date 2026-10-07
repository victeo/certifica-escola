import { buildEmail } from './email.mjs';

/**
 * POST /send  { teacherId, certificateCode }   Authorization: Bearer <ID token do Firebase>
 *
 * Segurança: o Worker não confia em nada do pedido além dos IDs. Ele lê o professor e o certificado
 * no Firestore COM O TOKEN DO USUÁRIO, então as firestore.rules decidem se o acesso é permitido
 * (diretor dono do professor ou admin). O destinatário vem do cadastro, nunca do pedido.
 */

const MAX_PER_MINUTE = 20; // melhor esforço, por instância do Worker
const hits = new Map();

export default {
  async fetch(request, env) {
    return handle(request, env, fetch);
  },
};

export async function handle(request, env, fetchImpl) {
  const origin = request.headers.get('Origin') ?? '';
  const allowed = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim());
  const corsOk = allowed.includes(origin);
  const cors = corsOk
    ? {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Max-Age': '86400',
        Vary: 'Origin',
      }
    : {};
  const reply = (status, body) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...cors } });

  if (request.method === 'OPTIONS') return new Response(null, { status: corsOk ? 204 : 403, headers: cors });
  if (!corsOk) return reply(403, { error: 'origin-not-allowed' });

  const url = new URL(request.url);
  if (request.method !== 'POST' || url.pathname !== '/send') return reply(404, { error: 'not-found' });

  const token = /^Bearer (.+)$/.exec(request.headers.get('Authorization') ?? '')?.[1];
  if (!token) return reply(401, { error: 'unauthenticated' });

  let body;
  try {
    body = await request.json();
  } catch {
    return reply(400, { error: 'invalid-json' });
  }
  const { teacherId, certificateCode } = body ?? {};
  const idPattern = /^[A-Za-z0-9_-]{5,64}$/;
  if (!idPattern.test(teacherId ?? '') || !idPattern.test(certificateCode ?? '')) {
    return reply(400, { error: 'invalid-request' });
  }

  const uid = uidFromToken(token);
  if (!uid) return reply(401, { error: 'unauthenticated' });
  if (!allow(uid)) return reply(429, { error: 'rate-limited' });

  const fs = (path) => firestoreGet(env, fetchImpl, path, token);
  const [teacher, certificate, caller] = await Promise.all([
    fs(`teachers/${teacherId}`),
    fs(`certificates/${certificateCode}`),
    fs(`users/${uid}`),
  ]);
  for (const r of [teacher, certificate, caller]) {
    if (r.status === 401) return reply(401, { error: 'unauthenticated' });
    if (r.status === 403) return reply(403, { error: 'forbidden' });
  }
  if (teacher.status === 404 || certificate.status === 404) return reply(404, { error: 'not-found' });
  if (!teacher.ok || !certificate.ok || !caller.ok) return reply(502, { error: 'firestore-error' });

  // O certificado precisa ser mesmo deste professor.
  if (certificate.fields.teacherId !== teacherId) return reply(400, { error: 'certificate-mismatch' });

  const to = (teacher.fields.email ?? '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return reply(422, { error: 'invalid-recipient' });

  const mail = buildEmail({ name: teacher.fields.name ?? '', code: certificateCode, env });
  const payload = {
    from: env.FROM_EMAIL,
    to: [to],
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
  };
  const callerEmail = caller.fields.email;
  if (callerEmail) payload.reply_to = callerEmail;
  if (env.BCC_DIRECTOR === 'true' && callerEmail && callerEmail !== to) payload.bcc = [callerEmail];

  const res = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
      // Evita envio duplicado por duplo clique (a mesma chave dentro do mesmo minuto).
      'Idempotency-Key': `cert-${certificateCode}-${Math.floor(Date.now() / 60_000)}`,
    },
    body: JSON.stringify(payload),
  });
  if (res.status === 429) return reply(429, { error: 'quota-exceeded' });
  if (!res.ok) return reply(502, { error: 'send-failed' });
  const data = await res.json().catch(() => ({}));
  return reply(200, { ok: true, id: data.id ?? null });
}

/** Lê um documento pelo REST do Firestore usando o token do usuário (as regras valem). */
async function firestoreGet(env, fetchImpl, path, token) {
  const res = await fetchImpl(
    `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${path}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) return { ok: false, status: res.status, fields: {} };
  const doc = await res.json();
  const fields = {};
  for (const [k, v] of Object.entries(doc.fields ?? {})) fields[k] = v.stringValue ?? v.integerValue ?? v.timestampValue ?? null;
  return { ok: true, status: 200, fields };
}

/** UID do JWT. Não validamos a assinatura aqui: o Firestore só responde se o token for válido. */
export function uidFromToken(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.user_id === 'string' ? payload.user_id : typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

function allow(uid) {
  const now = Date.now();
  const recent = (hits.get(uid) ?? []).filter((t) => now - t < 60_000);
  if (recent.length >= MAX_PER_MINUTE) return false;
  recent.push(now);
  hits.set(uid, recent);
  return true;
}
