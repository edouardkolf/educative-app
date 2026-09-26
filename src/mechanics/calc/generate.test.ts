import { describe, expect, it } from 'vitest';
import { createRng } from '../../engine/rng';
import type { CalcParams } from '../../engine/types';
import { addHasCarry, generateRounds, subHasBorrow } from './generate';

const SEEDS = Array.from({ length: 200 }, (_, i) => i + 1);

function expectedResult(op: CalcParams['operation'], a: number, b: number): number {
  return op === 'add' ? a + b : op === 'sub' ? a - b : a * b;
}

function checkParams(params: CalcParams, seeds: number[] = SEEDS) {
  for (const seed of seeds) {
    const rng = createRng(seed);
    const count = 8;
    const rounds = generateRounds(params, count, rng);
    expect(rounds).toHaveLength(count);

    for (const round of rounds) {
      const { a, b, result, unknown, answerMode, choices, showArray, operation } = round.data;

      expect(operation).toBe(params.operation);
      expect(result).toBe(expectedResult(params.operation, a, b));
      expect(a).toBeGreaterThanOrEqual(params.a.min);
      expect(a).toBeLessThanOrEqual(params.a.max);
      expect(b).toBeGreaterThanOrEqual(params.b.min);
      expect(b).toBeLessThanOrEqual(params.b.max);

      if (params.operation === 'sub') expect(a).toBeGreaterThanOrEqual(b);

      if (params.carry === 'with' && params.operation === 'add') expect(addHasCarry(a, b)).toBe(true);
      if (params.carry === 'without' && params.operation === 'add') expect(addHasCarry(a, b)).toBe(false);
      if (params.carry === 'with' && params.operation === 'sub') expect(subHasBorrow(a, b)).toBe(true);
      if (params.carry === 'without' && params.operation === 'sub') expect(subHasBorrow(a, b)).toBe(false);

      const unknownValue = unknown === 'result' ? result : b;
      expect(round.answer).toBe(String(unknownValue));

      expect(answerMode).toBe(params.answer);
      if (params.answer === 'choices') {
        expect(choices).toBeDefined();
        expect(choices).toHaveLength(params.choices ?? 3);
        const values = choices!.map((c) => c.value);
        expect(new Set(values).size).toBe(values.length);
        for (const v of values) expect(v).toBeGreaterThanOrEqual(0);
        expect(choices!.map((c) => c.id)).toContain(round.answer);
        expect(values.filter((v) => String(v) === round.answer)).toHaveLength(1);
        for (const c of choices!) expect(c.id).toBe(String(c.value));
      } else {
        expect(choices).toBeUndefined();
      }

      const expectedShowArray = Boolean(params.showArray) && params.operation === 'mul' && unknown === 'result';
      expect(showArray).toBe(expectedShowArray);
    }

    // Déterminisme : même graine → mêmes manches.
    const again = generateRounds(params, count, createRng(seed));
    expect(again).toEqual(rounds);
  }
}

describe('calc.generateRounds', () => {
  it('add 1-5 + 1-5, choices 3', () => {
    checkParams({ operation: 'add', a: { min: 1, max: 5 }, b: { min: 1, max: 5 }, unknown: 'result', answer: 'choices', choices: 3 });
  });

  it('add 2-9 + 2-9, carry with, keypad', () => {
    checkParams({
      operation: 'add',
      a: { min: 2, max: 9 },
      b: { min: 2, max: 9 },
      unknown: 'result',
      answer: 'keypad',
      carry: 'with',
    });
  });

  it('add 10-60 + 10-30, carry without', () => {
    checkParams({
      operation: 'add',
      a: { min: 10, max: 60 },
      b: { min: 10, max: 30 },
      unknown: 'result',
      answer: 'choices',
      choices: 4,
      carry: 'without',
    });
  });

  it('sub 11-18 - 2-9, carry with', () => {
    checkParams({
      operation: 'sub',
      a: { min: 11, max: 18 },
      b: { min: 2, max: 9 },
      unknown: 'result',
      answer: 'choices',
      choices: 3,
      carry: 'with',
    });
  });

  it('sub 20-99 - 1-9', () => {
    checkParams({
      operation: 'sub',
      a: { min: 20, max: 99 },
      b: { min: 1, max: 9 },
      unknown: 'result',
      answer: 'keypad',
    });
  });

  it('mul 1-4 x 1-4, choices 4, showArray', () => {
    checkParams({
      operation: 'mul',
      a: { min: 1, max: 4 },
      b: { min: 1, max: 4 },
      unknown: 'result',
      answer: 'choices',
      choices: 4,
      showArray: true,
    });
  });

  it('mul operand (le second facteur est caché), keypad', () => {
    checkParams({
      operation: 'mul',
      a: { min: 2, max: 9 },
      b: { min: 2, max: 9 },
      unknown: 'operand',
      answer: 'keypad',
      showArray: true, // ignoré côté affichage : ne doit jamais donner la réponse en "operand"
    });
  });

  it('deux manches consécutives ne portent (presque) jamais sur la même paire (réservoir suffisant)', () => {
    const params: CalcParams = {
      operation: 'add',
      a: { min: 1, max: 9 },
      b: { min: 1, max: 9 },
      unknown: 'result',
      answer: 'choices',
      choices: 3,
    };
    for (const seed of [1, 2, 3, 4, 5]) {
      const rounds = generateRounds(params, 10, createRng(seed));
      for (let i = 1; i < rounds.length; i += 1) {
        const prev = rounds[i - 1]!.data;
        const cur = rounds[i]!.data;
        expect(cur.a === prev.a && cur.b === prev.b).toBe(false);
      }
    }
  });

  it('pas de doublon commutatif (3×4 et 4×3) tant que le réservoir le permet', () => {
    const params: CalcParams = {
      operation: 'mul',
      a: { min: 1, max: 4 },
      b: { min: 1, max: 4 },
      unknown: 'result',
      answer: 'choices',
      choices: 3,
    };
    // Réservoir de paires distinctes {min,max} : 1,2,3,4 → C(4,2)+4 = 10 paires canoniques.
    const rounds = generateRounds(params, 10, createRng(7));
    const seen = new Set<string>();
    for (const round of rounds) {
      const key = [round.data.a, round.data.b].sort((x, y) => x - y).join('-');
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  it('reste robuste (sans erreur) même avec un réservoir minuscule', () => {
    const params: CalcParams = {
      operation: 'sub',
      a: { min: 5, max: 5 },
      b: { min: 5, max: 5 },
      unknown: 'result',
      answer: 'choices',
      choices: 3,
    };
    expect(() => generateRounds(params, 6, createRng(1))).not.toThrow();
  });
});
