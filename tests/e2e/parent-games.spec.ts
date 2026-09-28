// Espace parent : bascules des jeux libres, temps par activité, export puis import
// (docs/specs/HUB.md §8.2 « parent-games.spec.ts »). Navigation par tests/e2e/nav.ts (arbitrage A11).
import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { chooseProfile } from './nav';

const PARENT_PIN = '1234';

// ---------- Garde-fou qualité : aucune erreur JS, aucun console.error pendant un test ----------

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

// ---------- Aides de navigation (reprises de parent.spec.ts) ----------

async function enterPin(page: Page, pin: string): Promise<void> {
  for (const digit of pin) {
    await page.getByTestId(`pin-key-${digit}`).click();
  }
}

async function createParentCode(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByText('Commencer : espace parent')).toBeVisible();
  await page.getByText('Commencer : espace parent').click();
  await expect(page.getByText('Créer le code parent')).toBeVisible();
  await enterPin(page, PARENT_PIN);
  await expect(page.getByText('Confirme le code')).toBeVisible();
  await enterPin(page, PARENT_PIN);
  await expect(page.getByRole('heading', { name: 'Espace parent' })).toBeVisible();
}

async function addChild(page: Page, name: string): Promise<void> {
  await page.getByTestId('add-child').click();
  await page.locator('input[name=name]').fill(name);
  await page.getByTestId('save-child').click();
  await expect(page.getByRole('heading', { name: 'Espace parent' })).toBeVisible();
}

async function editChild(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Modifier' }).click();
  await expect(page.getByRole('heading', { name: /^Modifier / })).toBeVisible();
}

async function saveChild(page: Page): Promise<void> {
  await page.getByTestId('save-child').click();
  await expect(page.getByRole('heading', { name: 'Espace parent' })).toBeVisible();
}

async function longPress(page: Page, locator: ReturnType<Page['getByTestId']>, ms: number): Promise<void> {
  const box = await locator.boundingBox();
  if (!box) throw new Error('Élément introuvable pour simuler un appui long.');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  await page.mouse.up();
}

async function openParentDashboard(page: Page): Promise<void> {
  await longPress(page, page.getByTestId('parent-access'), 2100);
  await expect(page.getByText('Code parent', { exact: true })).toBeVisible();
  await enterPin(page, PARENT_PIN);
  await expect(page.getByRole('heading', { name: 'Espace parent' })).toBeVisible();
}

function statValue(card: ReturnType<Page['getByTestId']>, label: string): ReturnType<Page['getByTestId']> {
  return card.locator(`xpath=.//dt[normalize-space(text())="${label}"]/following-sibling::dd[1]`) as unknown as ReturnType<
    Page['getByTestId']
  >;
}

// ==================== 1. Bascules de jeux : 3 tuiles, puis 1, puis retour au défaut ====================

test('bascules de jeux dans la fiche enfant : 3 tuiles, puis 1, puis retour au choix par défaut', async ({
  page,
}) => {
  await createParentCode(page);
  await addChild(page, 'Léa'); // parcours MS par défaut : coloriage visible, pas la dictée
  await page.getByTestId('back-to-game').click();

  await chooseProfile(page, 'Léa');
  const hub = page.getByTestId('hub');
  await expect(hub.getByTestId('hub-tile-map')).toBeVisible();
  await expect(hub.getByTestId('hub-tile-coloring')).toBeVisible();
  await expect(hub.getByTestId('hub-tile-dictation')).toHaveCount(0);

  // ---- Ajoute la dictée : 3 tuiles (carte, coloriage, dictée) ----
  await page.getByTestId('hub-to-profiles').click();
  await openParentDashboard(page);
  await editChild(page);
  await page.getByTestId('game-toggle-dictation').click();
  await expect(page.getByTestId('game-toggle-dictation')).toHaveAttribute('aria-pressed', 'true');
  await saveChild(page);
  await page.getByTestId('back-to-game').click();

  await chooseProfile(page, 'Léa');
  await expect(hub.getByTestId('hub-tile-map')).toBeVisible();
  await expect(hub.getByTestId('hub-tile-coloring')).toBeVisible();
  await expect(hub.getByTestId('hub-tile-dictation')).toBeVisible();

  // ---- Retire les deux jeux : une seule tuile (la carte) ----
  await page.getByTestId('hub-to-profiles').click();
  await openParentDashboard(page);
  await editChild(page);
  await page.getByTestId('game-toggle-coloring').click();
  await page.getByTestId('game-toggle-dictation').click();
  await expect(page.getByTestId('game-toggle-coloring')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByTestId('game-toggle-dictation')).toHaveAttribute('aria-pressed', 'false');
  await saveChild(page);
  await page.getByTestId('back-to-game').click();

  await chooseProfile(page, 'Léa');
  await expect(hub.getByTestId('hub-tile-map')).toBeVisible();
  await expect(hub.getByTestId('hub-tile-coloring')).toHaveCount(0);
  await expect(hub.getByTestId('hub-tile-dictation')).toHaveCount(0);

  // ---- Revient au choix par défaut du parcours (MS → coloriage) ----
  await page.getByTestId('hub-to-profiles').click();
  await openParentDashboard(page);
  await editChild(page);
  await page.getByTestId('games-default').click();
  await saveChild(page);
  await page.getByTestId('back-to-game').click();

  await chooseProfile(page, 'Léa');
  await expect(hub.getByTestId('hub-tile-map')).toBeVisible();
  await expect(hub.getByTestId('hub-tile-coloring')).toBeVisible();
  await expect(hub.getByTestId('hub-tile-dictation')).toHaveCount(0);
});

