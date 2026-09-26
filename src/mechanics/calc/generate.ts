// Génération pure des manches de la mécanique « calcul ». Aucun DOM, aucun stockage.
import type { CalcParams, Rng, Round } from '../../engine/types';
import type { CalcRoundData } from './types';

const MAX_DISTRACTOR_DELTA = 300; // filet de sécurité contre une boucle infinie si le contexte est extrême

// ---------- Retenue / emprunt ----------

/** Vrai si l'addition posée a op b comporte au moins une retenue (sur n'importe quelle colonne). */
export function addHasCarry(a: number, b: number): boolean {
  let x = a;
  let y = b;
  let carry = 0;
  let any = false;
  while (x > 0 || y > 0 || carry > 0) {
    const sum = (x % 10) + (y % 10) + carry;
    if (sum >= 10) {
      any = true;
      carry = 1;
    } else {
      carry = 0;
    }
    x = Math.floor(x / 10);
    y = Math.floor(y / 10);
  }
  return any;
}

/** Vrai si la soustraction posée a - b (avec a ≥ b) comporte au moins un emprunt. */
export function subHasBorrow(a: number, b: number): boolean {
  let x = a;
  let y = b;
  let borrow = 0;
  let any = false;
  while (x > 0 || y > 0) {
    const dx = x % 10 - borrow;
    const dy = y % 10;
    if (dx < dy) {
      any = true;
      borrow = 1;
    } else {
      borrow = 0;
    }
    x = Math.floor(x / 10);
    y = Math.floor(y / 10);
  }
  return any;
}

function carryOk(params: CalcParams, a: number, b: number): boolean {
  const mode = params.carry ?? 'any';
  if (mode === 'any' || params.operation === 'mul') return true;
  const has = params.operation === 'add' ? addHasCarry(a, b) : subHasBorrow(a, b);
  return mode === 'with' ? has : !has;
}

// ---------- Réservoir de paires valides ----------

/** Toutes les paires (a, b) valides pour ces paramètres (bornes + contrainte de retenue/emprunt). */
export function buildPool(params: CalcParams): Array<[number, number]> {
  const pool: Array<[number, number]> = [];
  for (let a = params.a.min; a <= params.a.max; a += 1) {
    for (let b = params.b.min; b <= params.b.max; b += 1) {
      if (params.operation === 'sub' && a < b) continue;
      if (!carryOk(params, a, b)) continue;
      if (params.operation === 'mul' && params.maxProduct !== undefined && a * b > params.maxProduct) continue;
      pool.push([a, b]);
    }
  }
  return pool;
}

/** Clé qui identifie une paire indépendamment de l'ordre pour add/mul (commutatifs), ordonnée pour sub. */
function canonicalKey(operation: CalcParams['operation'], a: number, b: number): string {
  if (operation === 'sub') return `${a}-${b}`;
  const [lo, hi] = a <= b ? [a, b] : [b, a];
  return `${lo}-${hi}`;
}

// ---------- Distracteurs ----------

function computeExtras(params: CalcParams, a: number, b: number, result: number, unknownValue: number): number[] {
  const extras: number[] = [];
  if (params.unknown === 'result') {
    if (params.operation === 'add') extras.push(Math.abs(a - b));
    else if (params.operation === 'sub') extras.push(a + b);
    else {
      // Les voisins dans les tables (3 × 4 → 3 × 3, 3 × 5, 2 × 4, 4 × 4) et la confusion × / +.
      extras.push(a * (b - 1), a * (b + 1), (a - 1) * b, (a + 1) * b, a + b);
    }
  } else {
    // unknown = "operand" (b caché) : confusion plausible avec a, ou avec le résultat affiché.
    extras.push(a);
    if (params.operation === 'sub') extras.push(result);
  }
  return extras.filter((v) => v >= 0 && v !== unknownValue);
}

