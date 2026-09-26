// Génération pure des manches de « comparer » (CE1). Aucun DOM, aucun stockage.
import type { CompareChoice, CompareParams, Rng, Round } from '../../engine/types';
import type { CompareRoundData, Side } from './types';

const MAX_RETRIES = 30;

function sideFromNumber(value: number): Side {
  return { terms: [value], value };
}

function sideFromSplit(a: number, b: number): Side {
  return { terms: [a, b], value: a + b };
}

/** La relation gauche ? droite pour deux valeurs (utile aux tests). */
export function relation(left: number, right: number): CompareChoice {
  if (left < right) return 'lt';
  if (left > right) return 'gt';
  return 'eq';
}

/** Toutes les décompositions a + b = value avec a, b ≥ 1. */
function allSplits(value: number): Array<[number, number]> {
  const splits: Array<[number, number]> = [];
  for (let a = 1; a <= value - 1; a += 1) splits.push([a, value - a]);
  return splits;
}

/** Une somme a + b tirée au hasard, valeur dans [max(min,2), max]. */
function randomSum(min: number, max: number, rng: Rng): { a: number; b: number; value: number } {
  const lo = Math.max(min, 2);
  const hi = Math.max(lo, max);
  const value = rng.int(lo, hi);
  const a = rng.int(1, value - 1);
  const b = value - a;
  return { a, b, value };
}

/** Une décomposition a + b = value tirée au hasard (value ≥ 2, sinon repli 1 + (value-1) le cas échéant). */
function forceSplit(value: number, rng: Rng): [number, number] {
  const splits = allSplits(Math.max(value, 2));
  return rng.pick(splits);
}

/**
 * Valeurs de `target` (dans [min, max], à ≤ maxGap de `anchor` si fourni) telles que la relation
 * left-vs-right voulue soit respectée, sachant si l'ancre est à gauche ou à droite.
 */
function candidatesForRelation(
  min: number,
  max: number,
  anchor: number,
  wanted: CompareChoice,
  anchorIsLeft: boolean,
  maxGap?: number,
): number[] {
  const lo = maxGap !== undefined ? Math.max(min, anchor - maxGap) : min;
  const hi = maxGap !== undefined ? Math.min(max, anchor + maxGap) : max;
  const values: number[] = [];
  for (let v = lo; v <= hi; v += 1) {
    if (wanted === 'eq') {
      if (v === anchor) values.push(v);
      continue;
    }
    const anchorSmaller = anchorIsLeft ? anchor < v : v < anchor;
    if (wanted === 'lt' && anchorSmaller) values.push(v);
    if (wanted === 'gt' && !anchorSmaller && v !== anchor) values.push(v);
  }
  return values;
}

// ---------- Construction d'une manche pour une relation voulue ----------

function buildNumbers(min: number, max: number, maxGap: number | undefined, wanted: CompareChoice, rng: Rng): CompareRoundData {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    const anchor = rng.int(min, max);
    const candidates = candidatesForRelation(min, max, anchor, wanted, true, maxGap);
    if (candidates.length > 0) {
      const target = rng.pick(candidates);
      return { left: sideFromNumber(anchor), right: sideFromNumber(target) };
    }
  }
  // Repli déterministe (ne devrait arriver qu'avec des paramètres limites, voir validate.ts).
  if (wanted === 'eq') return { left: sideFromNumber(min), right: sideFromNumber(min) };
  return wanted === 'gt'
    ? { left: sideFromNumber(max), right: sideFromNumber(min) }
    : { left: sideFromNumber(min), right: sideFromNumber(max) };
}

function buildSumVsNumber(
  min: number,
  max: number,
  maxGap: number | undefined,
  wanted: CompareChoice,
  rng: Rng,
): CompareRoundData {
  const sumOnLeft = rng.next() < 0.5;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    const sum = randomSum(min, max, rng);
    const candidates = candidatesForRelation(min, max, sum.value, wanted, sumOnLeft, maxGap);
    if (candidates.length > 0) {
      const numberValue = rng.pick(candidates);
      const sumSide = sideFromSplit(sum.a, sum.b);
      const numberSide = sideFromNumber(numberValue);
      return sumOnLeft ? { left: sumSide, right: numberSide } : { left: numberSide, right: sumSide };
    }
  }
  // Repli déterministe : place chaque valeur à une extrémité sûre de la plage plutôt que de
  // décaler l'ancre de ±1 (qui peut retomber sur elle-même si l'ancre est déjà au bord).
  const lo = Math.max(min, 2);
  const hi = Math.max(lo, max);
  let sumValue: number;
  let numberValue: number;
  if (wanted === 'eq') {
    sumValue = lo;
    numberValue = lo;
  } else if (wanted === 'lt' ? sumOnLeft : !sumOnLeft) {
    // Le côté "somme" doit être le plus petit.
    sumValue = lo;
    numberValue = hi;
  } else {
    sumValue = hi;
    numberValue = lo;
  }
  const [a, b] = forceSplit(sumValue, rng);
  const sumSide = sideFromSplit(a, b);
  const numberSide = sideFromNumber(numberValue);
  return sumOnLeft ? { left: sumSide, right: numberSide } : { left: numberSide, right: sumSide };
}

