#!/usr/bin/env node

/**
 * Script para gerar src/app/core/firebase.config.ts e .firebaserc a partir de variáveis de ambiente (.env).
 *
 * Prioridade das variáveis:
 *   1. process.env (variáveis do sistema / CI/CD)
 *   2. .env.local
 *   3. .env
 *   4. .env.example (fallback seguro para não quebrar build/test em desenvolvimento)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf-8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let val = match[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  }
  return env;
}

const envExample = parseEnvFile(path.join(rootDir, '.env.example'));
const envDefault = parseEnvFile(path.join(rootDir, '.env'));
const envLocal = parseEnvFile(path.join(rootDir, '.env.local'));

const hasEnvFile = fs.existsSync(path.join(rootDir, '.env')) || fs.existsSync(path.join(rootDir, '.env.local'));

if (!hasEnvFile && !process.env.FIREBASE_API_KEY) {
  console.warn('\n⚠️  [set-env] Arquivo .env não encontrado.');
  console.warn('👉 Crie um arquivo .env na raiz copiando de .env.example para definir suas credenciais reais.\n');
}

const apiKey =
  process.env.FIREBASE_API_KEY ||
  envLocal.FIREBASE_API_KEY ||
  envDefault.FIREBASE_API_KEY ||
  envExample.FIREBASE_API_KEY ||
  'SUA_API_KEY';

const authDomain =
  process.env.FIREBASE_AUTH_DOMAIN ||
  envLocal.FIREBASE_AUTH_DOMAIN ||
  envDefault.FIREBASE_AUTH_DOMAIN ||
  envExample.FIREBASE_AUTH_DOMAIN ||
  'SEU_PROJETO.firebaseapp.com';

const projectId =
  process.env.FIREBASE_PROJECT_ID ||
  envLocal.FIREBASE_PROJECT_ID ||
  envDefault.FIREBASE_PROJECT_ID ||
  envExample.FIREBASE_PROJECT_ID ||
  'SEU_PROJETO';

const appId =
  process.env.FIREBASE_APP_ID ||
  envLocal.FIREBASE_APP_ID ||
  envDefault.FIREBASE_APP_ID ||
  envExample.FIREBASE_APP_ID ||
  'SEU_APP_ID';

const targetDir = path.join(rootDir, 'src', 'app', 'core');
const targetFile = path.join(targetDir, 'firebase.config.ts');

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const fileContent = `// ==============================================================================
// ARQUIVO GERADO AUTOMATICAMENTE POR scripts/set-env.mjs
// NÃO EDITE MANUALMENTE ESTE ARQUIVO E NÃO O COMMITE NO GIT.
// Configure suas credenciais no arquivo .env na raiz do projeto.
// ==============================================================================

export const firebaseConfig = {
  apiKey: '${apiKey}',
  authDomain: '${authDomain}',
  projectId: '${projectId}',
  appId: '${appId}',
};
`;

fs.writeFileSync(targetFile, fileContent, 'utf-8');

// .firebaserc (projeto usado pelo `firebase deploy`) também vem do .env.
fs.writeFileSync(
  path.join(rootDir, '.firebaserc'),
  JSON.stringify({ projects: { default: projectId } }, null, 2) + '\n',
  'utf-8',
);
console.log(`[set-env] Configuração do Firebase sincronizada a partir do .env (Projeto: ${projectId})`);
