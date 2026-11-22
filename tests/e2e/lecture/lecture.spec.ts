// Petits Lecteurs (docs/specs/LECTURE-APP.md) : l'app de lecture, maternelle seulement. Hub = carte d'aventure +
// mini-jeux ; l'aventure = les niveaux de lecture sur la carte des mondes ; espace parent identique ; mode admin.
// Projet Playwright « lecture » : build `--mode lecture`, servi sur son propre port (playwright.config.ts).
import { test, expect, type Page } from '@playwright/test';
import { chooseProfile } from '../nav';
import {
  installFakeVoice,
  onboardMs,
  openParentDashboard,
  playFullSession,
  readReadings,
} from '../reading-helpers';

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

async function openAdventure(page: Page): Promise<void> {
  await page.getByTestId('hub-tile-map').click();
  await expect(page.getByTestId('adventure-map')).toBeVisible();
}

const MINI_GAMES = ['coloring', 'memory', 'order', 'maze', 'robot'];

test('app et hub : la carte d’aventure et les mini-jeux de maternelle, rien d’autre', async ({ page }) => {
  await installFakeVoice(page, 'fr');
  await page.goto('/');
  await expect(page).toHaveTitle('Petits Lecteurs');
  await onboardMs(page, 'Alice');
  await chooseProfile(page, 'Alice');

  await expect(page.getByTestId('hub-tile-map')).toBeVisible();
  for (const id of MINI_GAMES) await expect(page.getByTestId(`hub-tile-${id}`)).toBeVisible();
  // La lecture est l'aventure (tuile carte), jamais une tuile de jeu libre ; aucun jeu de CE1.
  for (const id of ['reading', 'dictation', 'tictactoe', 'hangman', 'guess-number', 'code-breaker']) {
    await expect(page.getByTestId(`hub-tile-${id}`)).toHaveCount(0);
  }
  await expect(page.locator('.hub-tile')).toHaveCount(1 + MINI_GAMES.length);

  // Un mini-jeu s'ouvre et la maison ramène au hub.
  await page.getByTestId('hub-tile-memory').click();
  await page.getByTestId('to-hub').click();
  await expect(page.getByTestId('hub')).toBeVisible();

  // Base de données propre à l'app.
  const dbs = await page.evaluate(async () => (await indexedDB.databases()).map((d) => d.name));
  expect(dbs).toContain('petits-lecteurs');
  expect(dbs).not.toContain('petits-malins');
});

