// Tranche verticale de bout en bout (voir docs/ARCHITECTURE.md §3, §5, §7) : rejoue le parcours
// réel d'un parent puis d'une enfant sur le viewport Pixel 7 (projet `mobile-chrome`).
// Chaque test démarre avec un contexte Playwright neuf, donc un stockage IndexedDB vierge.
import { readFileSync } from 'node:fs';
import { test, expect, type Page, type Locator } from '@playwright/test';
import { EXPORT_FORMAT, type ExportBundle } from '../../src/storage/types';

const PARENT_PIN = '1234';
const SHOTS_DIR = '/tmp/claude-0/-home-user-educative-app/007564ed-74b0-55f0-83b0-41f952e2f0cb/scratchpad/shots';

function shot(name: string): string {
  return `${SHOTS_DIR}/${name}`;
}

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

// ---------- Aides de navigation (sélecteurs : ARCHITECTURE.md + attributs data-testid) ----------

async function enterPin(page: Page, pin: string): Promise<void> {
  for (const digit of pin) {
    await page.getByTestId(`pin-key-${digit}`).click();
  }
}

/** Premier lancement complet : code parent 1234 puis un enfant. Termine sur l'écran profils. */
async function onboardWithChild(page: Page, name: string): Promise<void> {
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
  await page.getByTestId('save-child').click();

  await expect(page.getByRole('heading', { name: 'Espace parent' })).toBeVisible();
  await page.getByTestId('back-to-game').click();
  await expect(page.getByText('Commencer : espace parent')).toHaveCount(0);
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

/** Appui long de 2 s sur le cadenas (durationMs configuré à 2000 dans ProfilePicker). */
async function openParentAccess(page: Page): Promise<void> {
  await longPress(page, page.getByTestId('parent-access'), 2100);
}

// ---------- Aides de partie (mécanique « sequence » : data-answer / data-choice) ----------

function currentRound(page: Page): Locator {
  // `.play-round` (LevelPlayer) ET `.seq-view` (SequenceView) portent tous deux `data-answer` :
  // on se limite au conteneur du moteur pour garder un sélecteur à résultat unique.
  return page.locator('.play-round[data-answer]');
}

/**
 * Index de la manche courante d'après les pastilles de progression (`.play-progress__dot.is-current`),
 * plutôt que `data-answer` : la mécanique « sequence » tire une nouvelle couleur par manche, donc
 * deux manches consécutives peuvent tout à fait partager la même bonne réponse par coïncidence.
 */
async function currentRoundIndex(page: Page): Promise<number | null> {
  const classes = await page.locator('.play-progress__dot').evaluateAll((els) => els.map((el) => el.className));
  const index = classes.findIndex((c) => c.includes('is-current'));
  return index === -1 ? null : index;
}

/** Répond juste à la manche affichée et attend la transition (manche suivante ou fin de niveau). */
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

// ---------- Aides statistiques parent ----------

function statValue(card: Locator, label: string): Locator {
  return card.locator(`xpath=.//dt[normalize-space(text())="${label}"]/following-sibling::dd[1]`);
}

/** Depuis l'écran profils (avec l'enfant visible) : ouvre l'espace parent puis les statistiques. */
async function openChildStats(page: Page, childName: string): Promise<void> {
  await openParentAccess(page);
  await expect(page.getByText('Code parent', { exact: true })).toBeVisible();
  await enterPin(page, PARENT_PIN);
  await expect(page.getByRole('heading', { name: 'Espace parent' })).toBeVisible();
  await page.getByRole('button', { name: 'Statistiques' }).click();
  await expect(page.getByRole('heading', { name: childName })).toBeVisible();
}

// ==================== 1. Premier lancement → configuration ====================

test('premier lancement : création du code parent et du premier enfant', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Commencer : espace parent')).toBeVisible();
  // Pas encore d'enfant : le cadenas d'accès parent n'existe pas sur l'écran de bienvenue.
  await expect(page.getByTestId('parent-access')).toHaveCount(0);

  await onboardWithChild(page, 'Lina');

  await expect(profileCard(page, 'Lina')).toBeVisible();
  await page.screenshot({ path: shot('01-profils.png') });
});

