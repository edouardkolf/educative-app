import { describe, expect, it } from 'vitest';
import { createRng } from '../../engine/rng';
import type { CountParams } from '../../engine/types';
import { choiceId, generateRounds } from './generate';

function countParams(overrides: Partial<CountParams> = {}): CountParams {
  return {
    min: 2,
    max: 6,
    objects: ['apple', 'banana', 'pear'],
    layout: 'line',
    choices: 3,
    answers: 'digits',
    ...overrides,
  };
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// ~52 px d'objet dans un cadre de ~300 px (count.css) : distance minimale entre centres à respecter.
const MIN_NORMALIZED_DISTANCE = 52 / 300;

describe('count.generateRounds', () => {
  it('le nombre cible reste dans [min, max]', () => {
    const params = countParams({ min: 3, max: 7 });
    for (const round of generateRounds(params, 20, createRng(1))) {
      expect(round.data.count).toBeGreaterThanOrEqual(3);
      expect(round.data.count).toBeLessThanOrEqual(7);
    }
  });

  it('la bonne réponse fait partie des propositions', () => {
    const params = countParams();
    for (const round of generateRounds(params, 10, createRng(2))) {
      expect(round.data.choices.map((c) => c.id)).toContain(round.answer);
      expect(round.answer).toBe(choiceId(round.data.count));
    }
  });

  it('les propositions sont des nombres distincts dans [1, 10]', () => {
    const params = countParams({ choices: 4 });
    for (const round of generateRounds(params, 10, createRng(3))) {
      const values = round.data.choices.map((c) => c.value);
      expect(new Set(values).size).toBe(values.length);
      for (const v of values) {
        expect(v).toBeGreaterThanOrEqual(1);
        expect(v).toBeLessThanOrEqual(10);
      }
    }
  });

  it('les propositions peuvent dépasser [min, max] tant qu\'elles restent dans [1, 10]', () => {
    const params = countParams({ min: 1, max: 2, choices: 4 });
    const [round] = generateRounds(params, 1, createRng(5));
    const values = round!.data.choices.map((c) => c.value);
    expect(values.some((v) => v > 2)).toBe(true);
  });

  it('le nombre de propositions correspond à params.choices', () => {
    const params = countParams({ choices: 4 });
    for (const round of generateRounds(params, 6, createRng(4))) {
      expect(round.data.choices).toHaveLength(4);
    }
  });

  it('positions dans [0, 1], sans chevauchement, quelle que soit la disposition', () => {
    for (const layout of ['line', 'scatter', 'dice'] as const) {
      const params = countParams({ layout, min: 1, max: layout === 'dice' ? 6 : 10 });
      for (const round of generateRounds(params, 8, createRng(6))) {
        const { positions } = round.data;
        expect(positions).toHaveLength(round.data.count);
        for (const p of positions) {
          expect(p.x).toBeGreaterThanOrEqual(0);
          expect(p.x).toBeLessThanOrEqual(1);
          expect(p.y).toBeGreaterThanOrEqual(0);
          expect(p.y).toBeLessThanOrEqual(1);
        }
        for (let i = 0; i < positions.length; i += 1) {
          for (let j = i + 1; j < positions.length; j += 1) {
            expect(distance(positions[i]!, positions[j]!)).toBeGreaterThanOrEqual(MIN_NORMALIZED_DISTANCE);
          }
        }
      }
    }
  });

  it('constellation classique du dé pour 1 à 6', () => {
    const third = (i: number) => (i + 0.5) / 3;
    const expected: Record<number, { x: number; y: number }[]> = {
      1: [{ x: third(1), y: third(1) }],
      2: [
        { x: third(0), y: third(0) },
        { x: third(2), y: third(2) },
      ],
      3: [
        { x: third(0), y: third(0) },
        { x: third(1), y: third(1) },
        { x: third(2), y: third(2) },
      ],
      4: [
        { x: third(0), y: third(0) },
        { x: third(2), y: third(0) },
        { x: third(0), y: third(2) },
        { x: third(2), y: third(2) },
      ],
      5: [
        { x: third(0), y: third(0) },
        { x: third(2), y: third(0) },
        { x: third(1), y: third(1) },
        { x: third(0), y: third(2) },
        { x: third(2), y: third(2) },
      ],
      6: [
        { x: third(0), y: third(0) },
        { x: third(2), y: third(0) },
        { x: third(0), y: third(1) },
        { x: third(2), y: third(1) },
        { x: third(0), y: third(2) },
        { x: third(2), y: third(2) },
      ],
    };
    const sortKey = (p: { x: number; y: number }) => `${p.x.toFixed(4)},${p.y.toFixed(4)}`;
    const bySortKey = (a: { x: number; y: number }, b: { x: number; y: number }) =>
      sortKey(a) > sortKey(b) ? 1 : -1;

    for (let n = 1; n <= 6; n += 1) {
      const params = countParams({ min: n, max: n, layout: 'dice', choices: 2 });
      const [round] = generateRounds(params, 1, createRng(7));
      const got = [...round!.data.positions].sort(bySortKey);
      const want = [...(expected[n] ?? [])].sort(bySortKey);
      expect(got).toEqual(want);
    }
  });

  it('déterminisme : même graine → mêmes manches', () => {
    const params = countParams({ layout: 'scatter', choices: 4 });
    const a = generateRounds(params, 8, createRng(42));
    const b = generateRounds(params, 8, createRng(42));
    expect(a).toEqual(b);
  });

  it("deux manches consécutives n'ont jamais le même nombre ET le même objet (réservoir suffisant)", () => {
    const params = countParams({ min: 1, max: 8, objects: ['apple', 'banana', 'pear'] });
    const rounds = generateRounds(params, 15, createRng(9));
    for (let i = 1; i < rounds.length; i += 1) {
      const same =
        rounds[i]!.data.count === rounds[i - 1]!.data.count && rounds[i]!.data.objectId === rounds[i - 1]!.data.objectId;
      expect(same).toBe(false);
    }
  });

  it('reste robuste (sans erreur) même quand min = max et un seul objet possible', () => {
    const params = countParams({ min: 4, max: 4, objects: ['apple'] });
    expect(() => generateRounds(params, 6, createRng(1))).not.toThrow();
  });
});
