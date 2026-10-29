import { describe, expect, it } from 'vitest';
import { createRng } from '../../engine/rng';
import {
  boardFromMoves,
  bestMoves,
  chooseComputerMove,
  freeCells,
  isLegalMove,
  markForMove,
  nextMark,
  type Level,
  outcomeOf,
  threatCells,
  winningLine,
  winningMove,
} from './logic';

describe('morpion — tours', () => {
  it('alterne à partir de celui qui commence', () => {
    expect(markForMove(0, true)).toBe('x');
    expect(markForMove(1, true)).toBe('o');
    expect(markForMove(0, false)).toBe('o');
    expect(nextMark([4], true)).toBe('o');
    expect(nextMark([4, 0], false)).toBe('o');
  });

  it('reconstruit la grille depuis les coups', () => {
    const board = boardFromMoves([4, 0, 8], true);
    expect(board[4]).toBe('x');
    expect(board[0]).toBe('o');
    expect(board[8]).toBe('x');
    expect(freeCells(board)).toEqual([1, 2, 3, 5, 6, 7]);
  });
});

describe('morpion — issue', () => {
  it('détecte une ligne, une colonne et une diagonale', () => {
    expect(winningLine(boardFromMoves([0, 3, 1, 4, 2], true))).toEqual({ mark: 'x', line: [0, 1, 2] });
    expect(outcomeOf(boardFromMoves([1, 0, 2, 3, 4, 6], true))).toBe('o');
    expect(outcomeOf(boardFromMoves([0, 1, 4, 2, 8], true))).toBe('x');
  });

  it('match nul quand la grille est pleine sans alignement', () => {
    // x o x / x o o / o x x
    expect(outcomeOf(boardFromMoves([0, 1, 2, 4, 3, 5, 7, 6, 8], true))).toBe('draw');
  });

  it('grille en cours : pas d’issue, coups légaux seulement sur les cases libres', () => {
    const board = boardFromMoves([4], true);
    expect(outcomeOf(board)).toBeNull();
    expect(isLegalMove(board, 4)).toBe(false);
    expect(isLegalMove(board, 0)).toBe(true);
    expect(isLegalMove(board, 9)).toBe(false);
    expect(isLegalMove(boardFromMoves([0, 3, 1, 4, 2], true), 8)).toBe(false);
  });
});

function playOut(levelX: Level | 'random', levelO: Level, seed: number, xStarts = true) {
  const rng = createRng(seed);
  const moves: number[] = [];
  let board = boardFromMoves(moves, xStarts);
  while (outcomeOf(board) === null) {
    const mark = nextMark(moves, xStarts);
    const level = mark === 'x' ? levelX : levelO;
    const cell = level === 'random' ? rng.pick(freeCells(board)) : chooseComputerMove(board, mark, rng, level);
    expect(isLegalMove(board, cell)).toBe(true);
    moves.push(cell);
    board = boardFromMoves(moves, xStarts);
  }
  return outcomeOf(board);
}

describe('morpion — coup du téléphone', () => {
  // o o _ / x x _ / x _ _ : o peut gagner en 2.
  const canWin = boardFromMoves([3, 0, 4, 1, 6], true);
  // x x _ / _ o _ / _ _ _ : o doit bloquer en 2.
  const mustBlock = boardFromMoves([0, 4, 1], true);

  function rate(board: ReturnType<typeof boardFromMoves>, level: Level, cell: number, tries = 400) {
    let hits = 0;
    for (let seed = 0; seed < tries; seed += 1) {
      if (chooseComputerMove(board, 'o', createRng(seed), level) === cell) hits += 1;
    }
    return hits / tries;
  }

  it('facile : rate souvent son coup gagnant et bloque rarement', () => {
    expect(rate(canWin, 'easy', 2)).toBeGreaterThan(0.4);
    expect(rate(canWin, 'easy', 2)).toBeLessThan(0.75);
    expect(rate(mustBlock, 'easy', 2)).toBeLessThan(0.55);
  });

  it('moyen : gagne presque toujours et bloque plus d’une fois sur deux, sans être parfait', () => {
    expect(rate(canWin, 'medium', 2)).toBeGreaterThan(0.85);
    expect(rate(mustBlock, 'medium', 2)).toBeGreaterThan(0.55);
    expect(rate(mustBlock, 'medium', 2)).toBeLessThan(0.9);
  });

  it('fort : gagne et bloque toujours', () => {
    expect(rate(canWin, 'hard', 2, 50)).toBe(1);
    expect(rate(mustBlock, 'hard', 2, 50)).toBe(1);
    expect(bestMoves(canWin, 'o')).toEqual([2]);
  });

  it('fort : invaincu contre un joueur au hasard, qu’il commence ou non', () => {
    for (let seed = 0; seed < 150; seed += 1) {
      expect(playOut('random', 'hard', seed, seed % 2 === 0)).not.toBe('x');
    }
  });

  it('fort contre fort : toujours nul', () => {
    for (let seed = 0; seed < 20; seed += 1) expect(playOut('hard', 'hard', seed)).toBe('draw');
  });

  it('l’ordre des niveaux se voit contre un joueur au hasard', () => {
    const losses = (level: Level) => {
      let n = 0;
      for (let seed = 0; seed < 300; seed += 1) if (playOut('random', level, seed) === 'x') n += 1;
      return n;
    };
    expect(losses('easy')).toBeGreaterThan(losses('medium'));
    expect(losses('medium')).toBeGreaterThan(losses('hard'));
  });

  it('refuse une grille pleine', () => {
    expect(() => chooseComputerMove(boardFromMoves([0, 1, 2, 4, 3, 5, 7, 6, 8], true), 'o', createRng(1))).toThrow();
  });
});

describe('morpion — coup de pouce (menaces)', () => {
  it('repère l’alignement où l’adversaire a deux pions et une case libre', () => {
    // o o _ / x _ _ / x _ _
    expect(threatCells(boardFromMoves([3, 0, 6, 1], true), 'o')).toEqual([0, 1, 2]);
    expect(threatCells(boardFromMoves([4], true), 'o')).toEqual([]);
    // Ligne déjà bloquée : plus de menace.
    expect(threatCells(boardFromMoves([3, 0, 6, 1, 2], true), 'o')).toEqual([]);
  });
});
