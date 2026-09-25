// Mécaniques « compter » et « intrus », dispositions de comptage (dé, éparpillé), trou de suite au
// milieu, progression sur la carte à 26 niveaux, tableau de bord parent et mise en page des 26
// niveaux sur deux tailles d'écran (voir docs/ARCHITECTURE.md §3, §5, §7, §9 et docs/PROGRESSION-MS.md).
// Chaque test démarre avec un contexte Playwright neuf, donc un stockage IndexedDB vierge.
// Aides de navigation copiées de vertical-slice.spec.ts (même convention : non partagées entre fichiers).
import { readFileSync } from 'node:fs';
import { test, expect, type Page, type Locator } from '@playwright/test';

const PARENT_PIN = '1234';
const SHOTS_DIR = '/tmp/claude-0/-home-user-educative-app/007564ed-74b0-55f0-83b0-41f952e2f0cb/scratchpad/shots';

function shot(name: string): string {
  return `${SHOTS_DIR}/${name}`;
}

// ---------- Contenu lu depuis content/ (fs), jamais codé en dur : la carte a 26 niveaux ----------

interface TrackJson {
  levels: string[];
}

function readContentJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(relativePath, 'utf-8')) as T;
}

const TRACK = readContentJson<TrackJson>('content/tracks/ms.json');

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
async function onboardWithChild(
  page: Page,
  name: string,
  opts: { sessionMinutes?: string; dailyMinutes?: string } = {},
): Promise<void> {
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
  if (opts.sessionMinutes !== undefined) {
    await page.locator('select[name=sessionMinutes]').selectOption(opts.sessionMinutes);
  }
  if (opts.dailyMinutes !== undefined) {
    await page.locator('select[name=dailyMinutes]').selectOption(opts.dailyMinutes);
  }
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

/** Appui long de 2 s sur le cadenas (durationMs configuré à 2000 dans ProfilePicker/LockScreen). */
async function openParentAccess(page: Page): Promise<void> {
  await longPress(page, page.getByTestId('parent-access'), 2100);
}

function currentRound(page: Page): Locator {
  return page.locator('.play-round[data-answer]');
}

async function currentRoundIndex(page: Page): Promise<number | null> {
  const classes = await page.locator('.play-progress__dot').evaluateAll((els) => els.map((el) => el.className));
  const index = classes.findIndex((c) => c.includes('is-current'));
  return index === -1 ? null : index;
}

/**
 * color-mix (« le laboratoire des couleurs ») n'a pas de choix direct portant l'id de la réponse :
 * `data-choice` désigne une fiole (red/yellow/blue), la réponse est la couleur RÉSULTANTE du mélange
 * (voir ColorMixView, contrat MechanicDefinition.solvedDelayMs). La recette (deux fioles à verser) est
 * exposée en attribut `data-mix-recipe` sur `.cmx-view`, invisible pour l'enfant.
 */
async function pourColorMix(page: Page): Promise<void> {
  const recipe = await page.locator('.cmx-view').getAttribute('data-mix-recipe');
  if (!recipe) throw new Error('color-mix : data-mix-recipe introuvable.');
  const [first, second] = recipe.split(',');
  await page.locator(`[data-choice="${first}"]`).click();
  await page.locator(`[data-choice="${second}"]`).click();
}

/** Répond juste à la manche affichée et attend la transition (manche suivante ou fin de niveau). */
async function answerCorrectly(page: Page): Promise<void> {
  const round = currentRound(page);
  const answer = await round.getAttribute('data-answer');
  if (!answer) throw new Error('Aucune manche affichée (data-answer introuvable).');
  const indexBefore = await currentRoundIndex(page);
  const isColorMix = (await page.locator('.cmx-view').count()) > 0;
  if (isColorMix) {
    await pourColorMix(page);
  } else {
    await page.locator(`[data-choice="${answer}"]`).click();
  }
  await expect
    .poll(
      async () => {
        if (await page.getByTestId('level-end').isVisible()) return 'end';
        return currentRoundIndex(page);
      },
      { timeout: isColorMix ? 8000 : 5000 },
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

/** Depuis l'écran profils (cadenas visible) : ouvre l'espace parent puis les statistiques de l'enfant. */
async function openChildStats(page: Page, childName: string): Promise<void> {
  await openParentAccess(page);
  await expect(page.getByText('Code parent', { exact: true })).toBeVisible();
  await enterPin(page, PARENT_PIN);
  await expect(page.getByRole('heading', { name: 'Espace parent' })).toBeVisible();
  await page.getByRole('button', { name: 'Statistiques' }).click();
  await expect(page.getByRole('heading', { name: childName })).toBeVisible();
}

/**
 * Débloque un niveau précis depuis l'espace parent (override « Débloqué », ARCHITECTURE.md §8), quelle
 * que soit sa position sur la carte. Part de l'écran profils (cadenas visible) et y revient.
 */
async function unlockLevel(page: Page, childName: string, levelId: string): Promise<void> {
  await openChildStats(page, childName);
  await page.getByTestId(`override-${levelId}-unlocked`).click();
  await expect(page.getByTestId(`override-${levelId}-unlocked`)).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '← Tableau de bord' }).click();
  await page.getByTestId('back-to-game').click();
  await expect(page.getByText('Commencer : espace parent')).toHaveCount(0);
}

/**
 * Ouvre un niveau directement par son hash, sans passer par la carte. Le profil actif vit en mémoire
 * (jamais persisté, voir ARCHITECTURE.md §6) : un simple changement de hash le conserve, alors qu'un
 * `page.goto()` rechargerait le document et le perdrait.
 */
async function openLevelHash(page: Page, levelId: string): Promise<void> {
  await page.evaluate((id) => {
    window.location.hash = `#/play/${encodeURIComponent(id)}`;
  }, levelId);
  // En passant d'un niveau à l'autre, l'ancienne manche reste un instant à l'écran : attendre
  // que l'URL soit prise en compte puis que les choix du nouveau niveau soient rendus.
  await expect(page).toHaveURL(new RegExp(`#/play/${levelId}$`));
  await expect(page.locator('.screen--loading')).toHaveCount(0);
  await expect(currentRound(page)).toBeVisible();
  await expect(page.locator('[data-choice]').first()).toBeVisible();
}

async function gotoMap(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.location.hash = '#/map';
  });
  await expect(page.locator('.screen--map')).toBeVisible();
}

