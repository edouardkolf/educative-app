import { describe, expect, it } from 'vitest';
import { createRng } from '../../engine/rng';
import type { GuessNumberParams } from '../../engine/types';
import { generateRounds } from './generate';

const params: GuessNumberParams = { range: { min: 1, max: 20 }, maxGuesses: 5, input: 'tiles' };

describe('generateRounds (guess-number)', () => {
  it('reste dans la plage et fixe answer = String(secret)', () => {
    for (let seed = 1; seed <= 100; seed += 1) {
      for (const r of generateRounds(params, 6, createRng(seed))) {
        expect(r.data.secret).toBeGreaterThanOrEqual(1);
        expect(r.data.secret).toBeLessThanOrEqual(20);
        expect(r.answer).toBe(String(r.data.secret));
        expect(r.data.maxGuesses).toBe(5);
        expect(r.data.input).toBe('tiles');
      }
    }
  });

  it('donne des secrets distincts quand la plage le permet', () => {
    for (let seed = 1; seed <= 100; seed += 1) {
      const secrets = generateRounds(params, 20, createRng(seed)).map((r) => r.data.secret);
      expect(new Set(secrets).size).toBe(20);
    }
  });

  it('ne répète pas deux fois de suite sur une petite plage', () => {
    const small: GuessNumberParams = { range: { min: 0, max: 4 }, maxGuesses: 3, input: 'keypad' };
    const secrets = generateRounds(small, 12, createRng(3)).map((r) => r.data.secret);
    secrets.slice(1).forEach((s, i) => expect(s).not.toBe(secrets[i]));
  });

  it('est déterministe par graine', () => {
    expect(generateRounds(params, 5, createRng(7))).toEqual(generateRounds(params, 5, createRng(7)));
  });
});
