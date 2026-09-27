// Génération pure des manches de la mécanique « compléter une suite ». Aucun DOM, aucun stockage.
import type { ChoiceId, ObjectId, Rng, Round, SequenceParams, SequenceStep, Token } from '../../engine/types';
import type { SequenceItem, SequenceRoundData } from './types';

const MAX_RETRIES_DIFFERENT_ROUND = 8;

export function tokenId(token: Token): ChoiceId {
  return `${token.shape}-${token.color}`;
}

/** Identifiant d'un objet illustré, préfixé pour ne jamais entrer en collision avec un id de jeton. */
export function objectItemId(objectId: ObjectId): ChoiceId {
  return `obj:${objectId}`;
}

/** Identifiant d'un nombre, préfixé comme les objets. */
export function numberItemId(value: number): ChoiceId {
  return `n:${value}`;
}

function itemId(item: SequenceItem): ChoiceId {
  if (item.kind === 'token') return tokenId(item.token);
  if (item.kind === 'object') return objectItemId(item.objectId);
  return numberItemId(item.value);
}

/** Un jeton distinct par lettre distincte du motif (ex. "AAB" → 2 lettres : A, B). */
function distinctLetters(pattern: string): string[] {
  return [...new Set(pattern.split(''))];
}

/** vary "color" → une forme pour toute la manche, couleurs distinctes ; "shape" → l'inverse ; "both" → les deux. */
function tokensForPattern(params: SequenceParams, rng: Rng): Map<string, Token> {
  const letters = distinctLetters(params.pattern ?? 'AB');
  const map = new Map<string, Token>();
  const colors = params.colors ?? [];
  const shapes = params.shapes ?? [];

  if (params.vary === 'color') {
    const shape = rng.pick(shapes);
    const pickedColors = rng.shuffle(colors).slice(0, letters.length);
    letters.forEach((letter, i) => map.set(letter, { shape, color: pickedColors[i] as Token['color'] }));
  } else if (params.vary === 'shape') {
    const color = rng.pick(colors);
    const pickedShapes = rng.shuffle(shapes).slice(0, letters.length);
    letters.forEach((letter, i) => map.set(letter, { shape: pickedShapes[i] as Token['shape'], color }));
  } else {
    const pickedColors = rng.shuffle(colors).slice(0, letters.length);
    const pickedShapes = rng.shuffle(shapes).slice(0, letters.length);
    letters.forEach((letter, i) =>
      map.set(letter, { shape: pickedShapes[i] as Token['shape'], color: pickedColors[i] as Token['color'] }),
    );
  }

  return map;
}

/** vary "object" : un objet distinct du réservoir par lettre distincte du motif. */
function objectsForPattern(params: SequenceParams, rng: Rng): Map<string, ObjectId> {
  const letters = distinctLetters(params.pattern ?? 'AB');
  const pool = rng.shuffle(params.objects ?? []);
  const map = new Map<string, ObjectId>();
  letters.forEach((letter, i) => map.set(letter, pool[i % Math.max(pool.length, 1)] as ObjectId));
  return map;
}

/** Jetons hors motif qui varient sur la même dimension que `vary` (pour les propositions pièges). */
function extraDistractorTokens(params: SequenceParams, correct: Token, rng: Rng): Token[] {
  const colors = params.colors ?? [];
  const shapes = params.shapes ?? [];
  if (params.vary === 'color') {
    return rng.shuffle(colors).map((color) => ({ shape: correct.shape, color }));
  }
  if (params.vary === 'shape') {
    return rng.shuffle(shapes).map((shape) => ({ shape, color: correct.color }));
  }
  const pairs: Token[] = [];
  for (const color of rng.shuffle(colors)) {
    for (const shape of rng.shuffle(shapes)) {
      pairs.push({ shape, color });
    }
  }
  return rng.shuffle(pairs);
}

