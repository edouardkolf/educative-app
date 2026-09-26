// Génération pure des manches de la mécanique « orthographe ». Aucun DOM, aucun stockage.
import type { ChoiceId, Rng, Round, SpellingParams, WordId } from '../../engine/types';
import type { Closeness, GapRoundData, PickRoundData, SpellingRoundData, TilesRoundData } from './types';
import { WORDS } from './words';

const MIN_CHOICES = 2;
const MAX_CHOICES = 4;
const MAX_EXTRA_TILES = 4;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Pioche un mot sans répétition tant que le réservoir n'est pas épuisé, jamais deux fois de suite. */
function makeWordPicker(words: readonly WordId[], rng: Rng): () => WordId {
  let queue: WordId[] = [];
  let last: WordId | null = null;
  return () => {
    if (queue.length === 0) queue = rng.shuffle(words);
    if (queue[0] === last && queue.length > 1) {
      const tmp = queue[0] as WordId;
      queue[0] = queue[1] as WordId;
      queue[1] = tmp;
    }
    const word = queue.shift() as WordId;
    last = word;
    return word;
  };
}

// ---------- Mode "pick" ----------

/** Ordre de pioche des niveaux de proximité : le niveau demandé d'abord, puis les plus proches de lui. */
const CLOSENESS_ORDER: Record<Closeness, Closeness[]> = { 1: [1, 2, 3], 2: [2, 3, 1], 3: [3, 2, 1] };

/** `count` variantes fautives distinctes, du niveau de proximité demandé en priorité (tous mélangés si absent). */
export function pickMisspellings(
  byCloseness: Record<Closeness, string[]>,
  count: number,
  closeness: Closeness | undefined,
  rng: Rng,
): string[] {
  if (closeness === undefined) return rng.shuffle([1, 2, 3].flatMap((c) => byCloseness[c as Closeness])).slice(0, count);
  return CLOSENESS_ORDER[closeness].flatMap((c) => rng.shuffle(byCloseness[c])).slice(0, count);
}

function buildPickRound(wordId: WordId, params: SpellingParams, rng: Rng): PickRoundData {
  const entry = WORDS[wordId];
  const sentence = params.sentence ? rng.pick(entry.sentences) : undefined;
  const wanted = clamp(params.choices ?? 3, MIN_CHOICES, MAX_CHOICES);
  const wrongs = pickMisspellings(entry.misspellings, wanted - 1, params.closeness, rng);
  const choices = rng.shuffle([entry.text, ...wrongs]).map((text) => ({ id: text as ChoiceId, text }));
  return { mode: 'pick', wordId, word: entry.text, sentence, choices };
}

// ---------- Mode "gap" ----------

function buildGapRound(wordId: WordId, params: SpellingParams, rng: Rng): GapRoundData {
  const entry = WORDS[wordId];
  const sentence = params.sentence ? rng.pick(entry.sentences) : undefined;
  const gap = rng.pick(entry.gaps);
  const wanted = clamp(params.choices ?? 3, MIN_CHOICES, MAX_CHOICES);
  const distractorCount = Math.min(wanted - 1, gap.distractors.length);
  const distractors = rng.shuffle(gap.distractors).slice(0, distractorCount);
  const choices = rng
    .shuffle([gap.missing, ...distractors])
    .map((text) => ({ id: text as ChoiceId, text }));
  return {
    mode: 'gap',
    wordId,
    word: entry.text,
    sentence,
    before: gap.before,
    missing: gap.missing,
    after: gap.after,
    choices,
  };
}

// ---------- Mode "tiles" ----------

const ACCENT_VARIANTS: Record<string, string[]> = {
  e: ['é', 'è', 'ê'],
  a: ['à', 'â'],
  o: ['ô'],
  u: ['û'],
  i: ['î'],
};

const CONSONANT_CONFUSIONS: Record<string, string[]> = {
  s: ['c'],
  c: ['s'],
  t: ['d'],
  f: ['v'],
};

function stripAccent(letter: string): string {
  return letter.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Lettres pièges plausibles : accents voisins, consonnes proches, doublon d'une lettre simple. */
function buildTrapPool(letters: readonly string[]): string[] {
  const counts = new Map<string, number>();
  for (const l of letters) counts.set(l, (counts.get(l) ?? 0) + 1);

  const pool = new Set<string>();
  for (const letter of letters) {
    const base = stripAccent(letter);
    for (const variant of ACCENT_VARIANTS[base] ?? []) if (variant !== letter) pool.add(variant);
    if (base !== letter) pool.add(base); // l'oubli d'accent : l'erreur la plus fréquente au CE1
    for (const variant of CONSONANT_CONFUSIONS[base] ?? []) if (variant !== letter) pool.add(variant);
    if (counts.get(letter) === 1 && /[bcdfgjklmnpqrstvwxz]/.test(letter)) pool.add(letter);
  }
  return [...pool];
}

function buildTilesRound(wordId: WordId, params: SpellingParams, rng: Rng): TilesRoundData {
  const entry = WORDS[wordId];
  const sentence = params.sentence ? rng.pick(entry.sentences) : undefined;
  const apostropheIndex = entry.text.indexOf("'");
  const letters = (apostropheIndex === -1 ? entry.text : entry.text.replace("'", '')).split('');
  // apostropheIndex = nombre de lettres avant l'apostrophe → elle se place juste après cette lettre-là.
  const apostropheAfterIndex = apostropheIndex === -1 ? undefined : apostropheIndex - 1;

  const extraWanted = clamp(params.extraTiles ?? 0, 0, MAX_EXTRA_TILES);
  const trapPool = buildTrapPool(letters);
  const traps = rng.shuffle(trapPool).slice(0, Math.min(extraWanted, trapPool.length));

  const tiles = rng.shuffle([...letters, ...traps]);

  return { mode: 'tiles', wordId, word: entry.text, sentence, letters, apostropheAfterIndex, tiles };
}

// ---------- Manches ----------

function buildOneRound(wordId: WordId, params: SpellingParams, rng: Rng): Round<SpellingRoundData> {
  if (params.mode === 'pick') {
    const data = buildPickRound(wordId, params, rng);
    return { data, answer: data.word };
  }
  if (params.mode === 'gap') {
    const data = buildGapRound(wordId, params, rng);
    return { data, answer: data.missing };
  }
  const data = buildTilesRound(wordId, params, rng);
  return { data, answer: data.word };
}

export function generateRounds(params: SpellingParams, count: number, rng: Rng): Round<SpellingRoundData>[] {
  const pickWord = makeWordPicker(params.words, rng);
  const rounds: Round<SpellingRoundData>[] = [];
  for (let i = 0; i < count; i += 1) {
    rounds.push(buildOneRound(pickWord(), params, rng));
  }
  return rounds;
}
