// Tirage de la dictée (docs/specs/DICTEE.md §3.1). Pur : aucune dépendance au DOM ni au stockage.
import type { Rng } from '../../engine/types';
import type { DictationPlannedWord, DictationRecord } from '../../storage/dictations';
import { DICTATION_WORDS } from './words';
import type { DictationSeries, DictationWordId } from './types';

/** Mots tirés au hasard dans les séries précédentes, en plus des mots de la série choisie. */
export const REVIEW_COUNT = 5;

/**
 * La série de la dictée la plus récente du profil (max `startedAt`, tous statuts) si elle existe
 * encore, sinon la première série. Pas de champ de profil : recalculé à partir des parties.
 */
export function defaultSeriesId(records: readonly DictationRecord[], all: readonly DictationSeries[]): string {
  const fallback = all[0]?.id ?? '';
  if (records.length === 0) return fallback;
  const latest = records.reduce((best, r) => (r.startedAt > best.startedAt ? r : best));
  const stillExists = all.some((s) => s.id === latest.seriesId);
  return stillExists ? latest.seriesId : fallback;
}

function seriesIdOf(wordId: DictationWordId, all: readonly DictationSeries[]): string {
  for (const series of all) {
    if (series.words.includes(wordId)) return series.id;
  }
  return '';
}

/**
 * Tire les mots d'une dictée : les mots de `series`, plus jusqu'à `REVIEW_COUNT` mots pris au
 * hasard dans les séries précédentes. Les appels au rng se font dans l'ordre décrit au §3.1, pour
 * qu'une même graine redonne toujours la même dictée.
 */
export function drawDictation(
  series: DictationSeries,
  all: readonly DictationSeries[],
  rng: Rng,
): DictationPlannedWord[] {
  const current = series.words;
  const currentSet = new Set(current);

  const poolAll: DictationWordId[] = [];
  for (const other of all) {
    if (other.number >= series.number) continue;
    for (const wordId of other.words) poolAll.push(wordId);
  }
  const pool = poolAll.filter((wordId) => !currentSet.has(wordId));

  const review = rng.shuffle(pool).slice(0, Math.min(REVIEW_COUNT, pool.length));
  const order = rng.shuffle([...current, ...review]);

  return order.map((wordId) => {
    const word = DICTATION_WORDS.get(wordId);
    const sentenceCount = word?.sentences.length ?? 1;
    const sentenceIndex = rng.int(0, Math.max(0, sentenceCount - 1));
    return { wordId, seriesId: seriesIdOf(wordId, all), sentenceIndex };
  });
}
