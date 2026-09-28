// Hub et navigation (docs/specs/HUB.md §2, §3, §6.3, §8.2). Utilise les aides communes de nav.ts
// (arbitrage A11).
import { test, expect, type Page } from '@playwright/test';
import { backToHub, chooseProfile, enterMap, openMap, profileCard } from './nav';

const PARENT_PIN = '1234';

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
  for (const digit of pin) {
    await page.getByTestId(`pin-key-${digit}`).click();
  }
}

/** Premier lancement : code parent 1234, puis un enfant (MS par défaut, ou CE1 si demandé). */
async function onboardWithChild(page: Page, name: string, track: 'ms' | 'ce1' = 'ms'): Promise<void> {
  await page.goto('/');
  await expect(page.getByText('Commencer : espace parent')).toBeVisible();
  await page.getByText('Commencer : espace parent').click();

  await expect(page.getByText('Créer le code parent')).toBeVisible();
  await enterPin(page, PARENT_PIN);
  await expect(page.getByText('Confirme le code')).toBeVisible();
  await enterPin(page, PARENT_PIN);

  await expect(page.getByRole('heading', { name: 'Espace parent' })).toBeVisible();
  await page.getByTestId('add-child').click();
  await page.locator('input[name=name]').fill(name);
  if (track === 'ce1') {
    await page.locator('.pa-track-option', { hasText: 'CE1' }).click();
    await expect(page.locator('.pa-track-option', { hasText: 'CE1' })).toHaveAttribute('aria-pressed', 'true');
  }
  await page.getByTestId('save-child').click();

  await expect(page.getByRole('heading', { name: 'Espace parent' })).toBeVisible();
  await page.getByTestId('back-to-game').click();
  await expect(page.getByText('Commencer : espace parent')).toHaveCount(0);
}

async function longPressClock(page: Page, locator: ReturnType<Page['getByTestId']>, ms: number): Promise<void> {
  const box = await locator.boundingBox();
  if (!box) throw new Error('Élément introuvable pour simuler un appui long.');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.clock.runFor(ms);
  await page.mouse.up();
}

// ==================== 1. Hub d'une enfant MS : carte + coloriage ====================

test('hub MS : carte et coloriage, sans texte visible, sans cadenas', async ({ page }) => {
  await onboardWithChild(page, 'Alice');
  await chooseProfile(page, 'Alice');

  const hub = page.getByTestId('hub');
  await expect(hub).toBeVisible();
  await expect(hub.getByTestId('hub-tile-map')).toBeVisible();
  await expect(hub.getByTestId('hub-tile-coloring')).toBeVisible();
  await expect(hub.getByTestId('hub-tile-dictation')).toHaveCount(0);
  await expect(page.getByTestId('parent-access')).toHaveCount(0);
  await expect(hub).toHaveText(''); // aucun texte visible (règle 2, HUB.md §3)

  // Carte → maison → hub.
  await openMap(page);
  await backToHub(page);
  await expect(page.getByTestId('hub')).toBeVisible();

  // Avatar → profils.
  await page.getByTestId('hub-to-profiles').click();
  await expect(profileCard(page, 'Alice')).toBeVisible();
});

// ==================== 2. Hub d'un enfant CE1 : carte + dictée ====================

test('hub CE1 : carte et dictée', async ({ page }) => {
  await onboardWithChild(page, 'Timéo', 'ce1');
  await chooseProfile(page, 'Timéo');

  const hub = page.getByTestId('hub');
  await expect(hub.getByTestId('hub-tile-map')).toBeVisible();
  await expect(hub.getByTestId('hub-tile-dictation')).toBeVisible();
  await expect(hub.getByTestId('hub-tile-coloring')).toHaveCount(0);
});

// ==================== 3. Historique : maison remonte sans empiler ====================

test('historique : carte → maison → retour Android donne les profils ; jeu → retour donne le hub', async ({ page }) => {
  await onboardWithChild(page, 'Timéo', 'ce1');
  await enterMap(page, 'Timéo');
  await backToHub(page);
  await page.goBack();
  await expect(profileCard(page, 'Timéo')).toBeVisible();

  await chooseProfile(page, 'Timéo');
  await page.getByTestId('hub-tile-dictation').click();
  await expect(page).toHaveURL(/#\/dictation$/);
  await page.goBack();
  await expect(page.getByTestId('hub')).toBeVisible();
});

// ==================== 4. Route de jeu non visible : redirection au hub ====================

test('#/dictation saisi à la main pour une enfant MS ramène au hub', async ({ page }) => {
  await onboardWithChild(page, 'Alice');
  await chooseProfile(page, 'Alice');

  await page.evaluate(() => {
    window.location.hash = '#/dictation';
  });
  await expect(page).toHaveURL(/#\/hub$/);
  await expect(page.getByTestId('hub')).toBeVisible();
});

// ==================== 5. Verrou sur le hub, écran de fin, +5 minutes → hub ====================

test('verrou sur le hub : écran de fin immédiat, +5 minutes ramène au hub', async ({ page }) => {
  test.slow();
  await page.clock.install();
  await onboardWithChild(page, 'Alice');
  await chooseProfile(page, 'Alice');
  await expect(page.getByTestId('hub')).toBeVisible();

  await page.clock.runFor('15:05'); // dépasse les 15 min de session par défaut
  await expect(page.getByTestId('lock-parent')).toBeVisible();

  await longPressClock(page, page.getByTestId('lock-parent'), 2100);
  await expect(page.getByText('Code parent', { exact: true })).toBeVisible();
  await enterPin(page, PARENT_PIN);
  await expect(page.getByTestId('grant-5')).toBeVisible();
  await page.getByTestId('grant-5').click();

  await expect(page.getByTestId('hub')).toBeVisible();
});
