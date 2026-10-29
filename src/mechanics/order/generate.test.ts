import { describe, expect, it } from 'vitest';
import { createRng } from '../../engine/rng';
import type { OrderParams } from '../../engine/types';
import { generateRounds } from './generate';

const SEEDS = Array.from({ length: 100 }, (_, i) => i + 1);

const size = (over: Partial<OrderParams> = {}): OrderParams => ({
  items: 4,
  mode: 'size',
  objects: ['apple', 'dog', 'car'],
  minGap: 15,
  ...over,
});
const qty = (over: Partial<OrderParams> = {}): OrderParams => ({
  items: 4,
  mode: 'quantity',
  range: { min: 1, max: 9 },
  ...over,
});

function scalesAscending(round: { data: { items: Array<{ id: string; scale?: number }> }; answer: string }) {
  const byId = new Map(round.data.items.map((i) => [i.id, i.scale as number]));
  return round.answer.split('-').map((id) => byId.get(id) as number);
}

describe('order.generateRounds (size)', () => {
  it('respecte l\'écart minimal et la plage de tailles', () => {
    for (const seed of SEEDS) {
      for (const [items, minGap] of [[3, 30], [4, 20], [5, 15]] as const) {
        for (const r of generateRounds(size({ items, minGap }), 4, createRng(seed))) {
          const s = scalesAscending(r);
          expect(s).toHaveLength(items);
          expect(s[0]).toBeGreaterThanOrEqual(40);
          expect(s[items - 1]).toBeLessThanOrEqual(100);
          for (let k = 1; k < s.length; k += 1) expect(s[k]! - s[k - 1]!).toBeGreaterThanOrEqual(minGap);
        }
      }
    }
  });

  it('présente toujours les éléments mélangés', () => {
    for (const seed of SEEDS) {
      for (const r of generateRounds(size({ items: 3 }), 6, createRng(seed))) {
        expect(r.data.items.map((i) => i.id).join('-')).not.toBe(r.answer);
        expect(r.data.items.map((i) => i.id).sort()).toEqual(r.answer.split('-').sort());
      }
    }
  });

  it('est déterministe et varie les manches', () => {
    const a = generateRounds(size(), 5, createRng(7));
    expect(generateRounds(size(), 5, createRng(7))).toEqual(a);
    const keys = new Set(a.map((r) => JSON.stringify(r.data)));
    expect(keys.size).toBe(5);
  });

  it('n\'utilise que les objets demandés', () => {
    const rounds = generateRounds(size({ objects: ['apple'] }), 3, createRng(3));
    expect(new Set(rounds.map((r) => r.data.emoji))).toEqual(new Set(['🍎']));
  });
});

describe('order.generateRounds (quantity)', () => {
  it('tire des quantités distinctes dans la plage, mélangées', () => {
    for (const seed of SEEDS) {
      for (const r of generateRounds(qty({ range: { min: 2, max: 8 } }), 5, createRng(seed))) {
        const counts = r.data.items.map((i) => i.count as number);
        expect(new Set(counts).size).toBe(4);
        expect(Math.min(...counts)).toBeGreaterThanOrEqual(2);
        expect(Math.max(...counts)).toBeLessThanOrEqual(8);
        expect(r.answer).toBe([...counts].sort((a, b) => a - b).join('-'));
        expect(counts.join('-')).not.toBe(r.answer);
      }
    }
  });

  it('est déterministe', () => {
    expect(generateRounds(qty(), 4, createRng(11))).toEqual(generateRounds(qty(), 4, createRng(11)));
  });
});
