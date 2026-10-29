// Jeux de logique (docs/specs/JEUX-LOGIQUE.md) : jeux libres (devine le nombre, code secret, robot), un raté,
// niveaux de la carte (nombre, code, pendu, robot, morpion ; MS : robot pas à pas, code), statistiques parent
// et alternance visible sur la carte. Aides de navigation communes : tests/e2e/nav.ts (arbitrage A11).
//
// Les vues exposent la manche courante en DOM : `.play-round[data-answer]` (nombre secret, code, id du mot) et,
// pour le robot, `.robot-view[data-size|data-start|data-goal|data-rocks]` (le trajet est calculé par BFS ici).
import { test, expect, type Locator, type Page } from '@playwright/test';
import { HANGMAN_WORDS_BY_ID } from '../../src/games/hangman/words';
import { backToHub, backToProfiles, chooseProfile } from './nav';

const PARENT_PIN = '1234';

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

// ---------- Aides : espace parent ----------

async function enterPin(page: Page, pin: string): Promise<void> {
  for (const digit of pin) await page.getByTestId(`pin-key-${digit}`).click();
}

/** Premier lancement : code parent 1234, puis un enfant (sans limite de temps). Termine sur l'écran profils. */
async function onboardWithChild(page: Page, name: string, track: 'ms' | 'ce1'): Promise<void> {
  await page.goto('/');
  await page.getByText('Commencer : espace parent').click();
  await expect(page.getByText('Créer le code parent')).toBeVisible();
  await enterPin(page, PARENT_PIN);
  await expect(page.getByText('Confirme le code')).toBeVisible();
  await enterPin(page, PARENT_PIN);
  await expect(page.getByRole('heading', { name: 'Espace parent' })).toBeVisible();
  await page.getByTestId('add-child').click();
  await page.locator('input[name=name]').fill(name);
  if (track === 'ce1') {
    await page.locator('.pa-track-option', { hasText: 'CE1' }).click();
    await expect(page.locator('.pa-track-option', { hasText: 'CE1' })).toHaveAttribute('aria-pressed', 'true');
  }
  await page.locator('select[name=sessionMinutes]').selectOption('');
  await page.locator('select[name=dailyMinutes]').selectOption('');
  await page.getByTestId('save-child').click();
  await expect(page.getByRole('heading', { name: 'Espace parent' })).toBeVisible();
  await page.getByTestId('back-to-game').click();
  await expect(page.getByText('Commencer : espace parent')).toHaveCount(0);
}

async function longPress(page: Page, locator: Locator, ms: number): Promise<void> {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  if (!box) throw new Error('Élément introuvable pour simuler un appui long.');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  await page.mouse.up();
}

/** Depuis l'écran profils : espace parent puis statistiques de l'enfant. */
async function openChildStats(page: Page, childName: string): Promise<void> {
  await longPress(page, page.getByTestId('parent-access'), 2100);
  await expect(page.getByText('Code parent', { exact: true })).toBeVisible();
  await enterPin(page, PARENT_PIN);
  await expect(page.getByRole('heading', { name: 'Espace parent' })).toBeVisible();
  await page.getByRole('button', { name: 'Statistiques' }).click();
  await expect(page.getByRole('heading', { name: childName })).toBeVisible();
}

/** Réglage manuel « débloquer » d'un niveau ; part de l'écran profils et y revient. */
async function unlockLevel(page: Page, childName: string, levelId: string): Promise<void> {
  await openChildStats(page, childName);
  await page.getByTestId(`override-${levelId}-unlocked`).click();
  await expect(page.getByTestId(`override-${levelId}-unlocked`)).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Retour aux enfants' }).click();
  await page.getByTestId('back-to-game').click();
  await expect(page.getByText('Commencer : espace parent')).toHaveCount(0);
}

