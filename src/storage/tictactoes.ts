// Parties de morpion (store "tictactoes"). Voir docs/specs/MORPION-PENDU.md §4.
// Une partie = une grille. Créée au premier coup joué (arbitrage A9), close à la fin de la grille.
// Les fonctions sont des déclarations `function` (hissées) : game-records.ts les importe en retour.
import { finishGameRecord, isGameRecordBase, listGameRecords, startGameRecord, updateGameRecord } from './game-records';
import type { GameEndReason, GameRecordBase } from './types';
import { isPlainObject } from './validate';

/** `solo` : l'enfant (X) contre le téléphone (O). `duo` : deux joueurs sur le même téléphone (X puis O). */
export type TicTacToeMode = 'solo' | 'duo';
/** `x` : X gagne (l'enfant en solo) ; `o` : O gagne (le téléphone en solo) ; `draw` : grille pleine. */
export type TicTacToeOutcome = 'x' | 'o' | 'draw';
/** Niveau du téléphone en solo. Absent : grille à deux, ou enregistrée avant les niveaux (= moyen). */
export type TicTacToeLevel = 'easy' | 'medium' | 'hard';

export interface TicTacToeRecord extends GameRecordBase {
  mode: TicTacToeMode;
  /** Qui pose le premier pion : X (vrai) ou O. En duo, toujours X. */
  xStarts: boolean;
  /** Cases jouées dans l'ordre (0 à 8, de gauche à droite puis de haut en bas). */
  moves: number[];
  outcome: TicTacToeOutcome | null;
  level?: TicTacToeLevel;
}

export async function startTicTacToe(
  profileId: string,
  init: Pick<TicTacToeRecord, 'mode' | 'xStarts' | 'moves' | 'level'>,
): Promise<TicTacToeRecord> {
  const { level, ...rest } = init;
  return startGameRecord('tictactoes', profileId, { ...rest, ...(level ? { level } : {}), outcome: null });
}

/** Coups joués et temps actif ; partie `in_progress` seulement. */
export async function saveTicTacToeMoves(id: string, moves: number[], activeMs: number): Promise<void> {
  await updateGameRecord('tictactoes', id, (record) => ({ ...record, moves: [...moves], activeMs }));
}

export async function completeTicTacToe(
  id: string,
  moves: number[],
  outcome: TicTacToeOutcome,
  activeMs: number,
): Promise<void> {
  await finishGameRecord('tictactoes', id, { status: 'completed' }, (record) => ({
    ...record,
    moves: [...moves],
    outcome,
    activeMs,
  }));
}

export async function abandonTicTacToe(id: string, reason: GameEndReason, activeMs?: number): Promise<void> {
  await finishGameRecord('tictactoes', id, { status: 'abandoned', endReason: reason }, (record) =>
    activeMs === undefined ? record : { ...record, activeMs },
  );
}

export async function listTicTacToes(profileId: string): Promise<TicTacToeRecord[]> {
  return listGameRecords('tictactoes', profileId);
}

/** La grille a une issue (sert à la clôture au lancement : `completed`, comme F7). */
export function isTicTacToeFinished(record: TicTacToeRecord): boolean {
  return record.outcome !== null;
}

/** Validation à l'import. */
export function isTicTacToeRecord(value: unknown): value is TicTacToeRecord {
  if (!isGameRecordBase(value) || !isPlainObject(value)) return false;
  const v = value as unknown as Record<string, unknown>;
  if (v.mode !== 'solo' && v.mode !== 'duo') return false;
  if (typeof v.xStarts !== 'boolean') return false;
  if (!Array.isArray(v.moves) || v.moves.length > 9) return false;
  const seen = new Set<number>();
  for (const move of v.moves) {
    if (!Number.isInteger(move) || (move as number) < 0 || (move as number) > 8 || seen.has(move as number)) {
      return false;
    }
    seen.add(move as number);
  }
  if (v.outcome !== null && v.outcome !== 'x' && v.outcome !== 'o' && v.outcome !== 'draw') return false;
  if (v.level !== undefined && v.level !== 'easy' && v.level !== 'medium' && v.level !== 'hard') return false;
  return true;
}
