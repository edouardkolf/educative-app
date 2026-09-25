// Génération pure des manches de la mécanique « compter des objets ». Aucun DOM, aucun stockage.
import type { ChoiceId, CountParams, ObjectId, Rng, Round } from '../../engine/types';
import type { CountRoundData } from './types';

const MAX_RETRIES_DIFFERENT_ROUND = 8;
// Bornes des nombres proposés : indépendantes de params.min/max (voir level.schema.json countParams).
const GLOBAL_MIN = 1;
const GLOBAL_MAX = 10;

export function choiceId(value: number): ChoiceId {
  return `n-${value}`;
}

// ---------- Dispositions ----------

/** Constellation classique du dé, sur une grille 3×3 (colonne, ligne dans 0..2). */
const DICE_GRID: Record<number, Array<[number, number]>> = {
  1: [[1, 1]],
  2: [
    [0, 0],
    [2, 2],
  ],
  3: [
    [0, 0],
    [1, 1],
    [2, 2],
  ],
  4: [
    [0, 0],
    [2, 0],
    [0, 2],
    [2, 2],
  ],
  5: [
    [0, 0],
    [2, 0],
    [1, 1],
    [0, 2],
    [2, 2],
  ],
  6: [
    [0, 0],
    [2, 0],
    [0, 1],
    [2, 1],
    [0, 2],
    [2, 2],
  ],
};

function diceConstellation(n: number): { x: number; y: number }[] | undefined {
  const grid = DICE_GRID[n];
  if (!grid) return undefined;
  return grid.map(([col, row]) => ({ x: (col + 0.5) / 3, y: (row + 0.5) / 3 }));
}

const LINE_ITEMS_PER_ROW = 5;
const LINE_MARGIN = 0.1;

/** Alignés, jusqu'à 5 par ligne ; au-delà, une deuxième ligne (mêmes bornes 0–1 pour les deux). */
function linePositions(n: number): { x: number; y: number }[] {
  const rowsCount = Math.max(1, Math.ceil(n / LINE_ITEMS_PER_ROW));
  const usable = 1 - 2 * LINE_MARGIN;
  const xStep = usable / (LINE_ITEMS_PER_ROW - 1);
  const positions: { x: number; y: number }[] = [];
  let placed = 0;
  for (let row = 0; row < rowsCount; row += 1) {
    const itemsInRow = Math.min(LINE_ITEMS_PER_ROW, n - placed);
    const rowWidth = (itemsInRow - 1) * xStep;
    const startX = LINE_MARGIN + (usable - rowWidth) / 2;
    const y = rowsCount === 1 ? 0.5 : LINE_MARGIN + (row * usable) / (rowsCount - 1);
    for (let i = 0; i < itemsInRow; i += 1) {
      positions.push({ x: startX + i * xStep, y });
      placed += 1;
    }
  }
  return positions;
}

/**
 * Points d'une constellation pour un nombre de 1 à 10 : constellation du dé quand elle existe (1–6),
 * grille alignée sinon. Utilisé pour la disposition "dice" et pour les propositions "dots"/"digits+dots".
 */
export function dotPositions(n: number): { x: number; y: number }[] {
  return diceConstellation(n) ?? linePositions(n);
}

const SCATTER_COLS = 4;
const SCATTER_ROWS = 3; // 12 emplacements : assez pour n ≤ 10 (borne de level.schema.json)
const SCATTER_JITTER = 0.018; // fraction du cadre : léger désordre qui garde une distance mini sûre

/** Éparpillés mais sans chevauchement : grille cachée (4×3) + léger décalage déterministe par le rng. */
function scatterPositions(n: number, rng: Rng): { x: number; y: number }[] {
  const slots: Array<[number, number]> = [];
  for (let row = 0; row < SCATTER_ROWS; row += 1) {
    for (let col = 0; col < SCATTER_COLS; col += 1) slots.push([col, row]);
  }
  const cellW = 1 / SCATTER_COLS;
  const cellH = 1 / SCATTER_ROWS;
  return rng
    .shuffle(slots)
    .slice(0, n)
    .map(([col, row]) => ({
      x: (col + 0.5) * cellW + (rng.next() * 2 - 1) * SCATTER_JITTER,
      y: (row + 0.5) * cellH + (rng.next() * 2 - 1) * SCATTER_JITTER,
    }));
}

function positionsForLayout(layout: CountParams['layout'], n: number, rng: Rng): { x: number; y: number }[] {
  if (layout === 'dice') return dotPositions(n); // robuste même si n > 6 (repli sur la grille alignée)
  if (layout === 'scatter') return scatterPositions(n, rng);
  return linePositions(n);
}

// ---------- Propositions ----------

/** La bonne réponse puis les voisins les plus proches (n±1, n±2…), toujours dans [1, 10]. */
function buildChoices(n: number, count: number, rng: Rng): { id: ChoiceId; value: number }[] {
  const values = new Set<number>([n]);
  let delta = 1;
  while (values.size < count && delta < GLOBAL_MAX) {
    const lower = n - delta;
    const upper = n + delta;
    if (lower >= GLOBAL_MIN && values.size < count) values.add(lower);
    if (upper <= GLOBAL_MAX && values.size < count) values.add(upper);
    delta += 1;
  }
  return rng.shuffle([...values]).map((value) => ({ id: choiceId(value), value }));
}

// ---------- Manches ----------

function buildOneRound(params: CountParams, rng: Rng): Round<CountRoundData> {
  const n = rng.int(params.min, params.max);
  const objectId = rng.pick(params.objects);
  const positions = positionsForLayout(params.layout, n, rng);
  const choices = buildChoices(n, params.choices, rng);

  return {
    data: { objectId, count: n, layout: params.layout, positions, choices, answers: params.answers },
    answer: choiceId(n),
  };
}

/** Génère `count` manches ; deux manches consécutives n'ont (quasi) jamais le même nombre ET le même objet. */
export function generateRounds(params: CountParams, count: number, rng: Rng): Round<CountRoundData>[] {
  const rounds: Round<CountRoundData>[] = [];
  let previous: { n: number; objectId: ObjectId } | null = null;

  for (let i = 0; i < count; i += 1) {
    let round = buildOneRound(params, rng);
    let attempts = 0;
    while (
      previous !== null &&
      round.data.count === previous.n &&
      round.data.objectId === previous.objectId &&
      attempts < MAX_RETRIES_DIFFERENT_ROUND
    ) {
      round = buildOneRound(params, rng);
      attempts += 1;
    }
    rounds.push(round);
    previous = { n: round.data.count, objectId: round.data.objectId };
  }

  return rounds;
}
