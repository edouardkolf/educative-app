// Logique pure du morpion (docs/specs/MORPION-PENDU.md §3.1) : grille, tour, victoire, coup du téléphone.
// Aucun accès au DOM : testée sous Vitest.
import type { Rng } from '../../engine/types';
import type { TicTacToeOutcome } from '../../storage/tictactoes';

export type Mark = 'x' | 'o';
export type Cell = Mark | null;
export type Board = readonly Cell[];

/** Les 8 alignements gagnants (cases 0 à 8, ligne par ligne). */
export const LINES: readonly (readonly [number, number, number])[] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

/**
 * Le téléphone bloque un alignement menacé dans 3 cas sur 4 seulement : il reste battable par une
 * enfant de 7 ans, sans jouer au hasard. Il gagne toujours quand il le peut.
 */
export const BLOCK_PROBABILITY = 0.75;
/** Probabilité de prendre le centre s'il est libre (quand il n'y a ni gain ni blocage). */
export const CENTER_PROBABILITY = 0.5;

export function emptyBoard(): Cell[] {
  return Array.from({ length: 9 }, () => null);
}

/** Qui joue le coup n° `index` (0 = premier coup). */
export function markForMove(index: number, xStarts: boolean): Mark {
  const first: Mark = xStarts ? 'x' : 'o';
  const second: Mark = xStarts ? 'o' : 'x';
  return index % 2 === 0 ? first : second;
}

export function boardFromMoves(moves: readonly number[], xStarts: boolean): Cell[] {
  const board = emptyBoard();
  moves.forEach((cell, i) => {
    board[cell] = markForMove(i, xStarts);
  });
  return board;
}

export function nextMark(moves: readonly number[], xStarts: boolean): Mark {
  return markForMove(moves.length, xStarts);
}

export function winningLine(board: Board): { mark: Mark; line: readonly [number, number, number] } | null {
  for (const line of LINES) {
    const [a, b, c] = line;
    const mark = board[a];
    if (mark && mark === board[b] && mark === board[c]) return { mark, line };
  }
  return null;
}

export function outcomeOf(board: Board): TicTacToeOutcome | null {
  const win = winningLine(board);
  if (win) return win.mark;
  return board.every((cell) => cell !== null) ? 'draw' : null;
}

export function freeCells(board: Board): number[] {
  const free: number[] = [];
  board.forEach((cell, i) => {
    if (cell === null) free.push(i);
  });
  return free;
}

/** Une case qui donne la victoire à `mark` en un coup, ou null. */
export function winningMove(board: Board, mark: Mark): number | null {
  for (const line of LINES) {
    const marks = line.map((i) => board[i]);
    const mine = marks.filter((m) => m === mark).length;
    const empty = line.filter((i) => board[i] === null);
    if (mine === 2 && empty.length === 1) return empty[0] as number;
  }
  return null;
}

/**
 * Coup du téléphone (`me`) : gagner si possible ; sinon bloquer l'adversaire (3 fois sur 4) ; sinon
 * le centre (1 fois sur 2) ; sinon une case libre au hasard. Lève une erreur si la grille est pleine.
 */
export function chooseComputerMove(board: Board, me: Mark, rng: Rng): number {
  const free = freeCells(board);
  if (free.length === 0) throw new Error('chooseComputerMove: grille pleine');
  const win = winningMove(board, me);
  if (win !== null) return win;
  const opponent: Mark = me === 'x' ? 'o' : 'x';
  const block = winningMove(board, opponent);
  if (block !== null && rng.next() < BLOCK_PROBABILITY) return block;
  if (board[4] === null && rng.next() < CENTER_PROBABILITY) return 4;
  return rng.pick(free);
}

/** Coup valable : la case existe, elle est libre, et la grille n'est pas déjà finie. */
export function isLegalMove(board: Board, cell: number): boolean {
  return Number.isInteger(cell) && cell >= 0 && cell <= 8 && board[cell] === null && outcomeOf(board) === null;
}
