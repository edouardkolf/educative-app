// Jeux de maternelle (docs/specs/JEUX-MATERNELLE.md) : memory (jeu libre + niveaux), ranger (taille, quantité),
// labyrinthe (tap, trace), alternance et monde de la montagne sur la carte MS, statistiques parent du memory.
// Aides de navigation communes : tests/e2e/nav.ts.
//
// Les vues exposent leur manche en DOM : `.play-round[data-answer]` (memory : « cleared » ; ranger : rangs/valeurs
// dans l'ordre croissant, « 1-2-3 » ; labyrinthe : chemin), `.memory-card[data-object]` (objet de chaque carte),
// `.maze-view[data-size|data-start|data-goal|data-right|data-down]` (murs ; le chemin est calculé par BFS ici).
import { readFileSync } from 'node:fs';
import { test, expect, type Locator, type Page } from '@playwright/test';
import { backToHub, backToProfiles, chooseProfile } from './nav';

const PARENT_PIN = '1234';
const TRACK = JSON.parse(readFileSync('content/tracks/ms.json', 'utf-8')) as { id: string; levels: string[] };

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

/** Premier lancement : code parent 1234, puis un enfant MS (sans limite de temps). Termine sur l'écran profils. */
async function onboardMs(page: Page, name: string): Promise<void> {
  await page.goto('/');
  await page.getByText('Commencer : espace parent').click();
  await expect(page.getByText('Créer le code parent')).toBeVisible();
  await enterPin(page, PARENT_PIN);
  await expect(page.getByText('Confirme le code')).toBeVisible();
  await enterPin(page, PARENT_PIN);
  await expect(page.getByRole('heading', { name: 'Espace parent' })).toBeVisible();
  await page.getByTestId('add-child').click();
  await page.locator('input[name=name]').fill(name);
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

const levelRounds = (levelId: string): number =>
  (JSON.parse(readFileSync(`content/levels/ms/${levelId}.json`, 'utf-8')) as { rounds: number }).rounds;

// ---------- Aides : niveaux ----------

const round = (page: Page): Locator => page.locator('.play-round[data-answer]');

async function roundIndex(page: Page): Promise<number | null> {
  const classes = await page.locator('.play-progress__dot').evaluateAll((els) => els.map((el) => el.className));
  const index = classes.findIndex((c) => c.includes('is-current'));
  return index === -1 ? null : index;
}

/** Joue `rounds` manches d'un niveau (résolution à chaque fois, en attendant l'avance du moteur). */
async function playLevelRounds(page: Page, rounds: number, solve: (i: number) => Promise<void>): Promise<void> {
  for (let i = 0; i < rounds; i += 1) {
    const before = await roundIndex(page);
    await solve(i);
    await expect
      .poll(async () => ((await page.getByTestId('level-end').isVisible()) ? 'end' : roundIndex(page)), {
        timeout: 15_000,
      })
      .not.toBe(before);
  }
}

async function waitForLevelEnd(page: Page): Promise<void> {
  await expect(page.getByTestId('level-end')).toBeVisible({ timeout: 60_000 });
}

// Les étoiles s'allument une à une : data-stars monte jusqu'au total.
const expectStars = (page: Page, n: number) =>
  expect.poll(() => stars(page), { timeout: 8000 }).toBe(n);
async function expectStarsBelow3(page: Page): Promise<void> {
  await page.waitForTimeout(3000); // laisse les étoiles s'allumer : le total final est < 3
  expect(await stars(page)).toBeLessThan(3);
}
const stars = async (page: Page): Promise<number> => Number(await page.getByTestId('level-end').getAttribute('data-stars'));

async function setupLevel(page: Page, name: string, levelId: string): Promise<void> {
  await onboardMs(page, name);
  await unlockLevel(page, name, levelId);
  await chooseProfile(page, name);
  await openLevelHash(page, levelId);
}

// ---------- Aides : memory ----------

/** Objet de chaque carte (index = numéro de carte), lu sur `data-object`. */
async function memoryObjects(page: Page): Promise<string[]> {
  const cards = page.locator('.memory-card');
  await expect(cards.first()).toBeVisible();
  return cards.evaluateAll((els) => els.map((el) => el.getAttribute('data-object') ?? ''));
}

/** Attend la fin de l'aperçu (toutes les cartes sont alors recachées) : les taps y sont ignorés. */
async function waitPeekOver(page: Page): Promise<void> {
  await expect(page.locator('.memory-card--up')).toHaveCount(0, { timeout: 8000 });
}

const card = (page: Page, i: number): Locator => page.locator(`[data-choice="card-${i}"]`);

/** Retrouve toutes les paires de la manche affichée, en vérifiant que chaque paire reste visible. */
async function solveMemoryRound(page: Page, skipPairs: ReadonlySet<string> = new Set()): Promise<void> {
  const objects = await memoryObjects(page);
  await waitPeekOver(page);
  const byObject = new Map<string, number[]>();
  objects.forEach((o, i) => byObject.set(o, [...(byObject.get(o) ?? []), i]));
  for (const [obj, idx] of byObject) {
    if (skipPairs.has(obj)) continue;
    expect(idx, `chaque objet apparaît exactement deux fois (${obj})`).toHaveLength(2);
    const before = await page.locator('.memory-card--found').count();
    await card(page, idx[0] as number).click();
    await card(page, idx[1] as number).click();
    await expect(page.locator('.memory-card--found')).toHaveCount(before + 2);
  }
}

// ---------- Aides : écran de jeu libre ----------

const stage = (page: Page): Locator => page.locator('.puzzle-stage .play-round[data-answer]');

async function openFreeMemory(page: Page): Promise<void> {
  await page.getByTestId('hub-tile-memory').click();
  await expect(page).toHaveURL(/#\/memory$/);
  await expect(page.getByTestId('puzzle')).toHaveAttribute('data-phase', 'choose');
  await expect(page.getByTestId('puzzle-preset-easy')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('puzzle-preset-medium')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByTestId('puzzle-preset-hard')).toHaveAttribute('aria-pressed', 'false');
}

async function startFreeGame(page: Page): Promise<void> {
  await page.getByTestId('puzzle-play').click();
  await expect(page.getByTestId('puzzle')).toHaveAttribute('data-phase', 'play');
  await expect(page.getByTestId('puzzle-solved')).toHaveAttribute('data-count', '0');
  await expect(stage(page)).toBeVisible();
}

async function viewHandle(page: Page) {
  const handle = await page.locator('.puzzle-stage .play-round > *').first().elementHandle();
  if (!handle) throw new Error('Vue de mécanique introuvable.');
  return handle;
}

async function expectNewRound(page: Page, handle: Awaited<ReturnType<typeof viewHandle>>): Promise<void> {
  await expect.poll(() => handle.evaluate((el) => el.isConnected), { timeout: 10_000 }).toBe(false);
  await expect(page.locator('.puzzle-stage .play-round > *').first()).toBeVisible();
}

// ==================== 1. Jeu libre memory ====================

test.describe('jeu libre memory', () => {
  test.slow();

  test('★ : 3 paires (aperçu), toutes retrouvées, une manche résolue, nouvelle manche', async ({ page }) => {
    await onboardMs(page, 'Mila');
    await chooseProfile(page, 'Mila');
    // Hub MS : 5 tuiles par défaut, dont le memory.
    await expect(page.getByTestId('hub').locator('[data-testid^="hub-tile-"]')).toHaveCount(5);
    for (const tile of ['map', 'coloring', 'code-breaker', 'robot', 'memory']) {
      await expect(page.getByTestId(`hub-tile-${tile}`)).toBeVisible();
    }
    await openFreeMemory(page);
    await startFreeGame(page);

    // ★ : 3 paires = 6 cartes, aperçu de toutes les faces au début.
    const objects = await memoryObjects(page);
    expect(objects).toHaveLength(6);
    expect(new Set(objects).size).toBe(3);
    await expect(page.locator('.memory-card--up')).toHaveCount(6);
    await waitPeekOver(page);

    const handle = await viewHandle(page);
    await solveMemoryRound(page);
    await expect(page.getByTestId('puzzle-solved')).toHaveAttribute('data-count', '1');
    await expectNewRound(page, handle);
    await expect(page.getByTestId('puzzle-solved')).toHaveAttribute('data-count', '1');
    // La nouvelle manche est une table neuve (rien de retourné une fois l'aperçu passé).
    await waitPeekOver(page);
    await expect(page.locator('.memory-card--found')).toHaveCount(0);
    await backToHub(page);
  });

  test('★★ : une paire ratée se recache, taps ignorés pendant ce temps, le jeu continue', async ({ page }) => {
    await onboardMs(page, 'Mila');
    await chooseProfile(page, 'Mila');
    await openFreeMemory(page);
    await page.getByTestId('puzzle-preset-medium').click();
    await expect(page.getByTestId('puzzle-preset-medium')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('puzzle-preset-easy')).toHaveAttribute('aria-pressed', 'false');
    await startFreeGame(page);

    const objects = await memoryObjects(page);
    expect(objects).toHaveLength(12);
    await waitPeekOver(page);

    // Deux cartes d'objets différents.
    const a = 0;
    const b = objects.findIndex((o) => o !== objects[a]);
    const c = objects.findIndex((o, i) => i !== a && i !== b && o !== objects[a] && o !== objects[b]);
    await card(page, a).click();
    await card(page, b).click();
    await expect(page.locator('.memory-card--up')).toHaveCount(2);
    // Pendant que les deux cartes sont visibles, un 3e tap est ignoré.
    await card(page, c).click();
    await expect(page.locator('.memory-card--up')).toHaveCount(2);
    await expect(card(page, c)).not.toHaveClass(/memory-card--up/);
    // Elles se recachent (~900 ms) ; rien n'est « trouvé », la manche n'est pas comptée.
    await expect(page.locator('.memory-card--up')).toHaveCount(0, { timeout: 4000 });
    await expect(page.locator('.memory-card--found')).toHaveCount(0);
    await expect(page.getByTestId('puzzle-solved')).toHaveAttribute('data-count', '0');

    // Le jeu continue : on retrouve toutes les paires.
    const handle = await viewHandle(page);
    await solveMemoryRound(page);
    await expect(page.getByTestId('puzzle-solved')).toHaveAttribute('data-count', '1');
    await expectNewRound(page, handle);
    await backToHub(page);
  });
});

// ==================== 2. Niveaux de la carte, jusqu'aux étoiles ====================

test.describe('niveaux de maternelle', () => {
  test.slow();

  test('ms-memoire-01 : la main du tutoriel disparaît au premier tap, 2 manches, 3 étoiles', async ({ page }) => {
    await setupLevel(page, 'Alba', 'ms-memoire-01');
    await expect(page.locator('.tutorial-hand')).toBeVisible();
    await waitPeekOver(page);
    const objects = await memoryObjects(page);
    expect(objects).toHaveLength(4); // 2 paires
    await card(page, 0).click();
    await expect(page.locator('.tutorial-hand')).toHaveCount(0);
    // Termine la manche 1 en reprenant la carte déjà retournée.
    const partner = objects.findIndex((o, i) => i !== 0 && o === objects[0]);
    await card(page, partner).click();
    await expect(page.locator('.memory-card--found')).toHaveCount(2);
    const other = objects.map((o, i) => (o !== objects[0] ? i : -1)).filter((i) => i >= 0);
    await card(page, other[0] as number).click();
    await card(page, other[1] as number).click();
    await expect(page.locator('.memory-card--found')).toHaveCount(4);
    await expect.poll(() => roundIndex(page), { timeout: 15_000 }).toBe(1);
    await expect(page.locator('.tutorial-hand')).toHaveCount(0); // tutoriel : première manche seulement

    await playLevelRounds(page, 1, () => solveMemoryRound(page));
    await waitForLevelEnd(page);
    await expectStars(page, 3);
    await page.getByTestId('to-map').click();
    await expect(page.locator('[data-level="ms-memoire-01"]')).toHaveAttribute('data-status', 'completed');
  });

  // ---------- ranger ----------

  async function playOrderRound(page: Page, mistake: boolean): Promise<void> {
    const ids = (await round(page).getAttribute('data-answer'))!.split('-');
    const view = page.locator('.order-view');
    await expect(view).toBeVisible();
    const poolIds = await page
      .locator('.order-item')
      .evaluateAll((els) => els.map((el) => (el.getAttribute('data-choice') ?? '').replace('item-', '')));
    expect([...poolIds].sort()).toEqual([...ids].sort());
    if (mistake) {
      // Un élément qui n'est pas le premier de l'ordre : il vibre et reste en haut.
      const wrong = ids[ids.length - 1] as string;
      await page.locator(`[data-choice="item-${wrong}"]`).click();
      await expect(page.locator(`[data-choice="item-${wrong}"]`)).toHaveClass(/order-item--shake/);
      await expect(page.locator(`[data-choice="item-${wrong}"]`)).toBeEnabled();
      await expect(page.locator('.order-slot--filled')).toHaveCount(0);
    }
    for (let k = 0; k < ids.length; k += 1) {
      await page.locator(`[data-choice="item-${ids[k]}"]`).click();
      await expect(page.locator('.order-slot--filled')).toHaveCount(k + 1);
      await expect(page.locator(`[data-choice="item-${ids[k]}"]`)).toBeDisabled();
    }
  }

  test('ms-ranger-01 (tailles) : un mauvais tap fait vibrer sans placer, ordre croissant, étoiles', async ({ page }) => {
    await setupLevel(page, 'Alba', 'ms-ranger-01');
    await expect(page.locator('.order-view')).toHaveAttribute('data-mode', 'size');
    await expect(page.locator('.tutorial-hand')).toBeVisible();

    // Le rang 1 est le plus petit : data-answer = « 1-2-3 ».
    expect(await round(page).getAttribute('data-answer')).toBe('1-2-3');
    // Les trois éléments ont des tailles différentes (le rang suit la taille de l'émoji).
    const sizes = await page
      .locator('.order-pool .order-item')
      .evaluateAll((els) =>
        els.map((el) => ({
          id: el.getAttribute('data-choice'),
          w: (el.querySelector('.order-emoji') as HTMLElement).getBoundingClientRect().width,
        })),
      );
    const byRank = ['item-1', 'item-2', 'item-3'].map((id) => sizes.find((s) => s.id === id)!.w);
    expect(byRank[0]).toBeLessThan(byRank[1] as number);
    expect(byRank[1]).toBeLessThan(byRank[2] as number);

    await playLevelRounds(page, levelRounds('ms-ranger-01'), (i) => playOrderRound(page, i === 0));
    await waitForLevelEnd(page);
    // Une manche ratée une fois (MISS) coûte au moins une étoile.
    await expectStarsBelow3(page);
  });

  test('ms-ranger-01 : sans erreur, 3 étoiles', async ({ page }) => {
    await setupLevel(page, 'Alba', 'ms-ranger-01');
    await playLevelRounds(page, levelRounds('ms-ranger-01'), () => playOrderRound(page, false));
    await waitForLevelEnd(page);
    await expectStars(page, 3);
  });

  test('ms-ranger-03 (quantités) : cartes de points, du moins au plus, 3 étoiles', async ({ page }) => {
    await setupLevel(page, 'Alba', 'ms-ranger-03');
    await expect(page.locator('.order-view')).toHaveAttribute('data-mode', 'quantity');
    await playLevelRounds(page, levelRounds('ms-ranger-03'), async () => {
      const ids = (await round(page).getAttribute('data-answer'))!.split('-');
      // L'identifiant d'une carte est sa valeur : le nombre de points affichés lui correspond.
      for (const id of ids) {
        const dots = await page.locator(`[data-choice="item-${id}"] circle`).count();
        expect(dots, `carte ${id} : 2 cercles par point`).toBe(Number(id) * 2);
      }
      expect(ids.map(Number)).toEqual([...ids.map(Number)].sort((x, y) => x - y));
      for (let k = 0; k < ids.length; k += 1) {
        await page.locator(`[data-choice="item-${ids[k]}"]`).click();
        await expect(page.locator('.order-slot--filled')).toHaveCount(k + 1);
      }
    });
    await waitForLevelEnd(page);
    await expectStars(page, 3);
  });

  // ---------- labyrinthe ----------

  interface Cell {
    r: number;
    c: number;
  }
  interface MazeBoard {
    size: number;
    start: Cell;
    goal: Cell;
    right: boolean[];
    down: boolean[];
  }
  const parseCell = (s: string): Cell => {
    const [r, c] = s.split(',').map(Number);
    return { r: r as number, c: c as number };
  };

  async function readMaze(page: Page): Promise<MazeBoard> {
    const view = page.locator('.maze-view');
    await expect(view).toBeVisible();
    return {
      size: Number(await view.getAttribute('data-size')),
      start: parseCell((await view.getAttribute('data-start')) as string),
      goal: parseCell((await view.getAttribute('data-goal')) as string),
      right: ((await view.getAttribute('data-right')) as string).split('').map((v) => v === '1'),
      down: ((await view.getAttribute('data-down')) as string).split('').map((v) => v === '1'),
    };
  }

  const open = (m: MazeBoard, a: Cell, b: Cell): boolean => {
    if (Math.abs(a.r - b.r) + Math.abs(a.c - b.c) !== 1) return false;
    const lo = a.r < b.r || a.c < b.c ? a : b;
    return (a.r === b.r ? m.right : m.down)[lo.r * m.size + lo.c] === true;
  };

  /** Chemin solution (cases, départ et arrivée compris) par BFS dans le labyrinthe lu en DOM. */
  function solution(m: MazeBoard): Cell[] {
    const key = (p: Cell) => p.r * m.size + p.c;
    const prev = new Map<number, Cell>();
    const seen = new Set([key(m.start)]);
    const queue = [m.start];
    for (let i = 0; i < queue.length; i += 1) {
      const cur = queue[i] as Cell;
      for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
        const n = { r: cur.r + dr, c: cur.c + dc };
        if (n.r < 0 || n.c < 0 || n.r >= m.size || n.c >= m.size || seen.has(key(n)) || !open(m, cur, n)) continue;
        seen.add(key(n));
        prev.set(key(n), cur);
        queue.push(n);
      }
    }
    if (!seen.has(key(m.goal))) throw new Error('Labyrinthe : arrivée inatteignable (BFS).');
    const path = [m.goal];
    while (key(path[0] as Cell) !== key(m.start)) path.unshift(prev.get(key(path[0] as Cell)) as Cell);
    return path;
  }

  /** Premier (case du chemin, voisine dans la grille séparée par un mur) : pour tester un choc / une coupure. */
  function wallStep(m: MazeBoard, path: Cell[]): { at: number; wall: Cell } {
    for (let at = 0; at < path.length; at += 1) {
      const p = path[at] as Cell;
      for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
        const n = { r: p.r + dr, c: p.c + dc };
        if (n.r < 0 || n.c < 0 || n.r >= m.size || n.c >= m.size) continue;
        if (!open(m, p, n)) return { at, wall: n };
      }
    }
    throw new Error('Labyrinthe : aucun mur à tester sur le chemin.');
  }

  /** Case de l'animal, lue sur le style de son conteneur (translate en unités de 100 par case). */
  async function animalCell(page: Page): Promise<Cell> {
    const t = await page.locator('.maze-mover').evaluate((el) => (el as unknown as SVGElement).style.transform);
    const m = /translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/.exec(t);
    if (!m) throw new Error(`Transform de l'animal illisible : ${t}`);
    return { r: Math.round((Number(m[2]) - 50) / 100), c: Math.round((Number(m[1]) - 50) / 100) };
  }

  const cellLocator = (page: Page, p: Cell): Locator => page.locator(`[data-choice="cell-${p.r}-${p.c}"]`);

  async function tapPath(page: Page, cells: Cell[]): Promise<void> {
    for (const p of cells) {
      await cellLocator(page, p).click();
      await expect.poll(() => animalCell(page)).toEqual(p);
    }
  }

  async function cellPoint(page: Page, size: number, p: Cell): Promise<{ x: number; y: number }> {
    const box = await page.locator('.maze-board').boundingBox();
    if (!box) throw new Error('Plateau du labyrinthe introuvable.');
    return { x: box.x + ((p.c + 0.5) * box.width) / size, y: box.y + ((p.r + 0.5) * box.height) / size };
  }

  /** Glisse du doigt (souris) case par case ; l'animal doit suivre à chaque case. */
  async function dragThrough(page: Page, m: MazeBoard, cells: Cell[]): Promise<void> {
    for (const p of cells) {
      const pt = await cellPoint(page, m.size, p);
      await page.mouse.move(pt.x, pt.y, { steps: 6 });
      await expect.poll(() => animalCell(page)).toEqual(p);
    }
  }

  async function pressOn(page: Page, m: MazeBoard, p: Cell): Promise<void> {
    const pt = await cellPoint(page, m.size, p);
    await page.mouse.move(pt.x, pt.y);
    await page.mouse.down();
  }

  test('ms-labyrinthe-01 (tap) : un tap sur une case derrière un mur ne bouge pas l\'animal, chemin case par case, 3 étoiles', async ({
    page,
  }) => {
    await setupLevel(page, 'Alba', 'ms-labyrinthe-01');
    await expect(page.locator('.maze-view')).toHaveAttribute('data-mode', 'tap');
    await expect(page.locator('.tutorial-hand')).toBeVisible();

    // Cibles tactiles : une case de la grille ≥ 44 px (assumé dans la spec).
    const hit = await cellLocator(page, { r: 0, c: 0 }).boundingBox();
    expect(hit!.width).toBeGreaterThanOrEqual(44);
    expect(hit!.height).toBeGreaterThanOrEqual(44);

    await playLevelRounds(page, levelRounds('ms-labyrinthe-01'), async (i) => {
      const m = await readMaze(page);
      const path = solution(m);
      expect(path.length).toBeGreaterThanOrEqual(2);
      expect(await animalCell(page)).toEqual(m.start);
      if (i === 0) {
        // Avance jusqu'à une case qui a un mur, puis tape de l'autre côté du mur : l'animal reste, il secoue la tête.
        const { at, wall } = wallStep(m, path);
        await tapPath(page, path.slice(1, at + 1));
        const here = path[at] as Cell;
        await cellLocator(page, wall).click();
        await expect(page.locator('.maze-shake')).toHaveCount(1);
        await page.waitForTimeout(400);
        expect(await animalCell(page)).toEqual(here);
        // Un seul choc ne coûte rien (le raté tombe au 3e).
        await tapPath(page, path.slice(at + 1));
      } else {
        await tapPath(page, path.slice(1));
      }
    });
    await waitForLevelEnd(page);
    await expectStars(page, 3);
    await page.getByTestId('to-map').click();
    await expect(page.locator('[data-level="ms-labyrinthe-01"]')).toHaveAttribute('data-status', 'completed');
  });

  test('ms-labyrinthe-01 : trois chocs contre un mur font un raté (étoile perdue), la manche continue', async ({ page }) => {
    await setupLevel(page, 'Alba', 'ms-labyrinthe-01');
    await playLevelRounds(page, levelRounds('ms-labyrinthe-01'), async (i) => {
      const m = await readMaze(page);
      const path = solution(m);
      if (i === 0) {
        const { at, wall } = wallStep(m, path);
        await tapPath(page, path.slice(1, at + 1));
        for (let k = 0; k < 3; k += 1) {
          await cellLocator(page, wall).click();
          await page.waitForTimeout(100);
        }
        expect(await animalCell(page)).toEqual(path[at]);
        await tapPath(page, path.slice(at + 1));
      } else {
        await tapPath(page, path.slice(1));
      }
    });
    await waitForLevelEnd(page);
    await expectStarsBelow3(page);
  });

  test('ms-labyrinthe-03 (trace) : tracé au doigt case par case, un tracé qui traverse un mur est coupé, 3 étoiles', async ({
    page,
  }) => {
    await setupLevel(page, 'Alba', 'ms-labyrinthe-03');
    await expect(page.locator('.maze-view')).toHaveAttribute('data-mode', 'trace');

    await playLevelRounds(page, levelRounds('ms-labyrinthe-03'), async (i) => {
      const m = await readMaze(page);
      const path = solution(m);
      expect(path.length).toBeGreaterThanOrEqual(10); // minPath du niveau
      expect(await animalCell(page)).toEqual(m.start);

      if (i === 0) {
        // Tracé coupé : on glisse jusqu'à une case qui a un mur, puis on traverse le mur.
        const { at, wall } = wallStep(m, path);
        await pressOn(page, m, m.start);
        await dragThrough(page, m, path.slice(1, at + 1));
        const here = path[at] as Cell;
        const pt = await cellPoint(page, m.size, wall);
        await page.mouse.move(pt.x, pt.y, { steps: 8 });
        await expect(page.locator('.maze-shake')).toHaveCount(1);
        await page.waitForTimeout(300);
        expect(await animalCell(page)).toEqual(here); // retour à la dernière case valide
        await page.mouse.up();
        // On reprend le tracé depuis l'animal et on le mène jusqu'au bout.
        await pressOn(page, m, here);
        await dragThrough(page, m, path.slice(at + 1));
        await page.mouse.up();
      } else {
        await pressOn(page, m, m.start);
        await dragThrough(page, m, path.slice(1));
        await page.mouse.up();
      }
    });
    await waitForLevelEnd(page);
    await expectStars(page, 3); // une seule coupure : pas de raté
  });
});