/**
 * ms-compte-01 tire 1 à 3 objets par manche (créés avec une graine = Date.now(), non maîtrisable
 * depuis le test) : pour démontrer le marquage de l'aide au comptage il en faut au moins deux. On
 * rejoue (aller-retour par la carte, qui régénère une manche avec une graine différente) plutôt que
 * de dépendre d'un tirage précis.
 */
async function openLevelWithAtLeastObjects(page: Page, levelId: string, minObjects: number): Promise<void> {
  const MAX_ATTEMPTS = 15;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    await openLevelHash(page, levelId);
    if ((await page.locator('.cnt-object').count()) >= minObjects) return;
    await gotoMap(page);
  }
  throw new Error(`${levelId} : impossible d'obtenir une manche avec au moins ${minObjects} objets après ${MAX_ATTEMPTS} essais.`);
}

/**
 * Sur la manche affichée : aucun défilement horizontal, et chaque choix (`[data-choice]`) visible
 * fait au moins 72 × 72 px et tient entièrement dans l'écran, sans qu'il faille défiler pour
 * l'atteindre (§9 : cibles tactiles ≥ 72 px pour les choix de jeu).
 */
async function assertRoundFitsScreen(page: Page): Promise<void> {
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
  }));
  expect(
    metrics.scrollWidth,
    `défilement horizontal : scrollWidth ${metrics.scrollWidth}px > innerWidth ${metrics.innerWidth}px`,
  ).toBeLessThanOrEqual(metrics.innerWidth);

  const choices = page.locator('[data-choice]');
  const count = await choices.count();
  expect(count, 'aucun [data-choice] trouvé sur cette manche').toBeGreaterThan(0);
  for (let i = 0; i < count; i += 1) {
    const choice = choices.nth(i);
    if (!(await choice.isVisible())) continue;
    const box = await choice.boundingBox();
    if (!box) continue;
    expect(box.width, `choix ${i} : largeur ${box.width}px < 72px`).toBeGreaterThanOrEqual(72);
    expect(box.height, `choix ${i} : hauteur ${box.height}px < 72px`).toBeGreaterThanOrEqual(72);
    expect(box.y, `choix ${i} : dépasse en haut de l'écran (y=${box.y})`).toBeGreaterThanOrEqual(0);
    expect(box.x, `choix ${i} : dépasse à gauche de l'écran (x=${box.x})`).toBeGreaterThanOrEqual(0);
    expect(
      box.y + box.height,
      `choix ${i} : dépasse en bas de l'écran (y+h=${box.y + box.height}px > ${metrics.innerHeight}px, défilement vertical nécessaire)`,
    ).toBeLessThanOrEqual(metrics.innerHeight);
    expect(box.x + box.width, `choix ${i} : dépasse à droite de l'écran`).toBeLessThanOrEqual(metrics.innerWidth);
  }
}

