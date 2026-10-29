// Logique pure de la vue du morpion (testée sans DOM) : qui commence, issue d'une grille, coup du téléphone.
import type { Rng, TicTacToeParams } from '../../engine/types';
import {
  boardFromMoves,
  chooseComputerMove,
  nextMark,
  outcomeOf,
  threatCells,
  type Level,
} from '../../games/tictactoe/logic';

export type GridResult = 'win' | 'loss' | 'draw';

/** L'enfant (croix) commence-t-il la grille n° `gridIndex` (0 = première de la manche) ? */
export function childStartsGrid(childStarts: TicTacToeParams['childStarts'], gridIndex: number): boolean {
  return childStarts === 'always' || gridIndex % 2 === 0;
}

/** Issue de la grille : victoire de l'enfant (croix), du téléphone (ronds), égalité, ou null si en cours. */
export function gridResult(moves: readonly number[], xStarts: boolean): GridResult | null {
  const outcome = outcomeOf(boardFromMoves(moves, xStarts));
  if (outcome === null) return null;
  if (outcome === 'draw') return 'draw';
  return outcome === 'x' ? 'win' : 'loss';
}

export function isChildTurn(moves: readonly number[], xStarts: boolean): boolean {
  return gridResult(moves, xStarts) === null && nextMark(moves, xStarts) === 'x';
}

export function phoneMove(moves: readonly number[], xStarts: boolean, rng: Rng, level: Level): number {
  return chooseComputerMove(boardFromMoves(moves, xStarts), 'o', rng, level);
}

/** Coup de pouce : cases de l'alignement menacé par le téléphone, quand c'est à l'enfant de jouer. */
export function hintCells(moves: readonly number[], xStarts: boolean, hint: boolean): number[] {
  if (!hint || !isChildTurn(moves, xStarts)) return [];
  return threatCells(boardFromMoves(moves, xStarts), 'o');
}
