// Génération pure des manches de la mécanique « compléter une suite ». Aucun DOM, aucun stockage.
import type { ChoiceId, Rng, Round, SequenceParams, Token } from '../../engine/types';
import type { SequenceRoundData } from './types';

const MAX_RETRIES_DIFFERENT_ROUND = 8;

export function tokenId(token: Token): ChoiceId {
  return `${token.shape}-${token.color}`;
}

/** Un jeton distinct par lettre distincte du motif (ex. "AAB" → 2 lettres : A, B). */
function distinctLetters(pattern: string): string[] {
  return [...new Set(pattern.split(''))];
}

/** vary "color" → une forme pour toute la manche, couleurs distinctes ; "shape" → l'inverse ; "both" → les deux. */
function tokensForPattern(params: SequenceParams, rng: Rng): Map<string, Token> {
  const letters = distinctLetters(params.pattern);
  const map = new Map<string, Token>();

  if (params.vary === 'color') {
    const shape = rng.pick(params.shapes);
    const colors = rng.shuffle(params.colors).slice(0, letters.length);
    letters.forEach((letter, i) => map.set(letter, { shape, color: colors[i] as Token['color'] }));
  } else if (params.vary === 'shape') {
    const color = rng.pick(params.colors);
    const shapes = rng.shuffle(params.shapes).slice(0, letters.length);
    letters.forEach((letter, i) => map.set(letter, { shape: shapes[i] as Token['shape'], color }));
  } else {
    const colors = rng.shuffle(params.colors).slice(0, letters.length);
    const shapes = rng.shuffle(params.shapes).slice(0, letters.length);
    letters.forEach((letter, i) =>
      map.set(letter, { shape: shapes[i] as Token['shape'], color: colors[i] as Token['color'] }),
    );
  }

  return map;
}

/** Jetons hors motif qui varient sur la même dimension que `vary` (pour les propositions pièges). */
function extraDistractors(params: SequenceParams, correct: Token, rng: Rng): Token[] {
  if (params.vary === 'color') {
    return rng.shuffle(params.colors).map((color) => ({ shape: correct.shape, color }));
  }
  if (params.vary === 'shape') {
    return rng.shuffle(params.shapes).map((shape) => ({ shape, color: correct.color }));
  }
  const pairs: Token[] = [];
  for (const color of rng.shuffle(params.colors)) {
    for (const shape of rng.shuffle(params.shapes)) {
      pairs.push({ shape, color });
    }
  }
  return rng.shuffle(pairs);
}

/** La bonne réponse, puis les autres jetons du motif, puis des jetons hors motif (même dimension). */
function buildChoices(
  params: SequenceParams,
  patternTokens: Token[],
  correct: Token,
  rng: Rng,
): { id: ChoiceId; token: Token }[] {
  const used = new Map<ChoiceId, Token>();
  used.set(tokenId(correct), correct);

  const others = rng.shuffle(patternTokens.filter((t) => tokenId(t) !== tokenId(correct)));
  for (const t of others) {
    if (used.size >= params.choices) break;
    used.set(tokenId(t), t);
  }

  if (used.size < params.choices) {
    for (const t of extraDistractors(params, correct, rng)) {
      if (used.size >= params.choices) break;
      const id = tokenId(t);
      if (!used.has(id)) used.set(id, t);
    }
  }

  const list = [...used.values()].slice(0, params.choices).map((token) => ({ id: tokenId(token), token }));
  return rng.shuffle(list);
}

function roundSignature(data: SequenceRoundData): string {
  return JSON.stringify({
    items: data.items.map((t) => (t ? tokenId(t) : null)),
    blankIndex: data.blankIndex,
    choices: data.choices.map((c) => c.id),
  });
}

function buildOneRound(params: SequenceParams, rng: Rng): Round<SequenceRoundData> {
  const tokens = tokensForPattern(params, rng);
  const patternChars = params.pattern.split('');
  const patternTokens = distinctLetters(params.pattern).map((letter) => tokens.get(letter) as Token);

  const items: (Token | null)[] = [];
  for (let i = 0; i < params.length; i += 1) {
    const letter = patternChars[i % patternChars.length] as string;
    items.push(tokens.get(letter) as Token);
  }

  // "middle" : trou dans [pattern.length, length - 2] (le motif s'est déjà répété au moins une fois avant le trou).
  const lastPossible = params.length - 2;
  const firstPossible = Math.min(patternChars.length, lastPossible);
  const blankIndex = params.blank === 'end' ? params.length - 1 : rng.int(firstPossible, lastPossible);

  const correct = items[blankIndex] as Token;
  items[blankIndex] = null;

  const choices = buildChoices(params, patternTokens, correct, rng);

  return { data: { items, blankIndex, choices }, answer: tokenId(correct) };
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
