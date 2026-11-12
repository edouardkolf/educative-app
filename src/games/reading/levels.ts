// Parcours de niveaux du programme de lecture (LECTURE.md §16, décision du PM du 12/11/2026). Pur.
// Un niveau = un seul jeu, une séance courte. Le chemin alterne une piste « oreille » (tambour, commence pareil,
// finit pareil, puis la machine à syllabes) et une piste « lettres » (chaque lettre : son seul, puis son dans un
// mot). Un niveau est gagné quand une séance terminée atteint la barre (4 sur 5) ; sinon on le rejoue.
import type { ReadingRecord } from '../../storage/readings';
import { gamesForItem, getGrapheme, GRAPHEMES } from './curriculum';
import type { ReadingSettings } from './progress';
import type { GraphemeId, ItemId, ReadingGameId, ReadingStage } from './types';

export type LevelTrack = 'ear' | 'letters' | 'blend' | 'read';

export interface ReadingLevel {
  /** Identifiant stable, enregistré dans la séance (`ReadingRecord.levelId`) : 'drum-1', 'sound-a', 'first-a'… */
  id: string;
  /** Rang dans le parcours, à partir de 1. */
  index: number;
  track: LevelTrack;
  game: ReadingGameId;
  /** Item travaillé (statistiques, maîtrise). */
  item: ItemId;
  /** Lettres déjà présentées à ce niveau, celle du niveau comprise, dans l'ordre du programme. */
  known: readonly GraphemeId[];
  /** Étape du programme (réglage parent « étape de départ », couleur du médaillon). */
  stage: ReadingStage;
  /** Questions de la séance. */
  questions: number;
}

/** Séances courtes tant que l'enfant découvre (étapes 1 et 2), un peu plus longues ensuite. */
export const SHORT_LEVEL_QUESTIONS = 5;
export const LONG_LEVEL_QUESTIONS = 8;

/** Bonnes réponses du premier coup exigées pour gagner un niveau de `planned` questions : 4 sur 5, 6 sur 8. */
export function passMark(planned: number): number {
  if (planned <= 1) return planned;
  return planned <= SHORT_LEVEL_QUESTIONS ? planned - 1 : planned - 2;
}

const EAR_OPENING: readonly ReadingGameId[] = [
  'syllable-drum',
  'syllable-drum',
  'same-start',
  'same-start',
  'same-end',
  'same-end',
];
const EAR_CYCLE: readonly ReadingGameId[] = ['syllable-drum', 'same-start', 'same-end'];
const EAR_ITEM: Partial<Record<ReadingGameId, ItemId>> = {
  'syllable-drum': 'k:count',
  'same-start': 'k:onset',
  'same-end': 'k:rhyme',
};
const EAR_SLUG: Partial<Record<ReadingGameId, string>> = {
  'syllable-drum': 'drum',
  'same-start': 'start',
  'same-end': 'end',
};

/** Lettres rares et sons bonus de la fin du parcours (« h », muette, n'a pas de jeu). */
const TAIL_GRAPHEMES: readonly GraphemeId[] = GRAPHEMES.filter(
  (g) => !g.gated && gamesForItem(`g:${g.id}`).includes('letter-sound'),
).map((g) => g.id);
/** Niveaux « je lis » et « jumelles » de la fin, en plus de ceux qui alternent avec les lettres rares. */
const TAIL_EXTRA_PAIRS = 2;

