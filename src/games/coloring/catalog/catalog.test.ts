// Règles 1 à 5 et 7 du §4.2 de docs/specs/COLORIAGE.md, pour chaque dessin et chaque niveau de détail.
// La règle 6 (assignColors sur le catalogue réel) est testée dans ../variants.test.ts.
import { describe, expect, it } from 'vitest';
import { COLORS } from '../../../engine/types';
import { FIGURES } from '../../../mechanics/builder/figures';
import type { BuilderShape } from '../../../mechanics/builder/figures';
import { ANCHOR_R, MIN_ANCHOR_GAP, ZONES_PER_DETAIL } from '../model';
import type { Detail, Drawing, Layer, Primitive, ZoneLayer } from '../model';
import { pointInUnion } from '../geometry';
import { DRAWINGS } from './index';

const DETAILS: Detail[] = [1, 2, 3];

/** Tous les calques du dessin, dans l'ordre de peinture (fond, sujets, avant-plan). */
function allLayersInOrder(drawing: Drawing): Layer[] {
  const layers: Layer[] = [...drawing.background];
  for (const subject of drawing.subjects) layers.push(...subject.layers);
  if (drawing.foreground) layers.push(...drawing.foreground);
  return layers;
}

function zonesOf(layers: readonly Layer[]): ZoneLayer[] {
  return layers.filter((l): l is ZoneLayer => l.kind === 'zone');
}

/** Bornes d'une primitive (pour vérifier que ses coordonnées restent dans [0, 100]). */
function primitiveBounds(shape: Primitive): { minX: number; maxX: number; minY: number; maxY: number } {
  switch (shape.kind) {
    case 'rect':
      return { minX: shape.x, maxX: shape.x + shape.w, minY: shape.y, maxY: shape.y + shape.h };
    case 'circle':
      return { minX: shape.cx - shape.r, maxX: shape.cx + shape.r, minY: shape.cy - shape.r, maxY: shape.cy + shape.r };
    case 'ellipse':
      return {
        minX: shape.cx - shape.rx,
        maxX: shape.cx + shape.rx,
        minY: shape.cy - shape.ry,
        maxY: shape.cy + shape.ry,
      };
    case 'polygon': {
      const xs = shape.points.map((p) => p[0]);
      const ys = shape.points.map((p) => p[1]);
      return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
    }
    default:
      throw new Error('primitive inconnue');
  }
}

