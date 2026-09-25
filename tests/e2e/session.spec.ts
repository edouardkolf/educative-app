// Minuteur de session, quota quotidien et écran de fin (voir docs/ARCHITECTURE.md §8).
// Utilise `page.clock` (fake timers) pour avancer le temps sans attendre en vrai. L'horloge de
// session (SessionProvider) démarre un `setInterval` dès le premier chargement de l'app : la fausse
// horloge doit donc être installée AVANT `page.goto('/')`, sinon cet intervalle déjà natif ignore
// `page.clock.runFor(...)`. On utilise `runFor` pour tout, y compris les appuis longs (l'anneau de
// progression repose sur `requestAnimationFrame`, également piloté par l'horloge simulée une fois installée).
// Aides et sélecteurs repris de vertical-slice.spec.ts (non exportés de ce fichier).
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

function statValue(card: Locator, label: string): Locator {
  return card.locator(`xpath=.//dt[normalize-space(text())="${label}"]/following-sibling::dd[1]`);
}

// ---------- Aides propres à ce fichier ----------

/** Appui long piloté par l'horloge simulée (`page.clock` doit déjà être installée). */
async function longPressClock(page: Page, locator: Locator, ms: number): Promise<void> {
  const box = await locator.boundingBox();
  if (!box) throw new Error('Élément introuvable pour simuler un appui long.');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.clock.runFor(ms);
  await page.mouse.up();
}

/** Déverrouille l'écran de fin (cadenas + code) puis clique un bouton du panneau parent (grant-5, grant-15, end-session). */
async function unlockAndTap(page: Page, testId: string): Promise<void> {
  await longPressClock(page, page.getByTestId('lock-parent'), 2100);
  await expect(page.getByText('Code parent', { exact: true })).toBeVisible();
  await enterPin(page, PARENT_PIN);
  await expect(page.getByTestId(testId)).toBeVisible();
  await page.getByTestId(testId).click();
}

// ==================== 1. Minuteur de session sur la carte ====================

test('minuteur de session sur la carte : écran de fin, persiste au rechargement, +5 minutes permet de rejouer', async ({
  page,
}) => {
  test.slow();
  await page.clock.install();
  await onboardWithChild(page, 'Lina');
  await chooseProfile(page, 'Lina');
  await expect(mapNode(page, 'ms-suite-01')).toBeVisible();

  await page.clock.runFor('15:05'); // dépasse les 15 min de session par défaut (fixées à la création de l'enfant)

  // Sur la carte ("hors partie") : l'horloge de session navigue elle-même vers l'écran de fin.
  await expect(page.getByTestId('lock-parent')).toBeVisible();

  await page.reload(); // l'horloge simulée (et le temps déjà avancé) survit au rechargement
  await expect(page.getByTestId('lock-parent')).toBeVisible(); // toujours bloqué : settings.lock persisté

  await unlockAndTap(page, 'grant-5');

  await expect(mapNode(page, 'ms-suite-01')).toBeVisible(); // déverrouillé, retour sur la carte
  await openLevel(page, 'ms-suite-01');
  await expect(currentRound(page)).toBeVisible(); // l'enfant peut effectivement rejouer
});

// ==================== 2. Minuteur pendant une partie ====================

test('minuteur pendant une partie : la manche se termine puis écran de fin, comptée en interruption', async ({ page }) => {
  test.slow();
  await page.clock.install();
  await onboardWithChild(page, 'Lina');
  await chooseProfile(page, 'Lina');
  await openLevel(page, 'ms-suite-01');
  const round = currentRound(page);
  await expect(round).toBeVisible();
  const answer = await round.getAttribute('data-answer');
  if (!answer) throw new Error('Aucune manche affichée.');

  // Un essai faux d'abord (réaliste, et fait disparaître la main du tutoriel : ms-suite-01 en a une,
  // animée en continu par requestAnimationFrame — mieux vaut ne pas la laisser tourner sous horloge
  // simulée pendant les 15 minutes qui suivent).
  const choiceIds = await round.locator('[data-choice]').evaluateAll((els) => els.map((el) => el.getAttribute('data-choice')));
  const wrongId = choiceIds.find((id): id is string => Boolean(id) && id !== answer);
  if (wrongId) {
    await page.locator(`[data-choice="${wrongId}"]`).click();
    await expect(page.locator(`[data-choice="${wrongId}"]`)).toBeDisabled();
  }

  await page.clock.runFor('15:05'); // épuise la session pendant que la manche 1 est toujours affichée, sans réponse

  // La bonne réponse malgré le minuteur écoulé : la manche en cours se termine normalement...
  await page.locator(`[data-choice="${answer}"]`).click();
  // ... mais au lieu de passer à la manche suivante (délai de 900 ms), la partie s'arrête : écran de fin.
  await page.clock.runFor(1000);
  await expect(page.getByTestId('lock-parent')).toBeVisible();

  await unlockAndTap(page, 'end-session');
  await expect(profileCard(page, 'Lina')).toBeVisible();

  // Statistiques parent : une interruption, pas un abandon (bouton maison jamais pressé).
  await longPressClock(page, page.getByTestId('parent-access'), 2100);
  await expect(page.getByText('Code parent', { exact: true })).toBeVisible();
  await enterPin(page, PARENT_PIN);
  await expect(page.getByRole('heading', { name: 'Espace parent' })).toBeVisible();
  await page.getByRole('button', { name: 'Statistiques' }).click();

  const card = page.getByTestId('level-stats-ms-suite-01');
  await expect(statValue(card, 'Essais')).toHaveText('1');
  await expect(statValue(card, 'Réussites')).toHaveText('0');
  await expect(statValue(card, 'Abandons')).toHaveText('0');
  await expect(statValue(card, 'Interruptions')).toHaveText('1');
});

