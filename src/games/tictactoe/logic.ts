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

/** Niveau du téléphone (choisi par l'enfant, « facile » par défaut à chaque ouverture). */
export type Level = 'easy' | 'medium' | 'hard';
export const LEVELS: readonly Level[] = ['easy', 'medium', 'hard'];

/**
 * Comportement par niveau : probabilité de jouer un coup gagnant, de bloquer une menace, de prendre le
 * centre. « Fort » ne tire rien au sort : il joue un coup optimal (minimax), on ne peut pas le battre.
 * - Facile : rate un coup gagnant sur deux, bloque rarement → une enfant de 7 ans gagne souvent.
 * - Moyen : gagne presque toujours quand il peut, bloque 6 fois sur 10 → il faut voir les menaces.
 */
export const LEVEL_TUNING: Record<Exclude<Level, 'hard'>, { win: number; block: number; center: number }> = {
  easy: { win: 0.5, block: 0.3, center: 0.2 },
  medium: { win: 0.9, block: 0.6, center: 0.5 },
};

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
 * Coup du téléphone (`me`) selon le niveau. Facile et moyen : gagner (selon `win`), sinon bloquer
 * (selon `block`), sinon le centre (selon `center`), sinon une case libre au hasard. Fort : minimax.
 * Lève une erreur si la grille est pleine.
 */
export function chooseComputerMove(board: Board, me: Mark, rng: Rng, level: Level = 'medium'): number {
  const free = freeCells(board);
  if (free.length === 0) throw new Error('chooseComputerMove: grille pleine');
  if (level === 'hard') return rng.pick(bestMoves(board, me));
  const tuning = LEVEL_TUNING[level];
  const win = winningMove(board, me);
  if (win !== null && rng.next() < tuning.win) return win;
  const opponent: Mark = me === 'x' ? 'o' : 'x';
  const block = winningMove(board, opponent);
  if (block !== null && rng.next() < tuning.block) return block;
  if (board[4] === null && rng.next() < tuning.center) return 4;
  return rng.pick(free);
}

/**
 * Valeur minimax de la grille pour `me` : gagner vite > gagner tard > nul > perdre tard > perdre vite.
 * La rapidité se lit au nombre de cases encore libres, ce qui ne dépend que de la position : on peut
 * donc la mettre en cache (au plus 3⁹ positions), et le niveau fort répond instantanément.
 */
const minimaxCache = new Map<string, number>();

function minimax(board: Cell[], me: Mark, toPlay: Mark): number {
  const key = `${me}${toPlay}${board.map((c) => c ?? '-').join('')}`;
  const cached = minimaxCache.get(key);
  if (cached !== undefined) return cached;
  const outcome = outcomeOf(board);
  const empties = board.filter((c) => c === null).length;
  let value: number;
  if (outcome === me) value = 1 + empties;
  else if (outcome === 'draw') value = 0;
  else if (outcome !== null) value = -1 - empties;
  else {
    const next: Mark = toPlay === 'x' ? 'o' : 'x';
    value = toPlay === me ? -Infinity : Infinity;
    for (const cell of freeCells(board)) {
      board[cell] = toPlay;
      const v = minimax(board, me, next);
      board[cell] = null;
      value = toPlay === me ? Math.max(value, v) : Math.min(value, v);
    }
  }
  minimaxCache.set(key, value);
  return value;
}

/** Tous les coups optimaux pour `me` (le niveau fort en tire un au hasard, pour varier ses parties). */
export function bestMoves(board: Board, me: Mark): number[] {
  const work = [...board];
  const opponent: Mark = me === 'x' ? 'o' : 'x';
  let bestValue = -Infinity;
  let moves: number[] = [];
  for (const cell of freeCells(work)) {
    work[cell] = me;
    const value = minimax(work, me, opponent);
    work[cell] = null;
    if (value > bestValue) {
      bestValue = value;
      moves = [cell];
    } else if (value === bestValue) moves.push(cell);
  }
  return moves;
}

/**
 * Coup de pouce du niveau facile : les cases d'un alignement où `opponent` a déjà deux pions et où la
 * troisième case est libre (la menace à bloquer). Vide s'il n'y a pas de menace.
 */
export function threatCells(board: Board, opponent: Mark): number[] {
  const cells = new Set<number>();
  for (const line of LINES) {
    const mine = line.filter((i) => board[i] === opponent).length;
    const empty = line.filter((i) => board[i] === null).length;
    if (mine === 2 && empty === 1) line.forEach((i) => cells.add(i));
  }
  return [...cells].sort((a, b) => a - b);
}

/** Coup valable : la case existe, elle est libre, et la grille n'est pas déjà finie. */
export function isLegalMove(board: Board, cell: number): boolean {
  return Number.isInteger(cell) && cell >= 0 && cell <= 8 && board[cell] === null && outcomeOf(board) === null;
}