// ==================== 2. Temps par activité : 60 s simulées sur la carte ====================

test('temps par activité : 60 s simulées sur la carte apparaissent dans « Aujourd’hui »', async ({ page }) => {
  test.slow();
  await page.clock.install();
  await createParentCode(page);
  await addChild(page, 'Noa');
  await page.getByTestId('back-to-game').click();

  await chooseProfile(page, 'Noa');
  await page.getByTestId('hub-tile-map').click();
  await expect(page.locator('.screen--map')).toBeVisible();

  await page.clock.runFor(60_000);

  await page.getByTestId('to-hub').click();
  await expect(page.getByTestId('hub')).toBeVisible();
  await page.getByTestId('hub-to-profiles').click();

  await longPress(page, page.getByTestId('parent-access'), 2100);
  await expect(page.getByText('Code parent', { exact: true })).toBeVisible();
  await enterPin(page, PARENT_PIN);
  await page.getByRole('button', { name: 'Statistiques' }).click();

  await expect(page.getByTestId('activity-map-today')).toHaveText('1 min 00 s');
});

// ==================== 3. Export puis import : les tuiles (bascules de jeux) sont conservées ====================

test('export puis import dans un contexte vierge conserve les bascules de jeux', async ({ browser }) => {
  test.slow();

  const contextA = await browser.newContext();
  const pageA = await contextA.newPage();
  try {
    await createParentCode(pageA);
    await addChild(pageA, 'Mia'); // MS par défaut : coloriage visible, pas la dictée

    // Bascule explicite, différente du défaut du parcours : dictée seule (ni coloriage, ni défaut).
    await editChild(pageA);
    await pageA.getByTestId('game-toggle-dictation').click();
    await pageA.getByTestId('game-toggle-coloring').click();
    await expect(pageA.getByTestId('game-toggle-dictation')).toHaveAttribute('aria-pressed', 'true');
    await expect(pageA.getByTestId('game-toggle-coloring')).toHaveAttribute('aria-pressed', 'false');
    await saveChild(pageA);
    await pageA.getByTestId('back-to-game').click();

    await chooseProfile(pageA, 'Mia');
    const hubA = pageA.getByTestId('hub');
    await expect(hubA.getByTestId('hub-tile-dictation')).toBeVisible();
    await expect(hubA.getByTestId('hub-tile-coloring')).toHaveCount(0);

    await pageA.getByTestId('hub-to-profiles').click();
    await openParentDashboard(pageA);
    await pageA.getByTestId('tab-data').click();
    const downloadPromise = pageA.waitForEvent('download');
    await pageA.getByTestId('export').click();
    const download = await downloadPromise;
    const filePath = await download.path();
    if (!filePath) throw new Error('Export : aucun fichier local produit.');
    const exported = readFileSync(filePath, 'utf-8');

    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    try {
      await createParentCode(pageB);
      await expect(pageB.getByText("Aucun enfant pour l'instant.")).toBeVisible();

      await pageB.getByTestId('tab-data').click();
      await pageB.setInputFiles('[data-testid="import-file"]', {
        name: 'sauvegarde.json',
        mimeType: 'application/json',
        buffer: Buffer.from(exported, 'utf-8'),
      });
      await expect(
        pageB.getByText('Remplacer toutes les données actuelles par cette sauvegarde (1 enfant, 0 parties) ?'),
      ).toBeVisible();
      await pageB.getByTestId('import-confirm').click();
      await expect(pageB.getByText('Sauvegarde importée : 1 enfant(s), 0 partie(s).')).toBeVisible();

      await pageB.getByRole('button', { name: 'Voir les enfants' }).click();
      await pageB.getByTestId('back-to-game').click();
      await chooseProfile(pageB, 'Mia');
      const hubB = pageB.getByTestId('hub');
      await expect(hubB.getByTestId('hub-tile-dictation')).toBeVisible();
      await expect(hubB.getByTestId('hub-tile-coloring')).toHaveCount(0);
    } finally {
      await contextB.close();
    }
  } finally {
    await contextA.close();
  }
});