/** 16 points du cercle d'ancre, plus le centre : les 17 points à tester pour la règle 2. */
function anchorDisk(anchor: { x: number; y: number }): { x: number; y: number }[] {
  const points = [{ x: anchor.x, y: anchor.y }];
  for (let i = 0; i < 16; i += 1) {
    const angle = (2 * Math.PI * i) / 16;
    points.push({ x: anchor.x + ANCHOR_R * Math.cos(angle), y: anchor.y + ANCHOR_R * Math.sin(angle) });
  }
  return points;
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

describe.each(DRAWINGS.map((d) => [d.id, d] as const))('dessin %s', (_id, drawing) => {
  const allLayers = allLayersInOrder(drawing);
  const allZoneIds = zonesOf(allLayers).map((z) => z.id);

  it('règle 1 : ids uniques, coordonnées dans [0, 100], au moins un sujet', () => {
    expect(drawing.subjects.length).toBeGreaterThanOrEqual(1);
    const seen = new Set<string>();
    for (const id of allZoneIds) {
      expect(seen.has(id)).toBe(false);
      seen.add(id);
    }
    for (const layer of allLayers) {
      if (layer.kind === 'ink') continue; // chemin SVG libre, pas de primitive à borner
      for (const shape of layer.shape) {
        const { minX, maxX, minY, maxY } = primitiveBounds(shape);
        expect(minX).toBeGreaterThanOrEqual(0);
        expect(maxX).toBeLessThanOrEqual(100);
        expect(minY).toBeGreaterThanOrEqual(0);
        expect(maxY).toBeLessThanOrEqual(100);
      }
    }
  });

  describe.each(DETAILS)('niveau de détail %i', (detail) => {
    const layers = allLayers.filter((l) => l.detail <= detail);
    const zones = zonesOf(layers);

    it('règle 2 : le disque d’ancre est dans sa case, aucun calque plus haut ne le recouvre', () => {
      zones.forEach((zone) => {
        const disk = anchorDisk(zone.anchor);
        for (const point of disk) {
          expect(pointInUnion(point, zone.shape)).toBe(true);
        }
        // Calques strictement au-dessus (indices suivants dans l'ordre de peinture), encre exclue.
        const zoneIndex = layers.indexOf(zone);
        for (let i = zoneIndex + 1; i < layers.length; i += 1) {
          const above = layers[i] as Layer;
          if (above.kind === 'ink') continue;
          if (above.kind === 'zone' && above.id === zone.id) continue;
          for (const point of disk) {
            expect(pointInUnion(point, above.shape)).toBe(false);
          }
        }
      });
    });

    it('règle 3 : deux ancres sont à au moins MIN_ANCHOR_GAP l’une de l’autre', () => {
      for (let i = 0; i < zones.length; i += 1) {
        for (let j = i + 1; j < zones.length; j += 1) {
          const a = zones[i] as ZoneLayer;
          const b = zones[j] as ZoneLayer;
          expect(distance(a.anchor, b.anchor)).toBeGreaterThanOrEqual(MIN_ANCHOR_GAP);
        }
      }
    });

    it('règle 4 : le nombre de cases est dans la fourchette du niveau', () => {
      const [min, max] = ZONES_PER_DETAIL[detail];
      expect(zones.length).toBeGreaterThanOrEqual(min);
      expect(zones.length).toBeLessThanOrEqual(max);
    });

    it('règle 5 : palettes valides', () => {
      const pairPalettes = new Map<string, string[]>();
      for (const zone of zones) {
        expect(zone.palette.length).toBeGreaterThan(0);
        expect(new Set(zone.palette).size).toBe(zone.palette.length);
        for (const color of zone.palette) expect(COLORS).toContain(color);

        if (zone.pair) {
          const sorted = [...zone.palette].sort();
          const existing = pairPalettes.get(zone.pair);
          if (existing) expect(sorted).toEqual(existing);
          else pairPalettes.set(zone.pair, sorted);
        }

        if (zone.differentFrom) {
          for (const otherId of zone.differentFrom) {
            expect(allZoneIds).toContain(otherId);
          }
        }
      }
    });
  });

  it('règle 7 : les pièces de chaque sujet correspondent aux emplacements de FIGURES', () => {
    for (const subject of drawing.subjects) {
      const pieces = subject.layers.filter(
        (l): l is Extract<Layer, { kind: 'zone' | 'blank' }> => (l.kind === 'zone' || l.kind === 'blank') && l.piece === true,
      );
      const slots = FIGURES[subject.figure].slots;
      expect(pieces.length).toBe(slots.length);

      const categoryOf = (shape: BuilderShape): 'rect' | 'circle' | 'triangle' =>
        shape === 'circle' ? 'circle' : shape === 'triangle' ? 'triangle' : 'rect';
      const countBy = (items: string[]): Record<string, number> =>
        items.reduce<Record<string, number>>((acc, k) => ({ ...acc, [k]: (acc[k] ?? 0) + 1 }), {});

      const slotCategories = countBy(slots.map((s) => categoryOf(s.shape)));
      const pieceCategories = countBy(
        pieces.map((piece) => {
          expect(piece.shape.length).toBe(1);
          const primitive = piece.shape[0] as Primitive;
          if (primitive.kind === 'rect') return 'rect';
          if (primitive.kind === 'circle') return 'circle';
          if (primitive.kind === 'polygon') {
            expect(primitive.points.length).toBe(3);
            return 'triangle';
          }
          throw new Error(`pièce de forme inattendue : ${primitive.kind}`);
        }),
      );
      expect(pieceCategories).toEqual(slotCategories);
    }
  });
});
