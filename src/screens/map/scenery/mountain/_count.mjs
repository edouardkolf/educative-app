// Temporaire : compte les éléments SVG de la montagne sur la planche de contrôle.
import { existsSync } from 'node:fs';
import { createServer } from 'vite';
import { chromium } from '@playwright/test';

const count = Number(process.argv[2] ?? 80);
const width = Number(process.argv[3] ?? 412);
const server = await createServer({ server: { port: 5800 + Math.floor(Math.random() * 100) }, logLevel: 'error' });
await server.listen();
const base = server.resolvedUrls.local[0];
const systemChrome = '/usr/bin/google-chrome';
const browser = await chromium.launch(existsSync(systemChrome) ? { executablePath: systemChrome, args: ['--no-sandbox'] } : {});
try {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  await page.goto(`${base}scripts/map-preview/index.html?count=${count}&width=${width}`);
  await page.waitForSelector('[data-map] svg');
  const res = await page.evaluate(() => {
    const svg = document.querySelector('[data-map] svg');
    const groups = [...svg.children];
    const out = {};
    const grounds = groups.filter((g) => g.getAttribute('data-layer') === 'ground');
    const paths = groups.filter((g) => g.getAttribute('data-layer') === 'path');
    const aboves = groups.filter((g) => g.getAttribute('data-layer') === 'above').reverse();
    const i = grounds.findIndex((g) => g.getAttribute('data-world') === 'mountain');
    const n = (el) => (el ? el.querySelectorAll('*').length : 0);
    out.ground = n(grounds[i]);
    out.path = n(paths[i]);
    out.above = n(aboves[i]);
    const borders = groups.filter((g) => g.getAttribute('data-testid') === 'map-border');
    const passages = groups.filter((g) => g.getAttribute('data-testid') === 'map-passage');
    out.border = n(borders[i - 1]);
    out.passage = n(passages[i - 1]);
    out.total = out.ground + out.path + out.above + out.border + out.passage;
    out.stones = paths[i].querySelectorAll('g[transform]').length;
    return out;
  });
  console.log(JSON.stringify(res));
} finally {
  await browser.close();
  await server.close();
}
