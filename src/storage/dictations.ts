// CONTRAT — parties de la dictée quotidienne (store "dictations"). Voir docs/specs/DICTEE.md §5.
// Les types font foi ; les corps sont écrits par la tâche « stockage v2 » (bâtis sur game-records.ts).
// Les fonctions sont des déclarations `function` (hissées) : game-records.ts les importe en retour.
import { finishGameRecord, isGameRecordBase, listGameRecords, startGameRecord, updateGameRecord } from './game-records';
import type { GameEndReason, GameRecordBase } from './types';
import { isFiniteNumber, isNonEmptyString, isPlainObject } from './validate';

/** Un mot prévu dans la dictée, avec sa série d'origine et la phrase tirée pour lui. */
export interface DictationPlannedWord {
  wordId: string;
  seriesId: string;
  sentenceIndex: number;
}

/** Un mot validé au moins une fois (au plus un item par `index`). */
export interface DictationItem {
  /** Position dans la dictée. */
  index: number;
  wordId: string;
  /** Orthographe attendue, copiée : les statistiques restent lisibles si le catalogue change. */
  expected: string;
  /** Première saisie validée, normalisée, jamais vide. */
  typed: string;
  /** Juste du premier coup = réussite. */
  firstTry: boolean;
  /** Réécriture terminée (vrai si firstTry). */
  copyDone: boolean;
  /** Touches refusées pendant la réécriture. */
  copyMistakes: number;
  /** Réécoutes demandées (hors lectures automatiques). */
  wordReplays: number;
  sentenceReplays: number;
  /** Temps actif jusqu'à la première validation (ms). */
  answerMs: number;
  /** Temps actif jusqu'à la fin de l'unité (ms). */
  durationMs: number;
}

export interface DictationRecord extends GameRecordBase {
  // startedAt : création, au premier mot validé (arbitrage A9). activeMs = Σ items.durationMs, recalculé à chaque item.
  /** Série choisie par l'enfant. */
  seriesId: string;
  /** Graine du tirage : rejoue exactement la dictée. */
  seed: number;
  words: DictationPlannedWord[];
  /** Un item par mot validé au moins une fois, trié par index. */
  items: DictationItem[];
}

/** Crée la dictée (au premier mot validé) : `in_progress`, sans item. */
export async function startDictation(
  profileId: string,
  init: Pick<DictationRecord, 'seriesId' | 'seed' | 'words'>,
): Promise<DictationRecord> {
  return startGameRecord('dictations', profileId, { ...init, items: [] });
}

/** Remplace l'item de même `index` (ou l'ajoute), trie, puis recalcule `activeMs`. Dictée `in_progress` seulement. */
export async function saveDictationItem(id: string, item: DictationItem): Promise<void> {
  await updateGameRecord('dictations', id, (record) => {
    const items = [...record.items.filter((existing) => existing.index !== item.index), item].sort(
      (a, b) => a.index - b.index,
    );
    const activeMs = items.reduce((sum, i) => sum + i.durationMs, 0);
    return { ...record, items, activeMs };
  });
}

export async function completeDictation(id: string): Promise<void> {
  await finishGameRecord('dictations', id, { status: 'completed' });
}

export async function abandonDictation(id: string, reason: GameEndReason): Promise<void> {
  await finishGameRecord('dictations', id, { status: 'abandoned', endReason: reason });
}

/** Dictées d'un profil, triées par `startedAt` croissant. */
export async function listDictations(profileId: string): Promise<DictationRecord[]> {
  return listGameRecords('dictations', profileId);
}

/** Tous les mots prévus ont un item (sert à la clôture au lancement : `completed`, comme F7). */
export function isDictationFinished(record: DictationRecord): boolean {
  return record.items.length === record.words.length;
}

function isPlannedWord(value: unknown): value is DictationPlannedWord {
  if (!isPlainObject(value)) return false;
  return (
    isNonEmptyString(value.wordId) &&
    isNonEmptyString(value.seriesId) &&
    Number.isInteger(value.sentenceIndex) &&
    (value.sentenceIndex as number) >= 0
  );
}

function isDictationItem(value: unknown, wordsLength: number): value is DictationItem {
  if (!isPlainObject(value)) return false;
  if (!Number.isInteger(value.index) || (value.index as number) < 0 || (value.index as number) >= wordsLength) {
    return false;
  }
  if (!isNonEmptyString(value.wordId)) return false;
  if (!isNonEmptyString(value.expected)) return false;
  if (!isNonEmptyString(value.typed)) return false;
  if (typeof value.firstTry !== 'boolean') return false;
  if (typeof value.copyDone !== 'boolean') return false;
  for (const key of ['copyMistakes', 'wordReplays', 'sentenceReplays'] as const) {
    const count = value[key];
    if (!Number.isInteger(count) || (count as number) < 0) return false;
  }
  if (!isFiniteNumber(value.answerMs) || value.answerMs < 0) return false;
  if (!isFiniteNumber(value.durationMs) || value.durationMs < 0) return false;
  return true;
}

/** Validation à l'import (docs/specs/DICTEE.md §5.2). */
export function isDictationRecord(value: unknown): value is DictationRecord {
  if (!isGameRecordBase(value)) return false;
  const v = value as unknown as Record<string, unknown>;
  if (!isNonEmptyString(v.seriesId)) return false;
  if (!Number.isInteger(v.seed) || (v.seed as number) < 0) return false;
  if (!Array.isArray(v.words) || v.words.length < 1 || v.words.length > 30) return false;
  const words = v.words;
  if (!words.every(isPlannedWord)) return false;
  if (!Array.isArray(v.items)) return false;
  const items = v.items;
  if (!items.every((item) => isDictationItem(item, words.length))) return false;
  const seenIndexes = new Set<number>();
  for (const item of items as DictationItem[]) {
    if (seenIndexes.has(item.index)) return false;
    seenIndexes.add(item.index);
  }
  return true;
}
