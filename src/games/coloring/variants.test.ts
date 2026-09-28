import { describe, expect, it } from 'vitest';
import { assignColors, fnv1a, legendFor, nextVariantSeed } from './variants';
import { DETAIL_FOR_TIER } from './model';
import type { Color } from '../../engine/types';
import type { Drawing } from './model';
import type { ColoringTier } from '../../storage/colorings';
import { DRAWINGS } from './catalog';

const house = DRAWINGS.find((d) => d.id === 'house') as Drawing;

// Petit dessin de test : deux cases jumelles, une exclusion, une case libre.
const TEST_DRAWING: Drawing = {
  id: 'test',
  background: [
    {
      kind: 'zone',
      id: 'a',
      shape: [{ kind: 'rect', x: 0, y: 0, w: 40, h: 40 }],
      anchor: { x: 20, y: 20 },
      detail: 1,
      palette: ['red', 'blue', 'orange'],
      differentFrom: ['b'],
    },
    {
      kind: 'zone',
      id: 'b',
      shape: [{ kind: 'rect', x: 60, y: 0, w: 40, h: 40 }],
      anchor: { x: 80, y: 20 },
      detail: 1,
      palette: ['red', 'blue', 'green'],
    },
    {
      kind: 'zone',
      id: 'pair-l',
      shape: [{ kind: 'rect', x: 0, y: 60, w: 40, h: 40 }],
      anchor: { x: 20, y: 80 },
      detail: 1,
      palette: ['yellow', 'purple'],
      pair: 'p',
    },
    {
      kind: 'zone',
      id: 'pair-r',
      shape: [{ kind: 'rect', x: 60, y: 60, w: 40, h: 40 }],
      anchor: { x: 80, y: 80 },
      detail: 1,
      palette: ['yellow', 'purple'],
      pair: 'p',
    },
  ],
  subjects: [{ figure: 'house', endAnimation: 'pop', layers: [] }],
};

describe('fnv1a', () => {
  it('déterministe, dépend entièrement de la chaîne', () => {
    expect(fnv1a('abc')).toBe(fnv1a('abc'));
    expect(fnv1a('abc')).not.toBe(fnv1a('abd'));
  });
});

describe('assignColors', () => {
  it('déterministe par graine : même dessin, même graine, même résultat', () => {
    const a = assignColors(TEST_DRAWING, 1, 1, 42);
    const b = assignColors(TEST_DRAWING, 1, 1, 42);
    expect(a).toEqual(b);
  });

  it('deux graines différentes peuvent donner des résultats différents', () => {
    const seeds = Array.from({ length: 20 }, (_, i) => i);
    const results = seeds.map((seed) => JSON.stringify(assignColors(TEST_DRAWING, 1, 1, seed)));
    expect(new Set(results).size).toBeGreaterThan(1);
  });

  it('les cases jumelles (pair) ont toujours la même couleur', () => {
    for (let seed = 0; seed < 30; seed += 1) {
      const result = assignColors(TEST_DRAWING, 1, 1, seed);
      const l = result.find((z) => z.id === 'pair-l')?.target;
      const r = result.find((z) => z.id === 'pair-r')?.target;
      expect(l).toBe(r);
    }
  });

  it('differentFrom est respecté', () => {
    for (let seed = 0; seed < 30; seed += 1) {
      const result = assignColors(TEST_DRAWING, 1, 1, seed);
      const a = result.find((z) => z.id === 'a')?.target;
      const b = result.find((z) => z.id === 'b')?.target;
      expect(a).not.toBe(b);
    }
  });

  it('repli sur les couleurs naturelles si aucun tirage valide (minimums trop hauts)', () => {
    // Un seul id, palette à une couleur : ne peut jamais atteindre le minimum de couleurs distinctes.
    const impossible: Drawing = {
      id: 'impossible',
      background: [
        {
          kind: 'zone',
          id: 'only',
          shape: [{ kind: 'rect', x: 0, y: 0, w: 40, h: 40 }],
          anchor: { x: 20, y: 20 },
          detail: 1,
          palette: ['red'],
        },
      ],
      subjects: [{ figure: 'house', endAnimation: 'pop', layers: [] }],
    };
    const result = assignColors(impossible, 1, 1, 0);
    expect(result).toEqual([{ id: 'only', target: 'red' }]);
  });
});

