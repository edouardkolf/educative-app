// Planche de contrôle des coloriages : `npm run preview:coloring -- [dossier de sortie] [id…] [--size=76]`.
// Écrit un PNG par dessin (3 niveaux de détail, à colorier puis colorié), rendu par le vrai DrawingView.
import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { createServer } from 'vite';
import { chromium } from '@playwright/test';

const args = process.argv.slice(2);
// `--size=76` : côté d'une feuille en px (76 = vignette du frigo, 128 = carte de l'écran de choix).
const size = args.find((a) => a.startsWith('--size='))?.slice('--size='.length);
const [outArg, ...ids] = args.filter((a) => !a.startsWith('--'));
const outDir = resolve(outArg ?? 'coloring-preview-out');
mkdirSync(outDir, { recursive: true });

const server = await createServer({ server: { port: 5300 + Math.floor(Math.random() * 400), strictPort: false }, logLevel: 'error' });
await server.listen();
const base = server.resolvedUrls.local[0];
const systemChrome = '/usr/bin/google-chrome';
const browser = await chromium.launch(existsSync(systemChrome) ? { executablePath: systemChrome, args: ['--no-sandbox'] } : {});
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
  const query = `?${ids.length ? `ids=${ids.join(',')}&` : ''}${size ? `size=${size}` : ''}`;
  await page.goto(`${base}scripts/coloring-preview/index.html${query}`);
  await page.waitForSelector('[data-drawing]');
  await page.waitForTimeout(400);
  for (const element of await page.locator('[data-drawing]').all()) {
    const id = await element.getAttribute('data-drawing');
    await element.screenshot({ path: resolve(outDir, `${id}.png`) });
    console.log(resolve(outDir, `${id}.png`));
  }
} finally {
  await browser.close();
  await server.close();
}
