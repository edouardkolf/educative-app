import { describe, expect, it } from 'vitest';
import type { CalcParams } from '../../engine/types';
import { validateParams } from './validate';

function params(overrides: Partial<CalcParams> = {}): CalcParams {
  return {
    operation: 'add',
    a: { min: 1, max: 5 },
    b: { min: 1, max: 5 },
    unknown: 'result',
    answer: 'choices',
    choices: 3,
    ...overrides,
  };
}

describe('calc.validateParams', () => {
  it('accepte des paramètres valides', () => {
    expect(validateParams(params())).toEqual([]);
  });

  it('rejette min > max sur a', () => {
    const errors = validateParams(params({ a: { min: 9, max: 2 } }));
    expect(errors.some((e) => e.includes('"a"'))).toBe(true);
  });

  it('rejette min > max sur b', () => {
    const errors = validateParams(params({ b: { min: 9, max: 2 } }));
    expect(errors.some((e) => e.includes('"b"'))).toBe(true);
  });

  it('rejette answer "choices" sans "choices"', () => {
    const errors = validateParams(params({ answer: 'choices', choices: undefined }));
    expect(errors.some((e) => e.includes('choices'))).toBe(true);
  });

  it('accepte answer "keypad" sans "choices"', () => {
    const errors = validateParams(params({ answer: 'keypad', choices: undefined }));
    expect(errors).toEqual([]);
  });

  it('rejette une soustraction où a ne peut jamais être ≥ b', () => {
    const errors = validateParams(
      params({ operation: 'sub', a: { min: 1, max: 3 }, b: { min: 5, max: 9 } }),
    );
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejette une contrainte de retenue insatisfiable', () => {
    // 1..1 + 1..1 = 2 : jamais de retenue possible.
    const errors = validateParams(
      params({ a: { min: 1, max: 1 }, b: { min: 1, max: 1 }, carry: 'with' }),
    );
    expect(errors.length).toBeGreaterThan(0);
  });

  it('accepte une contrainte de retenue satisfiable', () => {
    const errors = validateParams(params({ a: { min: 5, max: 9 }, b: { min: 5, max: 9 }, carry: 'with' }));
    expect(errors).toEqual([]);
  });

  it('rejette un résultat qui peut dépasser 999', () => {
    const errors = validateParams(
      params({ operation: 'mul', a: { min: 1, max: 100 }, b: { min: 1, max: 100 } }),
    );
    expect(errors.some((e) => e.includes('999'))).toBe(true);
  });

  it('rejette showArray hors multiplication', () => {
    const errors = validateParams(params({ showArray: true }));
    expect(errors.some((e) => e.includes('showArray'))).toBe(true);
  });

  it('rejette showArray avec un produit trop grand', () => {
    const errors = validateParams(
      params({ operation: 'mul', a: { min: 1, max: 8 }, b: { min: 1, max: 8 }, showArray: true }),
    );
    expect(errors.some((e) => e.includes('showArray'))).toBe(true);
  });

  it('accepte showArray en multiplication avec un produit raisonnable', () => {
    const errors = validateParams(
      params({ operation: 'mul', a: { min: 1, max: 5 }, b: { min: 1, max: 5 }, showArray: true }),
    );
    expect(errors).toEqual([]);
  });
});
