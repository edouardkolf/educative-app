import { describe, expect, it } from 'vitest';
import type { GuessNumberParams } from '../../engine/types';
import { validateGuessNumber } from './validate';

const ok: GuessNumberParams = { range: { min: 1, max: 20 }, maxGuesses: 5, input: 'tiles' };

describe('validateGuessNumber', () => {
  it('accepte des paramètres corrects', () => {
    expect(validateGuessNumber(ok)).toEqual([]);
    expect(validateGuessNumber({ range: { min: 1, max: 100 }, maxGuesses: 7, input: 'keypad' })).toEqual([]);
  });
  it('refuse min >= max', () => {
    expect(validateGuessNumber({ ...ok, range: { min: 5, max: 5 } })).toHaveLength(1);
  });
  it('refuse moins de 5 nombres', () => {
    expect(validateGuessNumber({ ...ok, range: { min: 1, max: 4 } }).join()).toContain('au moins 5');
  });
  it('limite les tuiles à 30 nombres', () => {
    expect(validateGuessNumber({ ...ok, range: { min: 1, max: 30 } })).toEqual([]);
    expect(validateGuessNumber({ ...ok, range: { min: 1, max: 31 }, maxGuesses: 6 }).join()).toContain('30');
  });
  it('exige maxGuesses >= ceil(log2(taille))', () => {
    expect(validateGuessNumber({ ...ok, maxGuesses: 4 }).join()).toContain('ne suffisent pas'); // 20 -> 5
    expect(validateGuessNumber({ range: { min: 1, max: 100 }, maxGuesses: 6, input: 'keypad' })).toHaveLength(1);
  });
});
