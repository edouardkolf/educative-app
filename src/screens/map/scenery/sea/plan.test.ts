// Mer : les îles portent leurs niveaux et seulement eux, le ponton relie le reste, les lieux sont à leur place.
import { describe, expect, it } from 'vitest';
import { NODE_SIZE, PATH_WIDTH, type Point } from '../../layout';
import { sceneContexts } from '../../MapScenery';
import { insidePolygon, nearest } from './geometry';
import { DECK_R, ISLAND_GROUPS, planSea } from './plan';

const WIDTHS = [360, 375, 390, 412, 430];
const COUNTS = [80, 67, 40, 33, 27, 22];

function seaCases() {
  const out = [];
  for (const width of WIDTHS) {
    for (const count of COUNTS) {
      for (const ctx of sceneContexts(count, width)) {
        if (ctx.band.world === 'sea') out.push({ width, count, ctx, prep: planSea(ctx) });
      }
    }
  }
  return out;
}

const cases = seaCases();
const ring = (p: Point, r: number) =>
  Array.from({ length: 12 }, (_, k) => ({ x: p.x + Math.cos((k * Math.PI) / 6) * r, y: p.y + Math.sin((k * Math.PI) / 6) * r }));

describe('mer : îles et ponton', () => {
  it('chaque île porte un petit groupe de niveaux consécutifs', () => {
    for (const { ctx, prep } of cases) {
      for (const il of prep.islands) {
        expect(il.levels.length).toBeLessThanOrEqual(3);
        il.levels.forEach((lv, k) => k > 0 && expect(lv).toBe(il.levels[k - 1]! + 1));
      }
      // Un monde complet a quatre ou cinq îles.
      if (ctx.levels.length === 20) expect(prep.islands.length).toBeGreaterThanOrEqual(4);
    }
    expect(ISLAND_GROUPS.length).toBe(5);
  });

  it('un niveau d’île est entièrement sur le sable, un niveau du ponton entièrement sur l’eau', () => {
    for (const { width, count, ctx, prep } of cases) {
      const onIsland = new Set(prep.islands.flatMap((il) => il.levels));
      for (const i of ctx.levels) {
        const node = ctx.nodes[i]!;
        const label = `${count} niveaux, ${width} px, niveau ${i + 1}`;
        if (onIsland.has(i)) {
          const il = prep.islands.find((x) => x.levels.includes(i))!;
          for (const p of ring(node, NODE_SIZE / 2 + 4)) expect(insidePolygon(il.outline, p.x, p.y), label).toBe(true);
        } else {
          for (const il of prep.islands) {
            expect(nearest(il.outline, node.x, node.y), label).toBeGreaterThan(DECK_R + 4);
          }
        }
      }
    }
  });

  it('les îles ne se touchent pas et ne débordent pas sur le chemin des autres', () => {
    for (const { width, count, ctx, prep } of cases) {
      prep.islands.forEach((a, ia) => {
        prep.islands.forEach((b, ib) => {
          if (ia >= ib) return;
          const touching = a.outline.some((p) => insidePolygon(b.outline, p.x, p.y));
          expect(touching, `${count} niveaux, ${width} px : îles ${ia} et ${ib}`).toBe(false);
        });
      });
      // Le chemin entre dans une île et en ressort une fois au plus : pas de ponton qui recoupe une île.
      expect(prep.landings.length).toBeLessThanOrEqual(prep.islands.length * 2);
      void ctx;
    }
  });

  it('phare et coffre sur une île, lieux du large dans l’eau, petits dessins sur le sable', () => {
    for (const { width, count, prep } of cases) {
      const inIsland = (p: Point) => prep.islands.some((il) => insidePolygon(il.outline, p.x, p.y));
      for (const pl of prep.places) {
        const label = `${count} niveaux, ${width} px : ${pl.kind}`;
        if (pl.kind === 'lighthouse' || pl.kind === 'chest') expect(inIsland(pl), label).toBe(true);
        else expect(inIsland(pl), label).toBe(false);
      }
      for (const pr of prep.props) expect(inIsland(pr), `${count} niveaux, ${width} px : ${pr.kind}`).toBe(true);
    }
  });

  it('un monde complet a ses lieux : phare, coffre, baleine, voilier', () => {
    for (const { width, count, ctx, prep } of cases) {
      if (ctx.levels.length < 20) continue;
      const kinds = new Set(prep.places.map((p) => p.kind));
      // Quand le parcours finit en mer, le coffre est au bout du chemin (End) plutôt que sur une île.
      const wanted = ctx.end ? (['lighthouse', 'whale', 'sailboat'] as const) : (['lighthouse', 'chest', 'whale', 'sailboat'] as const);
      for (const k of wanted) {
        expect(kinds.has(k), `${count} niveaux, ${width} px : ${k}`).toBe(true);
      }
    }
  });

  it('les pieux restent au bord du ponton, jamais sur une île ni sous un niveau', () => {
    for (const { ctx, prep } of cases) {
      for (const p of prep.posts) {
        expect(prep.islands.some((il) => insidePolygon(il.outline, p.x, p.y))).toBe(false);
        expect(Math.min(...ctx.nodes.map((n) => Math.hypot(n.x - p.x, n.y - p.y)))).toBeGreaterThan(DECK_R);
        expect(nearest(ctx.samples, p.x, p.y)).toBeLessThan(PATH_WIDTH / 2 + 3);
      }
    }
  });
});