/** La bonne réponse, puis les autres éléments du motif, puis des éléments hors motif (même dimension). */
function buildChoices(
  params: SequenceParams,
  patternItems: SequenceItem[],
  correct: SequenceItem,
  rng: Rng,
): { id: ChoiceId; item: SequenceItem }[] {
  const used = new Map<ChoiceId, SequenceItem>();
  used.set(itemId(correct), correct);

  const others = rng.shuffle(patternItems.filter((it) => itemId(it) !== itemId(correct)));
  for (const it of others) {
    if (used.size >= params.choices) break;
    used.set(itemId(it), it);
  }

  if (used.size < params.choices) {
    if (params.vary === 'object') {
      const pool = rng.shuffle(params.objects ?? []);
      for (const objectId of pool) {
        if (used.size >= params.choices) break;
        const item: SequenceItem = { kind: 'object', objectId };
        const id = itemId(item);
        if (!used.has(id)) used.set(id, item);
      }
    } else if (correct.kind === 'token') {
      for (const token of extraDistractorTokens(params, correct.token, rng)) {
        if (used.size >= params.choices) break;
        const item: SequenceItem = { kind: 'token', token };
        const id = itemId(item);
        if (!used.has(id)) used.set(id, item);
      }
    }
  }

  const list = [...used.values()].slice(0, params.choices).map((item) => ({ id: itemId(item), item }));
  return rng.shuffle(list);
}

function roundSignature(data: SequenceRoundData): string {
  return JSON.stringify({
    items: data.items.map((it) => (it ? itemId(it) : null)),
    blankIndex: data.blankIndex,
    choices: data.choices.map((c) => c.id),
  });
}

function buildOneRound(params: SequenceParams, rng: Rng): Round<SequenceRoundData> {
  const pattern = params.pattern ?? 'AB';
  const patternChars = pattern.split('');
  const letters = distinctLetters(pattern);

  let itemsByLetter: Map<string, SequenceItem>;
  if (params.vary === 'object') {
    const objects = objectsForPattern(params, rng);
    itemsByLetter = new Map(letters.map((letter) => [letter, { kind: 'object', objectId: objects.get(letter) as ObjectId }]));
  } else {
    const tokens = tokensForPattern(params, rng);
    itemsByLetter = new Map(letters.map((letter) => [letter, { kind: 'token', token: tokens.get(letter) as Token }]));
  }

  const patternItems = letters.map((letter) => itemsByLetter.get(letter) as SequenceItem);

  const items: (SequenceItem | null)[] = [];
  for (let i = 0; i < params.length; i += 1) {
    const letter = patternChars[i % patternChars.length] as string;
    items.push(itemsByLetter.get(letter) as SequenceItem);
  }

  // "middle" : trou dans [pattern.length, length - 2] (le motif s'est déjà répété au moins une fois avant le trou).
  const lastPossible = params.length - 2;
  const firstPossible = Math.min(patternChars.length, lastPossible);
  const blankIndex = params.blank === 'end' ? params.length - 1 : rng.int(firstPossible, lastPossible);

  const correct = items[blankIndex] as SequenceItem;
  items[blankIndex] = null;

  const choices = buildChoices(params, patternItems, correct, rng);

  return { data: { items, blankIndex, choices }, answer: itemId(correct) };
}

// ---------- vary "number" : suites de nombres ----------

/** Plus grand nombre affiché (trois chiffres tiennent dans une case). */
export const MAX_NUMBER = 999;

function stepCycle(step: SequenceStep): number[] {
  return Array.isArray(step) ? step : [step];
}

/** Les `length` nombres de la suite ; décalée vers le haut si elle passerait sous 0, vers le bas au-delà de 999. */
export function numberSequence(start: number, step: SequenceStep, length: number): number[] {
  const cycle = stepCycle(step);
  const values = [start];
  for (let i = 1; i < length; i += 1) {
    values.push((values[i - 1] as number) + (cycle[(i - 1) % cycle.length] as number));
  }
  const low = Math.min(...values);
  const high = Math.max(...values);
  const shift = low < 0 ? -low : high > MAX_NUMBER ? MAX_NUMBER - high : 0;
  return values.map((v) => v + shift);
}

/**
 * Propositions pièges, par ordre de vraisemblance : (pas de 100) une erreur de rang, une unité à côté, le pas
 * oublié (compter de 1 en 1),
 * le pas fait deux fois, deux unités à côté, une dizaine à côté. Jamais un nombre déjà affiché ni négatif.
 */
