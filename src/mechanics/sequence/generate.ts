// Génération pure des manches de la mécanique « compléter une suite ». Aucun DOM, aucun stockage.
import type { ChoiceId, ObjectId, Rng, Round, SequenceParams, Token } from '../../engine/types';
import type { SequenceItem, SequenceRoundData } from './types';

const MAX_RETRIES_DIFFERENT_ROUND = 8;

export function tokenId(token: Token): ChoiceId {
  return `${token.shape}-${token.color}`;
}

/** Identifiant d'un objet illustré, préfixé pour ne jamais entrer en collision avec un id de jeton. */
export function objectItemId(objectId: ObjectId): ChoiceId {
  return `obj:${objectId}`;
}

function itemId(item: SequenceItem): ChoiceId {
  return item.kind === 'token' ? tokenId(item.token) : objectItemId(item.objectId);
}

/** Un jeton distinct par lettre distincte du motif (ex. "AAB" → 2 lettres : A, B). */
function distinctLetters(pattern: string): string[] {
  return [...new Set(pattern.split(''))];
}

/** vary "color" → une forme pour toute la manche, couleurs distinctes ; "shape" → l'inverse ; "both" → les deux. */
function tokensForPattern(params: SequenceParams, rng: Rng): Map<string, Token> {
  const letters = distinctLetters(params.pattern);
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
  const letters = distinctLetters(params.pattern);
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
  const patternChars = params.pattern.split('');
  const letters = distinctLetters(params.pattern);

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

/** Génère `count` manches ; deux manches consécutives ne sont (quasi) jamais identiques. */
export function generateRounds(params: SequenceParams, count: number, rng: Rng): Round<SequenceRoundData>[] {
  const rounds: Round<SequenceRoundData>[] = [];
  let previousSignature: string | null = null;

  for (let i = 0; i < count; i += 1) {
    let round = buildOneRound(params, rng);
    let signature = roundSignature(round.data);
    let attempts = 0;
    while (signature === previousSignature && attempts < MAX_RETRIES_DIFFERENT_ROUND) {
      round = buildOneRound(params, rng);
      signature = roundSignature(round.data);
      attempts += 1;
    }
    rounds.push(round);
    previousSignature = signature;
  }

  return rounds;
}