/** Ouvre un niveau par son hash (le profil actif vit en mémoire : pas de page.goto). */
async function openLevelHash(page: Page, levelId: string): Promise<void> {
  await page.evaluate((id) => {
    window.location.hash = `#/play/${encodeURIComponent(id)}`;
  }, levelId);
  await expect(page).toHaveURL(new RegExp(`#/play/${levelId}$`));
  await expect(page.locator('.screen--loading')).toHaveCount(0);
  await expect(page.locator('.play-round[data-answer]')).toBeVisible();
  await expect(page.locator('[data-choice]').first()).toBeVisible();
}

// ---------- Aides : résolution d'une manche, par mécanique ----------

const round = (page: Page): Locator => page.locator('.play-round[data-answer]');

async function answerOf(page: Page): Promise<string> {
  const answer = await round(page).getAttribute('data-answer');
  if (!answer) throw new Error('Aucune manche affichée (data-answer introuvable).');
  return answer;
}

type Dir = 'up' | 'down' | 'left' | 'right';
interface Pos {
  x: number;
  y: number;
}
const DELTA: Record<Dir, Pos> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const parsePos = (s: string): Pos => {
  const [x, y] = s.split(',').map(Number);
  return { x: x as number, y: y as number };
};

interface RobotBoard {
  size: number;
  start: Pos;
  goal: Pos;
  rocks: Pos[];
  mode: string;
}

async function readRobot(page: Page): Promise<RobotBoard> {
  const view = page.locator('.robot-view');
  await expect(view).toBeVisible();
  const size = Number(await view.getAttribute('data-size'));
  const rocksAttr = (await view.getAttribute('data-rocks')) ?? '';
  return {
    size,
    start: parsePos((await view.getAttribute('data-start')) as string),
    goal: parsePos((await view.getAttribute('data-goal')) as string),
    rocks: rocksAttr === '' ? [] : rocksAttr.split(';').map(parsePos),
    mode: (await view.getAttribute('data-mode')) as string,
  };
}

/** Plus court chemin par BFS (flèches). Les rochers et les bords bloquent. */
function bfsPath(b: RobotBoard): Dir[] {
  const key = (p: Pos) => `${p.x},${p.y}`;
  const blocked = new Set(b.rocks.map(key));
  const prev = new Map<string, { from: Pos; dir: Dir }>();
  const seen = new Set([key(b.start)]);
  const queue: Pos[] = [b.start];
  for (let i = 0; i < queue.length; i += 1) {
    const cur = queue[i] as Pos;
    if (key(cur) === key(b.goal)) break;
    for (const dir of Object.keys(DELTA) as Dir[]) {
      const next = { x: cur.x + DELTA[dir].x, y: cur.y + DELTA[dir].y };
      if (next.x < 0 || next.y < 0 || next.x >= b.size || next.y >= b.size) continue;
      if (blocked.has(key(next)) || seen.has(key(next))) continue;
      seen.add(key(next));
      prev.set(key(next), { from: cur, dir });
      queue.push(next);
    }
  }
  if (!seen.has(key(b.goal))) throw new Error('Robot : trésor inatteignable (BFS).');
  const path: Dir[] = [];
  for (let cur = b.goal; key(cur) !== key(b.start); ) {
    const step = prev.get(key(cur)) as { from: Pos; dir: Dir };
    path.push(step.dir);
    cur = step.from;
  }
  return path.reverse();
}

/** Position du robot lue sur son style (translate(x*100px, y*100px)). */
async function robotPos(page: Page): Promise<Pos> {
  const transform = await page.locator('.robot-mover').evaluate((el) => (el as HTMLElement).style.transform);
  const m = /translate\((-?\d+)px,\s*(-?\d+)px\)/.exec(transform);
  if (!m) throw new Error(`Transform du robot illisible : ${transform}`);
  return { x: Number(m[1]) / 100, y: Number(m[2]) / 100 };
}

