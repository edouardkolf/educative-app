// Captures d'écran pour la revue visuelle du programme de lecture (360 × 640). NON exécuté par la suite normale
// (le suffixe `.manual.ts` n'est pas un `.spec.ts`). Lancement :
//   SHOTS_DIR=/chemin/shots npx playwright test --config <config avec testMatch /.*\.manual\.ts/>
// Chaque capture est accompagnée de mesures (défilement, cibles tactiles) écrites dans `metrics.json`.
import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chooseProfile } from './nav';
import {
  finishEnd,
  installFakeVoice,
  onboardMs,
  openParentDashboard,
  openReading,
  playFullSession,
  startCurrentLevel,
} from './reading-helpers';

const DIR = process.env.SHOTS_DIR ?? 'test-results/reading-shots';
mkdirSync(DIR, { recursive: true });
test.use({ viewport: { width: 360, height: 640 } });

const metrics: Record<string, unknown>[] = [];

/** Capture + mesures : défilement vertical/horizontal et cibles tactiles de moins de 72 px (écrans enfant). */
async function shot(page: Page, name: string, opts: { child?: boolean; fullPage?: boolean } = {}): Promise<void> {
  await page.waitForTimeout(350); // laisse finir les animations d'entrée
  const m = await page.evaluate((child) => {
    const de = document.documentElement;
    const scroller = document.querySelector('.screen') as HTMLElement | null;
    const small: string[] = [];
    if (child) {
      document.querySelectorAll<HTMLElement>('button, [data-choice]').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return;
        if (r.width < 72 || r.height < 72) {
          small.push(`${el.getAttribute('data-testid') ?? el.getAttribute('data-choice') ?? el.className}:${Math.round(r.width)}x${Math.round(r.height)}`);
        }
      });
    }
    return {
      overflowX: de.scrollWidth > de.clientWidth + 1,
      overflowY: de.scrollHeight > de.clientHeight + 1,
      screenScroll: scroller ? scroller.scrollHeight > scroller.clientHeight + 1 : null,
      small,
    };
  }, opts.child ?? false);
  metrics.push({ name, ...m });
  await page.screenshot({ path: `${DIR}/${name}.png`, fullPage: opts.fullPage ?? false });
}

test.afterAll(() => {
  writeFileSync(`${DIR}/metrics.json`, JSON.stringify(metrics, null, 1));
});

const GAME_FILES: Record<string, string> = {
  'syllable-drum': '05-game-syllable-drum',
  'same-start': '06-game-same-start',
  'same-end': '07-game-same-end',
  'letter-sound': '08-game-letter-sound',
  'first-sound': '09-game-first-sound',
  'syllable-machine': '10-game-syllable-machine',
  'mystery-word': '11-game-mystery-word',
  'letter-twins': '12-game-letter-twins',
};

/** Joue des séances jusqu'à avoir capturé chaque jeu voulu (choix actifs, question non guidée). */
let wrongShot = false;

async function collectGames(page: Page, wanted: string[], done: Set<string>, maxSessions: number, err = false): Promise<void> {
  for (let i = 0; i < maxSessions && wanted.some((g) => !done.has(g)); i += 1) {
    await startCurrentLevel(page);
    await playFullSession(page, {
      errOnce: err && !wrongShot,
      afterWrong: async (_info, p) => {
        wrongShot = true;
        await shot(p, '14-wrong-choice', { child: true });
      },
      beforeAnswer: async (info, p) => {
        if (info.guided || done.has(info.game) || !wanted.includes(info.game)) return;
        done.add(info.game);
        await shot(p, GAME_FILES[info.game]!, { child: true });
      },
    });
    await finishEnd(page);
  }
}

