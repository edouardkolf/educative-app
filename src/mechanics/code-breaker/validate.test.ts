import { describe, expect, it } from 'vitest';
import type { CodeBreakerParams } from '../../engine/types';
import { validateCodeBreaker } from './validate';

const ok: CodeBreakerParams = {
  length: 3,
  colors: ['red', 'blue', 'yellow', 'green'],
  repeats: false,
  feedback: 'positional',
  maxGuesses: 5,
};

describe('validateCodeBreaker', () => {
  it('accepte des paramètres valides', () => {
    expect(validateCodeBreaker(ok)).toEqual([]);
    expect(validateCodeBreaker({ ...ok, length: 4, repeats: true, feedback: 'counts', colors: ['red', 'blue', 'yellow'] })).toEqual([]);
  });
  it('sans répétition, couleurs >= longueur', () => {
    expect(validateCodeBreaker({ ...ok, length: 4, colors: ['red', 'blue', 'yellow'] })).not.toEqual([]);
  });
  it('counts déconseillé pour 2 pions', () => {
    expect(validateCodeBreaker({ ...ok, length: 2, feedback: 'counts' })).not.toEqual([]);
  });
  it('maxGuesses >= 2', () => {
    expect(validateCodeBreaker({ ...ok, maxGuesses: 1 })).not.toEqual([]);
  });
  it('couleur en double dans la liste', () => {
    expect(validateCodeBreaker({ ...ok, colors: ['red', 'red', 'blue', 'green'] })).not.toEqual([]);
  });
});