/** Joue la manche robot affichée : pas à pas (une flèche = un déplacement) ou programme (flèches puis ▶). */
async function solveRobotRound(page: Page): Promise<void> {
  const board = await readRobot(page);
  const path = bfsPath(board);
  for (const dir of path) {
    await page.locator(`[data-choice="arrow-${dir}"]`).click();
    if (board.mode === 'step') await page.waitForTimeout(60);
  }
  if (board.mode === 'program') {
    await expect(page.locator('.robot-slot.is-filled')).toHaveCount(path.length);
    await page.locator('[data-choice="run"]').click();
  }
}

/** Résout la manche affichée d'un jeu libre ou d'un niveau, selon la mécanique. */
async function solveRound(page: Page, game: 'guess-number' | 'code-breaker' | 'robot'): Promise<void> {
  if (game === 'guess-number') {
    const answer = await answerOf(page);
    await page.locator(`[data-choice="${answer.startsWith('num-') ? answer : `num-${answer}`}"]`).click();
  } else if (game === 'code-breaker') {
    const answer = await answerOf(page);
    for (const color of answer.split('-')) await page.locator(`[data-choice="color-${color}"]`).click();
    await page.locator('[data-choice="submit"]').click();
  } else {
    await solveRobotRound(page);
  }
}

/** Handle du nœud racine de la vue de mécanique : détaché quand la manche suivante arrive. */
async function viewHandle(page: Page) {
  const handle = await page.locator('.puzzle-stage .play-round > *').first().elementHandle();
  if (!handle) throw new Error('Vue de mécanique introuvable.');
  return handle;
}

async function expectNewRound(page: Page, handle: Awaited<ReturnType<typeof viewHandle>>): Promise<void> {
  await expect.poll(() => handle.evaluate((el) => el.isConnected), { timeout: 10_000 }).toBe(false);
  await expect(page.locator('.puzzle-stage .play-round > *').first()).toBeVisible();
}

// ---------- Aides : écran de jeu libre ----------

async function openFreeGame(page: Page, game: string): Promise<void> {
  await page.getByTestId(`hub-tile-${game}`).click();
  await expect(page).toHaveURL(new RegExp(`#/${game}$`));
  await expect(page.getByTestId('puzzle')).toHaveAttribute('data-phase', 'choose');
  await expect(page.getByTestId('puzzle-preset-easy')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('puzzle-preset-medium')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByTestId('puzzle-preset-hard')).toHaveAttribute('aria-pressed', 'false');
}

async function startFreeGame(page: Page): Promise<void> {
  await page.getByTestId('puzzle-play').click();
  await expect(page.getByTestId('puzzle')).toHaveAttribute('data-phase', 'play');
  await expect(page.getByTestId('puzzle-solved')).toHaveAttribute('data-count', '0');
  await expect(round(page)).toBeVisible();
}

/** Résout UNE manche d'un jeu libre, vérifie le compteur puis l'arrivée d'une nouvelle manche. */
async function solveOneFreeRound(page: Page, game: 'guess-number' | 'code-breaker' | 'robot'): Promise<void> {
  const handle = await viewHandle(page);
  await solveRound(page, game);
  await expect(page.getByTestId('puzzle-solved')).toHaveAttribute('data-count', '1');
  await expectNewRound(page, handle);
  await expect(page.getByTestId('puzzle-solved')).toHaveAttribute('data-count', '1');
}

// ==================== 1. Jeux libres (CE1) ====================

