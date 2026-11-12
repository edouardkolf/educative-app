// Composition d'une séance et fabrication des questions. LECTURE.md §5.4 et §4. Pur : tout le hasard vient du `Rng`.
// Garantie : `planSession` ne lève JAMAIS (au pire, une séance de tambour) et rend 8 à 10 questions.
import type { Rng } from '../../engine/types';
import {
  GRAPHEMES,
  READ_WORDS,
  SYLLABLES,
  allItems,
  gamesForItem,
  getGrapheme,
  keywordPicture,
  splitGraphemes,
  stageItems,
} from './curriculum';
import type { ReadingLevel } from './levels';
import { PICTURES, getPicture, isDrumAmbiguous, onsetKey, picturesStartingWith } from './pictures';
import {
  drumPrompt,
  firstSoundPraise,
  firstSoundPrompt,
  letterSoundPraise,
  letterSoundPrompt,
  machinePraise,
  machinePrompt,
  pairPraise,
  presentationSteps,
  readPraise,
  sameEndPrompt,
  sameStartPrompt,
  soundText,
  twinsPraise,
  twinsPrompt,
} from './speech';
import type {
  GraphemeId,
  ItemId,
  ItemProgress,
  ItemState,
  Picture,
  ReadingChoice,
  ReadingGameId,
  ReadingProgress,
  ReadingQuestion,
  ReadingSessionPlan,
  ReadingStage,
  Syllable,
} from './types';

export const SESSION_MIN_QUESTIONS = 8;
export const SESSION_MAX_QUESTIONS = 10;
/** Taille visée d'une séance. */
export const SESSION_QUESTIONS = 9;
/** Questions de l'item nouveau (la première est la présentation). */
export const NEW_ITEM_QUESTIONS = 3;
/** Au-dessous de ce nombre de réponses, un item n'a pas de leurre proche (§4). */
export const NEAR_DECOY_MIN_SEEN = 4;
/** Les paires b/d et p/q ne servent de leurres aux jumelles qu'à partir de ce nombre de réponses. */
export const TWINS_CONFUSABLE_MIN_SEEN = 20;
/** Plus de questions consécutives du même jeu : jamais. */
export const MAX_SAME_GAME_RUN = 3;

export interface PlanOptions {
  /** Séance de révision d'une étape déjà validée (choisie sur l'écran d'accueil). Absent = étape en cours. */
  stage?: ReadingStage;
}

// ---------- Aides ----------

const NEW_STATE: ItemProgress = { state: 'new', seen: 0, correct: 0, streak: 0, missStreak: 0, streakDays: [], lastSeenAt: null };

function itemProgress(progress: ReadingProgress, item: ItemId): ItemProgress {
  return progress.items[item] ?? NEW_STATE;
}
function stateOf(progress: ReadingProgress, item: ItemId): ItemState {
  return itemProgress(progress, item).state;
}
function isIntroduced(progress: ReadingProgress, id: GraphemeId): boolean {
  return stateOf(progress, `g:${id}`) !== 'new';
}

const NEAR_PAIRS: readonly (readonly [GraphemeId, GraphemeId])[] = [
  ['m', 'n'], ['f', 'v'], ['s', 'z'], ['p', 'b'], ['t', 'd'], ['j', 'ch'], ['o', 'ou'], ['b', 'd'], ['c', 'g'], ['a', 'é'], ['i', 'u'],
];
const NEAR: ReadonlyMap<GraphemeId, readonly GraphemeId[]> = (() => {
  const m = new Map<GraphemeId, GraphemeId[]>();
  for (const [a, b] of NEAR_PAIRS) {
    m.set(a, [...(m.get(a) ?? []), b]);
    m.set(b, [...(m.get(b) ?? []), a]);
  }
  return m;
})();

/** Rimes qui se ressemblent (leurres proches du jeu de rime). */
const NEAR_RHYME_GROUPS: readonly (readonly string[])[] = [
  ['on', 'an', 'in', 'onn'],
  ['o', 'ou', 'u'],
  ['é', 'è', 'i'],
  ['èt', 'è', 'èz'],
];

function nearRhymes(key: string): string[] {
  return NEAR_RHYME_GROUPS.filter((g) => g.includes(key)).flatMap((g) => g.filter((k) => k !== key));
}