test('captures du programme de lecture', async ({ page }) => {
  test.setTimeout(1_800_000);
  await installFakeVoice(page, 'fr');
  const done = new Set<string>();

  // ---- A. Étape 1 : hub, accueil, jeux d'écoute, choix faux, fête ----
  await onboardMs(page, 'Alice');
  await chooseProfile(page, 'Alice');
  await page.waitForTimeout(1500); // les tuiles arrivent l'une après l'autre
  await shot(page, '01-hub', { child: true });
  await openReading(page);
  await shot(page, '02-home-stage1', { child: true });

  await startCurrentLevel(page);
  let guidedShot = false;
  await playFullSession(page, {
    beforeAnswer: async (info, p) => {
      if (info.guided && !guidedShot) {
        guidedShot = true;
        await page.waitForTimeout(1200); // la main animée arrive
        await shot(p, '13-demo-guided', { child: true });
      }
      if (info.guided || done.has(info.game) || !['syllable-drum', 'same-start', 'same-end'].includes(info.game)) return;
      done.add(info.game);
      await shot(p, GAME_FILES[info.game]!, { child: true });
    },
  });
  await page.waitForTimeout(500);
  await shot(page, '15-end-early', { child: true });
  await expect(page.getByTestId('reading-end-continue')).toBeVisible();
  await shot(page, '16-end', { child: true });
  await finishEnd(page);
  await shot(page, '17-home-after-session', { child: true });

  // ---- B. Départ à l'étape 4 : lettres, machine à syllabes ; puis l'espace parent ----
  await page.getByTestId('to-hub').click();
  await page.getByTestId('hub-to-profiles').click();
  await openParentDashboard(page);
  await page.getByRole('button', { name: 'Modifier' }).click();
  await expect(page.getByTestId('reading-start-stage')).toBeVisible();
  await page.getByTestId('reading-start-stage').scrollIntoViewIfNeeded();
  await shot(page, '24-parent-start-stage');
  await page.getByTestId('reading-start-stage').selectOption('4');
  await page.getByTestId('save-child').click();
  await page.getByTestId('back-to-game').click();
  await chooseProfile(page, 'Alice');
  await openReading(page);
  await shot(page, '03-home-stage4', { child: true });
  await collectGames(page, ['letter-sound', 'first-sound', 'syllable-machine', 'same-end'], done, 4, true);

  // ---- C. Départ à l'étape 5 : mot mystère, jumelles ----
  await page.getByTestId('to-hub').click();
  await page.getByTestId('hub-to-profiles').click();
  await openParentDashboard(page);
  await page.getByRole('button', { name: 'Modifier' }).click();
  await page.getByTestId('reading-start-stage').selectOption('5');
  await page.getByTestId('save-child').click();
  await page.getByTestId('back-to-game').click();
  await chooseProfile(page, 'Alice');
  await openReading(page);
  await collectGames(page, ['mystery-word', 'letter-twins', 'syllable-machine', 'letter-sound', 'first-sound'], done, 4);

  // ---- D. Espace parent : statistiques puis banc d'écoute ----
  await page.getByTestId('to-hub').click();
  await page.getByTestId('hub-to-profiles').click();
  await openParentDashboard(page);
  await page.getByRole('button', { name: 'Statistiques' }).click();
  const card = page.getByTestId('game-stats-reading');
  await card.scrollIntoViewIfNeeded();
  await shot(page, '21-parent-stats-top');
  await card.locator('.rp-legend').scrollIntoViewIfNeeded();
  await shot(page, '22-parent-stats-legend');
  await card.getByTestId('reading-bench').scrollIntoViewIfNeeded();
  await shot(page, '22b-parent-stats-bottom');
  const bench = card.getByTestId('reading-bench');
  await bench.locator('summary').click();
  await bench.scrollIntoViewIfNeeded();
  await shot(page, '23-parent-bench-open');
  await page.mouse.wheel(0, 500);
  await shot(page, '23b-parent-bench-scrolled');

  expect([...done].sort(), 'jeux jamais capturés').toEqual(Object.keys(GAME_FILES).sort());
});

test('présentation d’une lettre nouvelle (voix ralentie)', async ({ page }) => {
  test.setTimeout(120_000);
  await installFakeVoice(page, 'fr');
  await onboardMs(page, 'Alice', 2);
  await chooseProfile(page, 'Alice');
  await openReading(page);
  await shot(page, '04-home-stage2', { child: true });
  await page.evaluate(() => {
    (window as unknown as { __speakMs: number }).__speakMs = 60_000;
  });
  await page.locator('[data-testid^="reading-level-"][data-state="current"]').click({ force: true });
  await expect(page.getByTestId('reading-question')).toBeVisible();
  await expect(page.getByTestId('reading-question')).toHaveAttribute('data-game', 'letter-sound');
  await shot(page, '18-new-letter-presentation', { child: true });
});

test('jeu « finit pareil » (rime) : atteint par révision', async ({ page }) => {
  test.setTimeout(300_000);
  await installFakeVoice(page, 'fr');
  await onboardMs(page, 'Alice', 3);
  await chooseProfile(page, 'Alice');
  await openReading(page);
  await collectGames(page, ['same-end'], new Set(), 4);
});
