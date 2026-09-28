// Statistiques parent de la dictée (docs/specs/DICTEE.md §5.3). Pur : aucune dépendance au DOM ni au
// stockage. Les indicateurs communs (parties, abandons, temps de jeu…) sont affichés par ChildStats
// (arbitrage A8) : ce module ne calcule que ce qui est propre à la dictée.
import type { DictationItem, DictationRecord } from '../../storage/dictations';
import { DICTATION_WORDS } from './words';

export type DictationWordStatus = 'fragile' | 'in-progress' | 'known';

export interface DictationWordStat {
  wordId: string;
  /** Orthographe du catalogue, ou `expected` si le mot en est sorti (§7 « catalogue modifié »). */
  label: string;
  attempts: number;
  firstTryCount: number;
  /** `firstTryCount / attempts`. */
  firstTryRate: number;
  status: DictationWordStatus;
  /** Saisies fausses distinctes, parmi les 3 dernières tentatives (dans l'ordre chronologique). */
  wrongTypings: string[];
}

export interface DictationSeriesStat {
  seriesId: string;
  /** Nombre de dictées lancées sur cette série (tous statuts). */
  launched: number;
  /** Score de la dernière dictée *terminée* de la série, ou `null` si aucune. */
  lastCompletedScore: { firstTry: number; total: number } | null;
}

export interface DictationStats {
  /** Nombre d'items, toutes dictées confondues. */
  wordsDictated: number;
  /** Items `firstTry` / items ; `null` sans item. */
  firstTryRate: number | null;
  /** Σ (wordReplays + sentenceReplays) / items ; `null` sans item. */
  replaysPerWord: number | null;
  /** Médiane des `answerMs` ; `null` sans item. */
  medianAnswerMs: number | null;
  /** Série et score de la dictée la plus récente (par `startedAt`), ou `null` sans dictée. */
  lastDictation: { seriesId: string; firstTry: number; total: number } | null;
  bySeries: DictationSeriesStat[];
  /** Triés : fragiles, en cours, sus, puis par taux croissant, puis alphabétique (§5.3). */
  byWord: DictationWordStat[];
  fragileWords: DictationWordStat[];
}

interface Attempt {
  dictationStartedAt: number;
  index: number;
  item: DictationItem;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? (sorted[mid] as number) : ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2;
}

/** Tentatives classées par `startedAt` de la dictée, puis par `index` (§5.3). */
function allAttempts(records: readonly DictationRecord[]): Attempt[] {
  const attempts: Attempt[] = [];
  for (const record of records) {
    for (const item of record.items) {
      attempts.push({ dictationStartedAt: record.startedAt, index: item.index, item });
    }
  }
  attempts.sort((a, b) => a.dictationStartedAt - b.dictationStartedAt || a.index - b.index);
  return attempts;
}

function statusRank(status: DictationWordStatus): number {
  switch (status) {
    case 'fragile':
      return 0;
    case 'in-progress':
      return 1;
    case 'known':
      return 2;
  }
}

function wordLabel(wordId: string, fallback: string): string {
  return DICTATION_WORDS.get(wordId)?.text ?? fallback;
}

function computeWordStats(attempts: readonly Attempt[]): DictationWordStat[] {
  const byWord = new Map<string, Attempt[]>();
  for (const attempt of attempts) {
    const list = byWord.get(attempt.item.wordId) ?? [];
    list.push(attempt);
    byWord.set(attempt.item.wordId, list);
  }

  const stats: DictationWordStat[] = [];
  for (const [wordId, wordAttempts] of byWord) {
    const attemptCount = wordAttempts.length;
    const firstTryCount = wordAttempts.filter((a) => a.item.firstTry).length;
    const lastThree = wordAttempts.slice(-3);
    const wrongInLastThree = lastThree.filter((a) => !a.item.firstTry);
    const isFragile = lastThree.length > 0 && (!lastThree[lastThree.length - 1]!.item.firstTry || wrongInLastThree.length >= 2);
    const isKnown = attemptCount >= 3 && lastThree.length === 3 && lastThree.every((a) => a.item.firstTry);
    const status: DictationWordStatus = isFragile ? 'fragile' : isKnown ? 'known' : 'in-progress';
    const wrongTypings = Array.from(
      new Set(lastThree.filter((a) => !a.item.firstTry).map((a) => a.item.typed)),
    );
    const last = wordAttempts[wordAttempts.length - 1]!;
    stats.push({
      wordId,
      label: wordLabel(wordId, last.item.expected),
      attempts: attemptCount,
      firstTryCount,
      firstTryRate: attemptCount > 0 ? firstTryCount / attemptCount : 0,
      status,
      wrongTypings,
    });
  }

  stats.sort((a, b) => {
    const rankDiff = statusRank(a.status) - statusRank(b.status);
    if (rankDiff !== 0) return rankDiff;
    const rateDiff = a.firstTryRate - b.firstTryRate;
    if (rateDiff !== 0) return rateDiff;
    return a.label.localeCompare(b.label, 'fr');
  });
  return stats;
}

function computeSeriesStats(records: readonly DictationRecord[]): DictationSeriesStat[] {
  const bySeries = new Map<string, DictationRecord[]>();
  for (const record of records) {
    const list = bySeries.get(record.seriesId) ?? [];
    list.push(record);
    bySeries.set(record.seriesId, list);
  }

  const stats: DictationSeriesStat[] = [];
  for (const [seriesId, seriesRecords] of bySeries) {
    const completed = seriesRecords
      .filter((r) => r.status === 'completed')
      .sort((a, b) => b.startedAt - a.startedAt);
    const lastCompleted = completed[0];
    stats.push({
      seriesId,
      launched: seriesRecords.length,
      lastCompletedScore: lastCompleted
        ? { firstTry: lastCompleted.items.filter((i) => i.firstTry).length, total: lastCompleted.words.length }
        : null,
    });
  }
  stats.sort((a, b) => a.seriesId.localeCompare(b.seriesId, 'fr'));
  return stats;
}

/** Statistiques parent de la dictée, calculées sur les dictées d'un profil (`now` réservé, non utilisé ici). */
export function computeDictationStats(records: readonly DictationRecord[], _now: number): DictationStats {
  const attempts = allAttempts(records);
  const items = attempts.map((a) => a.item);
  const wordsDictated = items.length;

  const firstTryRate = wordsDictated > 0 ? items.filter((i) => i.firstTry).length / wordsDictated : null;
  const replaysPerWord =
    wordsDictated > 0
      ? items.reduce((sum, i) => sum + i.wordReplays + i.sentenceReplays, 0) / wordsDictated
      : null;
  const medianAnswerMs = median(items.map((i) => i.answerMs));

  const latest = records.length > 0 ? records.reduce((best, r) => (r.startedAt > best.startedAt ? r : best)) : null;
  const lastDictation = latest
    ? { seriesId: latest.seriesId, firstTry: latest.items.filter((i) => i.firstTry).length, total: latest.words.length }
    : null;

  const byWord = computeWordStats(attempts);
  const fragileWords = byWord.filter((w) => w.status === 'fragile');

  return {
    wordsDictated,
    firstTryRate,
    replaysPerWord,
    medianAnswerMs,
    lastDictation,
    bySeries: computeSeriesStats(records),
    byWord,
    fragileWords,
  };
}
