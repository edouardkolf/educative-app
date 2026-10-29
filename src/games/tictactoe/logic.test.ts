import { describe, expect, it } from 'vitest';
import { createRng } from '../../engine/rng';
import {
  boardFromMoves,
  chooseComputerMove,
  freeCells,
  isLegalMove,
  markForMove,
  nextMark,
  outcomeOf,
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

describe('morpion — coup du téléphone', () => {
  it('gagne toujours quand il le peut (même si un blocage existe)', () => {
    // o o _ / x x _ / x _ _ : o joue 2.
    const board = boardFromMoves([3, 0, 4, 1, 6], true);
    expect(winningMove(board, 'o')).toBe(2);
    for (let seed = 0; seed < 50; seed += 1) {
      expect(chooseComputerMove(board, 'o', createRng(seed))).toBe(2);
    }
  });

  it('bloque souvent, mais pas toujours (reste battable)', () => {
    // x x _ / _ o _ / _ _ _ : blocage en 2.
    const board = boardFromMoves([0, 4, 1], true);
    let blocks = 0;
    const tries = 400;
    for (let seed = 0; seed < tries; seed += 1) {
      if (chooseComputerMove(board, 'o', createRng(seed)) === 2) blocks += 1;
    }
    expect(blocks / tries).toBeGreaterThan(0.6);
    expect(blocks).toBeLessThan(tries);
  });

  it('joue toujours une case libre', () => {
    for (let seed = 0; seed < 100; seed += 1) {
      const rng = createRng(seed);
      const moves: number[] = [];
      let board = boardFromMoves(moves, true);
      while (outcomeOf(board) === null) {
        const cell = chooseComputerMove(board, nextMark(moves, true), rng);
        expect(isLegalMove(board, cell)).toBe(true);
        moves.push(cell);
        board = boardFromMoves(moves, true);
      }
    }
  });

  it('refuse une grille pleine', () => {
    expect(() => chooseComputerMove(boardFromMoves([0, 1, 2, 4, 3, 5, 7, 6, 8], true), 'o', createRng(1))).toThrow();
  });
});
