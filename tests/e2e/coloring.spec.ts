// Coloriage magique (docs/specs/COLORIAGE.md §2, §3, §6, §8 « Bout en bout »). Navigation par
// tests/e2e/nav.ts (arbitrage A11). Chaque case porte son code (`data-choice="zone-<id>"`) avec la couleur
// attendue (`data-target`) et sa recette (`data-recipe`) : les tests peignent comme l'enfant, fiole par fiole.
import { test, expect, type Locator, type Page } from '@playwright/test';
import { chooseProfile } from './nav';

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

/** Premier lancement : code parent 1234, puis une enfant de moyenne section (coloriage visible par défaut). */
async function onboardWithChild(page: Page, name: string): Promise<void> {
  await page.goto('/');
  await page.getByText('Commencer : espace parent').click();
  await expect(page.getByText('Créer le code parent')).toBeVisible();
  await enterPin(page, PARENT_PIN);
  await expect(page.getByText('Confirme le code')).toBeVisible();
  await enterPin(page, PARENT_PIN);
  await expect(page.getByRole('heading', { name: 'Espace parent' })).toBeVisible();
  await page.getByTestId('add-child').click();
  await page.locator('input[name=name]').fill(name);
  await page.getByTestId('save-child').click();
  await expect(page.getByRole('heading', { name: 'Espace parent' })).toBeVisible();
  await page.getByTestId('back-to-game').click();
  await expect(page.getByText('Commencer : espace parent')).toHaveCount(0);
}

async function openColoring(page: Page, name: string): Promise<void> {
  await chooseProfile(page, name);
  await page.getByTestId('hub-tile-coloring').click();
  await expect(page.getByTestId('coloring')).toHaveAttribute('data-phase', 'painting');
}

/** Laisse passer le temps : réel par défaut, ou horloge simulée quand `page.clock` est installée. */
type Wait = (ms: number) => Promise<void>;
const realWait = (page: Page): Wait => (ms) => page.waitForTimeout(ms);
const clockWait = (page: Page): Wait => (ms) => page.clock.runFor(ms);

function codes(page: Page): Locator {
  return page.locator('[data-choice^="zone-"]');
}

function atelier(page: Page): Locator {
  return page.locator('.clr-atelier');
}

/** Rince le récipient s'il contient quelque chose (vidange de 400 ms). */
async function rinse(page: Page, wait: Wait): Promise<void> {
  if ((await atelier(page).getAttribute('data-drops')) !== '') {
    await page.locator('[data-choice="cup"]').click();
    await wait(500);
  }
}

/** Verse les fioles données dans le récipient (mélange de 600 ms après la 2e goutte). */
async function pour(page: Page, colors: readonly string[], wait: Wait): Promise<void> {
  for (const color of colors) {
    await page.locator(`[data-choice="${color}"]`).click();
    await wait(150);
  }
  await wait(700);
}

/** Peint une case avec sa bonne couleur, en préparant le récipient seulement s'il le faut (la peinture reste). */
async function paintZone(page: Page, zone: Locator, wait: Wait): Promise<void> {
  const target = await zone.getAttribute('data-target');
  const recipe = ((await zone.getAttribute('data-recipe')) ?? '').split(',');
  if ((await atelier(page).getAttribute('data-paint')) !== target) {
    await rinse(page, wait);
    await pour(page, recipe, wait);
    await expect(atelier(page)).toHaveAttribute('data-paint', target ?? '');
  }
  await zone.click();
  await wait(450); // la couleur se répand (350 ms) : aucun tap n'est pris pendant ce temps
}

/** Peint `count` cases (la première restante à chaque fois) ; tout le dessin si `count` est absent. */
async function paintZones(page: Page, wait: Wait, count = Number.POSITIVE_INFINITY): Promise<void> {
  for (let painted = 0; painted < count; painted += 1) {
    const remaining = await codes(page).count();
    if (remaining === 0) return;
    const before = remaining;
    await paintZone(page, codes(page).first(), wait);
    await expect(codes(page)).toHaveCount(before - 1);
  }
}

async function longPressClock(page: Page, locator: Locator, ms: number): Promise<void> {
  const box = await locator.boundingBox();
  if (!box) throw new Error('Élément introuvable pour simuler un appui long.');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.clock.runFor(ms);
  await page.mouse.up();
}

