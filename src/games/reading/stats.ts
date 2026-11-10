// Indicateurs du bloc parent « J'apprends à lire » (LECTURE.md §8.3). Pur, testé sous Vitest.
// Les confusions et les alertes se calculent à partir des seules réponses (`confusionsFrom`, `alertsFrom`) :
// elles se testent sans la progression ni le contenu.
import type { ReadingRecord } from '../../storage/readings';
import { getGrapheme, gatedItems, stageItems } from './curriculum';
import { computeProgress } from './progress';
import type { ReadingSettings } from './progress';
import { READING_STAGES } from './types';
import type { ItemId, ItemState, ReadingAnswer, ReadingGameId, ReadingStage } from './types';

export interface ItemStat {
  itemId: ItemId;
  /** Ce que le parent lit : « M », « OU », « Compter les syllabes ». */
  label: string;
  stage: ReadingStage;
  state: ItemState;
  seen: number;
  /** Taux de réussite du premier coup, 0 à 1, ou null si jamais vu. */
  rate: number | null;
}

export interface Confusion {
  /** Ce qui était demandé et ce qui a été choisi à la place, en clair : « M » → « N ». */
  target: string;
  chosen: string;
  count: number;
}

export interface GuessAlert {
  game: ReadingGameId;
  /** Libellé parent du jeu. */
  label: string;
  answers: number;
  rate: number;
  /** Taux attendu en répondant au hasard. */
  chance: number;
}

export interface ReadingStatsSummary {
  stage: ReadingStage;
  finished: boolean;
  sessionsCompleted: number;
  acquired: number;
  gatedTotal: number;
  items: ItemStat[];
  /** Les confusions les plus fréquentes d'abord, au plus 8. */
  confusions: Confusion[];
  /** Jeux où l'enfant semble deviner (LECTURE.md §8.3) : « à accompagner ». */
  alerts: GuessAlert[];
}

// ---------- Libellés parent ----------

export const STAGE_TITLES: Readonly<Record<ReadingStage, string>> = {
  1: "J'écoute",
  2: 'Les voyelles',
  3: 'Les consonnes qui durent',
  4: 'Les consonnes brèves',
  5: 'Je lis',
};

const SKILL_LABELS: Readonly<Record<string, string>> = {
  count: 'Compter les syllabes',
  onset: 'Commence pareil',
  rhyme: 'Rimes',
  blend: 'Assembler une syllabe',
  'blend-stop': 'Assembler avec P, T, B…',
  read: 'Lire un mot',
  case: 'Majuscule et minuscule',
};

export const GAME_LABELS: Readonly<Record<ReadingGameId, string>> = {
  'syllable-drum': 'Compter les syllabes',
  'same-start': 'Commence pareil',
  'same-end': 'Rimes',
  'letter-sound': 'La lettre qui chante',
  'first-sound': 'Par quoi ça commence',
  'syllable-machine': 'Assembler une syllabe',
  'mystery-word': 'Lire un mot',
  'letter-twins': 'Majuscule et minuscule',
};

/** Jeux dont le choix est une lettre ou une syllabe (les seuls qui entrent dans la table des confusions). */
const LETTER_GAMES: readonly ReadingGameId[] = ['letter-sound', 'first-sound', 'letter-twins'];
const SYLLABLE_GAMES: readonly ReadingGameId[] = ['syllable-machine'];

/** Libellé lisible d'un item : « M », « OU », « Compter les syllabes ». */
export function itemLabel(itemId: ItemId): string {
  if (itemId.startsWith('k:')) return SKILL_LABELS[itemId.slice(2)] ?? itemId.slice(2);
  return graphemeLabel(itemId.slice(2));
}

function graphemeLabel(id: string): string {
  try {
    return getGrapheme(id)?.upper ?? id.toUpperCase();
  } catch {
    return id.toUpperCase();
  }
}

// ---------- Confusions ----------

export const MAX_CONFUSIONS = 8;

/**
 * Table des confusions (demandé → choisi) sur les lettres et les syllabes. Les réponses `retry`, les réponses justes
 * et les choix qui ne sont ni lettre ni syllabe (images, mots, tambour) sont ignorés.
 * `label` met un identifiant en clair (capitales) ; il peut être remplacé dans les tests.
 */
