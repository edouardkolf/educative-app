// Espace parent : fonctions de contrôle (voir docs/ARCHITECTURE.md §8, src/parent/**).
// Helpers de navigation copiés de vertical-slice.spec.ts (non exportés là-bas).
import { readFileSync } from 'node:fs';
import { test, expect, type Page, type Locator } from '@playwright/test';

const PARENT_PIN = '1234';

// ---------- Garde-fou qualité : aucune erreur JS, aucun console.error pendant un test ----------

let jsErrors: string[] = [];
let consoleErrors: string[] = [];

test.beforeEach(async ({ page }) => {
  jsErrors = [];
  consoleErrors = [];
  page.on('pageerror', (err) => {
    jsErrors.push(err.message);
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
});

test.afterEach(() => {
  expect(jsErrors, `Erreur(s) JS non interceptée(s) sur la page :\n${jsErrors.join('\n')}`).toEqual([]);
  expect(consoleErrors, `console.error émis par la page :\n${consoleErrors.join('\n')}`).toEqual([]);
});

// ---------- Aides de navigation (copiées/adaptées de vertical-slice.spec.ts) ----------

async function enterPin(page: Page, pin: string): Promise<void> {
  for (const digit of pin) {
    await page.getByTestId(`pin-key-${digit}`).click();
  }
}

/** Premier lancement : crée le code parent 1234. Termine sur le tableau de bord (aucun enfant). */
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

/** Depuis le tableau de bord : ajoute un enfant (limites optionnelles). Termine sur le tableau de bord. */
async function addChild(
  page: Page,
  name: string,
  opts: { sessionMinutes?: string; dailyMinutes?: string } = {},
): Promise<void> {
  await page.getByTestId('add-child').click();
  await page.locator('input[name=name]').fill(name);
  if (opts.sessionMinutes !== undefined) {
    await page.locator('select[name=sessionMinutes]').selectOption(opts.sessionMinutes);
  }
  if (opts.dailyMinutes !== undefined) {
    await page.locator('select[name=dailyMinutes]').selectOption(opts.dailyMinutes);
  }
  await page.getByTestId('save-child').click();
  await expect(page.getByRole('heading', { name: 'Espace parent' })).toBeVisible();
}

function profileCard(page: Page, name: string): Locator {
  return page.getByRole('button', { name: new RegExp(name) });
}

async function chooseProfile(page: Page, name: string): Promise<void> {
  await profileCard(page, name).click();
}

function mapNode(page: Page, levelId: string): Locator {
  return page.locator(`[data-level="${levelId}"]`);
}

async function openLevel(page: Page, levelId: string): Promise<void> {
  await mapNode(page, levelId).click();
}

async function backToProfiles(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Retour aux profils' }).click();
}

async function longPress(page: Page, locator: Locator, ms: number): Promise<void> {
  const box = await locator.boundingBox();
  if (!box) throw new Error('Élément introuvable pour simuler un appui long.');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  await page.mouse.up();
}

/** Appui long de 2 s sur le cadenas, puis saisie du code : ouvre le tableau de bord depuis les profils. */
async function openParentDashboard(page: Page): Promise<void> {
  await longPress(page, page.getByTestId('parent-access'), 2100);
  await expect(page.getByText('Code parent', { exact: true })).toBeVisible();
  await enterPin(page, PARENT_PIN);
  await expect(page.getByRole('heading', { name: 'Espace parent' })).toBeVisible();
}

function currentRound(page: Page): Locator {
  return page.locator('.play-round[data-answer]');
}

async function currentRoundIndex(page: Page): Promise<number | null> {
  const classes = await page.locator('.play-progress__dot').evaluateAll((els) => els.map((el) => el.className));
  const index = classes.findIndex((c) => c.includes('is-current'));
  return index === -1 ? null : index;
}

async function answerCorrectly(page: Page): Promise<void> {
  const round = currentRound(page);
  const answer = await round.getAttribute('data-answer');
  if (!answer) throw new Error('Aucune manche affichée (data-answer introuvable).');
  const indexBefore = await currentRoundIndex(page);
  await page.locator(`[data-choice="${answer}"]`).click();
  await expect
    .poll(
      async () => {
        if (await page.getByTestId('level-end').isVisible()) return 'end';
        return currentRoundIndex(page);
      },
      { timeout: 5000 },
    )
    .not.toBe(indexBefore);
}

async function playPerfectly(page: Page, rounds: number): Promise<void> {
  for (let i = 0; i < rounds; i += 1) {
    await answerCorrectly(page);
  }
}

async function waitForLevelEndButtons(page: Page): Promise<void> {
  await page.getByTestId('replay').waitFor({ state: 'visible' });
  await page.getByTestId('to-map').waitFor({ state: 'visible' });
}

function statValue(card: Locator, label: string): Locator {
  return card.locator(`xpath=.//dt[normalize-space(text())="${label}"]/following-sibling::dd[1]`);
}

// ==================== 1. Limites par enfant ====================

test('les limites choisies sont enregistrées puis relues en modification', async ({ page }) => {
  await createParentCode(page);
  await addChild(page, 'Noa', { sessionMinutes: '20', dailyMinutes: '45' });

  await page.getByRole('button', { name: 'Modifier' }).click();
  await expect(page.getByRole('heading', { name: 'Modifier Noa' })).toBeVisible();
  await expect(page.locator('select[name=sessionMinutes]')).toHaveValue('20');
  await expect(page.locator('select[name=dailyMinutes]')).toHaveValue('45');

  // « Sans limite » (chaîne vide) fait aussi l'aller-retour.
  await page.locator('select[name=sessionMinutes]').selectOption('');
  await page.getByTestId('save-child').click();
  await expect(page.getByRole('heading', { name: 'Espace parent' })).toBeVisible();

  await page.getByRole('button', { name: 'Modifier' }).click();
  await expect(page.locator('select[name=sessionMinutes]')).toHaveValue('');
  await expect(page.locator('select[name=dailyMinutes]')).toHaveValue('45');
});

// ==================== 2. Déblocage manuel ====================

test('verrouiller puis débloquer un niveau change la carte de l’enfant', async ({ page }) => {
  await createParentCode(page);
  await addChild(page, 'Yuna');
  await page.getByTestId('back-to-game').click();

  await chooseProfile(page, 'Yuna');
  await expect(mapNode(page, 'ms-suite-01')).toHaveAttribute('data-status', 'unlocked');
  await backToProfiles(page);

  await openParentDashboard(page);
  await page.getByRole('button', { name: 'Statistiques' }).click();
  await expect(page.getByRole('heading', { name: 'Yuna' })).toBeVisible();

  const card = page.getByTestId('level-stats-ms-suite-01');
  const badge = card.locator('.pa-badge');
  await expect(page.getByTestId('override-ms-suite-01-auto')).toHaveAttribute('aria-pressed', 'true');

  // ---- Verrouiller : recalculé et affiché aussitôt dans les statistiques ----
  await page.getByTestId('override-ms-suite-01-locked').click();
  await expect(page.getByTestId('override-ms-suite-01-locked')).toHaveAttribute('aria-pressed', 'true');
  await expect(badge).toHaveText('Verrouillé');

  // ---- … et sur la carte du parcours vue par l'enfant ----
  await page.getByRole('button', { name: '← Tableau de bord' }).click();
  await page.getByTestId('back-to-game').click();
  await chooseProfile(page, 'Yuna');
  await expect(mapNode(page, 'ms-suite-01')).toHaveAttribute('data-status', 'locked');

  // ---- Débloquer explicitement : de nouveau recalculé aussitôt, des deux côtés ----
  await backToProfiles(page);
  await openParentDashboard(page);
  await page.getByRole('button', { name: 'Statistiques' }).click();
  await page.getByTestId('override-ms-suite-01-unlocked').click();
  await expect(page.getByTestId('override-ms-suite-01-unlocked')).toHaveAttribute('aria-pressed', 'true');
  await expect(badge).toHaveText('Débloqué');

  await page.getByRole('button', { name: '← Tableau de bord' }).click();
  await page.getByTestId('back-to-game').click();
  await chooseProfile(page, 'Yuna');
  await expect(mapNode(page, 'ms-suite-01')).toHaveAttribute('data-status', 'unlocked');
});

// ==================== 3. Tableau de bord : temps du jour ====================

test('« +15 min aujourd’hui » augmente aussitôt le total affiché', async ({ page }) => {
  await createParentCode(page);
  await addChild(page, 'Zoé', { dailyMinutes: '30' });

  const usage = page.locator('.pa-child-card__usage');
  await expect(usage).toHaveText("Aujourd'hui : 0 min sur 30");

  await page.locator('[data-testid^="grant-today-"]').click();
  await expect(usage).toHaveText("Aujourd'hui : 0 min sur 45");
});

// ==================== 4. Export puis import dans un contexte vierge ====================

test('export puis import dans un contexte vierge restaure l’enfant et ses statistiques', async ({ browser }) => {
  test.slow(); // deux contextes, une partie jouée en entier, export puis import.

  const contextA = await browser.newContext();
  const pageA = await contextA.newPage();
  try {
    await createParentCode(pageA);
    await addChild(pageA, 'Lina');
    await pageA.getByTestId('back-to-game').click();

    await chooseProfile(pageA, 'Lina');
    await openLevel(pageA, 'ms-suite-01');
    await playPerfectly(pageA, 4); // ms-suite-01.json : rounds = 4
    await waitForLevelEndButtons(pageA);
    await expect(pageA.getByTestId('level-end')).toHaveAttribute('data-stars', '3');
    await pageA.getByTestId('to-map').click();
    await expect(mapNode(pageA, 'ms-suite-01')).toHaveAttribute('data-status', 'completed');

    await backToProfiles(pageA);
    await openParentDashboard(pageA);
    const downloadPromise = pageA.waitForEvent('download');
    await pageA.getByTestId('export').click();
    const download = await downloadPromise;
    const filePath = await download.path();
    if (!filePath) throw new Error('Export : aucun fichier local produit.');
    const exported = readFileSync(filePath, 'utf-8');

    // ---- Contexte B, entièrement vierge : code parent créé, puis import ----
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    try {
      await createParentCode(pageB);
      await expect(pageB.getByText("Aucun enfant pour l'instant.")).toBeVisible();

      await pageB.setInputFiles('[data-testid="import-file"]', {
        name: 'petits-malins.json',
        mimeType: 'application/json',
        buffer: Buffer.from(exported, 'utf-8'),
      });
      await expect(pageB.getByText('Remplacer toutes les données actuelles par cette sauvegarde (1 enfant, 1 partie) ?')).toBeVisible();
      await pageB.getByTestId('import-confirm').click();
      await expect(pageB.getByText('Sauvegarde importée : 1 enfant(s), 1 partie(s).')).toBeVisible();

      await expect(pageB.getByText('Lina')).toBeVisible();
      await pageB.getByRole('button', { name: 'Statistiques' }).click();
      await expect(pageB.getByRole('heading', { name: 'Lina' })).toBeVisible();
      const card = pageB.getByTestId('level-stats-ms-suite-01');
      await expect(statValue(card, 'Essais')).toHaveText('1');
      await expect(statValue(card, 'Réussites')).toHaveText('1');

      // La progression est recalculée à partir des parties importées : la carte le confirme aussi.
      await pageB.getByRole('button', { name: '← Tableau de bord' }).click();
      await pageB.getByTestId('back-to-game').click();
      await chooseProfile(pageB, 'Lina');
      await expect(mapNode(pageB, 'ms-suite-01')).toHaveAttribute('data-status', 'completed');
    } finally {
      await contextB.close();
    }
  } finally {
    await contextA.close();
  }
});

// ==================== 5. Import d'un fichier invalide ====================

test('un fichier de sauvegarde invalide affiche une erreur et ne change rien', async ({ page }) => {
  await createParentCode(page);
  await addChild(page, 'Noé');
  await expect(page.getByText('Noé')).toBeVisible();

  await page.setInputFiles('[data-testid="import-file"]', {
    name: 'invalide.json',
    mimeType: 'application/json',
    buffer: Buffer.from("{ceci n'est pas du JSON", 'utf-8'),
  });

  await expect(page.locator('.pa-import .pa-error')).toBeVisible();
  await expect(page.getByTestId('import-confirm')).toHaveCount(0);
  // Rien n'a changé : l'enfant est toujours là, aucune donnée remplacée.
  await expect(page.getByText('Noé')).toBeVisible();
});

// ==================== 6. Suppression d'un enfant ====================

test('la suppression d’un enfant le retire du tableau de bord', async ({ page }) => {
  await createParentCode(page);
  await addChild(page, 'Timéo');
  await expect(page.getByText('Timéo')).toBeVisible();

  await page.getByRole('button', { name: 'Modifier' }).click();
  await expect(page.getByRole('heading', { name: 'Modifier Timéo' })).toBeVisible();

  await page.getByTestId('delete-child').click();
  await expect(page.getByText('Supprimer définitivement Timéo et toutes ses statistiques ?')).toBeVisible();
  await page.getByTestId('delete-child-confirm').click();

  await expect(page.getByRole('heading', { name: 'Espace parent' })).toBeVisible();
  await expect(page.getByText("Aucun enfant pour l'instant.")).toBeVisible();
});
