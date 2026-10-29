import { describe, expect, it } from 'vitest';
import { createRng } from '../../engine/rng';
import { generateRounds } from './generate';
import { childStartsGrid, gridResult, hintCells, isChildTurn, phoneMove } from './session';
import { validateTicTacToe } from './validate';

const params = { level: 'easy', hint: true, childStarts: 'alternate' } as const;

describe('generateRounds', () => {
  it('une graine par manche, réponse "win", déterministe', () => {
    const a = generateRounds(params, 3, createRng(5));
    const b = generateRounds(params, 3, createRng(5));
    expect(a).toEqual(b);
    expect(a).toHaveLength(3);
    expect(new Set(a.map((r) => r.data.seed)).size).toBe(3);
    expect(a.every((r) => r.answer === 'win' && r.data.level === 'easy' && r.data.hint)).toBe(true);
  });
});

describe('session', () => {
  it('qui commence', () => {
    expect(childStartsGrid('always', 3)).toBe(true);
    expect([0, 1, 2, 3].map((i) => childStartsGrid('alternate', i))).toEqual([true, false, true, false]);
  });

  it('issue de grille', () => {
    expect(gridResult([0, 3, 1, 4, 2], true)).toBe('win');
    expect(gridResult([0, 3, 1, 4, 8, 5], true)).toBe('loss');
    expect(gridResult([0, 1, 2, 4, 3, 5, 7, 6, 8], true)).toBe('draw');
    expect(gridResult([4], true)).toBeNull();
  });

  it('tour de l\'enfant selon qui commence', () => {
    expect(isChildTurn([], true)).toBe(true);
    expect(isChildTurn([], false)).toBe(false);
    expect(isChildTurn([4], false)).toBe(true);
  });

  it('coup de pouce : alignement menacé seulement au tour de l\'enfant', () => {
    // le téléphone (o) joue 3 et 4 : menace en 5 ; enfant a 0 et 8
    expect(hintCells([0, 3, 8, 4], true, true)).toEqual([3, 4, 5]);
    expect(hintCells([0, 3, 8, 4], true, false)).toEqual([]);
    expect(hintCells([0, 3, 8], true, true)).toEqual([]);
  });

  it('coup du téléphone reproductible et légal', () => {
    const moves = [0, 4];
    const a = phoneMove(moves, true, createRng(9), 'easy');
    const b = phoneMove(moves, true, createRng(9), 'easy');
    expect(a).toBe(b);
    expect(moves).not.toContain(a);
  });
});

describe('validateTicTacToe', () => {
  it('accepte des params valides', () => expect(validateTicTacToe(params)).toEqual([]));
  it('refuse un niveau inconnu', () =>
    expect(validateTicTacToe({ ...params, level: 'x' as never })).toHaveLength(1));
});