function numberDistractors(values: number[], blankIndex: number, rng: Rng): number[] {
  const correct = values[blankIndex] as number;
  const before = blankIndex > 0 ? (values[blankIndex - 1] as number) : null;
  const delta = before === null ? (values[1] as number) - correct : correct - before;
  const direction = Math.sign(delta) || 1;
  const shown = new Set(values.filter((_, i) => i !== blankIndex));

  // De 100 en 100 : l'erreur typique est de rang (ajouter 10 ou 1 au lieu de 100), pas d'une unité à côté.
  const placeValueSlips =
    before !== null && Math.abs(delta) >= 100 ? rng.shuffle([before + direction * 10, correct + 10, correct - 10]) : [];
  const tiers: number[][] = [
    placeValueSlips,
    rng.shuffle([correct + 1, correct - 1]),
    before === null ? [] : [before + direction],
    [correct + delta],
    rng.shuffle([correct + 2, correct - 2]),
    rng.shuffle([correct + 10, correct - 10]),
    rng.shuffle([correct + 3, correct - 3, correct + 4, correct - 4, correct + 5, correct - 5]),
  ];
  const result: number[] = [];
  for (const candidate of tiers.flat()) {
    if (candidate < 0 || candidate > MAX_NUMBER || candidate === correct) continue;
    if (shown.has(candidate) || result.includes(candidate)) continue;
    result.push(candidate);
  }
  return result;
}

function buildNumberRound(params: SequenceParams, step: SequenceStep, rng: Rng): Round<SequenceRoundData> {
  const start = params.start ?? { min: 0, max: 10 };
  const values = numberSequence(rng.int(start.min, start.max), step, params.length);

  // "middle" : au moins deux nombres avant le trou, pour voir le pas ; jamais le dernier.
  const blankIndex = params.blank === 'end' ? params.length - 1 : rng.int(2, params.length - 2);
  const correct = values[blankIndex] as number;

  const wrongs = numberDistractors(values, blankIndex, rng);
  // Les pièges les plus vraisemblables d'abord, mais pas toujours les mêmes : on pioche dans les premiers.
  const picked = rng.shuffle(wrongs.slice(0, params.choices + 1)).slice(0, params.choices - 1);
  const choices = rng
    .shuffle([correct, ...picked])
    .map((value) => ({ id: numberItemId(value), item: { kind: 'number', value } as SequenceItem }));

  const items: (SequenceItem | null)[] = values.map((value) => ({ kind: 'number', value }));
  items[blankIndex] = null;
  return { data: { items, blankIndex, choices }, answer: numberItemId(correct) };
}

/** Pioche un pas par manche, sans répétition tant que le réservoir n'est pas épuisé, jamais deux fois de suite. */
function makeStepPicker(steps: readonly SequenceStep[], rng: Rng): () => SequenceStep {
  let queue: SequenceStep[] = [];
  let last: SequenceStep | null = null;
  return () => {
    if (queue.length === 0) {
      queue = rng.shuffle(steps);
      if (queue[0] === last && queue.length > 1) queue.push(queue.shift() as SequenceStep);
    }
    last = queue.shift() as SequenceStep;
    return last;
  };
}

/** Génère `count` manches ; deux manches consécutives ne sont (quasi) jamais identiques. */
export function generateRounds(params: SequenceParams, count: number, rng: Rng): Round<SequenceRoundData>[] {
  const rounds: Round<SequenceRoundData>[] = [];
  let previousSignature: string | null = null;
  const pickStep = params.vary === 'number' ? makeStepPicker(params.steps ?? [2], rng) : null;
  const build = (): Round<SequenceRoundData> =>
    pickStep ? buildNumberRound(params, pickStep(), rng) : buildOneRound(params, rng);

  for (let i = 0; i < count; i += 1) {
    let round = build();
    let signature = roundSignature(round.data);
    let attempts = 0;
    while (signature === previousSignature && attempts < MAX_RETRIES_DIFFERENT_ROUND) {
      round = build();
      signature = roundSignature(round.data);
      attempts += 1;
    }
    rounds.push(round);
    previousSignature = signature;
  }

  return rounds;
}
