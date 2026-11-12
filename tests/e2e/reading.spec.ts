// « J'apprends à lire » (docs/specs/LECTURE.md §12 et §16) : tuile → parcours de niveaux → séance d'un niveau en
// répondant via `data-answer` → fête → niveau suivant débloqué ; niveau raté à rejouer, erreur volontaire, espace
// parent, « étape de départ », voix absente.
// Chromium headless n'a pas de voix : fausse voix de `reading-helpers.ts` (même technique que dictation.spec.ts).
import { test, expect } from '@playwright/test';
import { chooseProfile } from './nav';
import {
  answerCurrent,
  currentLevel,
  finishEnd,
  installFakeVoice,
  onboardMs,
  openParentDashboard,
  openReading,
  playFullSession,
  readReadings,
  spokenTexts,
  startCurrentLevel,
} from './reading-helpers';

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

async function expectNoHorizontalScroll(page: import('@playwright/test').Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(overflow, 'défilement horizontal').toBe(false);
}

// ==================== 1. Niveaux 1 et 2 : tambour, puis la première lettre ====================

test('niveau 1 (tambour seul, 5 questions) gagné → le niveau 2 s’ouvre sur la lettre A', async ({ page }) => {
  test.slow();
  await installFakeVoice(page, 'fr');
  await onboardMs(page, 'Alice');
  await chooseProfile(page, 'Alice');

  await openReading(page);
  await expectNoHorizontalScroll(page);
  await expect(page.getByTestId('reading-unavailable')).toHaveCount(0);
  await expect(page.getByTestId('reading-level-1')).toHaveAttribute('data-state', 'current');
  await expect(page.getByTestId('reading-level-1')).toHaveAttribute('data-game', 'syllable-drum');
  await expect(page.getByTestId('reading-level-1')).toBeInViewport();
  await expect(page.getByTestId('reading-level-2')).toHaveAttribute('data-state', 'locked');
  await expect(page.getByTestId('reading-level-2')).toHaveAttribute('data-level', 'sound-a');

  // Un niveau verrouillé ne lance rien.
  await page.getByTestId('reading-level-2').click({ force: true }); // aria-disabled : Playwright refuse le clic normal
  await expect(page.getByTestId('reading-home')).toBeVisible();
  await expect(page.getByTestId('reading-session')).toHaveCount(0);

  await startCurrentLevel(page);
  await expect(page.getByTestId('reading-dots').locator('.rd-dot')).toHaveCount(5);
  await expect(page.getByTestId('reading-replay')).toBeVisible();

  // Le bouton haut-parleur rejoue la consigne.
  await expect(page.getByTestId('reading-question')).toHaveAttribute('data-ready', 'true', { timeout: 10_000 });
  const before = (await spokenTexts(page)).length;
  await page.getByTestId('reading-replay').click();
  await expect.poll(async () => (await spokenTexts(page)).length).toBeGreaterThan(before);

  let checkedDrum = false;
  const played = await playFullSession(page, {
    beforeAnswer: async (info) => {
      if (info.guided || checkedDrum) return;
      checkedDrum = true;
      const question = page.getByTestId('reading-question');
      // L'image modèle fait répéter le mot, et la question reste posée.
      const spoken = (await spokenTexts(page)).length;
      await question.getByTestId('reading-model').click();
      await expect.poll(async () => (await spokenTexts(page)).length).toBeGreaterThan(spoken);
      // Pas de coche avant la première frappe, et rien ne part tout seul.
      const ok = question.locator('[data-choice="drum-ok"]');
      await expect(ok).toHaveAttribute('aria-disabled', 'true');
      await expect(ok).toBeHidden();
      await page.waitForTimeout(2500);
      await expect(question).not.toHaveAttribute('data-solved', 'true');
    },
  });
  expect(checkedDrum).toBe(true);
  await expectNoHorizontalScroll(page);
  // Un niveau = un seul jeu : une démonstration, puis 5 tambours.
  for (const q of played) expect(q.game).toBe('syllable-drum');
  expect(played.filter((q) => q.guided)).toHaveLength(1);
  expect(played.filter((q) => !q.guided)).toHaveLength(5);

  // Niveau gagné : fête, et le niveau suivant s'ouvre.
  await expect(page.getByTestId('reading-end')).toHaveAttribute('data-passed', 'true');
  await expect(page.getByTestId('reading-end-next')).toBeVisible();
  await finishEnd(page);
  await expect(page.getByTestId('reading-level-1')).toHaveAttribute('data-state', 'done');
  await expect(currentLevel(page)).toHaveAttribute('data-level', 'sound-a');
  await expect(page.getByTestId('reading-level-3')).toHaveAttribute('data-state', 'locked');

  let [session] = await readReadings(page);
  expect(session?.status).toBe('completed');
  expect(session?.levelId).toBe('drum-1');
  expect(session?.planned).toBe(5);
  expect(session?.answers.filter((a) => !a.retry)).toHaveLength(5);
  expect(session?.answers.every((a) => a.correct)).toBe(true);
  expect(session?.answers.some((a) => a.replays > 0)).toBe(true);
  expect(session?.demos).toEqual(['syllable-drum']);

  // Niveau 2 : la première lettre, à la deuxième séance.
  await startCurrentLevel(page);
  await expect(page.getByTestId('reading-dots').locator('.rd-dot')).toHaveCount(5);
  const letters = await playFullSession(page);
  for (const q of letters) {
    expect(q.game).toBe('letter-sound');
    expect(q.answer).toBe('a');
  }
  await finishEnd(page);
  await expect(page.getByTestId('reading-level-2')).toHaveAttribute('data-state', 'done');
  await expect(currentLevel(page)).toHaveAttribute('data-level', 'drum-2');
  session = (await readReadings(page)).find((r) => r.levelId === 'sound-a');
  expect(session?.status).toBe('completed');
  expect(session?.stage).toBe(2);
  expect(session?.newItemId).toBe('g:a');

  // Un niveau gagné se rejoue (révision) sans rien verrouiller.
  await page.getByTestId('reading-level-1').click();
  await expect(page.getByTestId('reading-session')).toBeVisible();
  await page.getByTestId('to-hub').click();
  await expect(page.getByTestId('hub')).toBeVisible();
});

