// Renderiza os SVGs em PNG (150 dpi) para public/certificado/. Requer o pacote global "playwright".
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(here, '../../public/certificado');
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch();
for (const name of ['frente', 'verso']) {
  const svg = fs.readFileSync(path.join(here, name + '.svg'), 'utf8').replace(/width="[^"]*mm" height="[^"]*mm"/, 'width="1754" height="1240"');
  const p = await b.newPage({ viewport: { width: 1754, height: 1240 } });
  await p.setContent('<body style="margin:0">' + svg + '</body>');
  await p.screenshot({ path: path.join(out, name + '.png') });
}
await b.close();
