// Parcours CE1 : création d'un enfant sur le parcours CE1, une manche de chaque mécanique jusqu'aux
// étoiles (calc en mode choix, calc au pavé, compare, spelling pick, spelling lettres manquantes), un mauvais
// numéro au pavé qui n'avance pas la manche, et absence de défilement horizontal (voir
// docs/ARCHITECTURE.md §8-9, src/mechanics/**). Aides de navigation copiées de parent.spec.ts /
// mechanics.spec.ts (même convention : non partagées entre fichiers).
import { test, expect, type Page, type Locator } from '@playwright/test';

const PARENT_PIN = '1234';
const SHOTS_DIR = 'test-results';

function shot(name: string): string {
  return `${SHOTS_DIR}/${name}`;
}

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

// ---------- Aides de navigation ----------

async function enterPin(page: Page, pin: string): Promise<void> {
  for (const digit of pin) {
    await page.getByTestId(`pin-key-${digit}`).click();
  }
}

/** Premier lancement : code parent 1234, puis un enfant sur le parcours CE1. Termine sur le tableau de bord. */
async function onboardWithCe1Child(page: Page, name: string): Promise<void> {
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
  await page.locator('.pa-track-option', { hasText: 'CE1' }).click();
  await expect(page.locator('.pa-track-option', { hasText: 'CE1' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('save-child').click();
  await expect(page.getByRole('heading', { name: 'Espace parent' })).toBeVisible();
}

function mapNode(page: Page, levelId: string): Locator {
  return page.locator(`[data-level="${levelId}"]`);
}

function profileCard(page: Page, name: string): Locator {
  return page.getByRole('button', { name: new RegExp(name) });
}

async function chooseProfile(page: Page, name: string): Promise<void> {
  await profileCard(page, name).click();
}

async function longPress(page: Page, locator: Locator, ms: number): Promise<void> {
  const box = await locator.boundingBox();
  if (!box) throw new Error('Élément introuvable pour simuler un appui long.');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  await page.mouse.up();
}

/** Depuis l'écran profils (cadenas visible) : ouvre l'espace parent puis les statistiques de l'enfant. */
async function openChildStats(page: Page, childName: string): Promise<void> {
  await longPress(page, page.getByTestId('parent-access'), 2100);
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
 * (jamais persisté) : un simple changement de hash le conserve, alors qu'un `page.goto()` rechargerait
 * le document et le perdrait.
 */
async function openLevelHash(page: Page, levelId: string): Promise<void> {
  await page.evaluate((id) => {
    window.location.hash = `#/play/${encodeURIComponent(id)}`;
  }, levelId);
  await expect(page).toHaveURL(new RegExp(`#/play/${levelId}$`));
  await expect(page.locator('.screen--loading')).toHaveCount(0);
  await expect(currentRound(page)).toBeVisible();
  await expect(page.locator('[data-choice]').first()).toBeVisible();
}

function currentRound(page: Page): Locator {
  return page.locator('.play-round[data-answer]');
}

async function currentRoundIndex(page: Page): Promise<number | null> {
  const classes = await page.locator('.play-progress__dot').evaluateAll((els) => els.map((el) => el.className));
  const index = classes.findIndex((c) => c.includes('is-current'));
  return index === -1 ? null : index;
}

/** Attend soit l'écran de fin de niveau, soit le passage à la manche suivante. */
async function waitForRoundAdvance(page: Page, indexBefore: number | null): Promise<void> {
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

/** calc / compare / spelling-pick : un choix direct porte l'id de la réponse. */
async function answerByDirectChoice(page: Page): Promise<void> {
  const round = currentRound(page);
  const answer = await round.getAttribute('data-answer');
  if (!answer) throw new Error('Aucune manche affichée (data-answer introuvable).');
  const indexBefore = await currentRoundIndex(page);
  await page.locator(`[data-choice="${answer}"]`).click();
  await waitForRoundAdvance(page, indexBefore);
}

/** calc au pavé : tape chaque chiffre de `number` puis « key-ok ». N'attend pas la transition. */
async function typeKeypadNumber(page: Page, number: string): Promise<void> {
  for (const digit of number) {
    await page.locator(`[data-choice="key-${digit}"]`).click();
  }
  await page.locator('[data-choice="key-ok"]').click();
}

/** calc au pavé : tape la bonne réponse et attend la transition (manche suivante ou fin de niveau). */
async function answerKeypadCorrectly(page: Page): Promise<void> {
  const round = currentRound(page);
  const answer = await round.getAttribute('data-answer');
  if (!answer) throw new Error('Aucune manche affichée (data-answer introuvable).');
  const indexBefore = await currentRoundIndex(page);
  await typeKeypadNumber(page, answer);
  await waitForRoundAdvance(page, indexBefore);
}

async function waitForLevelEndButtons(page: Page): Promise<void> {
  await page.getByTestId('replay').waitFor({ state: 'visible' });
  await page.getByTestId('to-map').waitFor({ state: 'visible' });
}

/**
 * Sur la manche affichée : aucun défilement horizontal (§9).
 */
async function assertNoHorizontalOverflow(page: Page): Promise<void> {
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(
    metrics.scrollWidth,
    `défilement horizontal : scrollWidth ${metrics.scrollWidth}px > innerWidth ${metrics.innerWidth}px`,
  ).toBeLessThanOrEqual(metrics.innerWidth);
}

// ==================== 1. Création d'un enfant CE1 : la carte démarre sur ce1-add-01 ====================

test('créer un enfant sur le parcours CE1 : la carte démarre sur ce1-add-01', async ({ page }) => {
  await onboardWithCe1Child(page, 'Timéo');
  await page.getByTestId('back-to-game').click();
  await chooseProfile(page, 'Timéo');
  await expect(mapNode(page, 'ce1-add-01')).toHaveAttribute('data-status', 'unlocked');
});

// ==================== 2. Une manche de chaque mécanique CE1, jusqu'aux étoiles ====================

test('ce1-add-01 (calc, choix) : une manche jusqu’aux étoiles, sans défilement horizontal', async ({ page }) => {
  await onboardWithCe1Child(page, 'Yuna');
  await page.getByTestId('back-to-game').click();
  await chooseProfile(page, 'Yuna');
  await openLevelHash(page, 'ce1-add-01');

  await expect(page.locator('.calc-choices')).toBeVisible();
  await assertNoHorizontalOverflow(page);
  await page.screenshot({ path: shot('ce1-calc-choix.png') });

  for (let i = 0; i < 5; i += 1) {
    await answerByDirectChoice(page);
  }
  await waitForLevelEndButtons(page);
  await expect(page.getByTestId('level-end')).toHaveAttribute('data-stars', '3');
});

test('ce1-add-03 (calc, pavé) : une manche jusqu’aux étoiles, sans défilement horizontal', async ({ page }) => {
  await onboardWithCe1Child(page, 'Noa');
  await page.getByTestId('back-to-game').click();
  await chooseProfile(page, 'Noa');
  await unlockLevel(page, 'Noa', 'ce1-add-03');
  await chooseProfile(page, 'Noa');
  await openLevelHash(page, 'ce1-add-03');

  await expect(page.locator('.calc-keypad')).toBeVisible();
  await assertNoHorizontalOverflow(page);
  await page.screenshot({ path: shot('ce1-calc-pave.png') });

  for (let i = 0; i < 6; i += 1) {
    await answerKeypadCorrectly(page);
  }
  await waitForLevelEndButtons(page);
  await expect(page.getByTestId('level-end')).toHaveAttribute('data-stars', '3');
});

test('ce1-compare-01 (compare) : une manche jusqu’aux étoiles, sans défilement horizontal', async ({ page }) => {
  await onboardWithCe1Child(page, 'Lina');
  await page.getByTestId('back-to-game').click();
  await chooseProfile(page, 'Lina');
  await unlockLevel(page, 'Lina', 'ce1-compare-01');
  await chooseProfile(page, 'Lina');
  await openLevelHash(page, 'ce1-compare-01');

  await expect(page.locator('.cmp-view')).toBeVisible();
  await assertNoHorizontalOverflow(page);
  await page.screenshot({ path: shot('ce1-compare.png') });

  for (let i = 0; i < 5; i += 1) {
    await answerByDirectChoice(page);
  }
  await waitForLevelEndButtons(page);
  await expect(page.getByTestId('level-end')).toHaveAttribute('data-stars', '3');
});

test('ce1-mots-01 (spelling, pick) : une manche jusqu’aux étoiles, sans défilement horizontal', async ({ page }) => {
  await onboardWithCe1Child(page, 'Zoé');
  await page.getByTestId('back-to-game').click();
  await chooseProfile(page, 'Zoé');
  await unlockLevel(page, 'Zoé', 'ce1-mots-01');
  await chooseProfile(page, 'Zoé');
  await openLevelHash(page, 'ce1-mots-01');

  await expect(page.locator('.spl-choices')).toBeVisible();
  await assertNoHorizontalOverflow(page);
  await page.screenshot({ path: shot('ce1-spelling-pick.png') });

  for (let i = 0; i < 5; i += 1) {
    await answerByDirectChoice(page);
  }
  await waitForLevelEndButtons(page);
  await expect(page.getByTestId('level-end')).toHaveAttribute('data-stars', '3');
});

test('ce1-mots-02 (spelling, lettres manquantes) : une manche jusqu’aux étoiles, sans défilement horizontal', async ({ page }) => {
  await onboardWithCe1Child(page, 'Noé');
  await page.getByTestId('back-to-game').click();
  await chooseProfile(page, 'Noé');
  await unlockLevel(page, 'Noé', 'ce1-mots-02');
  await chooseProfile(page, 'Noé');
  await openLevelHash(page, 'ce1-mots-02');

  await expect(page.locator('.spl-gap-hole')).toBeVisible();
  await assertNoHorizontalOverflow(page);
  await page.screenshot({ path: shot('ce1-spelling-gap.png') });

  for (let i = 0; i < 5; i += 1) {
    await answerByDirectChoice(page);
  }
  await waitForLevelEndButtons(page);
  await expect(page.getByTestId('level-end')).toHaveAttribute('data-stars', '3');
});

test('ce1-lire-01 (Lis et montre) : les images arrivent après le texte, une manche jusqu’aux étoiles', async ({ page }) => {
  await onboardWithCe1Child(page, 'Léa');
  await page.getByTestId('back-to-game').click();
  await chooseProfile(page, 'Léa');
  await unlockLevel(page, 'Léa', 'ce1-lire-01');
  await chooseProfile(page, 'Léa');
  await openLevelHash(page, 'ce1-lire-01');

  await expect(page.locator('.rd-text')).toBeVisible();
  await expect(page.locator('[data-choice]').first()).toBeDisabled(); // on lit d'abord la phrase
  await expect(page.locator('[data-choice]').first()).toBeEnabled();
  await assertNoHorizontalOverflow(page);
  await page.screenshot({ path: shot('ce1-read.png') });

  for (let i = 0; i < 5; i += 1) {
    await answerByDirectChoice(page);
  }
  await waitForLevelEndButtons(page);
  await expect(page.getByTestId('level-end')).toHaveAttribute('data-stars', '3');
});

test('ce1-lire-07 (Lis et montre, 2 phrases) : 4 images lisibles, sans défilement sur petit téléphone', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await onboardWithCe1Child(page, 'Lou');
  await page.getByTestId('back-to-game').click();
  await chooseProfile(page, 'Lou');
  await unlockLevel(page, 'Lou', 'ce1-lire-07');
  await chooseProfile(page, 'Lou');
  await openLevelHash(page, 'ce1-lire-07');

  await expect(page.locator('[data-choice]')).toHaveCount(4);
  await expect(page.locator('[data-choice]').first()).toBeEnabled();
  await assertNoHorizontalOverflow(page);
  for (const box of await page.locator('[data-choice]').evaluateAll((els) => els.map((el) => el.getBoundingClientRect().bottom))) {
    expect(box, 'une image dépasse en bas de l’écran').toBeLessThanOrEqual(640);
  }
  await page.screenshot({ path: shot('ce1-read-2-phrases.png') });

  for (let i = 0; i < 8; i += 1) {
    await answerByDirectChoice(page);
  }
  await waitForLevelEndButtons(page);
  await expect(page.getByTestId('level-end')).toHaveAttribute('data-stars', '3');
});

// ==================== 3. Pavé : une erreur n'avance pas la manche, la bonne réponse passe ====================

test('ce1-add-03 (pavé) : un mauvais nombre validé ne fait pas avancer la manche, la bonne réponse passe', async ({ page }) => {
  await onboardWithCe1Child(page, 'Léo');
  await page.getByTestId('back-to-game').click();
  await chooseProfile(page, 'Léo');
  await unlockLevel(page, 'Léo', 'ce1-add-03');
  await chooseProfile(page, 'Léo');
  await openLevelHash(page, 'ce1-add-03');

  const round = currentRound(page);
  const answer = await round.getAttribute('data-answer');
  if (!answer) throw new Error('Aucune manche affichée (data-answer introuvable).');
  const correct = Number(answer);
  // Un nombre forcément différent de la bonne réponse (décalage de +1, jamais négatif ni nul ici).
  const wrong = String(correct + 1);
  const indexBefore = await currentRoundIndex(page);

  await typeKeypadNumber(page, wrong);
  // Laisse le temps à une éventuelle (mauvaise) transition de se produire, puis vérifie qu'on est
  // toujours sur la même manche.
  await page.waitForTimeout(600);
  await expect(page.getByTestId('level-end')).toHaveCount(0);
  expect(await currentRoundIndex(page)).toBe(indexBefore);

  // La bonne réponse, elle, fait avancer.
  await typeKeypadNumber(page, answer);
  await waitForRoundAdvance(page, indexBefore);
});
