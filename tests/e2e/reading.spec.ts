// « J'apprends à lire » (docs/specs/LECTURE.md §12) : tuile → accueil → séance complète en répondant juste via
// `data-answer` → fête → accueil, erreur volontaire, espace parent, « étape de départ », voix absente.
// Chromium headless n'a pas de voix : fausse voix de `reading-helpers.ts` (même technique que dictation.spec.ts).
import { test, expect } from '@playwright/test';
import { chooseProfile } from './nav';
import {
  finishEnd,
  installFakeVoice,
  onboardMs,
  openParentDashboard,
  openReading,
  playFullSession,
  readReadings,
  spokenTexts,
  startCurrentStage,
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

const LETTER_GAMES = ['letter-sound', 'first-sound'];

async function expectNoHorizontalScroll(page: import('@playwright/test').Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(overflow, 'Défilement horizontal détecté').toBe(false);
}

// ==================== 1. Séance complète à l'étape 1 ====================

test('étape 1 : tuile, accueil, séance complète (démonstrations et tambour compris), fête, retour à l’accueil', async ({ page }) => {
  test.slow();
  await installFakeVoice(page, 'fr');
  await onboardMs(page, 'Alice');
  await chooseProfile(page, 'Alice');

  await openReading(page);
  await expectNoHorizontalScroll(page);
  await expect(page.getByTestId('reading-unavailable')).toHaveCount(0);
  await expect(page.getByTestId('reading-stage-1')).toHaveAttribute('data-state', 'current');
  for (const n of [2, 3, 4, 5]) await expect(page.getByTestId(`reading-stage-${n}`)).toHaveAttribute('data-state', 'locked');
  await expect(page.getByTestId('reading-gauge-1')).toBeVisible();

  // Une étape verrouillée ne lance rien.
  await page.getByTestId('reading-stage-3').click({ force: true }); // aria-disabled : Playwright refuse le clic normal
  await expect(page.getByTestId('reading-home')).toBeVisible();
  await expect(page.getByTestId('reading-session')).toHaveCount(0);

  await startCurrentStage(page);
  const planned = await page.getByTestId('reading-dots').locator('.rd-dot').count();
  expect(planned).toBeGreaterThanOrEqual(8);
  expect(planned).toBeLessThanOrEqual(10);
  await expect(page.getByTestId('reading-replay')).toBeVisible();

  // Le bouton haut-parleur rejoue la consigne.
  await expect(page.getByTestId('reading-question')).toHaveAttribute('data-ready', 'true', { timeout: 10_000 });
  const before = (await spokenTexts(page)).length;
  await page.getByTestId('reading-replay').click();
  await expect.poll(async () => (await spokenTexts(page)).length).toBeGreaterThan(before);

  const played = await playFullSession(page);
  await expectNoHorizontalScroll(page);
  // Étape 1 : uniquement des jeux d'écoute.
  for (const q of played) expect(['syllable-drum', 'same-start', 'same-end']).toContain(q.game);
  // Une démonstration (exemple guidé) par jeu rencontré, jamais enregistrée.
  const games = new Set(played.map((q) => q.game));
  expect(played.filter((q) => q.guided).map((q) => q.game).sort()).toEqual([...games].sort());

  await expect(page.getByTestId('reading-end')).toBeVisible();
  await finishEnd(page);
  await expect(page.getByTestId('reading-stage-1')).toHaveAttribute('data-state', 'current');

  const [session] = await readReadings(page);
  expect(session?.status).toBe('completed');
  expect(session?.stage).toBe(1);
  expect(session?.review).toBe(false);
  expect(session?.answers.filter((a) => !a.retry)).toHaveLength(session!.planned);
  expect(session?.answers.every((a) => a.correct)).toBe(true);
  expect(new Set(session?.demos)).toEqual(games);
  expect(session?.planned).toBe(planned);

  // La maison de l'accueil ramène au hub.
  await page.getByTestId('to-hub').click();
  await expect(page.getByTestId('hub')).toBeVisible();
});

// ==================== 1 bis. Image modèle qui répète, coche du tambour ====================

test('toucher l’image modèle répète le mot sans répondre ; le tambour ne se valide qu’avec la coche', async ({ page }) => {
  test.slow();
  await installFakeVoice(page, 'fr');
  await onboardMs(page, 'Lina');
  await chooseProfile(page, 'Lina');
  await openReading(page);
  await startCurrentStage(page);

  const checked = new Set<string>();
  await playFullSession(page, {
    beforeAnswer: async (info) => {
      if (info.guided || checked.has(info.game) || !['syllable-drum', 'same-start'].includes(info.game)) return;
      checked.add(info.game);
      const question = page.getByTestId('reading-question');
      // L'image modèle fait répéter le mot, et la question reste posée.
      const before = (await spokenTexts(page)).length;
      await question.getByTestId('reading-model').click();
      await expect.poll(async () => (await spokenTexts(page)).length).toBeGreaterThan(before);
      await expect(question).not.toHaveAttribute('data-solved', 'true');
      if (info.game === 'syllable-drum') {
        // Pas de coche avant la première frappe, et rien ne part tout seul.
        const ok = question.locator('[data-choice="drum-ok"]');
        await expect(ok).toHaveAttribute('aria-disabled', 'true');
        await expect(ok).toBeHidden();
        await page.waitForTimeout(2500);
        await expect(question).not.toHaveAttribute('data-solved', 'true');
      }
    },
  });
  expect([...checked].sort()).toEqual(['same-start', 'syllable-drum']);
  // Les réécoutes du modèle comptent comme des réécoutes, jamais comme des réponses.
  const [session] = await readReadings(page);
  expect(session?.answers.every((a) => a.correct)).toBe(true);
  expect(session?.answers.some((a) => a.replays > 0)).toBe(true);
});

// ==================== 2. Une erreur grise le choix et la question est reposée ====================

test('erreur volontaire : le choix se grise, la lettre touchée chante, la question est reposée et ne compte pas', async ({ page }) => {
  test.slow();
  await installFakeVoice(page, 'fr');
  // Étape 2 : la première séance de l'étape 1 n'a que des tambours (un seul jeu, pas de choix à rater).
  await onboardMs(page, 'Alice', 2);
  await chooseProfile(page, 'Alice');
  await openReading(page);
  await startCurrentStage(page);

  let spokenBefore = 0;
  const played = await playFullSession(page, {
    errOnce: true,
    beforeAnswer: async (_info, p) => {
      spokenBefore = (await spokenTexts(p)).length;
    },
    afterWrong: async (_info, p) => {
      // La lettre ou la syllabe touchée dit son propre son.
      await expect.poll(async () => (await spokenTexts(p)).length).toBeGreaterThan(spokenBefore);
    },
  });
  const erred = played.find((q) => q.wrongChoice !== null);
  expect(erred, 'aucune question non guidée à choix n’a été jouée').toBeTruthy();
  // La question ratée est reposée : un tour de plus que prévu, marqué `retry`.
  expect(played.some((q) => q.retry)).toBe(true);

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

// ==================== 3. Maison pendant la séance : abandon enregistré ====================

test('maison pendant une séance : la séance commencée est enregistrée comme abandonnée', async ({ page }) => {
  await installFakeVoice(page, 'fr');
  await onboardMs(page, 'Alice');
  await chooseProfile(page, 'Alice');
  await openReading(page);
  await startCurrentStage(page);

  // Rien n'est enregistré avant la première vraie réponse : démonstration, puis une réponse.
  const { answerCurrent } = await import('./reading-helpers');
  let info = await answerCurrent(page);
  while (info.guided) {
    const handle = await page.getByTestId('reading-question').elementHandle();
    await expect.poll(() => handle!.evaluate((el) => el.isConnected), { timeout: 15_000 }).toBe(false);
    info = await answerCurrent(page);
  }
  // La réponse du tambour part 2 s après la dernière frappe : on attend qu'elle soit enregistrée avant la maison.
  await expect.poll(async () => (await readReadings(page)).length, { timeout: 10_000 }).toBe(1);
  await page.getByTestId('to-hub').click();
  await expect(page.getByTestId('hub')).toBeVisible();
  await expect.poll(async () => (await readReadings(page))[0]?.status).toBe('abandoned');
  const [session] = await readReadings(page);
  expect(session?.status).toBe('abandoned');
  expect(session?.endReason).toBe('quit');
  expect(session?.answers.length).toBeGreaterThanOrEqual(1);
});

// ==================== 4. Étape de départ 2 : des lettres ; espace parent ====================

test('étape de départ 2 (réglage parent) : la séance propose des lettres ; statistiques et banc d’écoute côté parent', async ({ page }) => {
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
  await expect(page.getByTestId('reading-stage-1')).toHaveAttribute('data-state', 'done');
  await expect(page.getByTestId('reading-stage-2')).toHaveAttribute('data-state', 'current');

  await startCurrentStage(page);
  const played = await playFullSession(page);
  expect(played.some((q) => LETTER_GAMES.includes(q.game)), `jeux joués : ${played.map((q) => q.game).join(', ')}`).toBe(true);
  // Une lettre nouvelle est présentée (première question de l'item nouveau).
  const [session] = await readReadings(page).then((r) => (r.length ? r : [undefined]));
  expect(session === undefined || session.stage === 2).toBe(true);
  await finishEnd(page);

  const records = await readReadings(page);
  expect(records).toHaveLength(1);
  expect(records[0]?.stage).toBe(2);
  expect(records[0]?.newItemId).toMatch(/^g:/);

  // Espace parent : statistiques de lecture.
  await page.getByTestId('to-hub').click();
  await page.getByTestId('hub-to-profiles').click();
  await openParentDashboard(page);
  await page.getByRole('button', { name: 'Statistiques' }).click();

  const card = page.getByTestId('game-stats-reading');
  await expect(card).toBeVisible();
  await expect(card.getByTestId('reading-stats-stage')).toContainText('2');
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

// ==================== 5. Voix indisponible ====================

test('voix absente (speechSynthesis indéfinie) : accueil « reading-unavailable », aucune étape tapable', async ({ page }) => {
  await installFakeVoice(page, 'absent');
  await onboardMs(page, 'Alice');
  await chooseProfile(page, 'Alice');

  await expect(page.getByTestId('hub-tile-reading').locator('.hub-tile__badge')).toBeVisible();
  await openReading(page);
  await expect(page.getByTestId('reading-unavailable')).toBeVisible();
  for (const n of [1, 2, 3, 4, 5]) await expect(page.getByTestId(`reading-stage-${n}`)).toBeDisabled();
  await page.getByTestId('reading-stage-1').click({ force: true });
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
  await expect(page.getByTestId('reading-stage-1')).toBeDisabled();
});

// ==================== 6. Étapes 3, 4 et 5 par l'étape de départ ====================

for (const startStage of [3, 4] as const) {
  test(`étape de départ ${startStage} : séance complète, retour à l’accueil sur l’étape ${startStage}`, async ({ page }) => {
    test.slow();
    await installFakeVoice(page, 'fr');
    await onboardMs(page, 'Alice', startStage);
    await chooseProfile(page, 'Alice');
    await openReading(page);
    for (let n = 1; n < startStage; n += 1) await expect(page.getByTestId(`reading-stage-${n}`)).toHaveAttribute('data-state', 'done');
    await expect(page.getByTestId(`reading-stage-${startStage}`)).toHaveAttribute('data-state', 'current');

    await startCurrentStage(page);
    const played = await playFullSession(page);
    const games = new Set(played.map((q) => q.game));
    expect(games.size).toBeGreaterThan(1);
    expect([...games].some((g) => LETTER_GAMES.includes(g)), [...games].join(', ')).toBe(true);
    await finishEnd(page);
    await expect(page.getByTestId(`reading-stage-${startStage}`)).toHaveAttribute('data-state', 'current');

    const [session] = await readReadings(page);
    expect(session?.status).toBe('completed');
    expect(session?.stage).toBe(startStage);
  });
}

test('étape de départ 3 : la machine à syllabes apparaît dès que la fusion est au programme', async ({ page }) => {
  test.slow();
  await installFakeVoice(page, 'fr');
  await onboardMs(page, 'Alice', 4); // k:blend (étape 3) est acquis d'office : il revient en révision
  await chooseProfile(page, 'Alice');
  await openReading(page);
  const seen = new Set<string>();
  for (let i = 0; i < 3 && !seen.has('syllable-machine'); i += 1) {
    await startCurrentStage(page);
    for (const q of await playFullSession(page)) seen.add(q.game);
    await finishEnd(page);
  }
  expect([...seen], 'machine à syllabes jamais proposée en 3 séances').toContain('syllable-machine');
});

test('étape de départ 5 : mot mystère puis jumelles', async ({ page }) => {
  test.slow();
  await installFakeVoice(page, 'fr');
  await onboardMs(page, 'Alice', 5);
  await chooseProfile(page, 'Alice');
  await openReading(page);
  await expect(page.getByTestId('reading-stage-5')).toHaveAttribute('data-state', 'current');
  const seen = new Set<string>();
  for (let i = 0; i < 3 && !(seen.has('mystery-word') && seen.has('letter-twins')); i += 1) {
    await startCurrentStage(page);
    for (const q of await playFullSession(page)) seen.add(q.game);
    await finishEnd(page);
  }
  expect([...seen]).toContain('mystery-word');
  expect([...seen]).toContain('letter-twins');
});
