#!/usr/bin/env node

/**
 * Cria (ou promove) um administrador usando o Firebase Admin SDK.
 *
 * O Admin SDK ignora as firestore.rules, por isso este script é o caminho seguro para
 * criar admins: o navegador nunca consegue se promover.
 *
 * Credenciais (no .env, que nunca vai para o Git):
 *   FIREBASE_PROJECT_ID             ID do projeto
 *   FIREBASE_SERVICE_ACCOUNT_FILE   caminho do JSON da conta de serviço
 *                                   (Console > Configurações do projeto > Contas de serviço
 *                                    > Gerar nova chave privada). Guarde o arquivo FORA do repositório.
 *   (alternativa) GOOGLE_APPLICATION_CREDENTIALS com o mesmo caminho.
 *
 * Uso:
 *   node scripts/create-admin.mjs --email voce@exemplo.com [--name "Seu nome"] [--school "Administração Geral"]
 *   ADMIN_PASSWORD=... node scripts/create-admin.mjs --email ...   (senha opcional; se omitida, uma é gerada)
 *
 * Se o e-mail já existir no Authentication, o usuário é reaproveitado e apenas o perfil
 * (users/{uid}) é criado/atualizado com role "admin"; a senha existente não é alterada.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { cert, initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// .env.local tem prioridade sobre .env; variáveis já definidas no sistema vencem ambos.
for (const file of ['.env.local', '.env']) {
  const full = path.join(rootDir, file);
  if (fs.existsSync(full)) process.loadEnvFile(full);
}

function fail(message) {
  console.error(`\n❌ ${message}\n`);
  process.exit(1);
}

const { values } = parseArgs({
  options: {
    email: { type: 'string' },
    name: { type: 'string', default: 'Admin' },
    school: { type: 'string', default: 'Administração Geral' },
  },
});

const email = values.email?.trim().toLowerCase();
if (!email) fail('Informe o e-mail: node scripts/create-admin.mjs --email voce@exemplo.com');

const projectId = process.env.FIREBASE_PROJECT_ID;
if (!projectId || projectId === 'SEU_PROJETO') fail('Defina FIREBASE_PROJECT_ID no .env.');

const credentialPath = process.env.FIREBASE_SERVICE_ACCOUNT_FILE || process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!credentialPath) {
  fail(
    'Defina FIREBASE_SERVICE_ACCOUNT_FILE no .env com o caminho do JSON da conta de serviço\n' +
      '   (Console > Configurações do projeto > Contas de serviço > Gerar nova chave privada).',
  );
}
const resolvedCredential = path.resolve(rootDir, credentialPath);
if (!fs.existsSync(resolvedCredential)) fail(`Arquivo de credencial não encontrado: ${resolvedCredential}`);
if (path.relative(rootDir, resolvedCredential).startsWith('..') === false) {
  console.warn('⚠️  A chave da conta de serviço está dentro do repositório. Mova-a para fora para não correr risco de commitá-la.');
}

initializeApp({
  credential: cert(JSON.parse(fs.readFileSync(resolvedCredential, 'utf-8'))),
  projectId,
});

const auth = getAuth();
const db = getFirestore();

console.log(`\n🚀 Projeto: ${projectId}`);
console.log(`   E-mail: ${email}\n   Nome: ${values.name}\n   Instituição: ${values.school}\n`);

let uid;
let generatedPassword = null;

try {
  const existing = await auth.getUserByEmail(email).catch((e) => (e.code === 'auth/user-not-found' ? null : Promise.reject(e)));
  if (existing) {
    uid = existing.uid;
    console.log(`ℹ️  Usuário já existe no Auth (UID ${uid}); apenas o perfil será gravado.`);
  } else {
    const password = process.env.ADMIN_PASSWORD || (generatedPassword = crypto.randomBytes(12).toString('base64url'));
    if (password.length < 6) fail('ADMIN_PASSWORD precisa ter pelo menos 6 caracteres.');
    const created = await auth.createUser({ email, password, displayName: values.name });
    uid = created.uid;
    console.log(`✅ Usuário criado no Auth (UID ${uid}).`);
  }

  await db.doc(`users/${uid}`).set(
    { name: values.name, email, role: 'admin', schoolName: values.school, createdAt: FieldValue.serverTimestamp() },
    { merge: true },
  );
  console.log(`✅ Perfil gravado em users/${uid} com role "admin".`);
} catch (error) {
  fail(`Falha: ${error.code ?? ''} ${error.message}`);
}

if (generatedPassword) {
  console.log(`\n🔑 Senha gerada (anote agora, ela não será exibida de novo): ${generatedPassword}`);
}
console.log('\nPronto! Entre em /login com esse e-mail.\n');
process.exit(0);