test('aventure : niveau 1 joué depuis la carte → retour sur la carte, niveau 2 ouvert', async ({ page }) => {
  test.slow();
  await installFakeVoice(page, 'fr');
  await onboardMs(page, 'Alice');
  await chooseProfile(page, 'Alice');
  await openAdventure(page);

  await expect(page.getByTestId('reading-unavailable')).toHaveCount(0);
  await expect(page.getByTestId('admin-badge')).toHaveCount(0);
  const first = page.getByTestId('reading-level-1');
  await expect(first).toHaveAttribute('data-state', 'current');
  await expect(first).toBeInViewport();
  await expect(page.getByTestId('reading-level-2')).toHaveAttribute('data-state', 'locked');
  await expect(page.locator('[data-testid^="reading-level-"]')).toHaveCount(104);

  // Un niveau verrouillé ne lance rien.
  await page.getByTestId('reading-level-2').click({ force: true });
  await expect(page.getByTestId('adventure-map')).toBeVisible();

  await first.click({ force: true }); // il pulse : jamais « stable » pour Playwright
  await expect(page.getByTestId('reading-session')).toBeVisible();
  await expect(page).toHaveURL(/#\/reading\/drum-1$/);
  await expect(page.getByTestId('to-map')).toBeVisible();

  await playFullSession(page);
  await page.getByTestId('reading-end-continue').click();
  await expect(page.getByTestId('adventure-map')).toBeVisible();
  await expect(page.getByTestId('reading-level-1')).toHaveAttribute('data-state', 'done');
  await expect(page.getByTestId('reading-level-2')).toHaveAttribute('data-state', 'current');

  const records = await readReadings(page, 'petits-lecteurs');
  expect(records).toHaveLength(1);
  expect(records[0]?.levelId).toBe('drum-1');
  expect(records[0]?.status).toBe('completed');

  // Quitter une séance par la carte : retour sur la carte, rien de gagné.
  await page.getByTestId('reading-level-2').click({ force: true });
  await expect(page.getByTestId('reading-session')).toBeVisible();
  await page.getByTestId('to-map').click();
  await expect(page.getByTestId('adventure-map')).toBeVisible();
  await expect(page.getByTestId('reading-level-2')).toHaveAttribute('data-state', 'current');

  // La maison de la carte ramène au hub.
  await page.getByTestId('to-hub').click();
  await expect(page.getByTestId('hub')).toBeVisible();
});

test('espace parent : pas de choix de parcours, l’aventure a son étape de départ, pas de bascule lecture', async ({ page }) => {
  await installFakeVoice(page, 'fr');
  await onboardMs(page, 'Alice', 2);
  await openParentDashboard(page);
  await expect(page.locator('.pa-child-card__track')).toHaveText('Maternelle');
  await page.getByRole('button', { name: /Modifier/ }).first().click();
  await expect(page.getByTestId('adventure-settings')).toBeVisible();
  await expect(page.getByTestId('reading-start-stage')).toHaveValue('2');
  await expect(page.getByTestId('game-toggle-reading')).toHaveCount(0);
  await expect(page.getByTestId('game-toggle-dictation')).toHaveCount(0);
  for (const id of MINI_GAMES) await expect(page.getByTestId(`game-toggle-${id}`)).toBeVisible();
  // Un seul parcours : aucun choix « Moyenne section / CE1 ».
  await expect(page.getByRole('button', { name: /Moyenne section|CE1/ })).toHaveCount(0);

  // « Départ 2 » : la carte s'ouvre sur la lettre A.
  await page.getByTestId('save-child').click();
  await expect(page.getByRole('heading', { name: 'Espace parent' })).toBeVisible();
  await page.getByTestId('back-to-game').click();
  await chooseProfile(page, 'Alice');
  await openAdventure(page);
  await expect(page.locator('[data-level="sound-a"]')).toHaveAttribute('data-state', 'current');
});

test('mode admin : caché, révélé par 7 tapes, ouvre tous les niveaux de la carte', async ({ page }) => {
  await installFakeVoice(page, 'fr');
  await onboardMs(page, 'Alice');
  await openParentDashboard(page);
  await page.getByTestId('tab-settings').click();
  await expect(page.getByTestId('admin-section')).toHaveCount(0);
  const name = page.getByTestId('app-name');
  await expect(name).toHaveText('Petits Lecteurs');
  for (let i = 0; i < 6; i += 1) await name.click();
  await expect(page.getByTestId('admin-section')).toHaveCount(0);
  await name.click();
  await expect(page.getByTestId('admin-section')).toBeVisible();
  await page.getByTestId('toggle-admin').click();
  await expect(page.getByTestId('toggle-admin')).toHaveAttribute('aria-pressed', 'true');

  await page.getByTestId('back-to-game').click();
  await chooseProfile(page, 'Alice');
  await openAdventure(page);
  await expect(page.getByTestId('admin-badge')).toBeVisible();
  await expect(page.getByTestId('reading-level-1')).toHaveAttribute('data-state', 'current');
  await expect(page.locator('[data-testid^="reading-level-"][data-state="locked"]')).toHaveCount(0);
  await expect(page.getByTestId('reading-level-104')).toHaveAttribute('data-state', 'open');

  // Un niveau lointain se lance directement.
  const far = page.getByTestId('reading-level-40');
  await far.scrollIntoViewIfNeeded();
  await far.click();
  await expect(page.getByTestId('reading-session')).toBeVisible();
  await page.getByTestId('to-map').click();
  await expect(page.getByTestId('adventure-map')).toBeVisible();

  // Le réglage reste visible tant qu'il est actif ; le désactiver referme les niveaux.
  await page.getByTestId('to-hub').click();
  await page.getByTestId('hub-to-profiles').click();
  await openParentDashboard(page);
  await page.getByTestId('tab-settings').click();
  await expect(page.getByTestId('admin-section')).toBeVisible();
  await page.getByTestId('toggle-admin').click();
  await expect(page.getByTestId('toggle-admin')).toHaveAttribute('aria-pressed', 'false');
  await page.getByTestId('back-to-game').click();
  await chooseProfile(page, 'Alice');
  await openAdventure(page);
  await expect(page.getByTestId('admin-badge')).toHaveCount(0);
  await expect(page.getByTestId('reading-level-104')).toHaveAttribute('data-state', 'locked');
});

test('voix absente : badge sur la tuile de la carte, carte non jouable', async ({ page }) => {
  await installFakeVoice(page, 'absent');
  await onboardMs(page, 'Alice');
  await chooseProfile(page, 'Alice');
  await expect(page.getByTestId('hub-tile-map')).toHaveAttribute('data-state', 'unavailable');
  await openAdventure(page);
  await expect(page.getByTestId('reading-unavailable')).toBeVisible();
  await expect(page.getByTestId('reading-level-1')).toBeDisabled();
});