// ==================== 1. Compter : ms-compte-01, aide au comptage ====================

test('ms-compte-01 parfait : main du tutoriel, aide au comptage sans effet sur le score, 3 étoiles', async ({ page }) => {
  test.slow();
  await onboardWithChild(page, 'Nino', { sessionMinutes: '', dailyMinutes: '' });
  await unlockLevel(page, 'Nino', 'ms-compte-01');
  await chooseProfile(page, 'Nino');
  await openLevelWithAtLeastObjects(page, 'ms-compte-01', 2);

  // La main du tutoriel doit apparaître avant le tout premier tap de l'enfant.
  await expect(page.locator('.tutorial-hand')).toBeVisible();

  // Aide au comptage (correspondance terme à terme) : taper deux objets les marque, re-taper l'un
  // d'eux le démarque ; aucun effet sur le score (seul un tap sur un [data-choice] compte pour la
  // manche, voir CountView.tsx : toggleMark n'appelle jamais onChoose).
  const helpObjects = page.locator('.cnt-object');
  await helpObjects.nth(0).click();
  await helpObjects.nth(1).click();
  await expect(helpObjects.nth(0)).toHaveClass(/cnt-object--marked/);
  await expect(helpObjects.nth(1)).toHaveClass(/cnt-object--marked/);
  await page.waitForTimeout(400); // laisse l'animation de marquage (360 ms) se terminer avant la capture
  await page.screenshot({ path: shot('10-compte-ligne.png') });

  await helpObjects.nth(0).click(); // re-taper démarque
  await expect(helpObjects.nth(0)).not.toHaveClass(/cnt-object--marked/);
  await expect(helpObjects.nth(1)).toHaveClass(/cnt-object--marked/);

  await answerCorrectly(page); // manche 1 malgré le marquage : toujours réussie du premier coup
  await playPerfectly(page, 3); // manches 2 à 4 (ms-compte-01.json : rounds = 4)

  await waitForLevelEndButtons(page);
  await expect(page.getByTestId('level-end')).toHaveAttribute('data-stars', '3');
});

// ==================== 2. Intrus : ms-intrus-01 parfait, ms-intrus-04 avec une erreur ====================

