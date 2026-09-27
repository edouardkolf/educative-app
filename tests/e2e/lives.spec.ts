// Vies (docs/ARCHITECTURE.md §9) : une vie perdue par manche ratée du premier coup ; à 0 vie, écran
// d'échec (😢) avec rejouer / carte, sans relance automatique ; le niveau suivant reste verrouillé.
// Aides et sélecteurs repris de session.spec.ts (non exportés de ce fichier).
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

// ---------- Aides reprises de vertical-slice.spec.ts ----------

async function enterPin(page: Page, pin: string): Promise<void> {
  for (const digit of pin) {
    await page.getByTestId(`pin-key-${digit}`).click();
  }
}

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

function currentRound(page: Page): Locator {
  return page.locator('.play-round[data-answer]');
}

/** Tape un choix faux de la manche en cours (ms-suite-01 : 2 choix, donc le seul faux). */
async function tapWrong(page: Page): Promise<void> {
  const answer = await currentRound(page).getAttribute('data-answer');
  await page.locator(`.play-round [data-choice]:not([data-choice="${answer}"])`).first().click();
}

async function tapAnswer(page: Page): Promise<void> {
  const answer = await currentRound(page).getAttribute('data-answer');
  await page.locator(`.play-round [data-choice="${answer}"]`).click();
}

/** ms-suite-01 (2 choix, 4 manches → 2 vies) : rate la 1re manche puis la 2e, jusqu'à l'écran d'échec. */
async function loseAllLives(page: Page): Promise<void> {
  const lives = page.getByTestId('lives');
  await expect(lives).toHaveAttribute('data-lives', '2');
  await tapWrong(page);
  await expect(lives).toHaveAttribute('data-lives', '1');
  await tapAnswer(page);
  await expect(page.locator('.play-progress__dot.is-done')).toHaveCount(1);
  await tapWrong(page);
  await expect(lives).toHaveAttribute('data-lives', '0');
  await expect(page.getByTestId('level-failed')).toBeVisible();
}

test('plus de vies : écran triste, rejouer relance avec toutes les vies, la carte garde le niveau suivant verrouillé', async ({
  page,
}) => {
  await onboardWithChild(page, 'Lina');
  await chooseProfile(page, 'Lina');
  await openLevel(page, 'ms-suite-01');
  await expect(currentRound(page)).toBeVisible();

  await loseAllLives(page);
  // L'émoji est rendu en image (SVG Noto embarqué, cf. src/ui/Emoji.tsx) : on vérifie le marqueur
  // data-emoji plutôt que le texte, désormais vide (décoratif).
  await expect(page.getByTestId('level-failed').locator('.level-failed__face')).toHaveAttribute(
    'data-emoji',
    '😢',
  );
  // Jamais de relance automatique : l'écran d'échec reste affiché tant que l'enfant n'a pas choisi.
  await page.waitForTimeout(2000);
  await expect(page.getByTestId('level-failed')).toBeVisible();
  await expect(page.getByTestId('replay')).toBeVisible();
  await expect(page.getByTestId('to-map')).toBeVisible();

  await page.getByTestId('replay').click();
  await expect(currentRound(page)).toBeVisible();
  await expect(page.getByTestId('lives')).toHaveAttribute('data-lives', '2');

  await loseAllLives(page);
  await page.getByTestId('to-map').click();
  await expect(mapNode(page, 'ms-suite-01')).toHaveAttribute('data-status', 'unlocked');
  await expect(mapNode(page, 'ms-suite-02')).toHaveAttribute('data-status', 'locked');
});

test('une manche ratée ne coûte qu’une vie, et terminer avec des vies restantes donne les étoiles', async ({ page }) => {
  await onboardWithChild(page, 'Lina');
  await chooseProfile(page, 'Lina');
  await openLevel(page, 'ms-suite-01');
  await expect(currentRound(page)).toBeVisible();

  await tapWrong(page);
  await expect(page.getByTestId('lives')).toHaveAttribute('data-lives', '1');
  for (let done = 1; done <= 4; done += 1) {
    await tapAnswer(page);
    if (done < 4) await expect(page.locator('.play-progress__dot.is-done')).toHaveCount(done);
  }
  await expect(page.getByTestId('level-end')).toBeVisible();
  await expect(page.getByTestId('level-end')).toHaveAttribute('data-stars', '2');
});
