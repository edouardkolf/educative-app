import { describe, expect, it } from 'vitest';
import { createRng } from './rng';

describe('createRng (mulberry32)', () => {
  it('est déterministe : même graine → même suite de next()', () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('deux graines différentes donnent des suites différentes', () => {
    const a = createRng(1);
    const b = createRng(2);
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).not.toEqual(seqB);
  });

  it('next() reste dans [0, 1)', () => {
    const rng = createRng(7);
    for (let i = 0; i < 500; i += 1) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('int(min, max) reste dans les bornes incluses et les atteint toutes', () => {
    const rng = createRng(123);
    const seen = new Set<number>();
    for (let i = 0; i < 500; i += 1) {
      const v = rng.int(2, 5);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(2);
      expect(v).toBeLessThanOrEqual(5);
      seen.add(v);
    }
    expect(seen).toEqual(new Set([2, 3, 4, 5]));
  });

  it('pick() renvoie toujours un élément du tableau fourni', () => {
    const rng = createRng(9);
    const items = ['a', 'b', 'c'];
    for (let i = 0; i < 100; i += 1) {
      expect(items).toContain(rng.pick(items));
    }
  });

  it('shuffle() renvoie une permutation sans muter le tableau d’origine', () => {
    const rng = createRng(5);
    const items = [1, 2, 3, 4, 5];
    const copy = [...items];
    const shuffled = rng.shuffle(items);
    expect(items).toEqual(copy);
    expect(shuffled).toHaveLength(items.length);
    expect([...shuffled].sort()).toEqual([...items].sort());
  });

  it('la même graine reproduit les mêmes tirages int/pick/shuffle', () => {
    const run = (seed: number) => {
      const rng = createRng(seed);
      return {
        ints: Array.from({ length: 5 }, () => rng.int(0, 100)),
        pick: rng.pick(['a', 'b', 'c', 'd']),
        shuffle: rng.shuffle([1, 2, 3, 4, 5]),
      };
    };
    expect(run(99)).toEqual(run(99));
  });
});
