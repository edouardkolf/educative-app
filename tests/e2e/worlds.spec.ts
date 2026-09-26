// Mondes de la carte : arrivée dans un nouveau monde (trajet de l'avatar puis panneau), une seule fois.
// La progression est injectée directement dans IndexedDB : rejouer 16 niveaux n'apporterait rien ici.
import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';

const PARENT_PIN = '1234';
const SHOTS_DIR = '/tmp/claude-0/-home-user-educative-app/007564ed-74b0-55f0-83b0-41f952e2f0cb/scratchpad/shots';
const LEVELS_PER_WORLD = 16; // src/screens/map/layout.ts
const TRACK = JSON.parse(readFileSync('content/tracks/ms.json', 'utf-8')) as { id: string; levels: string[] };

let jsErrors: string[] = [];
let consoleErrors: string[] = [];

test.beforeEach(async ({ page }) => {
  jsErrors = [];
  consoleErrors = [];
  page.on('pageerror', (err) => jsErrors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
});

test.afterEach(() => {
  expect(jsErrors, `Erreur(s) JS non interceptée(s) sur la page :\n${jsErrors.join('\n')}`).toEqual([]);
  expect(consoleErrors, `console.error émis par la page :\n${consoleErrors.join('\n')}`).toEqual([]);
});

async function enterPin(page: Page, pin: string): Promise<void> {
  for (const digit of pin) await page.getByTestId(`pin-key-${digit}`).click();
}

async function onboardWithChild(page: Page, name: string): Promise<void> {
  await page.goto('/');
  await page.getByText('Commencer : espace parent').click();
  await enterPin(page, PARENT_PIN);
  await expect(page.getByText('Confirme le code')).toBeVisible();
  await enterPin(page, PARENT_PIN);
  await page.getByTestId('add-child').click();
  await page.locator('input[name=name]').fill(name);
  await page.getByTestId('save-child').click();
  await page.getByTestId('back-to-game').click();
}

/** Ajoute des parties réussies (3 étoiles) pour les `count` premiers niveaux du parcours. */
async function completeFirstLevels(page: Page, count: number): Promise<void> {
  await page.evaluate(
    async ({ levelIds, trackId }) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open('petits-malins');
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      const profiles = await new Promise<Array<{ id: string }>>((resolve, reject) => {
        const req = db.transaction('profiles').objectStore('profiles').getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      const profileId = profiles[0]!.id;
      const tx = db.transaction('runs', 'readwrite');
      const now = Date.now();
      levelIds.forEach((levelId, i) =>
        tx.objectStore('runs').put({
          id: `seed-${i}`,
          profileId,
          levelId,
          trackId,
          startedAt: now - 60_000,
          endedAt: now - 30_000,
          status: 'completed',
          endReason: null,
          replay: false,
          rounds: [],
          stars: 3,
        }),
      );
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    },
    { levelIds: TRACK.levels.slice(0, count), trackId: TRACK.id },
  );
}

test('arrivée dans la mer : trajet de l’avatar, panneau, puis plus jamais', async ({ page }) => {
  test.skip(TRACK.levels.length <= LEVELS_PER_WORLD, 'le parcours n’a qu’un monde');
  const firstSeaLevel = TRACK.levels[LEVELS_PER_WORLD]!;

  await onboardWithChild(page, 'Lou');
  await page.getByRole('button', { name: /Lou/ }).click();
  // Première visite : calibrage silencieux sur la forêt, aucune fête.
  await expect(page.locator(`[data-level="${TRACK.levels[0]}"]`)).toHaveAttribute('data-status', 'unlocked');
  await page.waitForTimeout(300);
  await expect(page.getByTestId('world-banner')).toHaveCount(0);

  await completeFirstLevels(page, LEVELS_PER_WORLD);
  await page.reload();
  await page.getByRole('button', { name: /Lou/ }).click();

  // Trajet puis panneau de la mer.
  await expect(page.locator('.map-traveller')).toBeVisible();
  const banner = page.getByTestId('world-banner');
  await expect(banner).toBeVisible({ timeout: 5000 });
  await expect(banner).toHaveAttribute('data-world', 'sea');
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${SHOTS_DIR}/20-nouveau-monde-mer.png` });
  await banner.click();
  await expect(banner).toHaveCount(0);

  const node = page.locator(`[data-level="${firstSeaLevel}"]`);
  await expect(node).toHaveAttribute('data-status', 'unlocked');
  await expect(node).toHaveAttribute('data-world', 'sea');
  await expect(node.locator('.map-node__avatar')).toBeVisible();

  // Déjà vue : ne se rejoue pas.
  await page.reload();
  await page.getByRole('button', { name: /Lou/ }).click();
  await expect(node).toBeVisible();
  await page.waitForTimeout(1500);
  await expect(page.getByTestId('world-banner')).toHaveCount(0);
  await expect(page.locator('.map-traveller')).toHaveCount(0);
});