// ==================== 2. Niveau raté : on le rejoue ====================

test('3 bonnes réponses sur 5 : pas de fête, le niveau reste à rejouer ; 4 sur 5 le gagne', async ({ page }) => {
  test.slow();
  await installFakeVoice(page, 'fr');
  await onboardMs(page, 'Alice');
  await chooseProfile(page, 'Alice');
  await openReading(page);

  await startCurrentLevel(page);
  await playFullSession(page, { missFirst: 2 });
  await expect(page.getByTestId('reading-end')).toHaveAttribute('data-passed', 'false');
  await expect(page.getByTestId('reading-end-next')).toHaveCount(0);
  await finishEnd(page);
  await expect(page.getByTestId('reading-level-1')).toHaveAttribute('data-state', 'current');
  await expect(page.getByTestId('reading-level-2')).toHaveAttribute('data-state', 'locked');
  let records = await readReadings(page);
  expect(records).toHaveLength(1);
  expect(records[0]?.status).toBe('completed');
  expect(records[0]?.answers.filter((a) => !a.retry && !a.correct)).toHaveLength(2);

  await startCurrentLevel(page);
  const second = await playFullSession(page, { missFirst: 1 });
  // La démonstration du tambour a déjà été faite.
  expect(second.some((q) => q.guided)).toBe(false);
  await expect(page.getByTestId('reading-end')).toHaveAttribute('data-passed', 'true');
  await finishEnd(page);
  await expect(page.getByTestId('reading-level-1')).toHaveAttribute('data-state', 'done');
  await expect(page.getByTestId('reading-level-2')).toHaveAttribute('data-state', 'current');
  records = await readReadings(page);
  expect(records).toHaveLength(2);
});

// ==================== 3. Une erreur grise le choix et la question est reposée ====================

test('erreur volontaire : le choix se grise, la lettre touchée chante, la question est reposée et ne compte pas', async ({ page }) => {
  test.slow();
  await installFakeVoice(page, 'fr');
  // Étape de départ 2 : les niveaux d'écoute de l'étape 1 sont tenus pour gagnés, le niveau en cours est la lettre A.
  await onboardMs(page, 'Alice', 2);
  await chooseProfile(page, 'Alice');
  await openReading(page);
  await expect(page.getByTestId('reading-level-1')).toHaveAttribute('data-state', 'done');
  await expect(currentLevel(page)).toHaveAttribute('data-level', 'sound-a');
  await startCurrentLevel(page);

  let spokenBefore = 0;
  let checkedModel = false;
  const played = await playFullSession(page, {
    errOnce: true,
    beforeAnswer: async (info, p) => {
      if (!info.guided && !checkedModel) {
        // Le grand haut-parleur fait réentendre le son sans répondre.
        checkedModel = true;
        const n = (await spokenTexts(p)).length;
        await p.getByTestId('reading-question').getByTestId('reading-model').click();
        await expect.poll(async () => (await spokenTexts(p)).length).toBeGreaterThan(n);
      }
      spokenBefore = (await spokenTexts(p)).length;
    },
    afterWrong: async (_info, p) => {
      // La lettre touchée dit son propre son.
      await expect.poll(async () => (await spokenTexts(p)).length).toBeGreaterThan(spokenBefore);
    },
  });
  const erred = played.find((q) => q.wrongChoice !== null);
  expect(erred, 'aucune question non guidée à choix n’a été jouée').toBeTruthy();
  // La question ratée est reposée : un tour de plus que prévu, marqué `retry`.
  expect(played.some((q) => q.retry)).toBe(true);

  // Une seule erreur sur 5 : le niveau est gagné quand même.
  await expect(page.getByTestId('reading-end')).toHaveAttribute('data-passed', 'true');
  await finishEnd(page);
  const [session] = await readReadings(page);
  expect(session?.status).toBe('completed');
  const misses = session!.answers.filter((a) => !a.correct);
  expect(misses).toHaveLength(1);
  expect(misses[0]?.chosen).toBe(erred!.wrongChoice);
  expect(misses[0]?.retry).toBe(false);
  expect(session!.answers.some((a) => a.retry && a.itemId === misses[0]!.itemId)).toBe(true);
  expect(session!.answers.filter((a) => !a.retry)).toHaveLength(session!.planned);
});