// ==================== F1. Retour Android après l'écran de fin ne contourne jamais le verrou ====================

test('F1 : le bouton retour Android après l\'écran de fin reste bloqué, aucune nouvelle partie', async ({ page }) => {
  test.slow();
  await page.clock.install();
  await onboardWithChild(page, 'Lina');
  await chooseProfile(page, 'Lina');
  await openLevel(page, 'ms-suite-01');
  await expect(currentRound(page)).toBeVisible();

  // Retour à la carte, puis fin du temps hors partie : l'écran de fin s'affiche directement.
  await page.getByTestId('quit').click();
  await expect(mapNode(page, 'ms-suite-01')).toBeVisible();
  await page.clock.runFor('15:05');
  await expect(page.getByTestId('lock-parent')).toBeVisible();

  // Plusieurs retours Android d'affilée : toujours l'écran de fin, jamais une manche relancée.
  await page.goBack();
  await expect(page.getByTestId('lock-parent')).toBeVisible();
  await page.goBack();
  await expect(page.getByTestId('lock-parent')).toBeVisible();

  // Même après un délai (> 10 min, fenêtre de reprise de session) qui, avant le correctif, aurait
  // fait repartir une session neuve à 0 et n'aurait plus jamais réappliqué le verrou.
  await page.clock.runFor('11:00');
  await page.goBack();
  await expect(page.getByTestId('lock-parent')).toBeVisible();
  await expect(currentRound(page)).toHaveCount(0);

  await unlockAndTap(page, 'end-session');
  await expect(profileCard(page, 'Lina')).toBeVisible();

  // Aucune partie sur ms-suite-01 n'a été relancée par les retours Android (seul le quit initial compte).
  await longPressClock(page, page.getByTestId('parent-access'), 2100);
  await expect(page.getByText('Code parent', { exact: true })).toBeVisible();
  await enterPin(page, PARENT_PIN);
  await page.getByRole('button', { name: 'Statistiques' }).click();
  const card = page.getByTestId('level-stats-ms-suite-01');
  await expect(statValue(card, 'Essais')).toHaveText('1');
  await expect(statValue(card, 'Abandons')).toHaveText('1');
});

// ==================== 3. Quota quotidien épuisé ====================

test('quota du jour épuisé : le profil apparaît estompé et non sélectionnable ; « Terminer » ramène aux profils', async ({
  page,
}) => {
  test.slow();
  await page.clock.install();
  await onboardWithChild(page, 'Lina');
  await chooseProfile(page, 'Lina');
  await expect(mapNode(page, 'ms-suite-01')).toBeVisible();

  // Une session de 15 min n'épuise que le minuteur de session : il en faut deux pour atteindre le
  // quota du jour (30 min par défaut). On repart via « Terminer » (pas « +X ») entre les deux : le
  // quota du jour ne dépend que du temps cumulé (`usage`), jamais de la session en cours.
  await page.clock.runFor('15:05');
  await expect(page.getByTestId('lock-parent')).toBeVisible();
  await unlockAndTap(page, 'end-session');
  await expect(profileCard(page, 'Lina')).toBeVisible();
  await expect(profileCard(page, 'Lina')).not.toHaveAttribute('data-exhausted', 'true'); // quota pas encore épuisé

  await chooseProfile(page, 'Lina');
  await expect(mapNode(page, 'ms-suite-01')).toBeVisible();
  await page.clock.runFor('15:05');
  await expect(page.getByTestId('lock-parent')).toBeVisible();

  await unlockAndTap(page, 'end-session');
  await expect(profileCard(page, 'Lina')).toBeVisible();

  const card = profileCard(page, 'Lina');
  await expect(card).toHaveAttribute('data-exhausted', 'true');

  // Le taper déclenche un petit tremblement, rien d'autre (pas de retour sur la carte).
  await card.click();
  await expect(card).toHaveClass(/is-shaking/);
  await expect(page).not.toHaveURL(/#\/map$/);
  await expect(profileCard(page, 'Lina')).toBeVisible();
});
