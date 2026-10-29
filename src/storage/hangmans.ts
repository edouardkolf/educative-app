// Parties de pendu (store "hangmans"). Voir docs/specs/MORPION-PENDU.md §4.
// Une partie = un mot à deviner. Créée à la première lettre proposée (arbitrage A9), close quand le
// mot est trouvé ou que la fleur n'a plus de pétale.
// Les fonctions sont des déclarations `function` (hissées) : game-records.ts les importe en retour.
import { finishGameRecord, isGameRecordBase, listGameRecords, startGameRecord, updateGameRecord } from './game-records';
import type { GameEndReason, GameRecordBase } from './types';
import { isNonEmptyString, isPlainObject } from './validate';

export type HangmanOutcome = 'found' | 'lost';

export interface HangmanRecord extends GameRecordBase {
  wordId: string;
  /** Mot attendu, copié : les statistiques restent lisibles si le catalogue change. */
  word: string;
  /** Lettres proposées dans l'ordre, sans accent (a à z), sans doublon. */
  guesses: string[];
  /** Lettres proposées absentes du mot. */
  mistakes: number;
  /** Erreurs permises avant de perdre (nombre de pétales). */
  maxMistakes: number;
  outcome: HangmanOutcome | null;
}

export async function startHangman(
  profileId: string,
  init: Pick<HangmanRecord, 'wordId' | 'word' | 'maxMistakes' | 'guesses' | 'mistakes'>,
): Promise<HangmanRecord> {
  return startGameRecord('hangmans', profileId, { ...init, outcome: null });
}

export async function saveHangmanGuesses(
  id: string,
  guesses: string[],
  mistakes: number,
  activeMs: number,
): Promise<void> {
  await updateGameRecord('hangmans', id, (record) => ({ ...record, guesses: [...guesses], mistakes, activeMs }));
}

export async function completeHangman(
  id: string,
  guesses: string[],
  mistakes: number,
  outcome: HangmanOutcome,
  activeMs: number,
): Promise<void> {
  await finishGameRecord('hangmans', id, { status: 'completed' }, (record) => ({
    ...record,
    guesses: [...guesses],
    mistakes,
    outcome,
    activeMs,
  }));
}

export async function abandonHangman(id: string, reason: GameEndReason, activeMs?: number): Promise<void> {
  await finishGameRecord('hangmans', id, { status: 'abandoned', endReason: reason }, (record) =>
    activeMs === undefined ? record : { ...record, activeMs },
  );
}

export async function listHangmans(profileId: string): Promise<HangmanRecord[]> {
  return listGameRecords('hangmans', profileId);
}

/** Le mot a une issue (sert à la clôture au lancement : `completed`, comme F7). */
export function isHangmanFinished(record: HangmanRecord): boolean {
  return record.outcome !== null;
}

/** Validation à l'import. */
export function isHangmanRecord(value: unknown): value is HangmanRecord {
  if (!isGameRecordBase(value) || !isPlainObject(value)) return false;
  const v = value as unknown as Record<string, unknown>;
  if (!isNonEmptyString(v.wordId) || !isNonEmptyString(v.word)) return false;
  if (!Array.isArray(v.guesses) || v.guesses.length > 26) return false;
  const seen = new Set<string>();
  for (const g of v.guesses) {
    if (typeof g !== 'string' || !/^[a-z]$/.test(g) || seen.has(g)) return false;
    seen.add(g);
  }
  if (!Number.isInteger(v.maxMistakes) || (v.maxMistakes as number) < 1 || (v.maxMistakes as number) > 26) return false;
  if (!Number.isInteger(v.mistakes) || (v.mistakes as number) < 0 || (v.mistakes as number) > (v.maxMistakes as number)) {
    return false;
  }
  if (v.outcome !== null && v.outcome !== 'found' && v.outcome !== 'lost') return false;
  return true;
}
