import { describe, expect, it } from 'vitest';
import { createRng } from '../../engine/rng';
import type { SortParams } from '../../engine/types';
import { generateRounds } from './generate';

const SEEDS = Array.from({ length: 30 }, (_, i) => i + 1);

function params(overrides: Partial<SortParams> = {}): SortParams {
  return {
    groups: [
      { id: 'farm', symbol: '🚜', objects: ['cow', 'pig', 'sheep', 'chicken', 'horse'] },
      { id: 'sea', symbol: '🌊', objects: ['crab', 'octopus', 'whale', 'dolphin'] },
    ],
    ...overrides,
  };
}

describe('sort.generateRounds', () => {
  it('génère exactement `count` manches', () => {
    for (const seed of SEEDS) {
      const rounds = generateRounds(params(), 6, createRng(seed));
      expect(rounds).toHaveLength(6);
    }
  });

  it("la réponse est l'id du groupe qui contient l'objet de la manche", () => {
    const p = params();
    const groupOf = new Map<string, string>();
    for (const g of p.groups) for (const o of g.objects) groupOf.set(o, g.id);

    for (const seed of SEEDS) {
      for (const round of generateRounds(p, 7, createRng(seed))) {
        expect(round.answer).toBe(groupOf.get(round.data.objectId));
        expect(p.groups.map((g) => g.id)).toContain(round.answer);
      }
    }
  });

  it("les paniers affichés sont dans l'ordre fixe des paramètres, sur toutes les manches", () => {
    const p = params();
    const expectedBaskets = p.groups.map((g) => ({ id: g.id, symbol: g.symbol }));
    for (const round of generateRounds(p, 5, createRng(1))) {
      expect(round.data.baskets).toEqual(expectedBaskets);
    }
  });

  it('équilibre les groupes (répartition quasi égale) sur un grand nombre de manches', () => {
    const p = params();
    for (const seed of SEEDS) {
      const rounds = generateRounds(p, 20, createRng(seed));
      const counts = new Map<string, number>();
      for (const round of rounds) counts.set(round.answer, (counts.get(round.answer) ?? 0) + 1);
      const values = [...counts.values()];
      expect(Math.max(...values) - Math.min(...values)).toBeLessThanOrEqual(1);
    }
  });

  it('jamais plus de deux manches consécutives sur le même groupe (réservoir ≥ 2 groupes)', () => {
    for (const seed of SEEDS) {
      const rounds = generateRounds(params(), 10, createRng(seed));
      for (let i = 2; i < rounds.length; i += 1) {
        const a = rounds[i - 2]?.answer;
        const b = rounds[i - 1]?.answer;
        const c = rounds[i]?.answer;
        expect(a === b && b === c).toBe(false);
      }
    }
  });

  it("aucun objet répété tant que le réservoir d'un groupe n'est pas épuisé", () => {
    const p = params({
      groups: [
        { id: 'farm', symbol: '🚜', objects: ['cow', 'pig', 'sheep'] },
        { id: 'sea', symbol: '🌊', objects: ['crab', 'octopus', 'whale'] },
      ],
    });
    for (const seed of SEEDS) {
      const rounds = generateRounds(p, 6, createRng(seed)); // 3 par groupe, exactement le réservoir
      const byGroup = new Map<string, string[]>();
      for (const round of rounds) {
        const list = byGroup.get(round.answer) ?? [];
        list.push(round.data.objectId);
        byGroup.set(round.answer, list);
      }
      for (const [, objects] of byGroup) {
        expect(new Set(objects).size).toBe(objects.length);
      }
    }
  });

  it('avec un réservoir insuffisant, répète sans planter et couvre toujours les groupes', () => {
    const p = params({
      groups: [
        { id: 'farm', symbol: '🚜', objects: ['cow', 'pig'] },
        { id: 'sea', symbol: '🌊', objects: ['crab', 'octopus'] },
      ],
    });
    const rounds = generateRounds(p, 9, createRng(1));
    expect(rounds).toHaveLength(9);
    expect(new Set(rounds.map((r) => r.answer))).toEqual(new Set(['farm', 'sea']));
  });

  it('fonctionne avec 3 groupes', () => {
    const p = params({
      groups: [
        { id: 'farm', symbol: '🚜', objects: ['cow', 'pig', 'sheep'] },
        { id: 'sea', symbol: '🌊', objects: ['crab', 'octopus', 'whale'] },
        { id: 'sky', symbol: '☁️', objects: ['bird', 'butterfly', 'bee', 'owl'] },
      ],
    });
    for (const seed of SEEDS) {
      const rounds = generateRounds(p, 9, createRng(seed));
      expect(rounds).toHaveLength(9);
      expect(new Set(rounds.map((r) => r.answer))).toEqual(new Set(['farm', 'sea', 'sky']));
    }
  });
});