test.describe('jeux libres CE1', () => {
  test.slow();

  for (const game of ['guess-number', 'code-breaker'] as const) {
    test(`${game} : ★ présélectionné, une manche résolue, nouvelle manche, retour au hub`, async ({ page }) => {
      await onboardWithChild(page, 'Noa', 'ce1');
      await chooseProfile(page, 'Noa');
      await openFreeGame(page, game);
      await startFreeGame(page);
      await solveOneFreeRound(page, game);
      await backToHub(page);
    });
  }

  test('robot ★ (pas à pas) : le robot rejoint le trésor, un choc ne le déplace pas, nouvelle manche', async ({ page }) => {
    await onboardWithChild(page, 'Noa', 'ce1');
    await chooseProfile(page, 'Noa');
    await openFreeGame(page, 'robot');
    await startFreeGame(page);

    const board = await readRobot(page);
    expect(board.mode).toBe('step');
    await expect(page.locator('.robot-slot')).toHaveCount(0); // pas de bande de programme en pas à pas
    await expect(page.locator('[data-choice="run"]')).toHaveCount(0);
    expect(await robotPos(page)).toEqual(board.start);

    // Un choc (bord ou rocher) : le robot reste sur place, la manche continue.
    const blockedDir = (Object.keys(DELTA) as Dir[]).find((dir) => {
      const n = { x: board.start.x + DELTA[dir].x, y: board.start.y + DELTA[dir].y };
      return (
        n.x < 0 ||
        n.y < 0 ||
        n.x >= board.size ||
        n.y >= board.size ||
        board.rocks.some((r) => r.x === n.x && r.y === n.y)
      );
    });
    if (blockedDir) {
      await page.locator(`[data-choice="arrow-${blockedDir}"]`).click();
      await page.waitForTimeout(500);
      expect(await robotPos(page)).toEqual(board.start);
      await expect(page.getByTestId('puzzle-solved')).toHaveAttribute('data-count', '0');
    }

    const handle = await viewHandle(page);
    const path = bfsPath(board);
    for (const dir of path) {
      await page.locator(`[data-choice="arrow-${dir}"]`).click();
      await page.waitForTimeout(60);
    }
    await expect(page.getByTestId('puzzle-solved')).toHaveAttribute('data-count', '1');
    await expectNewRound(page, handle);
    await backToHub(page);
  });

  test('robot ★★ (programme) : un programme faux échoue sans compter, le bon trajet gagne, nouvelle manche', async ({
    page,
  }) => {
    await onboardWithChild(page, 'Noa', 'ce1');
    await chooseProfile(page, 'Noa');
    await openFreeGame(page, 'robot');
    await page.getByTestId('puzzle-preset-medium').click();
    await expect(page.getByTestId('puzzle-preset-medium')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('puzzle-preset-easy')).toHaveAttribute('aria-pressed', 'false');
    await startFreeGame(page);

    const board = await readRobot(page);
    expect(board.mode).toBe('program');
    const path = bfsPath(board);

    // Programme volontairement faux : une seule flèche (le trajet minimal en demande au moins 4).
    await page.locator(`[data-choice="arrow-${path[0]}"]`).click();
    await expect(page.locator('.robot-slot.is-filled')).toHaveCount(1);
    await page.locator('[data-choice="run"]').click();
    await expect(page.locator('.robot-slot.is-filled')).toHaveCount(1); // le programme reste affiché pour être corrigé
    await expect(page.getByTestId('puzzle-solved')).toHaveAttribute('data-count', '0');
    await expect.poll(() => robotPos(page), { timeout: 5000 }).toEqual(board.start); // retour au départ

    // Retirer la flèche (tap sur sa case) une fois le robot revenu et les touches de nouveau actives.
    await expect(page.locator('.robot-btn--run:not(.is-locked)')).toBeVisible();
    await page.locator('[data-choice="slot-0"]').click();
    await expect(page.locator('.robot-slot.is-filled')).toHaveCount(0);
    const handle = await viewHandle(page);
    await solveRobotRound(page);
    await expect(page.getByTestId('puzzle-solved')).toHaveAttribute('data-count', '1', { timeout: 10_000 });
    await expectNewRound(page, handle);
    await backToHub(page);
  });
});

// ==================== 2. Un raté dans devine le nombre ====================