// ==================== 4. Maison pendant la séance : abandon enregistré ====================

test('maison pendant une séance : la séance commencée est enregistrée comme abandonnée, le niveau reste à faire', async ({ page }) => {
  await installFakeVoice(page, 'fr');
  await onboardMs(page, 'Alice');
  await chooseProfile(page, 'Alice');
  await openReading(page);
  await startCurrentLevel(page);

  // Rien n'est enregistré avant la première vraie réponse : démonstration, puis une réponse.
  let info = await answerCurrent(page);
  while (info.guided) {
    const handle = await page.getByTestId('reading-question').elementHandle();
    await expect.poll(() => handle!.evaluate((el) => el.isConnected), { timeout: 15_000 }).toBe(false);
    info = await answerCurrent(page);
  }
  await expect.poll(async () => (await readReadings(page)).length, { timeout: 10_000 }).toBe(1);
  await page.getByTestId('to-hub').click();
  await expect(page.getByTestId('hub')).toBeVisible();
  await expect.poll(async () => (await readReadings(page))[0]?.status).toBe('abandoned');
  const [session] = await readReadings(page);
  expect(session?.endReason).toBe('quit');
  expect(session?.levelId).toBe('drum-1');
  expect(session?.answers.length).toBeGreaterThanOrEqual(1);

  await openReading(page);
  await expect(page.getByTestId('reading-level-1')).toHaveAttribute('data-state', 'current');
});

// ==================== 5. Étape de départ 2 par la fiche enfant ; espace parent ====================

test('étape de départ 2 (réglage parent) : le parcours reprend à la lettre A ; statistiques et banc d’écoute côté parent', async ({ page }) => {
  test.slow();
  await installFakeVoice(page, 'fr');
  await onboardMs(page, 'Alice');
  await chooseProfile(page, 'Alice');

  // Réglage dans la fiche enfant (profils → espace parent → Modifier).
  await page.getByTestId('hub-to-profiles').click();
  await openParentDashboard(page);
  await page.getByRole('button', { name: 'Modifier' }).click();
  await expect(page.getByTestId('reading-start-stage')).toHaveValue('1');
  await page.getByTestId('reading-start-stage').selectOption('2');
  await page.getByTestId('save-child').click();
  await expect(page.getByRole('heading', { name: 'Espace parent' })).toBeVisible();
  await page.getByTestId('back-to-game').click();

  await chooseProfile(page, 'Alice');
  await openReading(page);
  await expect(page.getByTestId('reading-level-1')).toHaveAttribute('data-state', 'done');
  await expect(page.getByTestId('reading-level-2')).toHaveAttribute('data-state', 'current');

  await startCurrentLevel(page);
  const played = await playFullSession(page);
  for (const q of played) expect(q.game).toBe('letter-sound');
  await finishEnd(page);

  const records = await readReadings(page);
  expect(records).toHaveLength(1);
  expect(records[0]?.stage).toBe(2);
  expect(records[0]?.levelId).toBe('sound-a');
  expect(records[0]?.newItemId).toBe('g:a');

  // Espace parent : statistiques de lecture.
  await page.getByTestId('to-hub').click();
  await page.getByTestId('hub-to-profiles').click();
  await openParentDashboard(page);
  await page.getByRole('button', { name: 'Statistiques' }).click();

  const card = page.getByTestId('game-stats-reading');
  await expect(card).toBeVisible();
  // La lettre A gagnée, le niveau d'écoute suivant tenu pour gagné : on en est au niveau 4 (A dans un mot).
  await expect(card.getByTestId('reading-stats-level')).toContainText('4 sur');
  await expect(card.getByTestId('reading-stats-sessions')).toHaveText('1');
  await expect(card.getByTestId('reading-stats-acquired')).toContainText('/');
  await expect(card.getByTestId('reading-stats-item-g:a')).toBeVisible();
  await expect(card.getByTestId('reading-stats-item-k:count')).toBeVisible();

  // Banc d'écoute : replié par défaut, le nom de la voix, des entrées à écouter.
  const bench = card.getByTestId('reading-bench');
  await expect(bench).toBeVisible();
  await expect(bench).not.toHaveAttribute('open', '');
  await bench.locator('summary').click();
  await expect(bench).toHaveAttribute('open', '');
  await expect(card.getByTestId('reading-bench-voice')).toContainText('Fake FR');
  const entries = card.getByTestId('reading-bench-entry');
  expect(await entries.count()).toBeGreaterThan(20);
  const before = (await spokenTexts(page)).length;
  await entries.first().click();
  await expect.poll(async () => (await spokenTexts(page)).length).toBeGreaterThan(before);
});