function buildSums(min: number, max: number, maxGap: number | undefined, wanted: CompareChoice, rng: Rng): CompareRoundData {
  const first = randomSum(min, max, rng);

  if (wanted === 'eq') {
    const alternatives = allSplits(first.value).filter(([a, b]) => !(a === first.a && b === first.b) && !(a === first.b && b === first.a));
    const [a, b] = alternatives.length > 0 ? rng.pick(alternatives) : [first.a, first.b];
    return { left: sideFromSplit(first.a, first.b), right: sideFromSplit(a, b) };
  }

  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    // Nouvelle première somme à chaque essai : une somme au bord de la plage n'a parfois aucun partenaire valide.
    const anchor = attempt === 0 ? first : randomSum(min, max, rng);
    const candidates = candidatesForRelation(min, max, anchor.value, wanted, true, maxGap);
    if (candidates.length > 0) {
      const targetValue = rng.pick(candidates);
      const [a, b] = forceSplit(targetValue, rng);
      return { left: sideFromSplit(anchor.a, anchor.b), right: sideFromSplit(a, b) };
    }
  }
  // Repli déterministe : reconstruit les deux sommes aux extrémités sûres de la plage plutôt que
  // de décaler la première somme de ±1 (qui peut retomber sur elle-même si elle est déjà au bord).
  const lo = Math.max(min, 2);
  const hi = Math.max(lo, max);
  const leftValue = wanted === 'lt' ? lo : hi;
  const rightValue = wanted === 'lt' ? hi : lo;
  const [la, lb] = forceSplit(leftValue, rng);
  const [ra, rb] = forceSplit(rightValue, rng);
  return { left: sideFromSplit(la, lb), right: sideFromSplit(ra, rb) };
}

function buildRoundData(params: CompareParams, wanted: CompareChoice, rng: Rng): CompareRoundData {
  if (params.form === 'sum-vs-number') return buildSumVsNumber(params.min, params.max, params.maxGap, wanted, rng);
  if (params.form === 'sums') return buildSums(params.min, params.max, params.maxGap, wanted, rng);
  return buildNumbers(params.min, params.max, params.maxGap, wanted, rng);
}

function sameData(a: CompareRoundData, b: CompareRoundData): boolean {
  return (
    a.left.terms.length === b.left.terms.length &&
    a.left.terms.every((v, i) => v === b.left.terms[i]) &&
    a.right.terms.length === b.right.terms.length &&
    a.right.terms.every((v, i) => v === b.right.terms[i])
  );
}

// ---------- Plan des réponses : équilibre lt/gt, répétitions limitées ----------

function pickNextAnswer(
  rng: Rng,
  ltCount: number,
  gtCount: number,
  banned: CompareChoice | null,
  equalRate: number,
): CompareChoice {
  const wantEqRoll = rng.next() < equalRate;
  if (wantEqRoll && banned !== 'eq') return 'eq';

  let preferred: CompareChoice;
  if (ltCount < gtCount) preferred = 'lt';
  else if (gtCount < ltCount) preferred = 'gt';
  else preferred = rng.next() < 0.5 ? 'lt' : 'gt';

  if (preferred !== banned) return preferred;
  const other: CompareChoice = preferred === 'lt' ? 'gt' : 'lt';
  if (other !== banned) return other;
  return 'eq'; // banned ne peut être qu'un seul des trois : repli sûr
}

/** Génère `count` manches : relation gauche ? droite équilibrée (lt/gt), répétitions limitées. */
export function generateRounds(params: CompareParams, count: number, rng: Rng): Round<CompareRoundData>[] {
  const rounds: Round<CompareRoundData>[] = [];
  let ltCount = 0;
  let gtCount = 0;
  let last: CompareChoice | null = null;
  let streak = 0;
  let previousData: CompareRoundData | null = null;

  for (let i = 0; i < count; i += 1) {
    const banned = streak >= 3 ? last : null;
    const wanted = pickNextAnswer(rng, ltCount, gtCount, banned, params.equalRate);

    let data = buildRoundData(params, wanted, rng);
    let attempts = 0;
    while (previousData !== null && sameData(data, previousData) && attempts < MAX_RETRIES) {
      data = buildRoundData(params, wanted, rng);
      attempts += 1;
    }

    rounds.push({ data, answer: wanted });
    if (wanted === 'lt') ltCount += 1;
    else if (wanted === 'gt') gtCount += 1;
    streak = wanted === last ? streak + 1 : 1;
    last = wanted;
    previousData = data;
  }

  return rounds;
}