test('devine le nombre ★ : 8 propositions fausses, puis le bon nombre ; la partie compte un raté', async ({ page }) => {
  test.slow();
  await onboardWithChild(page, 'Lina', 'ce1');
  await chooseProfile(page, 'Lina');
  await openFreeGame(page, 'guess-number');
  await startFreeGame(page);

  const answer = await answerOf(page);
  const secret = Number(answer.replace('num-', ''));
  expect(secret).toBeGreaterThanOrEqual(1);
  expect(secret).toBeLessThanOrEqual(20);

  // 8 propositions fausses, toujours dans l'intervalle encore possible (les autres tuiles sont grisées).
  const wrong: number[] =
    secret >= 9
      ? Array.from({ length: 8 }, (_, i) => i + 1)
      : Array.from({ length: 8 }, (_, i) => 20 - i);
  for (const n of wrong) {
    await page.locator(`[data-choice="num-${n}"]`).click();
    await expect(page.locator(`[data-choice="num-${n}"]`)).toBeDisabled();
  }
  // Le budget est dépassé mais l'écran continue : pas de solution, pas d'erreur, le bon nombre est encore jouable.
  await expect(page.getByTestId('puzzle-solved')).toHaveAttribute('data-count', '0');
  await expect(page.locator('.gn-pips--over')).toBeVisible();
  await expect(page.locator(`[data-choice="num-${secret}"]`)).toBeEnabled();

  const handle = await viewHandle(page);
  await page.locator(`[data-choice="num-${secret}"]`).click();
  await expect(page.getByTestId('puzzle-solved')).toHaveAttribute('data-count', '1');
  await expectNewRound(page, handle);

  // La partie est résolue mais pas du premier coup : 1 manche résolue, 0 % du premier coup.
  await backToHub(page);
  await page.getByTestId('hub-to-profiles').click();
  await openChildStats(page, 'Lina');
  const stats = page.getByTestId('game-stats-guess-number').getByTestId('puzzle-stats');
  await expect(stats).toBeVisible();
  await expect(stats.getByTestId('puzzle-preset-easy')).toHaveText('1');
  await expect(stats.locator('tbody tr').first().locator('td').nth(1)).toHaveText(/^0\s*%$/);
});

// ==================== 3. Niveaux de la carte, jusqu'aux étoiles ====================

async function waitForLevelEnd(page: Page, timeout = 60_000): Promise<void> {
  await expect(page.getByTestId('level-end')).toBeVisible({ timeout });
}

async function roundIndex(page: Page): Promise<number | null> {
  const classes = await page.locator('.play-progress__dot').evaluateAll((els) => els.map((el) => el.className));
  const index = classes.findIndex((c) => c.includes('is-current'));
  return index === -1 ? null : index;
}

/** Joue `rounds` manches d'un niveau (résolution à chaque fois, en attendant l'avance du moteur). */
async function playLevelRounds(
  page: Page,
  rounds: number,
  solve: () => Promise<void>,
): Promise<void> {
  for (let i = 0; i < rounds; i += 1) {
    const before = await roundIndex(page);
    await solve();
    await expect
      .poll(
        async () => ((await page.getByTestId('level-end').isVisible()) ? 'end' : roundIndex(page)),
        { timeout: 15_000 },
      )
      .not.toBe(before);
  }
}

async function setupLevel(page: Page, name: string, track: 'ms' | 'ce1', levelId: string): Promise<void> {
  await onboardWithChild(page, name, track);
  await unlockLevel(page, name, levelId);
  await chooseProfile(page, name);
  await openLevelHash(page, levelId);
}

