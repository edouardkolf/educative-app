// Planche de contrôle de la carte : `npm run preview:map -- [dossier] [--count=80] [--width=412] [--worlds=sea,clouds]`.
// Écrit, pour chaque monde, trois tranches de bas en haut (<monde>-1.png en bas … <monde>-3.png en haut, ~1150 px
// chacune, à l'échelle réelle), puis backdrops.png (les fonds de partie). Les disques numérotés sont les niveaux.
import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { createServer } from 'vite';
import { chromium } from '@playwright/test';

const args = process.argv.slice(2);
const opt = (name, def) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? def;
const count = Number(opt('count', 80));
const width = Number(opt('width', 412));
const only = opt('worlds', '').split(',').filter(Boolean);
const outDir = resolve(args.find((a) => !a.startsWith('--')) ?? 'map-preview-out');
mkdirSync(outDir, { recursive: true });

const server = await createServer({ server: { port: 5300 + Math.floor(Math.random() * 400) }, logLevel: 'error' });
await server.listen();
const base = server.resolvedUrls.local[0];
const systemChrome = '/usr/bin/google-chrome';
const browser = await chromium.launch(existsSync(systemChrome) ? { executablePath: systemChrome, args: ['--no-sandbox'] } : {});
try {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(`${base}scripts/map-preview/index.html?count=${count}&width=${width}`);
  await page.waitForSelector('[data-map] svg');
  const height = await page.evaluate(() => document.querySelector('[data-map]').getBoundingClientRect().height);
  await page.setViewportSize({ width, height: Math.ceil(height) });
  await page.waitForTimeout(500);
  const bands = await page.evaluate(() =>
    [...document.querySelectorAll('[data-layer="ground"]')].map((g) => g.getAttribute('data-world')),
  );
  const tops = await page.evaluate(() =>
    [...document.querySelectorAll('[data-map] svg > defs > clipPath rect')].map((r) => [Number(r.getAttribute('y')), Number(r.getAttribute('height'))]),
  );
  for (let i = 0; i < bands.length; i += 1) {
    const world = bands[i];
    if (only.length && !only.includes(world)) continue;
    const [top, h] = tops[i];
    const slice = Math.ceil(h / 3);
    for (let k = 0; k < 3; k += 1) {
      const y = Math.max(0, top + h - (k + 1) * slice - 40);
      const file = resolve(outDir, `${world}${i >= 4 ? `-${i}` : ''}-${k + 1}.png`);
      await page.screenshot({ path: file, clip: { x: 0, y, width, height: Math.min(slice + 80, height - y) } });
      console.log(file);
    }
  }
  await page.setViewportSize({ width: 1300, height: 640 });
  await page.goto(`${base}scripts/map-preview/index.html?backdrops=1`);
  await page.waitForSelector('[data-backdrop] svg');
  await page.waitForTimeout(300);
  await page.screenshot({ path: resolve(outDir, 'backdrops.png') });
  console.log(resolve(outDir, 'backdrops.png'));
  if (errors.length) console.error('Erreurs dans la page :\n' + errors.join('\n'));
} finally {
  await browser.close();
  await server.close();
}
