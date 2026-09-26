import { describe, expect, it } from 'vitest';
import { createRng } from '../../engine/rng';
import type { CompareParams } from '../../engine/types';
import { generateRounds, relation } from './generate';

function compareParams(overrides: Partial<CompareParams> = {}): CompareParams {
  return {
    min: 0,
    max: 20,
    form: 'numbers',
    equalRate: 0.2,
    ...overrides,
  };
}

const PARAM_SETS: Array<{ label: string; params: CompareParams }> = [
  { label: 'numbers 0-20', params: compareParams({ min: 0, max: 20, form: 'numbers', equalRate: 0.2 }) },
  { label: 'numbers 10-99 gap3', params: compareParams({ min: 10, max: 99, form: 'numbers', equalRate: 0.2, maxGap: 3 }) },
  { label: 'numbers 100-999', params: compareParams({ min: 100, max: 999, form: 'numbers', equalRate: 0.2 }) },
  {
    label: 'sum-vs-number 5-20',
    params: compareParams({ min: 5, max: 20, form: 'sum-vs-number', equalRate: 0.2 }),
  },
  { label: 'sums 5-20 equalRate 0.25', params: compareParams({ min: 5, max: 20, form: 'sums', equalRate: 0.25 }) },
];

const SEEDS = Array.from({ length: 200 }, (_, i) => i + 1);

describe('compare.generateRounds', () => {
  for (const { label, params } of PARAM_SETS) {
    describe(label, () => {
      it('la réponse correspond exactement à la relation gauche ? droite (200 graines)', () => {
        for (const seed of SEEDS) {
          const rng = createRng(seed);
          const rounds = generateRounds(params, 10, rng);
          for (const round of rounds) {
            expect(round.answer).toBe(relation(round.data.left.value, round.data.right.value));
          }
        }
      });

      it('les valeurs respectent [min, max] et les termes des sommes sont ≥ 1 (200 graines)', () => {
        for (const seed of SEEDS) {
          const rng = createRng(seed);
          const rounds = generateRounds(params, 10, rng);
          for (const round of rounds) {
            for (const side of [round.data.left, round.data.right]) {
              expect(side.value).toBeGreaterThanOrEqual(params.min);
              expect(side.value).toBeLessThanOrEqual(params.max);
              expect(side.value).toBe(side.terms.reduce((a, b) => a + b, 0));
              if (side.terms.length === 2) {
                for (const term of side.terms) expect(term).toBeGreaterThanOrEqual(1);
              }
              if (params.form === 'sums') expect(side.terms.length).toBe(2);
            }
          }
        }
      });

      it('maxGap est respecté quand les deux côtés diffèrent', () => {
        if (params.maxGap === undefined) return;
        for (const seed of SEEDS) {
          const rng = createRng(seed);
          const rounds = generateRounds(params, 10, rng);
          for (const round of rounds) {
            if (round.answer === 'eq') continue;
            const gap = Math.abs(round.data.left.value - round.data.right.value);
            expect(gap).toBeLessThanOrEqual(params.maxGap!);
          }
        }
      });

      it('deux manches consécutives ne sont jamais strictement identiques', () => {
        for (const seed of SEEDS.slice(0, 20)) {
          const rng = createRng(seed);
          const rounds = generateRounds(params, 10, rng);
          for (let i = 1; i < rounds.length; i += 1) {
            const a = rounds[i - 1]!.data;
            const b = rounds[i]!.data;
            const identical =
              a.left.terms.join(',') === b.left.terms.join(',') && a.right.terms.join(',') === b.right.terms.join(',');
            expect(identical).toBe(false);
          }
        }
      });

      it("pas plus de 3 fois la même réponse d'affilée", () => {
        for (const seed of SEEDS.slice(0, 30)) {
          const rng = createRng(seed);
          const rounds = generateRounds(params, 20, rng);
          let streak = 1;
          for (let i = 1; i < rounds.length; i += 1) {
            streak = rounds[i]!.answer === rounds[i - 1]!.answer ? streak + 1 : 1;
            expect(streak).toBeLessThanOrEqual(3);
          }
        }
      });

      it("équilibre lt/gt : écart ≤ 1 sur un niveau complet (agrégé sur les graines)", () => {
        let ltTotal = 0;
        let gtTotal = 0;
        for (const seed of SEEDS) {
          const rng = createRng(seed);
          const rounds = generateRounds(params, 20, rng);
          let lt = 0;
          let gt = 0;
          for (const round of rounds) {
            if (round.answer === 'lt') lt += 1;
            if (round.answer === 'gt') gt += 1;
          }
          expect(Math.abs(lt - gt)).toBeLessThanOrEqual(1);
          ltTotal += lt;
          gtTotal += gt;
        }
        expect(ltTotal).toBeGreaterThan(0);
        expect(gtTotal).toBeGreaterThan(0);
      });

      it('déterminisme : même graine → mêmes manches', () => {
        for (const seed of [1, 42, 123]) {
          const a = generateRounds(params, 10, createRng(seed));
          const b = generateRounds(params, 10, createRng(seed));
          expect(a).toEqual(b);
        }
      });
    });
  }

  it('sums : à égalité, les deux sommes sont écrites différemment', () => {
    const params = compareParams({ min: 5, max: 20, form: 'sums', equalRate: 0.5 });
    for (const seed of SEEDS) {
      const rng = createRng(seed);
      const rounds = generateRounds(params, 15, rng);
      for (const round of rounds) {
        if (round.answer !== 'eq') continue;
        const [la, lb] = round.data.left.terms as [number, number];
        const [ra, rb] = round.data.right.terms as [number, number];
        const sameOrder = la === ra && lb === rb;
        const reversed = la === rb && lb === ra;
        expect(sameOrder || reversed).toBe(false);
      }
    }
  });

  it('sum-vs-number : la somme se trouve parfois à gauche, parfois à droite', () => {
    const params = compareParams({ min: 5, max: 20, form: 'sum-vs-number', equalRate: 0.2 });
    let sumLeft = 0;
    let sumRight = 0;
    for (const seed of SEEDS) {
      const rng = createRng(seed);
      const rounds = generateRounds(params, 10, rng);
      for (const round of rounds) {
        if (round.data.left.terms.length === 2) sumLeft += 1;
        else sumRight += 1;
      }
    }
    expect(sumLeft).toBeGreaterThan(0);
    expect(sumRight).toBeGreaterThan(0);
  });
});