test.describe('niveaux de raisonnement', () => {
  test.slow();

  test('ce1-nombre-01 : 3 manches, 3 étoiles, tutoriel au premier tour', async ({ page }) => {
    await setupLevel(page, 'Zoé', 'ce1', 'ce1-nombre-01');
    await expect(page.locator('.tutorial-hand')).toBeVisible();
    await playLevelRounds(page, 3, () => solveRound(page, 'guess-number'));
    await waitForLevelEnd(page);
    await expect(page.getByTestId('level-end')).toHaveAttribute('data-stars', '3');
    await page.getByTestId('to-map').click();
    await expect(page.locator('[data-level="ce1-nombre-01"]')).toHaveAttribute('data-status', 'completed');
  });

  test('ce1-code-01 : 3 manches, 3 étoiles', async ({ page }) => {
    await setupLevel(page, 'Zoé', 'ce1', 'ce1-code-01');
    await playLevelRounds(page, 3, () => solveRound(page, 'code-breaker'));
    await waitForLevelEnd(page);
    await expect(page.getByTestId('level-end')).toHaveAttribute('data-stars', '3');
  });

  test('ce1-pendu-01 : 3 mots (lettres sans accent), 3 étoiles', async ({ page }) => {
    await setupLevel(page, 'Zoé', 'ce1', 'ce1-pendu-01');
    await playLevelRounds(page, 3, async () => {
      const id = await answerOf(page);
      const entry = HANGMAN_WORDS_BY_ID.get(id);
      if (!entry) throw new Error(`Mot inconnu du catalogue : ${id}`);
      const letters = new Set(
        [...entry.word.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()],
      );
      for (const letter of letters) {
        await page.locator(`[data-choice="letter-${letter}"]`).click();
      }
    });
    await waitForLevelEnd(page);
    await expect(page.getByTestId('level-end')).toHaveAttribute('data-stars', '3');
  });

  test('ce1-robot-01 : 3 trajets en programme, 3 étoiles', async ({ page }) => {
    await setupLevel(page, 'Zoé', 'ce1', 'ce1-robot-01');
    await playLevelRounds(page, 3, () => solveRound(page, 'robot'));
    await waitForLevelEnd(page);
    await expect(page.getByTestId('level-end')).toHaveAttribute('data-stars', '3');
  });

  test('ce1-morpion-01 : 2 grilles gagnantes contre le téléphone facile (3 vies, ne peut pas échouer)', async ({ page }) => {
    test.setTimeout(240_000);
    await setupLevel(page, 'Zoé', 'ce1', 'ce1-morpion-01');
    await expect(page.getByTestId('lives')).toHaveAttribute('data-lives', '3');

    const LINES = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6],
    ];
    const deadline = Date.now() + 200_000;
    let lastClicked = '';
    while (Date.now() < deadline) {
      if (await page.getByTestId('level-end').isVisible()) break;
      if (await page.getByTestId('level-failed').isVisible()) {
        throw new Error('Morpion : niveau perdu (plus de vies) malgré la stratégie gagner/bloquer/centre/coins.');
      }
      const view = page.locator('.tm-view');
      const result = await view.getAttribute('data-result', { timeout: 500 }).catch(() => 'absent');
      if (result !== null) {
        await page.waitForTimeout(150);
        continue;
      }
      const marks = await page.locator('.tm-view [data-choice^="cell-"]').evaluateAll((els) =>
        els.map((el) => el.getAttribute('data-mark')),
      );
      if (marks.length !== 9) {
        await page.waitForTimeout(150);
        continue;
      }
      const xs = marks.filter((m) => m === 'x').length;
      const os = marks.filter((m) => m === 'o').length;
      if (xs !== os) {
        await page.waitForTimeout(100); // le téléphone réfléchit (l'enfant commence toujours la grille)
        continue;
      }
      const free = marks.map((m, i) => (m === null ? i : -1)).filter((i) => i >= 0);
      const completing = (who: string) =>
        LINES.flatMap((line) => {
          const mine = line.filter((i) => marks[i] === who).length;
          const empty = line.filter((i) => marks[i] === null);
          return mine === 2 && empty.length === 1 ? [empty[0] as number] : [];
        });
      const cell =
        completing('x')[0] ??
        completing('o')[0] ??
        [4, 0, 2, 6, 8, 1, 3, 5, 7].find((i) => free.includes(i));
      if (cell === undefined) {
        await page.waitForTimeout(150);
        continue;
      }
      const signature = marks.join(',');
      if (signature === lastClicked) {
        await page.waitForTimeout(100);
        continue;
      }
      lastClicked = signature;
      await page.locator(`.tm-view [data-choice="cell-${cell}"]`).click({ timeout: 3000 }).catch(() => {
        lastClicked = '';
      });
    }
    await waitForLevelEnd(page, 5000);
    // Les étoiles s'allument une à une (data-stars = étoiles déjà affichées) ; une grille perdue en coûte, pas toutes.
    await expect
      .poll(async () => Number(await page.getByTestId('level-end').getAttribute('data-stars')), { timeout: 8000 })
      .toBeGreaterThanOrEqual(1);
  });

  test('ms-robot-01 (pas à pas) : 4 trajets, 3 étoiles', async ({ page }) => {
    await setupLevel(page, 'Alba', 'ms', 'ms-robot-01');
    await expect(page.locator('.robot-view')).toHaveAttribute('data-mode', 'step');
    await playLevelRounds(page, 4, () => solveRound(page, 'robot'));
    await waitForLevelEnd(page);
    await expect(page.getByTestId('level-end')).toHaveAttribute('data-stars', '3');
  });

  test('ms-robot-07 (pas à pas, 5×5) : 4 trajets, 3 étoiles', async ({ page }) => {
    await setupLevel(page, 'Alba', 'ms', 'ms-robot-07');
    await playLevelRounds(page, 4, () => solveRound(page, 'robot'));
    await waitForLevelEnd(page);
    await expect(page.getByTestId('level-end')).toHaveAttribute('data-stars', '3');
  });
});

