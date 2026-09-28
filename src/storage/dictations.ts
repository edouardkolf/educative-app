// CONTRAT — parties de la dictée quotidienne (store "dictations"). Voir docs/specs/DICTEE.md §5.
// Les types font foi ; les corps sont écrits par la tâche « stockage v2 » (bâtis sur game-records.ts).
// Les fonctions sont des déclarations `function` (hissées) : game-records.ts les importe en retour.
import type { GameEndReason, GameRecordBase } from './types';

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
  _profileId: string,
  _init: Pick<DictationRecord, 'seriesId' | 'seed' | 'words'>,
): Promise<DictationRecord> {
  throw new Error('startDictation : à implémenter (docs/specs/DICTEE.md §5.1)');
}

/** Remplace l'item de même `index` (ou l'ajoute), trie, puis recalcule `activeMs`. Dictée `in_progress` seulement. */
export async function saveDictationItem(_id: string, _item: DictationItem): Promise<void> {
  throw new Error('saveDictationItem : à implémenter (docs/specs/DICTEE.md §5.1)');
}

export async function completeDictation(_id: string): Promise<void> {
  throw new Error('completeDictation : à implémenter (docs/specs/DICTEE.md §5.1)');
}

export async function abandonDictation(_id: string, _reason: GameEndReason): Promise<void> {
  throw new Error('abandonDictation : à implémenter (docs/specs/DICTEE.md §5.1)');
}

/** Dictées d'un profil, triées par `startedAt` croissant. */
export async function listDictations(_profileId: string): Promise<DictationRecord[]> {
  return [];
}

/** Tous les mots prévus ont un item (sert à la clôture au lancement : `completed`, comme F7). */
export function isDictationFinished(record: DictationRecord): boolean {
  return record.items.length === record.words.length;
}

/** Validation à l'import (docs/specs/DICTEE.md §5.2). */
export function isDictationRecord(_value: unknown): _value is DictationRecord {
  return false;
}