test('ms-intrus-01 parfait (3 étoiles) puis ms-intrus-04 (catégories) avec une erreur (2 étoiles)', async ({ page }) => {
  test.slow();
  await onboardWithChild(page, 'Timéo', { sessionMinutes: '', dailyMinutes: '' });

  await unlockLevel(page, 'Timéo', 'ms-intrus-01');
  await chooseProfile(page, 'Timéo');
  await openLevelHash(page, 'ms-intrus-01');
  await expect(page.locator('.tutorial-hand')).toBeVisible();
  await page.waitForTimeout(300);
  await page.screenshot({ path: shot('13-intrus-couleur.png') });
  await playPerfectly(page, 4); // ms-intrus-01.json : rounds = 4, tutoriel
  await waitForLevelEndButtons(page);
  await expect(page.getByTestId('level-end')).toHaveAttribute('data-stars', '3');
  await page.getByTestId('to-map').click();

  await backToProfiles(page);
  await unlockLevel(page, 'Timéo', 'ms-intrus-04');
  await chooseProfile(page, 'Timéo');
  await openLevelHash(page, 'ms-intrus-04');
  await page.waitForTimeout(150);
  await page.screenshot({ path: shot('14-intrus-categorie.png') });

  // Une erreur à la 1re manche puis parfait sur les suivantes (5 manches, 1 ratée → 2 étoiles).
  const round = currentRound(page);
  const answer = await round.getAttribute('data-answer');
  if (!answer) throw new Error('ms-intrus-04 : aucune manche affichée.');
  const ids = await round.locator('[data-choice]').evaluateAll((els) => els.map((el) => el.getAttribute('data-choice')));
  const wrongId = ids.find((id): id is string => Boolean(id) && id !== answer);
  if (!wrongId) throw new Error('ms-intrus-04 : aucun choix faux disponible pour ce niveau.');
  const wrongChoice = page.locator(`[data-choice="${wrongId}"]`);
  await wrongChoice.click();
  await expect(wrongChoice).toBeDisabled(); // le choix faux se grise, jamais punitif (§9)
  await answerCorrectly(page); // puis la bonne réponse
  await playPerfectly(page, 4); // manches 2 à 5

  await waitForLevelEndButtons(page);
  await expect(page.getByTestId('level-end')).toHaveAttribute('data-stars', '2');
});

// ==================== 3. Dispositions : dé (ms-compte-03) et éparpillé (ms-compte-04) ====================

test('dispositions : ms-compte-03 (dé) et ms-compte-04 (éparpillé) se jouent jusqu\'au bout', async ({ page }) => {
  test.slow();
  await onboardWithChild(page, 'Alba', { sessionMinutes: '', dailyMinutes: '' });

  await unlockLevel(page, 'Alba', 'ms-compte-03');
  await chooseProfile(page, 'Alba');
  await openLevelHash(page, 'ms-compte-03');
  await expect(page.locator('.cnt-frame--dice')).toBeVisible();
  await page.screenshot({ path: shot('11-compte-de.png') });
  await playPerfectly(page, 5); // ms-compte-03.json : rounds = 5
  await waitForLevelEndButtons(page);
  await expect(page.getByTestId('level-end')).toHaveAttribute('data-stars', '3');
  await page.getByTestId('to-map').click();

  await backToProfiles(page);
  await unlockLevel(page, 'Alba', 'ms-compte-04');
  await chooseProfile(page, 'Alba');
  await openLevelHash(page, 'ms-compte-04');
  await page.screenshot({ path: shot('12-compte-eparpille.png') });
  await playPerfectly(page, 5); // ms-compte-04.json : rounds = 5
  await waitForLevelEndButtons(page);
  await expect(page.getByTestId('level-end')).toHaveAttribute('data-stars', '3');
});

// ==================== 4. Suite : trou au milieu (ms-suite-07) ====================