// ==================== 4. Statistiques parent d'un jeu libre ====================

test('après une manche de code secret, la fiche statistiques montre le bloc puzzle-stats', async ({ page }) => {
  test.slow();
  await onboardWithChild(page, 'Ana', 'ce1');
  await chooseProfile(page, 'Ana');
  await openFreeGame(page, 'code-breaker');
  await startFreeGame(page);
  await solveOneFreeRound(page, 'code-breaker');
  await backToProfiles(page);

  await openChildStats(page, 'Ana');
  const section = page.getByTestId('game-stats-code-breaker');
  await expect(section).toBeVisible();
  const stats = section.getByTestId('puzzle-stats');
  await expect(stats).toBeVisible();
  await expect(stats.getByTestId('puzzle-stats-best')).toHaveText('1 étoile');
  await expect(stats.getByTestId('puzzle-preset-easy')).toHaveText('1');
  await expect(stats.getByTestId('puzzle-preset-medium')).toHaveText('0');
  // Un jeu libre non joué montre le même bloc, à zéro partout.
  const robot = page.getByTestId('game-stats-robot').getByTestId('puzzle-stats');
  await expect(robot.getByTestId('puzzle-stats-best')).toHaveText('—');
  await expect(robot.getByTestId('puzzle-preset-easy')).toHaveText('0');
});

// ==================== 5. Alternance visible sur la carte ====================

test('carte CE1 : le 5e nœud est ce1-morpion-01, puis un niveau de raisonnement tous les 5', async ({ page }) => {
  test.slow();
  await onboardWithChild(page, 'Lou', 'ce1');
  await chooseProfile(page, 'Lou');
  await page.getByTestId('hub-tile-map').click();
  await expect(page.locator('.screen--map')).toBeVisible();
  const nodes = page.locator('[data-level]');
  await expect(nodes.first()).toBeVisible();
  const ids = await nodes.evaluateAll((els) => els.map((el) => el.getAttribute('data-level')));
  expect(ids[4]).toBe('ce1-morpion-01');
  expect(ids[9]).toBe('ce1-nombre-01'); // une série de 4 niveaux de compétence entre deux niveaux de raisonnement
});
