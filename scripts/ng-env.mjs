#!/usr/bin/env node

/**
 * Wrapper do Angular CLI para injetar as variáveis do .env no build/serve via esbuild define.
 * Isso permite que `src/app/core/firebase.config.ts` chame `process.env['FIREBASE_*']`
 * diretamente no código, mantendo os valores reais exclusivamente no arquivo .env.
 */

import { spawn } from 'node:child_process';
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

// Mescla valores com prioridade: process.env > .env.local > .env > .env.example
const env = { ...envExample, ...envDefault, ...envLocal, ...process.env };

const args = process.argv.slice(2);
const command = args[0] || 'serve';
const extraArgs = args.slice(1);

const keys = [
  'FIREBASE_API_KEY',
  'FIREBASE_AUTH_DOMAIN',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_APP_ID',
  'MAIL_WORKER_URL',
];

// Popula process.env atual do Node (para Vitest e ferramentas baseadas em Node)
for (const key of keys) {
  if (env[key]) {
    process.env[key] = env[key];
  }
}

// Para build e serve do Angular (esbuild), injeta via --define
const defineArgs = [];
if (command === 'build' || command === 'serve') {
  for (const key of keys) {
    const val = env[key] ?? '';
    defineArgs.push('--define', `process.env.${key}=${JSON.stringify(val)}`);
  }
}

const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const child = spawn(npxCmd, ['ng', command, ...extraArgs, ...defineArgs], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: process.env,
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