// ==================== 2. Tranche verticale complète ====================

test('tranche verticale complète : jeu, étoiles, stats et export', async ({ page }) => {
  test.slow(); // plusieurs niveaux joués + animations + appui long : plus que les 30 s par défaut.

  await onboardWithChild(page, 'Lina');
  await chooseProfile(page, 'Lina');

  // ---- Carte : ms-suite-01 courant/débloqué, ms-suite-02 verrouillé ----
  await expect(mapNode(page, 'ms-suite-01')).toHaveAttribute('data-status', 'unlocked');
  await expect(mapNode(page, 'ms-suite-01')).toHaveClass(/is-current/);
  await expect(mapNode(page, 'ms-suite-02')).toHaveAttribute('data-status', 'locked');
  await page.screenshot({ path: shot('02-carte.png') });

  // ---- ms-suite-01 parfait : la main du tutoriel doit apparaître avant le premier tap ----
  await openLevel(page, 'ms-suite-01');
  await expect(page.locator('.tutorial-hand')).toBeVisible();
  // Capture pendant la phase « hold » du cycle (voir TutorialHand : trajet 850 ms puis pause posée
  // sur la cible) pour que la capture montre la main sur le bon choix, pas en plein trajet.
  await page.waitForTimeout(1000);
  await page.screenshot({ path: shot('03-manche.png') });
  await playPerfectly(page, 4); // ms-suite-01.json : rounds = 4

  await waitForLevelEndButtons(page);
  await expect(page.getByTestId('next')).toBeVisible();
  await expect(page.getByTestId('level-end')).toHaveAttribute('data-stars', '3');
  // Les boutons de fin apparaissent dès que la dernière étoile est comptée, mais son animation
  // CSS (« pop », 420 ms) démarre au même instant : on la laisse se terminer avant la capture.
  await page.waitForTimeout(500);
  await page.screenshot({ path: shot('05-fin-niveau.png') });
  await page.getByTestId('to-map').click();

  // ---- Retour carte : ms-suite-01 réussi, ms-suite-02 débloqué ----
  await expect(mapNode(page, 'ms-suite-01')).toHaveAttribute('data-status', 'completed');
  await expect(mapNode(page, 'ms-suite-02')).toHaveAttribute('data-status', 'unlocked');

  // ---- ms-suite-02 avec une erreur à la 1re manche puis parfait ----
  await openLevel(page, 'ms-suite-02');
  {
    const round = currentRound(page);
    const answer = await round.getAttribute('data-answer');
    if (!answer) throw new Error('ms-suite-02 : aucune manche affichée.');
    const ids = await round.locator('[data-choice]').evaluateAll((els) => els.map((el) => el.getAttribute('data-choice')));
    const wrongId = ids.find((id): id is string => Boolean(id) && id !== answer);
    if (!wrongId) throw new Error('ms-suite-02 : aucun choix faux disponible pour ce niveau.');
    const wrongChoice = page.locator(`[data-choice="${wrongId}"]`);
    await wrongChoice.click();
    await expect(wrongChoice).toBeDisabled(); // le choix faux se grise, jamais punitif (§9)
    await page.waitForTimeout(250); // laisse la transition CSS d'opacité (150 ms) se terminer
    await page.screenshot({ path: shot('04-erreur.png') });
    await answerCorrectly(page); // puis la bonne réponse
  }
  await playPerfectly(page, 4); // manches 2 à 5, toutes parfaites

  await waitForLevelEndButtons(page);
  await expect(page.getByTestId('level-end')).toHaveAttribute('data-stars', '2'); // 1 manche ratée au 1er coup → 2 étoiles
  await page.getByTestId('to-map').click();

  // ---- Rejouer ms-suite-01, abandonner via quit après 1 manche ----
  await openLevel(page, 'ms-suite-01');
  {
    const round = currentRound(page);
    const answer = await round.getAttribute('data-answer');
    if (!answer) throw new Error('ms-suite-01 (rejeu) : aucune manche affichée.');
    await page.locator(`[data-choice="${answer}"]`).click();
    // La manche est enregistrée dès que la réponse est juste (RecordRound), pas besoin d'attendre
    // les 900 ms d'avance auto — mais on attend que le tap ait bien été pris en compte.
    await expect(round.locator('[data-choice]').first()).toBeDisabled();
  }
  await page.getByTestId('quit').click();
  await expect(mapNode(page, 'ms-suite-01')).toBeVisible();

  // ---- Accès parent : un tap bref n'ouvre rien, l'appui long de 2 s ouvre le code ----
  await backToProfiles(page);
  await page.getByTestId('parent-access').click();
  await expect(page.getByText('Code parent', { exact: true })).toHaveCount(0);
  await expect(page.url()).not.toContain('#/parent');
  await expect(profileCard(page, 'Lina')).toBeVisible();

  await openParentAccess(page);
  await expect(page.getByText('Code parent', { exact: true })).toBeVisible();
  await page.screenshot({ path: shot('07-code-parent.png') });
  await enterPin(page, PARENT_PIN);
  await page.getByRole('button', { name: 'Statistiques' }).click();

  // ---- Statistiques de Lina ----
  const card01 = page.getByTestId('level-stats-ms-suite-01');
  await expect(statValue(card01, 'Essais')).toHaveText('2');
  await expect(statValue(card01, 'Réussites')).toHaveText('1');
  await expect(statValue(card01, 'Abandons')).toHaveText('1');
  await expect(statValue(card01, 'Rejeux')).toHaveText('1');
  await expect(statValue(card01, 'Taux de réussite')).toHaveText('100 %');

  const card02 = page.getByTestId('level-stats-ms-suite-02');
  await expect(statValue(card02, 'Essais')).toHaveText('1');
  await expect(statValue(card02, 'Réussites')).toHaveText('1');
  await expect(statValue(card02, 'Taux de réussite')).toHaveText('80 %'); // 4 manches sur 5 au 1er coup

  await page.screenshot({ path: shot('06-stats.png'), fullPage: true });

  // ---- Export : format, 1 profil, 3 parties, aucun champ pinHash ----
  await page.getByRole('button', { name: '← Tableau de bord' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('export').click();
  const download = await downloadPromise;
  const filePath = await download.path();
  if (!filePath) throw new Error('Export : le téléchargement n’a produit aucun fichier local.');
  const raw = readFileSync(filePath, 'utf-8');
  const bundle = JSON.parse(raw) as ExportBundle;

  expect(bundle.format).toBe(EXPORT_FORMAT);
  expect(bundle.profiles).toHaveLength(1);
  expect(bundle.runs).toHaveLength(3); // ms-suite-01 (réussi) + ms-suite-02 (réussi) + ms-suite-01 (rejeu abandonné)
  expect(raw).not.toContain('pinHash');
});

// ==================== 3. Retour Android pendant une partie ====================

test('le bouton retour Android pendant une partie compte comme abandon', async ({ page }) => {
  await onboardWithChild(page, 'Lina');
  await chooseProfile(page, 'Lina');
  await openLevel(page, 'ms-suite-01');
  await expect(currentRound(page)).toBeVisible();

  await page.goBack();

  await expect(mapNode(page, 'ms-suite-01')).toBeVisible();

  await backToProfiles(page);
  await openChildStats(page, 'Lina');
  const card = page.getByTestId('level-stats-ms-suite-01');
  await expect(statValue(card, 'Essais')).toHaveText('1');
  await expect(statValue(card, 'Réussites')).toHaveText('0');
  await expect(statValue(card, 'Abandons')).toHaveText('1');
});

// ==================== 4. Persistance ====================

test('le profil et les étoiles survivent à un rechargement', async ({ page }) => {
  await onboardWithChild(page, 'Lina');
  await chooseProfile(page, 'Lina');
  await openLevel(page, 'ms-suite-01');
  await playPerfectly(page, 4);
  await waitForLevelEndButtons(page);
  await expect(page.getByTestId('level-end')).toHaveAttribute('data-stars', '3');
  await page.getByTestId('to-map').click();

  await page.reload();

  // Le profil actif n'est pas persisté (état en mémoire) : on revient à l'écran profils, où Lina
  // doit toujours apparaître — c'est la persistance qui compte, pas la route.
  await expect(profileCard(page, 'Lina')).toBeVisible();
  await chooseProfile(page, 'Lina');
  const node = mapNode(page, 'ms-suite-01');
  await expect(node).toHaveAttribute('data-status', 'completed');
  await expect(node.locator('.star-row__star.is-filled')).toHaveCount(3);
});

// ==================== 5. Fermeture pendant une partie ====================

test('une app fermée pendant une partie compte comme abandon au redémarrage', async ({ page }) => {
  await onboardWithChild(page, 'Lina');
  await chooseProfile(page, 'Lina');
  await openLevel(page, 'ms-suite-01');
  await answerCorrectly(page); // joue 1 manche jusqu'au bout

  await page.reload(); // simule l'app tuée pendant la partie (in_progress laissée telle quelle)

  // closeStaleRuns() (appelé au montage de AppShell) doit clore la partie orpheline en "abandoned".
  await expect(profileCard(page, 'Lina')).toBeVisible();
  await openChildStats(page, 'Lina');
  const card = page.getByTestId('level-stats-ms-suite-01');
  await expect(statValue(card, 'Essais')).toHaveText('1');
  await expect(statValue(card, 'Réussites')).toHaveText('0');
  await expect(statValue(card, 'Abandons')).toHaveText('1');
});

// ==================== 6. PWA ====================

test('PWA : manifest valide, service worker actif, fonctionne hors ligne', async ({ page, context }) => {
  test.slow(); // deux rechargements complets + vérifications réseau du manifest et des icônes.

  await onboardWithChild(page, 'Lina');

  // ---- Manifest lié et valide ----
  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
  if (!manifestHref) throw new Error('Aucune balise <link rel="manifest"> dans la page.');
  const manifestUrl = new URL(manifestHref, page.url()).toString();
  const manifestResp = await page.request.get(manifestUrl);
  expect(manifestResp.status()).toBe(200);
  const manifest = (await manifestResp.json()) as {
    name: string;
    display: string;
    icons: Array<{ src: string; sizes: string; purpose?: string }>;
  };
  expect(manifest.name).toBe('Petits Malins');
  expect(manifest.display).toBe('fullscreen');
  const sizes = new Set(manifest.icons.map((i) => i.sizes));
  expect(sizes.has('192x192')).toBe(true);
  expect(sizes.has('512x512')).toBe(true);
  expect(manifest.icons.some((i) => i.purpose === 'maskable')).toBe(true);

  for (const icon of manifest.icons) {
    const iconUrl = new URL(icon.src, manifestUrl).toString();
    const resp = await page.request.get(iconUrl);
    expect(resp.status(), `icône ${icon.src} accessible en HTTP`).toBe(200);
  }

  // ---- Un service worker s'enregistre et contrôle la page après un rechargement ----
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  const controlled = await page.evaluate(() => Boolean(navigator.serviceWorker.controller));
  expect(controlled).toBe(true);
  await expect(profileCard(page, 'Lina')).toBeVisible();

  // ---- Hors ligne : l'app s'affiche toujours (écran profils avec Lina) ----
  await context.setOffline(true);
  try {
    await page.reload();
    await expect(profileCard(page, 'Lina')).toBeVisible();
  } finally {
    await context.setOffline(false);
  }
});