// ==================== 6. Voix indisponible ====================

test('voix absente (speechSynthesis indéfinie) : accueil « reading-unavailable », aucun niveau tapable', async ({ page }) => {
  await installFakeVoice(page, 'absent');
  await onboardMs(page, 'Alice');
  await chooseProfile(page, 'Alice');

  await expect(page.getByTestId('hub-tile-reading').locator('.hub-tile__badge')).toBeVisible();
  await openReading(page);
  await expect(page.getByTestId('reading-unavailable')).toBeVisible();
  for (const n of [1, 2, 3]) await expect(page.getByTestId(`reading-level-${n}`)).toBeDisabled();
  await page.getByTestId('reading-level-1').click({ force: true });
  await expect(page.getByTestId('reading-session')).toHaveCount(0);

  await page.getByTestId('to-hub').click();
  await expect(page.getByTestId('hub')).toBeVisible();
});

test('voix anglaise seulement : même écran d’indisponibilité', async ({ page }) => {
  await installFakeVoice(page, 'en');
  await onboardMs(page, 'Alice');
  await chooseProfile(page, 'Alice');
  await openReading(page);
  await expect(page.getByTestId('reading-unavailable')).toBeVisible();
  await expect(page.getByTestId('reading-level-1')).toBeDisabled();
});

// ==================== 7. Plus loin dans le parcours, par l'étape de départ ====================

/** Joue le niveau en cours en répondant juste, vérifie qu'il n'a qu'un jeu, et rend son identifiant. */
async function playCurrent(page: import('@playwright/test').Page, game: string, questions: number): Promise<string> {
  const id = (await currentLevel(page).getAttribute('data-level')) ?? '';
  await expect(currentLevel(page)).toHaveAttribute('data-game', game);
  await expect(currentLevel(page)).toBeInViewport();
  await startCurrentLevel(page);
  await expect(page.getByTestId('reading-dots').locator('.rd-dot')).toHaveCount(questions);
  const played = await playFullSession(page);
  for (const q of played) expect(q.game, id).toBe(game);
  await expect(page.getByTestId('reading-end')).toHaveAttribute('data-passed', 'true');
  await finishEnd(page);
  return id;
}

test('étape de départ 3 : niveaux de 8 questions, « commence pareil » puis « par quoi ça commence »', async ({ page }) => {
  test.setTimeout(240_000); // quatre séances de 8 questions
  await installFakeVoice(page, 'fr');
  await onboardMs(page, 'Alice', 3);
  await chooseProfile(page, 'Alice');
  await openReading(page);
  expect(await playCurrent(page, 'syllable-drum', 8)).toBe('drum-4');
  expect(await playCurrent(page, 'letter-sound', 8)).toBe('sound-l');
  expect(await playCurrent(page, 'same-start', 8)).toBe('start-4');
  expect(await playCurrent(page, 'first-sound', 8)).toBe('first-l');
  const records = await readReadings(page);
  expect(records.every((r) => r.stage === 3 && r.status === 'completed')).toBe(true);
});

test('étape de départ 4 : la machine à syllabes a son niveau à elle', async ({ page }) => {
  test.slow();
  await installFakeVoice(page, 'fr');
  await onboardMs(page, 'Alice', 4);
  await chooseProfile(page, 'Alice');
  await openReading(page);
  expect(await playCurrent(page, 'syllable-drum', 8)).toBe('drum-8');
  expect(await playCurrent(page, 'letter-sound', 8)).toBe('sound-p');
  expect(await playCurrent(page, 'syllable-machine', 8)).toBe('machine-11');
});

test('étape de départ 5 : mot mystère, lettre rare, puis jumelles', async ({ page }) => {
  test.slow();
  await installFakeVoice(page, 'fr');
  await onboardMs(page, 'Alice', 5);
  await chooseProfile(page, 'Alice');
  await openReading(page);
  expect(await playCurrent(page, 'mystery-word', 8)).toBe('mystery-1');
  expect(await playCurrent(page, 'letter-sound', 8)).toBe('sound-k');
  expect(await playCurrent(page, 'letter-twins', 8)).toBe('twins-1');
});