test('ms-suite-07 : trou au milieu d\'une suite AB', async ({ page }) => {
  test.slow();
  await onboardWithChild(page, 'Iris', { sessionMinutes: '', dailyMinutes: '' });
  await unlockLevel(page, 'Iris', 'ms-suite-07');
  await chooseProfile(page, 'Iris');
  await openLevelHash(page, 'ms-suite-07');

  await expect(page.locator('.seq-cell--blank')).toHaveCount(1);
  const cells = page.locator('.seq-cell');
  const total = await cells.count();
  const blankIndex = await cells.evaluateAll((els) => els.findIndex((el) => el.classList.contains('seq-cell--blank')));
  expect(blankIndex, 'le trou doit être au milieu, pas tout au début').toBeGreaterThan(0);
  expect(blankIndex, 'le trou doit être au milieu, pas tout à la fin').toBeLessThan(total - 1);

  await page.waitForTimeout(300); // laisse la pulsation (seq-pulse) démarrer proprement pour la capture
  await page.screenshot({ path: shot('15-suite-trou-milieu.png') });

  await playPerfectly(page, 5); // ms-suite-07.json : rounds = 5
  await waitForLevelEndButtons(page);
  await expect(page.getByTestId('level-end')).toHaveAttribute('data-stars', '3');
});

// ==================== 5. Progression sur la carte + tableau de bord (captures pleine page) ====================

test('progression sur la carte à 26 niveaux et tableau de bord parent', async ({ page }) => {
  test.slow();
  await onboardWithChild(page, 'Yanis', { sessionMinutes: '', dailyMinutes: '' });
  await chooseProfile(page, 'Yanis');

  // Réussit les 3 premiers niveaux dans l'ordre (une mécanique de chacune) : la carte montre une
  // vraie progression avant la capture ("quelques niveaux réussis").
  await openLevel(page, 'ms-suite-01');
  await playPerfectly(page, 4); // ms-suite-01.json : rounds = 4
  await waitForLevelEndButtons(page);
  await page.getByTestId('to-map').click();

  await openLevel(page, 'ms-compte-01');
  await playPerfectly(page, 4); // ms-compte-01.json : rounds = 4
  await waitForLevelEndButtons(page);
  await page.getByTestId('to-map').click();

  await openLevel(page, 'ms-intrus-01');
  await playPerfectly(page, 4); // ms-intrus-01.json : rounds = 4
  await waitForLevelEndButtons(page);
  await page.getByTestId('to-map').click();

  const defaultViewport = page.viewportSize();
  if (!defaultViewport) throw new Error('Taille de viewport indisponible.');
  const lastLevelId = TRACK.levels[TRACK.levels.length - 1];
  if (!lastLevelId) throw new Error('content/tracks/ms.json : parcours vide.');

  // La carte défile dans un conteneur interne (.map-scroll), pas dans le document : on agrandit
  // temporairement le viewport pour que la capture "pleine page" montre les 26 niveaux sans coupe.
  await page.setViewportSize({ width: defaultViewport.width, height: 3600 });
  await expect(mapNode(page, lastLevelId)).toBeVisible(); // le dernier niveau de la carte est bien rendu
  await page.screenshot({ path: shot('17-carte-20-niveaux.png'), fullPage: true });
  await page.setViewportSize(defaultViewport);

  await backToProfiles(page);
  await openParentAccess(page);
  await expect(page.getByText('Code parent', { exact: true })).toBeVisible();
  await enterPin(page, PARENT_PIN);
  await expect(page.getByRole('heading', { name: 'Espace parent' })).toBeVisible();
  await page.screenshot({ path: shot('18-parent-tableau-de-bord.png'), fullPage: true });
});

// ==================== 6. Écran de fin (minuteur atteint) ====================

test('écran de fin (minuteur de session atteint) : visuel de nuit', async ({ page }) => {
  test.slow();
  await page.clock.install(); // avant page.goto('/') : voir session.spec.ts pour l'explication complète
  await onboardWithChild(page, 'Suzon'); // limites par défaut (session 15 min) : on veut justement l'atteindre
  await chooseProfile(page, 'Suzon');
  await expect(mapNode(page, 'ms-suite-01')).toBeVisible();

  await page.clock.runFor('15:05'); // dépasse les 15 min de session par défaut
  await expect(page.getByTestId('lock-parent')).toBeVisible();
  await page.waitForTimeout(200);
  await page.screenshot({ path: shot('16-ecran-de-fin.png') });
});