describe('legendFor', () => {
  it('paliers 1 et 2 : pas de légende', () => {
    expect(legendFor(['red', 'blue'], 1, 0)).toBe(null);
    expect(legendFor(['red', 'blue'], 2, 0)).toBe(null);
  });

  it('palier 3 : une forme distincte par couleur (3 à 6 couleurs)', () => {
    for (let n = 3; n <= 6; n += 1) {
      const colors = (['red', 'blue', 'yellow', 'green', 'purple', 'orange'] as Color[]).slice(0, n);
      const legend = legendFor(colors, 3, 7);
      expect(legend).not.toBe(null);
      const symbols = colors.map((c) => legend?.[c]);
      expect(new Set(symbols).size).toBe(n);
    }
  });

  it('palier 4 : une face de dé distincte par couleur', () => {
    const colors: Color[] = ['red', 'blue', 'yellow'];
    const legend = legendFor(colors, 4, 3);
    const symbols = colors.map((c) => legend?.[c]);
    expect(new Set(symbols).size).toBe(3);
    for (const s of symbols) expect(s).toMatch(/^dice-[1-6]$/);
  });

  it('change de dessin en dessin (graines différentes)', () => {
    const colors: Color[] = ['red', 'blue', 'green'];
    const a = legendFor(colors, 3, 1);
    const b = legendFor(colors, 3, 2);
    expect(a).not.toEqual(b);
  });
});

describe('nextVariantSeed', () => {
  it('différent des 5 dernières signatures', () => {
    const detail = 1;
    const tier = 1;
    // Calcule les signatures des k=0..4 pour les préremplir comme "5 dernières".
    const recent = Array.from({ length: 5 }, (_, k) => {
      const seed = fnv1a(`profile|test|${k}`);
      return assignColors(TEST_DRAWING, detail, tier, seed).map((z) => z.target);
    });
    const seed = nextVariantSeed('profile', TEST_DRAWING, detail, tier, recent);
    const signature = assignColors(TEST_DRAWING, detail, tier, seed).map((z) => z.target);
    for (const sig of recent) {
      expect(sig).not.toEqual(signature);
    }
  });

  it('sans historique, renvoie la graine de k=0', () => {
    const seed = nextVariantSeed('profile', TEST_DRAWING, 1, 1, []);
    expect(seed).toBe(fnv1a('profile|test|0'));
  });
});

describe('règle 6 du catalogue (docs/specs/COLORIAGE.md §4.2) : diversité des variantes', () => {
  it('4 paliers × 40 graines, sur house : au moins 6 affectations distinctes au niveau 1, 12 aux niveaux 2/3', () => {
    for (const tier of [1, 2, 3, 4] as ColoringTier[]) {
      const detail = DETAIL_FOR_TIER[tier];
      const signatures = new Set<string>();
      for (let seed = 0; seed < 40; seed += 1) {
        signatures.add(JSON.stringify(assignColors(house, detail, tier, seed)));
      }
      const minimum = detail === 1 ? 6 : 12;
      expect(signatures.size).toBeGreaterThanOrEqual(minimum);
    }
  });

  it('4 paliers × 40 graines, pour chaque dessin du catalogue', () => {
    for (const drawing of DRAWINGS) {
      for (const tier of [1, 2, 3, 4] as ColoringTier[]) {
        const detail = DETAIL_FOR_TIER[tier];
        const signatures = new Set<string>();
        for (let seed = 0; seed < 40; seed += 1) {
          signatures.add(JSON.stringify(assignColors(drawing, detail, tier, seed)));
        }
        const minimum = detail === 1 ? 6 : 12;
        expect(signatures.size, `${drawing.id} palier ${tier}`).toBeGreaterThanOrEqual(minimum);
      }
    }
  });
});
