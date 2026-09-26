import { describe, expect, it } from 'vitest';
import type { CompareParams } from '../../engine/types';
import { validateParams } from './validate';

function compareParams(overrides: Partial<CompareParams> = {}): CompareParams {
  return {
    min: 0,
    max: 20,
    form: 'numbers',
    equalRate: 0.2,
    ...overrides,
  };
}

describe('compare.validateParams', () => {
  it('accepte des paramètres valides', () => {
    expect(validateParams(compareParams())).toEqual([]);
    expect(validateParams(compareParams({ form: 'sum-vs-number', min: 5, max: 20 }))).toEqual([]);
    expect(validateParams(compareParams({ form: 'sums', min: 5, max: 20, maxGap: 3 }))).toEqual([]);
  });

  it('signale min > max', () => {
    expect(validateParams(compareParams({ min: 10, max: 5 }))).toContain(
      'Le minimum doit être inférieur ou égal au maximum.',
    );
  });

  it('signale min < 2 pour une somme', () => {
    const errors = validateParams(compareParams({ form: 'sum-vs-number', min: 0, max: 20 }));
    expect(errors.some((e) => e.includes('au moins 2'))).toBe(true);
  });

  it('accepte min = 0 pour form "numbers"', () => {
    expect(validateParams(compareParams({ form: 'numbers', min: 0, max: 20 }))).toEqual([]);
  });

  it('signale une plage à une seule valeur', () => {
    const errors = validateParams(compareParams({ min: 7, max: 7 }));
    expect(errors.some((e) => e.includes('deux valeurs différentes'))).toBe(true);
  });

  it('signale un equalRate hors [0, 0.5]', () => {
    expect(validateParams(compareParams({ equalRate: 0.8 })).length).toBeGreaterThan(0);
    expect(validateParams(compareParams({ equalRate: -0.1 })).length).toBeGreaterThan(0);
  });

  it('signale un maxGap < 1', () => {
    const errors = validateParams(compareParams({ maxGap: 0 }));
    expect(errors.some((e) => e.includes('maxGap') || e.includes('écart'))).toBe(true);
  });
});
