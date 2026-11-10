import { describe, expect, it } from 'vitest';
import { flattenPath, pointInPrimitive, pointInUnion, resolveTap } from './geometry';
import type { Layer, Primitive } from './model';

describe('pointInPrimitive', () => {
  it('rect: inclut les bords', () => {
    const rect = { kind: 'rect', x: 10, y: 10, w: 20, h: 10 } as const;
    expect(pointInPrimitive({ x: 10, y: 10 }, rect)).toBe(true);
    expect(pointInPrimitive({ x: 30, y: 20 }, rect)).toBe(true);
    expect(pointInPrimitive({ x: 20, y: 15 }, rect)).toBe(true);
    expect(pointInPrimitive({ x: 9.9, y: 15 }, rect)).toBe(false);
    expect(pointInPrimitive({ x: 20, y: 20.1 }, rect)).toBe(false);
  });

  it('circle: inclut le bord', () => {
    const circle = { kind: 'circle', cx: 0, cy: 0, r: 5 } as const;
    expect(pointInPrimitive({ x: 0, y: 0 }, circle)).toBe(true);
    expect(pointInPrimitive({ x: 5, y: 0 }, circle)).toBe(true);
    expect(pointInPrimitive({ x: 0, y: 5 }, circle)).toBe(true);
    expect(pointInPrimitive({ x: 5.01, y: 0 }, circle)).toBe(false);
  });

  it('ellipse: inclut le bord', () => {
    const ellipse = { kind: 'ellipse', cx: 0, cy: 0, rx: 10, ry: 5 } as const;
    expect(pointInPrimitive({ x: 10, y: 0 }, ellipse)).toBe(true);
    expect(pointInPrimitive({ x: 0, y: 5 }, ellipse)).toBe(true);
    expect(pointInPrimitive({ x: 10.01, y: 0 }, ellipse)).toBe(false);
  });

  it('polygon: inclut les bords (triangle)', () => {
    const poly: Primitive = { kind: 'polygon', points: [[0, 0], [10, 0], [5, 10]] };
    expect(pointInPrimitive({ x: 5, y: 5 }, poly)).toBe(true);
    expect(pointInPrimitive({ x: 0, y: 0 }, poly)).toBe(true); // sommet
    expect(pointInPrimitive({ x: 5, y: 0 }, poly)).toBe(true); // arête
    expect(pointInPrimitive({ x: -1, y: 0 }, poly)).toBe(false);
  });

  it('union : vrai si au moins une forme contient le point', () => {
    const shapes = [
      { kind: 'circle', cx: 0, cy: 0, r: 1 } as const,
      { kind: 'circle', cx: 20, cy: 0, r: 1 } as const,
    ];
    expect(pointInUnion({ x: 20, y: 0 }, shapes)).toBe(true);
    expect(pointInUnion({ x: 10, y: 0 }, shapes)).toBe(false);
  });
});