// ==================== 7. Mise en page des 26 niveaux (test paramétré, standard + petit téléphone) ====================

test('mise en page : les 26 niveaux tiennent à l\'écran, en standard et sur petit téléphone (360×640)', async ({ page }) => {
  test.setTimeout(180_000); // 26 niveaux × 2 tailles d'écran : plus que les 30 s (même triplées) par défaut.
  await onboardWithChild(page, 'Zoé', { sessionMinutes: '', dailyMinutes: '' });

  // Débloque tous les niveaux d'un coup depuis les statistiques de l'enfant : plus rapide et tout
  // aussi valide que de rejouer les 26 niveaux dans l'ordre pour un test purement visuel.
  await openChildStats(page, 'Zoé');
  for (const levelId of TRACK.levels) {
    await page.getByTestId(`override-${levelId}-unlocked`).click();
    await expect(page.getByTestId(`override-${levelId}-unlocked`)).toHaveAttribute('aria-pressed', 'true');
  }
  await page.getByRole('button', { name: '← Tableau de bord' }).click();
  await page.getByTestId('back-to-game').click();
  await chooseProfile(page, 'Zoé');

  const defaultViewport = page.viewportSize();
  if (!defaultViewport) throw new Error('Taille de viewport indisponible.');

  for (const levelId of TRACK.levels) {
    await test.step(`niveau ${levelId}`, async () => {
      await openLevelHash(page, levelId);
      await assertRoundFitsScreen(page);

      await page.setViewportSize({ width: 360, height: 640 });
      if (levelId === 'ms-intrus-06') {
        await page.screenshot({ path: shot('19-petit-ecran-intrus-06.png') });
      }
      await assertRoundFitsScreen(page);
      await page.setViewportSize(defaultViewport);
    });
  }
});

// ==================== 8. Color-mix : le laboratoire des couleurs (mélange faux puis juste) ====================

test('ms-couleurs-01 : un mélange faux (pas puni) puis le bon fait avancer la manche', async ({ page }) => {
  test.slow();
  await onboardWithChild(page, 'Nolan', { sessionMinutes: '', dailyMinutes: '' });
  await unlockLevel(page, 'Nolan', 'ms-couleurs-01');
  await chooseProfile(page, 'Nolan');
  await openLevelHash(page, 'ms-couleurs-01');

  // La main du tutoriel doit apparaître avant le tout premier tap (et mimer les deux versements).
  await expect(page.locator('.tutorial-hand')).toBeVisible();
  await page.waitForTimeout(300);
  await page.screenshot({ path: shot('20-couleurs-labo.png') });

  const indexBefore = await currentRoundIndex(page);

  // Mélange faux : rouge + rouge redonne toujours du rouge, jamais orange/vert/violet (les cibles de
  // ce niveau) — un vrai mélange quand même (objet révélé), jamais une punition (ARCHITECTURE.md §9).
  await page.locator('[data-choice="red"]').click();
  await page.locator('[data-choice="red"]').click();
  // Bulles (1 s) + objet révélé (1,5 s) + chaudron qui se vide tout seul (0,7 s) avant de pouvoir réessayer.
  await page.waitForTimeout(3600);
  expect(await currentRoundIndex(page)).toBe(indexBefore); // toujours la même manche, cible inchangée

  await answerCorrectly(page); // le bon mélange, cette fois : la manche avance
  await playPerfectly(page, 3); // manches 2 à 4 (ms-couleurs-01.json : rounds = 4)

  await waitForLevelEndButtons(page);
  await expect(page.getByTestId('level-end')).toHaveAttribute('data-stars', '2'); // 1 raté au 1er coup
});