function buildChoices(
  params: CalcParams,
  a: number,
  b: number,
  result: number,
  unknownValue: number,
  rng: Rng,
): { id: string; value: number }[] {
  const count = params.choices ?? 3;
  const pool = new Set<number>();
  // Facteur manquant : ni 0 ni 1 (hors des tables travaillées, jamais plausibles).
  const floor = params.operation === 'mul' && params.unknown === 'operand' ? Math.min(2, params.b.min) : 0;
  const add = (v: number) => {
    if (v >= floor && v !== unknownValue) pool.add(v);
  };
  add(unknownValue - 1);
  add(unknownValue + 1);
  add(unknownValue - 2);
  add(unknownValue + 2);
  if (params.operation !== 'mul') {
    // Erreur de dizaine (retenue oubliée ou comptée deux fois) : n'a de sens qu'en addition et soustraction.
    add(unknownValue - 10);
    add(unknownValue + 10);
  }
  for (const extra of computeExtras(params, a, b, result, unknownValue)) add(extra);

  let delta = 3;
  while (pool.size < count - 1 && delta < MAX_DISTRACTOR_DELTA) {
    add(unknownValue - delta);
    add(unknownValue + delta);
    delta += 1;
  }

  const distractors = rng.shuffle([...pool]).slice(0, count - 1);
  const values = rng.shuffle([...distractors, unknownValue]);
  return values.map((value) => ({ id: String(value), value }));
}

// ---------- Manches ----------

function buildRound(params: CalcParams, a: number, b: number, rng: Rng): Round<CalcRoundData> {
  const result = params.operation === 'add' ? a + b : params.operation === 'sub' ? a - b : a * b;
  const unknownValue = params.unknown === 'result' ? result : b;
  const showArray = Boolean(params.showArray) && params.operation === 'mul' && params.unknown === 'result';

  const data: CalcRoundData = {
    operation: params.operation,
    a,
    b,
    result,
    unknown: params.unknown,
    answerMode: params.answer,
    showArray,
  };
  if (params.answer === 'choices') {
    data.choices = buildChoices(params, a, b, result, unknownValue, rng);
  }

  return { data, answer: String(unknownValue) };
}

/**
 * Génère `count` manches ; deux manches consécutives ne portent (quasi) jamais sur la même paire,
 * et une paire et sa symétrique (3×4 / 4×3) ne sont pas toutes deux tirées tant que le réservoir le permet.
 */
export function generateRounds(params: CalcParams, count: number, rng: Rng): Round<CalcRoundData>[] {
  let pool = buildPool(params);
  if (pool.length === 0) {
    // Filet de sécurité : contrainte de retenue non satisfiable avec ces bornes, on l'ignore plutôt
    // que de planter (validate.ts est censé empêcher ce cas en amont, côté contenu).
    const relaxed: CalcParams = { ...params, carry: 'any' };
    pool = buildPool(relaxed);
  }
  if (pool.length === 0) {
    // Dernier filet : bornes de sub incompatibles (a < b partout) — on force a = max(a, b).
    for (let a = params.a.min; a <= params.a.max; a += 1) {
      for (let b = params.b.min; b <= params.b.max; b += 1) pool.push([Math.max(a, b), Math.min(a, b)]);
    }
  }

  const shuffled = rng.shuffle(pool);
  const usedKeys = new Set<string>();
  let previousKey: string | null = null;
  let idx = 0;
  const rounds: Round<CalcRoundData>[] = [];

  for (let i = 0; i < count; i += 1) {
    let chosen: [number, number] | undefined;
    for (let tries = 0; tries < shuffled.length; tries += 1) {
      const candidate = shuffled[idx % shuffled.length]!;
      idx += 1;
      const key = canonicalKey(params.operation, candidate[0], candidate[1]);
      if (!usedKeys.has(key)) {
        chosen = candidate;
        usedKeys.add(key);
        break;
      }
    }
    if (!chosen) {
      // Réservoir épuisé : on recommence un cycle, en évitant seulement la répétition immédiate.
      usedKeys.clear();
      for (let tries = 0; tries < shuffled.length; tries += 1) {
        const candidate = shuffled[idx % shuffled.length]!;
        idx += 1;
        const key = canonicalKey(params.operation, candidate[0], candidate[1]);
        if (key !== previousKey) {
          chosen = candidate;
          usedKeys.add(key);
          break;
        }
      }
    }
    if (!chosen) chosen = shuffled[idx % shuffled.length]!;

    previousKey = canonicalKey(params.operation, chosen[0], chosen[1]);
    rounds.push(buildRound(params, chosen[0], chosen[1], rng));
  }

  return rounds;
}