async function longPress(page: Page, locator: Locator, ms: number): Promise<void> {
  const box = await locator.boundingBox();
  if (!box) throw new Error('Élément introuvable pour simuler un appui long.');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  await page.mouse.up();
}

async function openParentFromProfiles(page: Page): Promise<void> {
  await longPress(page, page.getByTestId('parent-access'), 2100);
  await expect(page.getByText('Code parent', { exact: true })).toBeVisible();
  await enterPin(page, PARENT_PIN);
  await expect(page.getByRole('heading', { name: 'Espace parent' })).toBeVisible();
}

// ==================== 1. Premier dessin : tutoriel, dessin entier, fin, frigo, choix ====================

test('premier coloriage : tutoriel, tout le dessin peint, la figure prend vie, frigo et 3 nouveaux dessins', async ({
  page,
}) => {
  test.slow();
  await onboardWithChild(page, 'Léa');
  await openColoring(page, 'Léa');

  const screen = page.getByTestId('coloring');
  await expect(screen).toHaveAttribute('data-tier', '1');
  await expect(page.locator('.tutorial-hand')).toBeVisible();
  await expect(screen).toHaveText(''); // aucun texte pour une enfant non lectrice

  await paintZones(page, realWait(page));
  await expect(screen).toHaveAttribute('data-phase', 'celebrating');
  await expect(screen).toHaveAttribute('data-phase', 'choosing', { timeout: 10_000 });

  // Trois dessins proposés, jamais celui qu'on vient de finir (la maison du tutoriel).
  await expect(page.locator('[data-choice^="pick-"]')).toHaveCount(3);
  await expect(page.locator('[data-choice="pick-house"]')).toHaveCount(0);
  await expect(screen).toHaveText('');

  // Le dessin fini est sur le frigo.
  await page.getByTestId('coloring-fridge').click();
  await expect(screen).toHaveAttribute('data-phase', 'fridge');
  await expect(page.getByTestId('fridge-item')).toHaveCount(1);
  await expect(screen).toHaveText('');
});

// ==================== 2. Erreur douce : la peinture ne prend pas ====================

test('erreur douce : une mauvaise couleur ne prend pas, le code reste, la bonne couleur prend', async ({ page }) => {
  await onboardWithChild(page, 'Léa');
  await openColoring(page, 'Léa');
  const wait = realWait(page);

  const zone = codes(page).first();
  const zoneChoice = (await zone.getAttribute('data-choice')) as string;
  const target = (await zone.getAttribute('data-target')) as string;
  const wrong = ['red', 'yellow', 'blue'].find((c) => c !== target) as string;

  await pour(page, [wrong], wait);
  await expect(atelier(page)).toHaveAttribute('data-paint', wrong);
  await zone.click();
  await wait(600);
  await expect(page.locator(`[data-choice="${zoneChoice}"]`)).toHaveCount(1); // la case reste blanche
  await expect(atelier(page)).toHaveAttribute('data-paint', wrong); // le récipient garde sa couleur

  await paintZone(page, page.locator(`[data-choice="${zoneChoice}"]`), wait);
  await expect(page.locator(`[data-choice="${zoneChoice}"]`)).toHaveCount(0);
});

// ==================== 3. Le récipient : deux gouttes au plus, rinçage ====================

test('récipient : rouge, bleu, puis jaune rince et ne garde que le jaune ; un tap sur le récipient le vide', async ({
  page,
}) => {
  await onboardWithChild(page, 'Léa');
  await openColoring(page, 'Léa');
  const wait = realWait(page);

  await page.locator('[data-choice="red"]').click();
  await expect(atelier(page)).toHaveAttribute('data-drops', 'red');
  await page.locator('[data-choice="blue"]').click();
  await expect(atelier(page)).toHaveAttribute('data-drops', 'red,blue');
  await expect(atelier(page)).toHaveAttribute('data-paint', 'purple');
  await wait(700);
  await page.locator('[data-choice="yellow"]').click(); // récipient plein : il se rince, puis reçoit le jaune
  await expect(atelier(page)).toHaveAttribute('data-drops', 'yellow');
  await wait(700);

  await page.locator('[data-choice="cup"]').click();
  await expect(atelier(page)).toHaveAttribute('data-drops', '');
  await expect(atelier(page)).toHaveAttribute('data-paint', 'none');
});

// ==================== 4. Fin douce puis reprise « on finira demain » ====================

