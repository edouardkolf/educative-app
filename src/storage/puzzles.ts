// CONTRAT — parties des jeux libres « mécanique en manches illimitées » (store "puzzles", DB v4).
// Voir docs/specs/JEUX-LOGIQUE.md §4. Les trois jeux (devine le nombre, code secret, robot) partagent le store ;
// une partie = une manche (un nombre, un code, un trajet), créée au premier coup (arbitrage A9).
// Les fonctions sont des déclarations `function` (hissées) : game-records.ts les importe en retour.
import { finishGameRecord, isGameRecordBase, listGameRecords, startGameRecord, updateGameRecord } from './game-records';
import type { GameEndReason, GameRecordBase } from './types';
import { isPlainObject } from './validate';

export const PUZZLE_GAMES = ['guess-number', 'code-breaker', 'robot', 'memory'] as const;
export type PuzzleGameId = (typeof PUZZLE_GAMES)[number];

/** Difficulté choisie par l'enfant (une, deux ou trois étoiles) ; « easy » présélectionné. */
export const PUZZLE_PRESETS = ['easy', 'medium', 'hard'] as const;
export type PuzzlePreset = (typeof PUZZLE_PRESETS)[number];

export interface PuzzleRecord extends GameRecordBase {
  game: PuzzleGameId;
  preset: PuzzlePreset;
  /** `MISS` reçus de la mécanique pendant la manche (0 = réussie du premier coup si résolue). */
  misses: number;
  /** null tant que la manche n'est pas résolue ; sinon `misses === 0`. */
  firstTry: boolean | null;
  outcome: 'solved' | null;
}

export async function startPuzzle(
  profileId: string,
  init: Pick<PuzzleRecord, 'game' | 'preset'>,
): Promise<PuzzleRecord> {
  return startGameRecord('puzzles', profileId, { ...init, misses: 0, firstTry: null, outcome: null });
}

/** Un `MISS` de plus ; partie `in_progress` seulement. */
export async function recordPuzzleMiss(id: string, activeMs: number): Promise<void> {
  await updateGameRecord('puzzles', id, (record) => ({ ...record, misses: record.misses + 1, activeMs }));
}

/** Manche résolue : `completed`, `firstTry = misses === 0`. */
export async function completePuzzle(id: string, activeMs: number): Promise<void> {
  await finishGameRecord('puzzles', id, { status: 'completed' }, (record) => ({
    ...record,
    outcome: 'solved',
    firstTry: record.misses === 0,
    activeMs,
  }));
}

export async function abandonPuzzle(id: string, reason: GameEndReason, activeMs?: number): Promise<void> {
  await finishGameRecord('puzzles', id, { status: 'abandoned', endReason: reason }, (record) =>
    activeMs === undefined ? record : { ...record, activeMs },
  );
}

/** Parties d'un profil, triées par `startedAt` ; `game` filtre sur un jeu. */
export async function listPuzzles(profileId: string, game?: PuzzleGameId): Promise<PuzzleRecord[]> {
  const records = await listGameRecords('puzzles', profileId);
  return game ? records.filter((r) => r.game === game) : records;
}

export function isPuzzleFinished(record: PuzzleRecord): boolean {
  return record.outcome !== null;
}

/** Validation à l'import. */
export function isPuzzleRecord(value: unknown): value is PuzzleRecord {
  if (!isGameRecordBase(value) || !isPlainObject(value)) return false;
  const v = value as unknown as Record<string, unknown>;
  if (!(PUZZLE_GAMES as readonly unknown[]).includes(v.game)) return false;
  if (!(PUZZLE_PRESETS as readonly unknown[]).includes(v.preset)) return false;
  if (!Number.isInteger(v.misses) || (v.misses as number) < 0) return false;
  if (v.firstTry !== null && typeof v.firstTry !== 'boolean') return false;
  if (v.outcome !== null && v.outcome !== 'solved') return false;
  return true;
}
