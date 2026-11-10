// Règles communes à tous les mondes de la carte (docs/specs/CARTE-MONDES.md).
import { describe, expect, it } from 'vitest';
import { LEVELS_PER_WORLD, NODE_SIZE, PATH_WIDTH, WORLD_ORDER } from '../layout';
import { sceneContexts } from '../MapScenery';
import { SCENES } from '.';

const WIDTHS = [360, 412];
const COUNTS = [LEVELS_PER_WORLD * 4, LEVELS_PER_WORLD * 3, LEVELS_PER_WORLD * 2 + 7];

describe('mondes de la carte', () => {
  it('chaque monde a sa scène', () => {
    for (const world of WORLD_ORDER) expect(SCENES[world]).toBeDefined();
  });

  for (const width of WIDTHS) {
    for (const count of COUNTS) {
      it(`les grands lieux laissent le chemin et les niveaux dégagés (${count} niveaux, ${width} px)`, () => {
        for (const ctx of sceneContexts(count, width)) {
          const scene = SCENES[ctx.band.world];
          const prep = scene.prepare(ctx);
          for (const f of scene.footprints?.(prep) ?? []) {
            const path = Math.min(...ctx.samples.map((p) => Math.hypot(p.x - f.x, p.y - f.y)));
            expect(path, `${ctx.band.world} : emprise (${f.x}, ${f.y}) sur le chemin`).toBeGreaterThanOrEqual(PATH_WIDTH / 2 + f.r);
            const node = Math.min(...ctx.nodes.map((p) => Math.hypot(p.x - f.x, p.y - f.y)));
            expect(node, `${ctx.band.world} : emprise (${f.x}, ${f.y}) sur un niveau`).toBeGreaterThanOrEqual(NODE_SIZE / 2 + f.r);
          }
        }
      });

      it(`prépare la même carte à chaque visite (${count} niveaux, ${width} px)`, () => {
        const a = sceneContexts(count, width).map((ctx) => SCENES[ctx.band.world].prepare(ctx));
        const b = sceneContexts(count, width).map((ctx) => SCENES[ctx.band.world].prepare(ctx));
        expect(JSON.stringify(a)).toEqual(JSON.stringify(b));
      });
    }
  }

  it('le parcours finit sur une destination dans le dernier monde (hors montagne)', () => {
    const ctxs = sceneContexts(LEVELS_PER_WORLD * 4, 412);
    expect(ctxs.at(-1)!.end).not.toBeNull();
    expect(ctxs.slice(0, -1).every((c) => c.end === null)).toBe(true);
    expect(sceneContexts(LEVELS_PER_WORLD * 3, 412).at(-1)!.end).toBeNull();
  });
});