test('fin douce : la case en cours se termine, écran de fin, puis le même dessin est repris', async ({ page }) => {
  test.slow();
  await page.clock.install();
  await onboardWithChild(page, 'Léa');
  await openColoring(page, 'Léa');
  const wait = clockWait(page);

  const total = await codes(page).count();
  await paintZones(page, wait, 2);

  await page.clock.runFor('15:05'); // dépasse les 15 min de session par défaut, pendant la peinture
  await expect(page.getByTestId('coloring')).toHaveAttribute('data-phase', 'painting'); // l'unité continue
  await paintZone(page, codes(page).first(), wait); // la case en cours se termine…
  await expect(page.getByTestId('lock-parent')).toBeVisible(); // … puis l'écran de fin

  await longPressClock(page, page.getByTestId('lock-parent'), 2100);
  await expect(page.getByText('Code parent', { exact: true })).toBeVisible();
  await enterPin(page, PARENT_PIN);
  await page.getByTestId('grant-5').click();
  await expect(page.getByTestId('hub')).toBeVisible();

  // Interrompu par la lune : repris directement, avec ses 3 cases peintes.
  await page.getByTestId('hub-tile-coloring').click();
  await expect(page.getByTestId('coloring')).toHaveAttribute('data-phase', 'painting');
  await expect(codes(page)).toHaveCount(total - 3);
});

// ==================== 5. Petit téléphone : tout tient, cibles assez grandes ====================

test('360 × 640 : aucun défilement, dessin ≥ 300 px, codes ≥ 28 px, fioles ≥ 72 px, boutons ≥ 56 px', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await onboardWithChild(page, 'Léa');
  await openColoring(page, 'Léa');

  const scroll = await page.evaluate(() => ({
    x: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    y: document.documentElement.scrollHeight > document.documentElement.clientHeight + 1,
  }));
  expect(scroll, 'défilement détecté').toEqual({ x: false, y: false });

  const drawing = await page.locator('.clr-svg').boundingBox();
  expect(drawing).not.toBeNull();
  expect(drawing!.width).toBeGreaterThanOrEqual(300);

  for (const code of await codes(page).all()) {
    const box = await code.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(28);
  }
  for (const color of ['red', 'yellow', 'blue']) {
    const box = await page.locator(`[data-choice="${color}"]`).boundingBox();
    expect(box).not.toBeNull();
    expect(Math.min(box!.width, box!.height)).toBeGreaterThanOrEqual(72);
  }
  for (const id of ['to-hub', 'coloring-fridge']) {
    const box = await page.getByTestId(id).boundingBox();
    expect(box).not.toBeNull();
    expect(Math.min(box!.width, box!.height)).toBeGreaterThanOrEqual(56);
  }
});

// ==================== 6. Espace parent : dessin terminé compté, palier forcé ====================

test('parent : un dessin terminé compté ; le palier forcé dans la fiche enfant s’applique au dessin suivant', async ({
  page,
}) => {
  test.slow();
  await onboardWithChild(page, 'Léa');
  await openColoring(page, 'Léa');
  await paintZones(page, realWait(page));
  await expect(page.getByTestId('coloring')).toHaveAttribute('data-phase', 'choosing', { timeout: 10_000 });

  await page.getByTestId('to-hub').click();
  await page.getByTestId('hub-to-profiles').click();
  await openParentFromProfiles(page);
  await page.getByRole('button', { name: 'Statistiques' }).click();
  await expect(page.getByTestId('coloring-stats-completed')).toHaveText('1');

  // Palier forcé : « Formes » (palier 3), dans la fiche de l'enfant.
  await page.getByRole('button', { name: 'Retour aux enfants' }).click(); // sous-page : pas d'onglets
  await page.getByRole('button', { name: 'Modifier' }).click();
  await page.getByTestId('coloring-tier-3').click();
  await expect(page.getByTestId('coloring-tier-3')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('save-child').click();
  await page.getByTestId('back-to-game').click();

  await chooseProfile(page, 'Léa');
  await page.getByTestId('hub-tile-coloring').click();
  await expect(page.getByTestId('coloring')).toHaveAttribute('data-phase', 'choosing');
  await page.locator('[data-choice^="pick-"]').first().click();
  await expect(page.getByTestId('coloring')).toHaveAttribute('data-tier', '3');
  await expect(page.locator('[data-choice^="legend-"]').first()).toBeVisible();
});