function strip(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function letterChoice(id: GraphemeId): ReadingChoice {
  const g = getGrapheme(id);
  return { id, kind: 'letter', label: g ? g.upper : id.toUpperCase() };
}
function lowerChoice(id: GraphemeId): ReadingChoice {
  const g = getGrapheme(id);
  return { id, kind: 'lower', label: g ? g.lower : id };
}
function pictureChoice(p: Picture, speech: boolean): ReadingChoice {
  return speech ? { id: p.id, kind: 'picture', picture: p.id, speech: p.word } : { id: p.id, kind: 'picture', picture: p.id };
}

/** État mutable d'une fabrication de séance. */
interface Ctx {
  progress: ReadingProgress;
  rng: Rng;
  /** `item|cible` déjà posées. */
  used: Set<string>;
  /** Images déjà montrées (modèles et réponses). */
  usedPictures: Set<string>;
  drumCounts: [number, number, number];
  blendStopAsked: number;
  blendStopShort: number;
}

function pickUnused<T>(ctx: Ctx, items: readonly T[], key: (t: T) => string): T | undefined {
  if (items.length === 0) return undefined;
  const fresh = items.filter((t) => !ctx.usedPictures.has(key(t)));
  return ctx.rng.pick(fresh.length > 0 ? fresh : items);
}

// ---------- Leurres de lettres ----------

/** Lettres (graphèmes) servant de leurres : introduites d'abord, éloignées d'abord, puis proches. */
function letterDecoys(
  ctx: Ctx,
  target: GraphemeId,
  need: number,
  seen: number,
  exclude: (id: GraphemeId) => boolean = () => false,
): GraphemeId[] {
  const tg = getGrapheme(target);
  if (!tg) return [];
  const targetSound = soundText(target);
  const eligible = (id: GraphemeId): boolean => id !== target && id !== 'h' && soundText(id) !== targetSound && !exclude(id);
  const near = NEAR.get(target) ?? [];
  const allowNear = seen >= NEAR_DECOY_MIN_SEEN;
  const intro = GRAPHEMES.map((g) => g.id).filter((id) => eligible(id) && isIntroduced(ctx.progress, id));
  const out: GraphemeId[] = [];
  if (allowNear) {
    const n = ctx.rng.shuffle(intro.filter((id) => near.includes(id)));
    if (n[0] !== undefined) out.push(n[0]);
  }
  for (const id of ctx.rng.shuffle(intro.filter((id) => !near.includes(id)))) {
    if (out.length >= need) break;
    if (!out.includes(id)) out.push(id);
  }
  const rest = GRAPHEMES.map((g) => g.id).filter((id) => eligible(id) && !intro.includes(id));
  const before = rest.filter((id) => (getGrapheme(id)?.order ?? 0) < tg.order).reverse();
  const after = rest.filter((id) => (getGrapheme(id)?.order ?? 0) > tg.order);
  for (const id of [...before, ...after]) {
    if (out.length >= need) break;
    if (!allowNear && near.includes(id)) continue;
    if (!out.includes(id)) out.push(id);
  }
  for (const id of [...intro, ...before, ...after]) {
    if (out.length >= need) break;
    if (!out.includes(id)) out.push(id);
  }
  return out.slice(0, need);
}

function letterChoiceCount(seen: number, isNew: boolean): number {
  return isNew || seen < 2 ? 2 : 3;
}

// ---------- Fabricants de questions (un par jeu) ----------

interface Slot {
  item: ItemId;
  game: ReadingGameId;
  /** Question de l'item nouveau. */
  forNew: boolean;
  /** Première question de l'item nouveau : la présentation. */
  presentation: boolean;
}

function makeLetterSound(ctx: Ctx, slot: Slot): ReadingQuestion | null {
  const id = slot.item.slice(2);
  const gr = getGrapheme(id);
  if (!gr) return null;
  const seen = itemProgress(ctx.progress, slot.item).seen;
  const decoys = letterDecoys(ctx, id, letterChoiceCount(seen, slot.presentation) - 1, seen);
  if (decoys.length === 0) return null;
  const kw = keywordPicture(id);
  const keyword = kw && kw.firstSound === id ? kw.word : null;
  const base = letterSoundPrompt(id);
  return {
    game: 'letter-sound',
    itemId: slot.item,
    target: id,
    stimulus: { kind: 'sound', grapheme: id },
    choices: ctx.rng.shuffle([id, ...decoys]).map(letterChoice),
    answer: id,
    prompt: slot.presentation ? [...presentationSteps(id, keyword), ...base] : base,
    speakChoices: false,
    praise: letterSoundPraise(id, keyword),
    isNew: slot.presentation,
  };
}

function makeFirstSound(ctx: Ctx, slot: Slot): ReadingQuestion | null {
  const id = slot.item.slice(2);
  const pic = pickUnused(ctx, picturesStartingWith(id), (p) => p.id);
  if (!pic) return null;
  const seen = itemProgress(ctx.progress, slot.item).seen;
  const word = strip(pic.word);
  // Un leurre ne doit pas être le début du mot (« c » pour chocolat, « o » pour oiseau).
  const decoys = letterDecoys(ctx, id, letterChoiceCount(seen, slot.presentation) - 1, seen, (d) => word.startsWith(d));
  if (decoys.length === 0) return null;
  ctx.usedPictures.add(pic.id);
  return {
    game: 'first-sound',
    itemId: slot.item,
    target: id,
    stimulus: { kind: 'picture', picture: pic.id },
    choices: ctx.rng.shuffle([id, ...decoys]).map(letterChoice),
    answer: id,
    prompt: firstSoundPrompt(pic.word),
    speakChoices: false,
    praise: firstSoundPraise(pic.word, id),
    isNew: slot.presentation,
  };
}

function makeDrum(ctx: Ctx, slot: Slot): ReadingQuestion | null {
  const seen = itemProgress(ctx.progress, slot.item).seen;
  const counts = seen < 3 ? [1, 2] : [1, 2, 3];
  const usable = PICTURES.filter((p) => !isDrumAmbiguous(p) && p.syllables.length >= 1 && p.syllables.length <= 3);
  const fresh = usable.filter((p) => !ctx.used.has(`${slot.item}|${p.id}`));
  const pool = fresh.length > 0 ? fresh : usable;
  const least = Math.min(...counts.map((c) => ctx.drumCounts[c - 1] ?? 0));
  const wanted = counts.filter((c) => (ctx.drumCounts[c - 1] ?? 0) === least);
  const c = ctx.rng.pick(wanted);
  const ofCount = pool.filter((p) => p.syllables.length === c);
  const pic = pickUnused(ctx, ofCount.length > 0 ? ofCount : pool, (p) => p.id);
  if (!pic) return null;
  ctx.usedPictures.add(pic.id);
  ctx.drumCounts[pic.syllables.length - 1] = (ctx.drumCounts[pic.syllables.length - 1] ?? 0) + 1;
  return {
    game: 'syllable-drum',
    itemId: slot.item,
    target: pic.id,
    stimulus: { kind: 'picture', picture: pic.id },
    choices: [],
    answer: String(pic.syllables.length),
    prompt: drumPrompt(pic.word),
    speakChoices: false,
    praise: [],
    isNew: slot.presentation,
  };
}

/** Familles d'au moins 2 images partageant une clé (première syllabe orale ou rime). */
function families(key: (p: Picture) => string): Picture[][] {
  const m = new Map<string, Picture[]>();
  for (const p of PICTURES) m.set(key(p), [...(m.get(key(p)) ?? []), p]);
  return [...m.values()].filter((f) => f.length >= 2);
}
const START_FAMILIES = families((p) => p.syllables[0] ?? p.word);
const RHYME_FAMILIES = families((p) => p.rhyme);

/** Classe sonore de la voyelle d'une syllabe orale (« lé » et « lait » sonnent presque pareil). */
export function vowelClass(syllable: string): string {
  const v = strip(syllable).replace(/^[^aeiouy]+/, '');
  const table: readonly (readonly [RegExp, string])[] = [
    [/^(eau|au|o)/, 'o'],
    [/^(ou)/, 'ou'],
    [/^(oi)/, 'oi'],
    [/^(on|om)/, 'on'],
    [/^(an|am|en|em)/, 'an'],
    [/^(ain|ein|in|im)/, 'in'],
    [/^(eu|oeu)/, 'eu'],
    [/^(ai|ei|er|ez|et|e)/, 'e'],
    [/^(i|y)/, 'i'],
    [/^u/, 'u'],
    [/^a/, 'a'],
  ];
  return table.find(([re]) => re.test(v))?.[1] ?? v;
}

/** Une première syllabe qui en commence une autre sonne pareil (« cha » / « chat ») : jamais en leurre. */
function sameFirstSound(a: Picture, b: Picture): boolean {
  const x = strip(a.syllables[0] ?? '');
  const y = strip(b.syllables[0] ?? '');
  return onsetKey(a) === onsetKey(b) && (x.startsWith(y) || y.startsWith(x));
}

function makePairQuestion(ctx: Ctx, slot: Slot, kind: 'start' | 'end'): ReadingQuestion | null {
  const seen = itemProgress(ctx.progress, slot.item).seen;
  const fams = kind === 'start' ? START_FAMILIES : RHYME_FAMILIES;
  const freshFams = fams.filter((f) => f.some((p) => !ctx.used.has(`${slot.item}|${p.id}`)));
  const fam = ctx.rng.pick(freshFams.length > 0 ? freshFams : fams);
  const modelPool = fam.filter((p) => !ctx.used.has(`${slot.item}|${p.id}`));
  const model = pickUnused(ctx, modelPool.length > 0 ? modelPool : fam, (p) => p.id);
  if (!model) return null;
  const answer = pickUnused(ctx, fam.filter((p) => p.id !== model.id), (p) => p.id);
  if (!answer) return null;
  const allowNear = seen >= NEAR_DECOY_MIN_SEEN;
  const candidates = PICTURES.filter((p) =>
    kind === 'start' ? onsetKey(p) !== onsetKey(model) : p.rhyme !== model.rhyme,
  );
  let near: Picture[] = [];
  if (allowNear) {
    if (kind === 'start') {
      // même premier son, autre syllabe nettement différente (« ba » contre « bé »)
      near = PICTURES.filter(
        (p) => p.id !== model.id && onsetKey(p) === onsetKey(model) && !sameFirstSound(p, model) && vowelClass(p.syllables[0] ?? '') !== vowelClass(model.syllables[0] ?? ''),
      );
    } else {
      const keys = nearRhymes(model.rhyme);
      near = candidates.filter((p) => keys.includes(p.rhyme));
    }
  }
  const nearKeys = kind === 'end' ? nearRhymes(model.rhyme) : [];
  const far = candidates.filter((p) => p.id !== answer.id && (kind === 'start' || !nearKeys.includes(p.rhyme)));
  const decoys: Picture[] = [];
  const firstNear = ctx.rng.shuffle(near)[0];
  if (firstNear) decoys.push(firstNear);
  for (const p of ctx.rng.shuffle(far)) {
    if (decoys.length >= 2) break;
    if (decoys.some((d) => d.id === p.id)) continue;
    if (kind === 'start' && decoys.some((d) => onsetKey(d) === onsetKey(p) && sameFirstSound(d, p))) continue;
    decoys.push(p);
  }
  if (decoys.length < 2) return null;
  ctx.usedPictures.add(model.id);
  ctx.usedPictures.add(answer.id);
  ctx.used.add(`${slot.item}|${answer.id}`);
  return {
    game: kind === 'start' ? 'same-start' : 'same-end',
    itemId: slot.item,
    target: model.id,
    stimulus: { kind: 'picture', picture: model.id },
    choices: ctx.rng.shuffle([answer, ...decoys]).map((p) => pictureChoice(p, true)),
    answer: answer.id,
    prompt: kind === 'start' ? sameStartPrompt(model.word) : sameEndPrompt(model.word),
    speakChoices: true,
    praise: pairPraise(model.word, answer.word, kind),
    isNew: slot.presentation,
  };
}

function syllableAllowed(item: ItemId, s: Syllable): boolean {
  const kind = getGrapheme(s.onset)?.kind;
  if (item === 'k:blend') return kind === 'long';
  return kind === 'long' || kind === 'short' || s.onset === 'ch';
}
function isShortOnset(s: Syllable): boolean {
  return getGrapheme(s.onset)?.kind === 'short';
}

function makeMachine(ctx: Ctx, slot: Slot): ReadingQuestion | null {
  const seen = itemProgress(ctx.progress, slot.item).seen;
  const allowed = SYLLABLES.filter((s) => syllableAllowed(slot.item, s));
  const introduced = allowed.filter((s) => isIntroduced(ctx.progress, s.onset) && isIntroduced(ctx.progress, s.vowel));
  const pool = introduced.length >= 3 ? introduced : allowed;
  let cands = pool.filter((s) => !ctx.used.has(`${slot.item}|${s.id}`));
  if (cands.length === 0) cands = pool;
  if (slot.item === 'k:blend-stop') {
    // au moins une question sur deux avec une consonne brève
    const forceShort = ctx.blendStopShort * 2 < ctx.blendStopAsked + 1;
    const shorts = cands.filter(isShortOnset);
    if (forceShort && shorts.length > 0) cands = shorts;
  }
  const target = ctx.rng.pick(cands);
  const wide = SYLLABLES.filter((s) => s.id !== target.id);
  const base = pool.length >= 3 ? pool : wide;
  const nearOnset = NEAR.get(target.onset) ?? [];
  const isNear = (s: Syllable): boolean => s.onset === target.onset || s.vowel === target.vowel || nearOnset.includes(s.onset);
  const far = ctx.rng.shuffle(base.filter((s) => s.id !== target.id && !isNear(s)));
  const nearList = ctx.rng.shuffle(base.filter((s) => s.id !== target.id && isNear(s)));
  const decoys: Syllable[] = [];
  if (seen >= NEAR_DECOY_MIN_SEEN && nearList[0]) decoys.push(nearList[0]);
  for (const s of [...far, ...(seen >= NEAR_DECOY_MIN_SEEN ? nearList : []), ...ctx.rng.shuffle(wide.filter((s) => !isNear(s))), ...ctx.rng.shuffle(wide)]) {
    if (decoys.length >= 2) break;
    if (s.id !== target.id && !decoys.some((d) => d.id === s.id)) decoys.push(s);
  }
  if (decoys.length < 2) return null;
  if (slot.item === 'k:blend-stop') {
    ctx.blendStopAsked += 1;
    if (isShortOnset(target)) ctx.blendStopShort += 1;
  }
  const pic = target.picture ? getPicture(target.picture) : undefined;
  const parts = [getGrapheme(target.onset)?.upper ?? target.onset.toUpperCase(), getGrapheme(target.vowel)?.upper ?? target.vowel.toUpperCase()] as const;
  return {
    game: 'syllable-machine',
    itemId: slot.item,
    target: target.id,
    stimulus: { kind: 'syllable', syllable: target.id, parts },
    choices: ctx.rng.shuffle([target, ...decoys]).map((s): ReadingChoice => ({ id: s.id, kind: 'syllable', label: s.id.toUpperCase() })),
    answer: target.id,
    prompt: machinePrompt(target.onset, target.vowel, target.id),
    speakChoices: false,
    praise: machinePraise(target.id, pic ? pic.word : null),
    isNew: slot.presentation,
  };
}

function makeMystery(ctx: Ctx, slot: Slot): ReadingQuestion | null {
  const seen = itemProgress(ctx.progress, slot.item).seen;
  const readable = READ_WORDS.filter((w) => splitGraphemes(w.text).every((g) => isIntroduced(ctx.progress, g)));
  let pool = readable.length >= 3 ? readable : READ_WORDS;
  const easy = pool.filter((w) => w.syllables.length === 2);
  if (seen < NEAR_DECOY_MIN_SEEN && easy.length >= 3) pool = easy;
  const fresh = pool.filter((w) => !ctx.used.has(`${slot.item}|${w.id}`));
  const word = ctx.rng.pick(fresh.length > 0 ? fresh : pool);
  const first = (w: { text: string }): string => strip(w.text)[0] ?? '';
  const others = READ_WORDS.filter((w) => w.id !== word.id && w.picture !== word.picture);
  const nearList = ctx.rng.shuffle(others.filter((w) => first(w) === first(word)));
  const farList = ctx.rng.shuffle(others.filter((w) => first(w) !== first(word)));
  const decoys = [];
  if (seen >= NEAR_DECOY_MIN_SEEN && nearList[0]) decoys.push(nearList[0]);
  for (const w of [...farList, ...nearList]) {
    if (decoys.length >= 2) break;
    if (!decoys.some((d) => d.id === w.id)) decoys.push(w);
  }
  const pics = [word, ...decoys].map((w) => getPicture(w.picture));
  if (decoys.length < 2 || pics.some((p) => !p)) return null;
  return {
    game: 'mystery-word',
    itemId: slot.item,
    target: word.id,
    stimulus: { kind: 'word', word: word.text, syllables: word.syllables },
    choices: ctx.rng.shuffle([word, ...decoys]).map((w) => ({ id: w.picture, kind: 'picture' as const, picture: w.picture })),
    answer: word.picture,
    prompt: [],
    speakChoices: false,
    praise: readPraise(word.text),
    isNew: slot.presentation,
  };
}

/** Confusables visuels : jamais l'un contre l'autre avant 20 réponses. */
const CONFUSABLE: Readonly<Record<string, string>> = { b: 'd', d: 'b', p: 'q', q: 'p' };

function makeTwins(ctx: Ctx, slot: Slot): ReadingQuestion | null {
  const seen = itemProgress(ctx.progress, slot.item).seen;
  const singles = GRAPHEMES.filter((g) => g.id.length === 1 && g.id !== 'h').map((g) => g.id);
  let pool = singles.filter((id) => isIntroduced(ctx.progress, id));
  if (pool.length < 3) pool = singles.slice(0, Math.max(3, pool.length));
  const fresh = pool.filter((id) => !ctx.used.has(`${slot.item}|${id}`));
  const target = ctx.rng.pick(fresh.length > 0 ? fresh : pool);
  const conf = CONFUSABLE[target];
  const allowConf = seen >= TWINS_CONFUSABLE_MIN_SEEN;
  const others = ctx.rng.shuffle(pool.filter((id) => id !== target && (allowConf || id !== conf)));
  const decoys = [...others];
  if (allowConf && conf && pool.includes(conf)) {
    const i = decoys.indexOf(conf);
    if (i > 0) decoys.unshift(...decoys.splice(i, 1));
  }
  for (const id of singles) {
    if (decoys.length >= 2) break;
    if (id !== target && !decoys.includes(id) && (allowConf || id !== conf)) decoys.push(id);
  }
  if (decoys.length < 2) return null;
  const two = decoys.slice(0, 2);
  return {
    game: 'letter-twins',
    itemId: slot.item,
    target,
    stimulus: { kind: 'letter', grapheme: target },
    choices: ctx.rng.shuffle([target, ...two]).map(lowerChoice),
    answer: target,
    prompt: twinsPrompt(),
    speakChoices: false,
    praise: twinsPraise(target),
    isNew: slot.presentation,
  };
}

function makeQuestion(ctx: Ctx, slot: Slot): ReadingQuestion | null {
  switch (slot.game) {
    case 'syllable-drum':
      return makeDrum(ctx, slot);
    case 'same-start':
      return makePairQuestion(ctx, slot, 'start');
    case 'same-end':
      return makePairQuestion(ctx, slot, 'end');
    case 'letter-sound':
      return makeLetterSound(ctx, slot);
    case 'first-sound':
      return makeFirstSound(ctx, slot);
    case 'syllable-machine':
      return makeMachine(ctx, slot);
    case 'mystery-word':
      return makeMystery(ctx, slot);
    case 'letter-twins':
      return makeTwins(ctx, slot);
  }
}

// ---------- Composition ----------

function rate(p: ItemProgress): number {
  return p.seen > 0 ? p.correct / p.seen : 0;
}

/** Les moins réussis d'abord. */
function byLeastSuccessful(progress: ReadingProgress, items: ItemId[]): ItemId[] {
  return [...items].sort((a, b) => {
    const pa = itemProgress(progress, a);
    const pb = itemProgress(progress, b);
    return rate(pa) - rate(pb) || (pa.lastSeenAt ?? 0) - (pb.lastSeenAt ?? 0);
  });
}
/** Les plus anciennement vus d'abord (jamais vu en tête). */
function byOldest(progress: ReadingProgress, items: ItemId[]): ItemId[] {
  return [...items].sort((a, b) => (itemProgress(progress, a).lastSeenAt ?? -1) - (itemProgress(progress, b).lastSeenAt ?? -1));
}

function roundRobin(pool: readonly ItemId[], n: number, counts: Map<ItemId, number>, capK: number, capG = 1): ItemId[] {
  const out: ItemId[] = [];
  let moved = true;
  while (out.length < n && moved) {
    moved = false;
    for (const item of pool) {
      if (out.length >= n) break;
      const cap = item.startsWith('g:') ? capG : capK;
      const c = counts.get(item) ?? 0;
      if (c < cap) {
        out.push(item);
        counts.set(item, c + 1);
        moved = true;
      }
    }
  }
  return out;
}

/** Items interrogeables, c'est-à-dire avec au moins un jeu. */
function playable(items: ItemId[]): ItemId[] {
  return items.filter((i) => gamesForItem(i).length > 0);
}

interface Allocation {
  newItem: ItemId | null;
  /** Items des questions hors présentation de l'item nouveau, avec répétitions. */
  items: ItemId[];
  newCount: number;
}

function allocate(progress: ReadingProgress, stage: ReadingStage, review: boolean, finished: boolean): Allocation {
  const stageIts = playable(stageItems(stage));
  const counts = new Map<ItemId, number>();
  const all = playable(allItems());
  const known = (items: ItemId[]): ItemId[] => items.filter((i) => stateOf(progress, i) !== 'new');

  if (review || finished) {
    const source = review ? stageIts : all;
    let pool = known(source);
    if (pool.length === 0) pool = source;
    const ordered = [...byLeastSuccessful(progress, pool.filter((i) => stateOf(progress, i) === 'learning')), ...byOldest(progress, pool.filter((i) => stateOf(progress, i) !== 'learning'))];
    let items = roundRobin(ordered, SESSION_QUESTIONS, counts, 3);
    if (items.length < SESSION_QUESTIONS) items = [...items, ...roundRobin(ordered, SESSION_QUESTIONS - items.length, counts, 5)];
    // Étape à peu d'items (ex. 5 voyelles) : en dernier recours une lettre revient une 2e fois (autre jeu).
    if (items.length < SESSION_QUESTIONS) items = [...items, ...roundRobin(ordered, SESSION_QUESTIONS - items.length, counts, 5, 2)];
    return { newItem: null, items, newCount: 0 };
  }

  const learningInStage = stageItems(stage).filter((i) => stateOf(progress, i) === 'learning').length;
  const newItem = learningInStage <= 1 ? (stageIts.find((i) => stateOf(progress, i) === 'new') ?? null) : null;
  const cur = byLeastSuccessful(progress, stageIts.filter((i) => stateOf(progress, i) === 'learning'));
  const rev = byOldest(progress, all.filter((i) => stateOf(progress, i) === 'acquired'));

  let newCount = newItem ? NEW_ITEM_QUESTIONS : 0;
  if (newItem && cur.length === 0 && rev.length === 0) {
    // Toute première séance (rien en cours, rien à réviser) : plutôt que 9 questions du même jeu d'affilée,
    // on mêle un second item de l'étape (ex. tambour + « qui commence pareil »). Seule exception à
    // « un item nouveau par séance » (LECTURE.md §5.4).
    const second = stageIts.find((i) => i !== newItem && stateOf(progress, i) === 'new');
    if (second) {
      const firstCount = Math.ceil(SESSION_QUESTIONS / 2);
      return { newItem, items: Array.from({ length: SESSION_QUESTIONS - firstCount }, () => second), newCount: firstCount };
    }
    newCount = SESSION_MIN_QUESTIONS;
  }
  const rest = SESSION_QUESTIONS - newCount;
  const curWant = rev.length === 0 ? rest : cur.length === 0 ? 0 : Math.round(rest * 0.6);
  const items: ItemId[] = roundRobin(cur, curWant, counts, 3);
  items.push(...roundRobin(rev, rest - items.length, counts, 3));
  let short = rest - items.length;
  if (short > 0) {
    items.push(...roundRobin(cur, short, counts, 5));
    short = rest - items.length;
    if (short > 0) items.push(...roundRobin(rev, short, counts, 5));
    short = rest - items.length;
    if (short > 0) items.push(...roundRobin([...cur, ...rev], short, counts, 5, 2));
  }
  short = rest - items.length;
  if (short > 0 && newItem) newCount += short;
  return { newItem, items, newCount };
}

function chooseGame(item: ItemId, used: Map<ReadingGameId, number>, rng: Rng): ReadingGameId {
  const games = gamesForItem(item);
  const least = Math.min(...games.map((g) => used.get(g) ?? 0));
  return rng.pick(games.filter((g) => (used.get(g) ?? 0) === least));
}

function buildSlots(alloc: Allocation, rng: Rng): Slot[] {
  const usedGames = new Map<ReadingGameId, number>();
  const slots: Slot[] = [];
  const add = (item: ItemId, game: ReadingGameId, forNew: boolean, presentation: boolean): void => {
    usedGames.set(game, (usedGames.get(game) ?? 0) + 1);
    slots.push({ item, game, forNew, presentation });
  };
  if (alloc.newItem) {
    const games = gamesForItem(alloc.newItem);
    for (let i = 0; i < alloc.newCount; i += 1) {
      const game = i === 0 && games.includes('letter-sound') ? 'letter-sound' : chooseGame(alloc.newItem, usedGames, rng);
      add(alloc.newItem, game, true, i === 0);
    }
  }
  for (const item of alloc.items) add(item, chooseGame(item, usedGames, rng), false, false);
  return slots;
}

/** Plus longue série du même jeu. */
function longestRun(list: readonly Slot[]): number {
  let best = 0;
  let run = 0;
  list.forEach((s, i) => {
    run = i > 0 && list[i - 1]?.game === s.game ? run + 1 : 1;
    best = Math.max(best, run);
  });
  return best;
}

/** Ordonne : présentation d'abord, jamais plus de 3 du même jeu d'affilée, l'item nouveau jamais deux fois de suite. */
function arrange(slots: Slot[], rng: Rng): Slot[] {
  const pres = slots.find((s) => s.presentation);
  const news = slots.filter((s) => s.forNew && !s.presentation);
  const rest = rng.shuffle(slots.filter((s) => !s.forNew));
  const out: Slot[] = pres ? [pres] : [];
  while (rest.length > 0) {
    const last = out.slice(-MAX_SAME_GAME_RUN);
    const run = last.length === MAX_SAME_GAME_RUN && last.every((s) => s.game === last[0]?.game) ? last[0]?.game : null;
    const prev = out[out.length - 1];
    const all = rest.map((_, i) => i);
    let cands = all.filter((i) => rest[i]?.game !== run);
    const diffItem = cands.filter((i) => rest[i]?.item !== prev?.item);
    if (diffItem.length > 0) cands = diffItem;
    if (cands.length === 0) cands = all;
    const remaining = new Map<ReadingGameId, number>();
    for (const s of rest) remaining.set(s.game, (remaining.get(s.game) ?? 0) + 1);
    const max = Math.max(...cands.map((i) => remaining.get(rest[i]?.game as ReadingGameId) ?? 0));
    const heavy = cands.filter((i) => (remaining.get(rest[i]?.game as ReadingGameId) ?? 0) === max);
    const pick = rng.next() < 0.5 ? rng.pick(heavy) : rng.pick(cands);
    out.push(...rest.splice(pick, 1));
  }
  // Les autres questions de l'item nouveau s'intercalent : jamais côte à côte (sauf la présentation).
  for (const s of news) {
    const positions = rng.shuffle(Array.from({ length: out.length }, (_, i) => i + 1));
    const clash = (list: Slot[], at: number): boolean =>
      (list[at - 1]?.forNew === true && !list[at - 1]?.presentation) || (list[at + 1]?.forNew === true && !list[at + 1]?.presentation);
    let chosen: number | null = null;
    for (const strict of [true, false]) {
      for (const p of positions) {
        const trial = [...out.slice(0, p), s, ...out.slice(p)];
        if (clash(trial, p)) continue;
        if (strict && longestRun(trial) > MAX_SAME_GAME_RUN) continue;
        chosen = p;
        break;
      }
      if (chosen !== null) break;
    }
    out.splice(chosen ?? out.length, 0, s);
  }
  return out;
}

/** Question de secours quand un fabricant échoue : autre jeu du même item, puis n'importe quel item. */
function fallbackQuestion(ctx: Ctx, slot: Slot): ReadingQuestion | null {
  for (const game of gamesForItem(slot.item)) {
    const q = makeQuestion(ctx, { ...slot, game });
    if (q) return q;
  }
  for (const item of playable(allItems())) {
    for (const game of gamesForItem(item)) {
      const key = `${item}|`;
      if ([...ctx.used].some((u) => u.startsWith(key)) && item.startsWith('g:')) continue;
      const q = makeQuestion(ctx, { item, game, forNew: false, presentation: false });
      if (q) return q;
    }
  }
  return null;
}

function emergencyDrum(index: number): ReadingQuestion {
  const usable = PICTURES.filter((p) => !isDrumAmbiguous(p));
  const pic = usable[index % usable.length] as Picture;
  return {
    game: 'syllable-drum',
    itemId: 'k:count',
    target: pic.id,
    stimulus: { kind: 'picture', picture: pic.id },
    choices: [],
    answer: String(pic.syllables.length),
    prompt: drumPrompt(pic.word),
    speakChoices: false,
    praise: [],
    isNew: false,
  };
}

function emergencyPlan(progress: ReadingProgress, rng: Rng): ReadingSessionPlan {
  const picks = rng.shuffle(PICTURES.filter((p) => !isDrumAmbiguous(p))).slice(0, SESSION_MIN_QUESTIONS);
  const questions = picks.map(
    (pic): ReadingQuestion => ({
      game: 'syllable-drum',
      itemId: 'k:count',
      target: pic.id,
      stimulus: { kind: 'picture', picture: pic.id },
      choices: [],
      answer: String(pic.syllables.length),
      prompt: drumPrompt(pic.word),
      speakChoices: false,
      praise: [],
      isNew: false,
    }),
  );
  return { stage: progress.stage ?? 1, questions, newItemId: null, demos: demosOf(progress, questions) };
}

function demosOf(progress: ReadingProgress, questions: readonly ReadingQuestion[]): ReadingGameId[] {
  const done = new Set<ReadingGameId>(progress.demosDone ?? []);
  const out: ReadingGameId[] = [];
  for (const q of questions) {
    if (!done.has(q.game) && !out.includes(q.game)) out.push(q.game);
  }
  return out;
}

function plan(progress: ReadingProgress, rng: Rng, opts?: PlanOptions): ReadingSessionPlan {
  const review = opts?.stage !== undefined;
  const finished = !review && progress.finished === true;
  const stage: ReadingStage = review ? (opts?.stage as ReadingStage) : finished ? 5 : progress.stage;
  const alloc = allocate(progress, stage, review, finished);
  const slots = arrange(buildSlots(alloc, rng), rng);
  const ctx: Ctx = {
    progress,
    rng,
    used: new Set(),
    usedPictures: new Set(),
    drumCounts: [0, 0, 0],
    blendStopAsked: 0,
    blendStopShort: 0,
  };
  const questions: ReadingQuestion[] = [];
  for (const slot of slots) {
    const q = makeQuestion(ctx, slot) ?? fallbackQuestion(ctx, slot);
    if (!q) continue;
    if (!slot.forNew) ctx.used.add(`${q.itemId}|${q.target}`);
    questions.push(q);
  }
  // Dernier recours : jamais moins de 8 questions.
  let k = 0;
  while (questions.length < SESSION_MIN_QUESTIONS) {
    questions.push(emergencyDrum(k + questions.length));
    k += 1;
  }
  const limited = questions.slice(0, SESSION_MAX_QUESTIONS);
  const newItemId = alloc.newItem !== null && limited.some((q) => q.itemId === alloc.newItem && q.isNew) ? alloc.newItem : null;
  return { stage, questions: limited, newItemId, demos: demosOf(progress, limited) };
}

// ---------- Parcours de niveaux (levels.ts) : une séance = un niveau = un seul jeu ----------

/** Part des questions d'un niveau « lettre » qui portent sur la lettre du niveau (le reste : révision). */
const LEVEL_MAIN_SHARE = 0.6;

/** Progression vue depuis un niveau : seules les lettres déjà présentées dans le parcours sont « introduites ». */
function progressAtLevel(progress: ReadingProgress, level: ReadingLevel): ReadingProgress {
  const known = new Set(level.known);
  const items: Record<string, ItemProgress> = { ...progress.items };
  for (const g of GRAPHEMES) {
    const key = `g:${g.id}`;
    const cur = items[key] ?? NEW_STATE;
    if (known.has(g.id)) items[key] = cur.state === 'new' ? { ...cur, state: 'learning' } : cur;
    else items[key] = { ...cur, state: 'new' };
  }
  return { ...progress, items };
}

function levelSlots(level: ReadingLevel, rng: Rng): Slot[] {
  const n = level.questions;
  const plain = (item: ItemId, forNew = false, presentation = false): Slot => ({ item, game: level.game, forNew, presentation });
  if (level.game !== 'letter-sound' && level.game !== 'first-sound') {
    return Array.from({ length: n }, () => plain(level.item));
  }
  const id = level.item.slice(2);
  // Lettres déjà vues qui peuvent être révisées par ce jeu, les plus récentes d'abord.
  const earlier = level.known
    .filter((g) => g !== id && gamesForItem(`g:${g}`).includes(level.game))
    .reverse()
    .slice(0, 4);
  let main = earlier.length === 0 ? n : Math.ceil(n * LEVEL_MAIN_SHARE);
  if (level.game === 'first-sound') main = Math.min(main, picturesStartingWith(id).length);
  if (earlier.length === 0) main = n;
  const review: Slot[] = [];
  const order = rng.shuffle(earlier);
  for (let i = 0; review.length < n - main; i += 1) review.push(plain(`g:${order[i % order.length] as string}`));
  const mains = Array.from({ length: main }, () => plain(level.item, true));
  if (level.game === 'letter-sound') {
    // La lettre du niveau est présentée en premier (« a… comme avion »), puis le reste est mélangé.
    const first = plain(level.item, true, true);
    return [first, ...rng.shuffle([...mains.slice(1), ...review])];
  }
  return rng.shuffle([...mains, ...review]);
}

/**
 * Séance d'un niveau du parcours : uniquement le jeu du niveau. Déterministe pour une graine ; ne lève jamais
 * (au pire, la séance de tambour de secours).
 */
export function planLevel(level: ReadingLevel, progress: ReadingProgress, rng: Rng): ReadingSessionPlan {
  try {
    const at = progressAtLevel(progress, level);
    const ctx: Ctx = {
      progress: at,
      rng,
      used: new Set(),
      usedPictures: new Set(),
      drumCounts: [0, 0, 0],
      blendStopAsked: 0,
      blendStopShort: 0,
    };
    const questions: ReadingQuestion[] = [];
    for (const slot of levelSlots(level, rng)) {
      // Jamais un autre jeu en secours : à défaut, une question de plus sur l'item du niveau.
      const q = makeQuestion(ctx, slot) ?? makeQuestion(ctx, { ...slot, item: level.item, presentation: false });
      if (!q) continue;
      if (!slot.forNew) ctx.used.add(`${q.itemId}|${q.target}`);
      questions.push(q);
    }
    if (questions.length === 0) return emergencyPlan(progress, rng);
    const newItemId = questions.some((q) => q.isNew) ? level.item : null;
    return { stage: level.stage, levelId: level.id, questions, newItemId, demos: demosOf(progress, questions) };
  } catch (err) {
    console.error('planLevel : séance de secours', err);
    return emergencyPlan(progress, rng);
  }
}

/** Séance déterministe pour une graine donnée. Ne lève jamais : toute progression valide donne une séance. */
export function planSession(progress: ReadingProgress, rng: Rng, opts?: PlanOptions): ReadingSessionPlan {
  try {
    return plan(progress, rng, opts);
  } catch (err) {
    console.error('planSession : séance de secours', err);
    return emergencyPlan(progress, rng);
  }
}

// ---------- Questions ratées ----------

/** Questions déjà reposées : une seule fois par question. */
const requeued = new WeakSet<ReadingQuestion>();

/**
 * Après une erreur : la même question est reposée plus tard dans la séance (2 à 4 questions plus loin, ou en
 * dernier), une seule fois par question. Renvoie la nouvelle file ; `index` = position de la question ratée.
 */
export function requeueAfterMiss(queue: readonly ReadingQuestion[], index: number): ReadingQuestion[] {
  const missed = queue[index];
  if (!missed || requeued.has(missed)) return [...queue];
  requeued.add(missed);
  const offset = 2 + (index % 3);
  const next = [...queue];
  const at = index + offset;
  if (at >= next.length) next.push(missed);
  else next.splice(at, 0, missed);
  return next;
}
