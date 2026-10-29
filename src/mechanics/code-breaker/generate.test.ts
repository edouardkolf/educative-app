import { describe, expect, it } from 'vitest';
import { createRng } from '../../engine/rng';
import type { CodeBreakerParams } from '../../engine/types';
import { generateRounds } from './generate';

const base: CodeBreakerParams = {
  length: 3,
  colors: ['red', 'blue', 'yellow', 'green'],
  repeats: false,
  feedback: 'positional',
  maxGuesses: 5,
};

describe('code-breaker.generateRounds', () => {
  it('respecte longueur, couleurs et answer = code.join("-")', () => {
    for (let seed = 1; seed <= 100; seed += 1) {
      for (const r of generateRounds(base, 4, createRng(seed))) {
        expect(r.data.code).toHaveLength(3);
        expect(r.data.code.every((c) => base.colors.includes(c))).toBe(true);
        expect(r.answer).toBe(r.data.code.join('-'));
        expect(r.answer).not.toBe('miss');
      }
    }
  });

  it('repeats: false => couleurs toutes différentes', () => {
    for (let seed = 1; seed <= 100; seed += 1) {
      for (const r of generateRounds({ ...base, length: 4 }, 4, createRng(seed))) {
        expect(new Set(r.data.code).size).toBe(4);
      }
    }
  });

  it('repeats: true peut répéter une couleur', () => {
    const p = { ...base, repeats: true, colors: ['red', 'blue', 'yellow'] as CodeBreakerParams['colors'] };
    let seen = false;
    for (let seed = 1; seed <= 50; seed += 1) {
      for (const r of generateRounds(p, 4, createRng(seed))) if (new Set(r.data.code).size < 3) seen = true;
    }
    expect(seen).toBe(true);
  });

  it('codes distincts entre manches quand possible', () => {
    const p = { ...base, length: 2, colors: ['red', 'blue', 'yellow'] as CodeBreakerParams['colors'] }; // 6 codes
    for (let seed = 1; seed <= 100; seed += 1) {
      const answers = generateRounds(p, 5, createRng(seed)).map((r) => r.answer);
      expect(new Set(answers).size).toBe(5);
    }
  });

  it('déterministe', () => {
    expect(generateRounds(base, 4, createRng(7))).toEqual(generateRounds(base, 4, createRng(7)));
  });
});