function buildLevels(): ReadingLevel[] {
  const out: ReadingLevel[] = [];
  const counters = new Map<string, number>();
  const known: GraphemeId[] = [];
  let earCount = 0;
  let otherCount = 0;

  const push = (slug: string, track: LevelTrack, game: ReadingGameId, item: ItemId, stage: ReadingStage, id?: string) => {
    const n = (counters.get(slug) ?? 0) + 1;
    counters.set(slug, n);
    out.push({
      id: id ?? `${slug}-${n}`,
      index: out.length + 1,
      track,
      game,
      item,
      known: [...known],
      stage,
      questions: stage <= 2 ? SHORT_LEVEL_QUESTIONS : LONG_LEVEL_QUESTIONS,
    });
  };

  const pushEar = (stage: ReadingStage) => {
    const game = (EAR_OPENING[earCount] ?? EAR_CYCLE[(earCount - EAR_OPENING.length) % EAR_CYCLE.length]) as ReadingGameId;
    earCount += 1;
    push(EAR_SLUG[game] as string, 'ear', game, EAR_ITEM[game] as ItemId, stage);
  };

  /** Niveau de la piste « oreille » : jeux d'écoute, puis une machine à syllabes sur deux dès L et R connues. */
  const pushOther = (stage: ReadingStage) => {
    const canBlend = known.includes('l') && known.includes('r');
    if (canBlend && otherCount % 2 === 0) {
      const hasShort = known.some((id) => getGrapheme(id)?.kind === 'short');
      push('machine', 'blend', 'syllable-machine', hasShort ? 'k:blend-stop' : 'k:blend', stage);
    } else {
      pushEar(stage);
    }
    if (canBlend) otherCount += 1;
  };

  // Lettres du programme (n° 1 à 23) : un niveau « son », puis un niveau « son dans un mot » s'il y a des images.
  for (const g of GRAPHEMES.filter((x) => x.gated)) {
    const item: ItemId = `g:${g.id}`;
    // Les niveaux d'écoute mêlés aux voyelles forment l'étape 1 ; ensuite ils suivent l'étape de la lettre.
    const otherStage: ReadingStage = g.stage <= 2 ? 1 : g.stage;
    pushOther(otherStage);
    known.push(g.id);
    push('sound', 'letters', 'letter-sound', item, g.stage, `sound-${g.id}`);
    if (gamesForItem(item).includes('first-sound')) {
      pushOther(otherStage);
      push('first', 'letters', 'first-sound', item, g.stage, `first-${g.id}`);
    }
  }

  // Fin du parcours : lire des mots et les jumelles, en alternance avec les lettres rares.
  let flip = 0;
  const pushRead = () => {
    if (flip % 2 === 0) push('mystery', 'read', 'mystery-word', 'k:read', 5);
    else push('twins', 'read', 'letter-twins', 'k:case', 5);
    flip += 1;
  };
  for (const id of TAIL_GRAPHEMES) {
    pushRead();
    known.push(id);
    push('sound', 'letters', 'letter-sound', `g:${id}`, 5, `sound-${id}`);
  }
  for (let i = 0; i < TAIL_EXTRA_PAIRS * 2; i += 1) pushRead();
  return out;
}

/** Tous les niveaux, dans l'ordre du parcours. */
export const LEVELS: readonly ReadingLevel[] = buildLevels();

const LEVEL_BY_ID: ReadonlyMap<string, ReadingLevel> = new Map(LEVELS.map((l) => [l.id, l]));

export function getLevel(id: string): ReadingLevel | undefined {
  return LEVEL_BY_ID.get(id);
}

export type LevelState = 'done' | 'current' | 'locked';

export interface LevelProgress {
  /** Niveaux gagnés (ou tenus pour acquis par le réglage « étape de départ »). */
  passed: ReadonlySet<string>;
  /** Premier niveau non gagné, ou null quand tout le parcours est fait. */
  current: ReadingLevel | null;
  finished: boolean;
  /** Séances terminées par niveau (gagnées ou non). */
  attempts: Readonly<Record<string, number>>;
}

/** La séance (terminée) atteint-elle la barre de son niveau ? */
export function isLevelPass(record: Pick<ReadingRecord, 'status' | 'planned' | 'answers'>): boolean {
  if (record.status !== 'completed') return false;
  const firsts = record.answers.filter((a) => !a.retry);
  if (firsts.length < record.planned) return false;
  return firsts.filter((a) => a.correct).length >= passMark(record.planned);
}

/** Position dans le parcours, déduite des séances. Les séances sans niveau (ancien format) sont ignorées. */
export function levelProgress(records: readonly ReadingRecord[], settings?: ReadingSettings): LevelProgress {
  const startStage = settings?.startStage ?? 1;
  const passed = new Set<string>();
  for (const level of LEVELS) if (level.stage < startStage) passed.add(level.id);
  const attempts: Record<string, number> = {};
  for (const record of records) {
    const id = record.levelId;
    if (!id || !LEVEL_BY_ID.has(id) || record.status !== 'completed') continue;
    attempts[id] = (attempts[id] ?? 0) + 1;
    if (isLevelPass(record)) passed.add(id);
  }
  const current = LEVELS.find((l) => !passed.has(l.id)) ?? null;
  return { passed, current, finished: current === null, attempts };
}

export function levelState(progress: LevelProgress, level: ReadingLevel): LevelState {
  if (progress.passed.has(level.id)) return 'done';
  return progress.current?.id === level.id ? 'current' : 'locked';
}