describe('resolveTap', () => {
  const zoneA: Layer = {
    kind: 'zone',
    id: 'a',
    anchor: { x: 20, y: 20 },
    shape: [{ kind: 'rect', x: 0, y: 0, w: 40, h: 40 }],
    palette: ['red'],
    detail: 1,
  };
  const zoneB: Layer = {
    kind: 'zone',
    id: 'b',
    anchor: { x: 80, y: 20 },
    shape: [{ kind: 'rect', x: 60, y: 0, w: 40, h: 40 }],
    palette: ['blue'],
    detail: 1,
  };
  const blank: Layer = {
    kind: 'blank',
    shape: [{ kind: 'rect', x: 0, y: 60, w: 100, h: 40 }],
    detail: 1,
  };
  const ink: Layer = { kind: 'ink', d: 'M0 0', detail: 1 };
  const layers = [zoneA, zoneB, blank, ink];

  it('priorité à l’ancre la plus proche dans le rayon (72 px, pxPerUnit=1 → rayon 36 unités)', () => {
    // point à 5 unités de l'ancre de a, mais géométriquement dans le rect de a aussi
    expect(resolveTap({ x: 22, y: 22 }, layers, new Set(), 1)).toBe('a');
    // point plus proche de l'ancre de b
    expect(resolveTap({ x: 79, y: 21 }, layers, new Set(), 1)).toBe('b');
  });

  it('conversion px → unités via pxPerUnit', () => {
    // avec pxPerUnit=10, le rayon en unités devient 3.6 ; un point à distance 10 de l'ancre a
    // ne doit plus déclencher l'étape 1, mais retombe sur le calque du dessous (case a par le rect)
    const far = { x: 20, y: 30 };
    expect(resolveTap(far, layers, new Set(), 10)).toBe('a');
  });

  it('case peinte ignorée à l’étape 1, renvoie null si aucun autre calque ne contient le point à l’étape 2', () => {
    const painted = new Set(['a']);
    // point proche de l'ancre a mais dans son propre rect (peint) → étape 2 : calque le plus haut contenant le
    // point est zoneA (peinte) → null
    expect(resolveTap({ x: 22, y: 22 }, layers, painted, 1)).toBe(null);
  });

  it('blanc qui occulte : un point dans le blanc ne peint pas la case en dessous', () => {
    // aucune ancre proche, mais le blanc est au-dessus dans la liste et couvre y=60..100
    expect(resolveTap({ x: 50, y: 80 }, layers, new Set(), 1)).toBe(null);
  });

  it('encre transparente au tap : laisse passer au calque du dessous', () => {
    const inkOverZone: Layer[] = [zoneA, { kind: 'ink', d: 'M0 0', detail: 1 }];
    expect(resolveTap({ x: 10, y: 10 }, inkOverZone, new Set(), 1)).toBe('a');
  });

  it('hors dessin : null', () => {
    expect(resolveTap({ x: 500, y: 500 }, layers, new Set(), 1)).toBe(null);
  });
});

describe('flattenPath et primitive path', () => {
  it('droites absolues et relatives : un carré', () => {
    expect(flattenPath('M10 10 H20 V20 H10 Z')).toEqual([[[10, 10], [20, 10], [20, 20], [10, 20]]]);
    expect(flattenPath('m10 10 h10 v10 h-10 z')).toEqual([[[10, 10], [20, 10], [20, 20], [10, 20]]]);
  });

  it('courbes : une colline contient ce qui est sous sa crête, pas ce qui est au-dessus', () => {
    const hill: Primitive = { kind: 'path', d: 'M0 80 C20 76 35 77 50 79 S85 81 100 77 V100 H0 Z' };
    expect(pointInPrimitive({ x: 50, y: 90 }, hill)).toBe(true);
    expect(pointInPrimitive({ x: 50, y: 70 }, hill)).toBe(false);
    expect(pointInPrimitive({ x: 25, y: 78.5 }, hill)).toBe(true);
    expect(pointInPrimitive({ x: 25, y: 75 }, hill)).toBe(false);
  });

  it('quadratiques enchaînées (Q puis T) et sous-chemins multiples', () => {
    const rings = flattenPath('M0 0 Q5 10 10 0 T20 0 V-20 H0 Z M30 0 L40 0 L35 10 Z');
    expect(rings.length).toBe(2);
    const shape: Primitive = { kind: 'path', d: 'M0 0 Q5 10 10 0 T20 0 V-20 H0 Z M30 0 L40 0 L35 10 Z' };
    expect(pointInPrimitive({ x: 5, y: 3 }, shape)).toBe(true); // sous la première bosse
    expect(pointInPrimitive({ x: 15, y: -10 }, shape)).toBe(true); // la deuxième bosse rentre vers le haut
    expect(pointInPrimitive({ x: 15, y: -3 }, shape)).toBe(false);
    expect(pointInPrimitive({ x: 35, y: 5 }, shape)).toBe(true);
  });

  it('un chemin qui revient à son départ avant Z ne contient pas tout le plan', () => {
    const shell: Primitive = { kind: 'path', d: 'M10 10 L20 10 L20 20 L10 20 L10 10 Z' };
    expect(flattenPath(shell.d)[0]?.length).toBe(4);
    expect(pointInPrimitive({ x: 90, y: 90 }, shell)).toBe(false);
    const degenerate: Primitive = { kind: 'polygon', points: [[0, 0], [10, 0], [10, 10], [0, 0], [0, 0]] };
    expect(pointInPrimitive({ x: 90, y: 90 }, degenerate)).toBe(false);
  });

  it('refuse les arcs et les chemins invalides', () => {
    expect(() => flattenPath('M0 0 A5 5 0 0 1 10 0 Z')).toThrow();
    expect(() => flattenPath('10 10 L20 20')).toThrow();
  });
});