export function confusionsFrom(
  answers: readonly ReadingAnswer[],
  label: (id: string) => string = graphemeLabel,
): Confusion[] {
  const counts = new Map<string, Confusion>();
  for (const a of answers) {
    if (a.retry || a.correct || a.chosen === null || a.chosen === a.target) continue;
    const isLetter = LETTER_GAMES.includes(a.game);
    const isSyllable = SYLLABLE_GAMES.includes(a.game);
    if (!isLetter && !isSyllable) continue;
    const target = isLetter ? label(a.target) : a.target.toUpperCase();
    const chosen = isLetter ? label(a.chosen) : a.chosen.toUpperCase();
    const key = `${target}\u0000${chosen}`;
    const entry = counts.get(key);
    if (entry) entry.count += 1;
    else counts.set(key, { target, chosen, count: 1 });
  }
  return [...counts.values()]
    .sort((x, y) => y.count - x.count || x.target.localeCompare(y.target, 'fr') || x.chosen.localeCompare(y.chosen, 'fr'))
    .slice(0, MAX_CONFUSIONS);
}

// ---------- Alertes « à accompagner » ----------

export const ALERT_MIN_ANSWERS = 12;
export const ALERT_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;
export const ALERT_MARGIN = 0.15;
/** Le tambour n'a pas de choix : on le compte pour 3 (réponses '1' à '3'). */
export const DRUM_CHOICES = 3;

/**
 * Jeux où l'enfant semble répondre au hasard : au moins 12 réponses (hors `retry`) sur les 14 derniers jours et un
 * taux de premier coup ≤ hasard + 15 points (hasard = moyenne de 1 / choiceCount).
 */
export function alertsFrom(answers: readonly ReadingAnswer[], now: number): GuessAlert[] {
  const byGame = new Map<ReadingGameId, ReadingAnswer[]>();
  for (const a of answers) {
    if (a.retry || a.at < now - ALERT_WINDOW_MS) continue;
    const list = byGame.get(a.game);
    if (list) list.push(a);
    else byGame.set(a.game, [a]);
  }
  const alerts: GuessAlert[] = [];
  for (const [game, list] of byGame) {
    if (list.length < ALERT_MIN_ANSWERS) continue;
    const rate = list.filter((a) => a.correct).length / list.length;
    const chance =
      list.reduce((sum, a) => sum + 1 / (a.choiceCount >= 1 ? a.choiceCount : DRUM_CHOICES), 0) / list.length;
    // Petite tolérance : évite qu'une erreur d'arrondi flottant écarte le cas limite exact.
    if (rate <= chance + ALERT_MARGIN + 1e-9) alerts.push({ game, label: GAME_LABELS[game], answers: list.length, rate, chance });
  }
  return alerts.sort((x, y) => x.rate - y.rate || x.game.localeCompare(y.game));
}

// ---------- Synthèse ----------

export function summarizeReading(
  records: readonly ReadingRecord[],
  settings: ReadingSettings | undefined,
  now: number,
): ReadingStatsSummary {
  const progress = computeProgress(records, settings);
  const items: ItemStat[] = [];
  for (const stage of READING_STAGES) {
    for (const itemId of stageItems(stage)) {
      const p = progress.items[itemId];
      items.push({
        itemId,
        label: itemLabel(itemId),
        stage,
        state: p?.state ?? 'new',
        seen: p?.seen ?? 0,
        rate: p && p.seen > 0 ? p.correct / p.seen : null,
      });
    }
  }
  let acquired = 0;
  let gatedTotal = 0;
  for (const stage of READING_STAGES) {
    for (const itemId of gatedItems(stage)) {
      gatedTotal += 1;
      if (progress.items[itemId]?.state === 'acquired') acquired += 1;
    }
  }
  const answers = records.flatMap((r) => r.answers);
  return {
    stage: progress.stage,
    finished: progress.finished,
    sessionsCompleted: progress.sessionsCompleted,
    acquired,
    gatedTotal,
    items,
    confusions: confusionsFrom(answers),
    alerts: alertsFrom(answers, now),
  };
}