// ==================== 3. Alternance et monde de la montagne sur la carte MS ====================

test('carte MS : 60 niveaux, alternance (45, 50, 55, 60) et décor de la montagne au monde 3', async ({ page }) => {
  test.slow();
  await onboardMs(page, 'Lou');
  await chooseProfile(page, 'Lou');
  await page.getByTestId('hub-tile-map').click();
  await expect(page.locator('.screen--map')).toBeVisible();
  const nodes = page.locator('[data-level]');
  await expect(nodes.first()).toBeVisible();
  const ids = await nodes.evaluateAll((els) => els.map((el) => el.getAttribute('data-level')));
  expect(ids).toHaveLength(60);
  expect(ids[44]).toBe('ms-robot-04');
  expect(ids[49]).toBe('ms-code-04');
  expect(ids[54]).toBe('ms-morpion-03');
  expect(ids[59]).toBe('ms-robot-05');
  expect(ids).toEqual(TRACK.levels);

  // Trois mondes de 20 : forêt, mer, montagne.
  const worlds = await nodes.evaluateAll((els) => els.map((el) => el.getAttribute('data-world')));
  expect(worlds.slice(0, 20).every((w) => w === 'forest')).toBe(true);
  expect(worlds.slice(20, 40).every((w) => w === 'sea')).toBe(true);
  expect(worlds.slice(40).every((w) => w === 'mountain')).toBe(true);
  // Le décor de la montagne est dessiné sous la carte.
  await expect(page.locator('.screen--map g[data-world="mountain"]').first()).toBeAttached();
  await expect(page.locator('.screen--map g[data-world="sea"]').first()).toBeAttached();
});

// ==================== 4. Statistiques parent du memory ====================

test('après une partie de memory libre, la fiche statistiques montre le bloc puzzle-stats du memory', async ({ page }) => {
  test.slow();
  await onboardMs(page, 'Ana');
  await chooseProfile(page, 'Ana');
  await openFreeMemory(page);
  await startFreeGame(page);
  const handle = await viewHandle(page);
  await solveMemoryRound(page);
  await expect(page.getByTestId('puzzle-solved')).toHaveAttribute('data-count', '1');
  await expectNewRound(page, handle);
  await backToProfiles(page);

  await openChildStats(page, 'Ana');
  const section = page.getByTestId('game-stats-memory');
  await expect(section).toBeVisible();
  const stats = section.getByTestId('puzzle-stats');
  await expect(stats).toBeVisible();
  await expect(stats.getByTestId('puzzle-stats-best')).toHaveText('1 étoile');
  await expect(stats.getByTestId('puzzle-preset-easy')).toHaveText('1');
  await expect(stats.getByTestId('puzzle-preset-medium')).toHaveText('0');
  await expect(stats.getByTestId('puzzle-preset-hard')).toHaveText('0');
});
