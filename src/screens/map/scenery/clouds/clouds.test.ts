// Nuages : le château au bout du chemin, l'arc-en-ciel au-dessus du chemin, rien sur un niveau.
import { describe, expect, it } from 'vitest';
import { LEVELS_PER_WORLD, NODE_SIZE, PATH_WIDTH } from '../../layout';
import { sceneContexts } from '../../MapScenery';
import { prepareClouds } from './geometry';

const WIDTHS = [360, 390, 412, 430];
const COUNTS = [LEVELS_PER_WORLD * 3 + 1, LEVELS_PER_WORLD * 3 + 7, LEVELS_PER_WORLD * 3 + 13, LEVELS_PER_WORLD * 4];

describe('monde des nuages', () => {
  for (const width of WIDTHS) {
    for (const count of COUNTS) {
      const ctx = sceneContexts(count, width).at(-1)!;
      const prep = prepareClouds(ctx);
      const last = ctx.nodes[count - 1]!;

      it(`le château attend au bout du chemin, sans couvrir le dernier niveau (${count} niveaux, ${width} px)`, () => {
        expect(ctx.band.world).toBe('clouds');
        expect(prep.castle).not.toBeNull();
        expect(prep.castle!.at).toEqual(ctx.end);
        // Le pied du banc de nuages (≈ 30 px sous la porte) reste au-dessus du dernier niveau.
        expect(last.y - NODE_SIZE / 2 - (ctx.end!.y + 30)).toBeGreaterThan(60);
      });

      it(`les lieux laissent le chemin, les niveaux et le panneau dégagés (${count} niveaux, ${width} px)`, () => {
        for (const f of prep.footprints) {
          const path = Math.min(...ctx.samples.map((p) => Math.hypot(p.x - f.x, p.y - f.y)));
          expect(path).toBeGreaterThanOrEqual(PATH_WIDTH / 2 + f.r);
          for (const n of [...ctx.nodes, ctx.sign]) expect(Math.hypot(n.x - f.x, n.y - f.y)).toBeGreaterThanOrEqual(NODE_SIZE / 2 + f.r);
        }
      });

      it(`l'arc-en-ciel enjambe le chemin sans passer sous un niveau (${count} niveaux, ${width} px)`, () => {
        const rb = prep.rainbow;
        if (count === LEVELS_PER_WORLD * 4) expect(rb).not.toBeNull();
        if (!rb) return;
        expect(ctx.samples.some((p) => Math.abs(p.y - rb.y) < 10 && Math.abs(p.x - rb.cx) < rb.r)).toBe(true);
        for (const n of ctx.nodes.filter((p) => p.y < rb.y + NODE_SIZE / 2)) {
          const d = Math.hypot(n.x - rb.cx, n.y - rb.y);
          expect(d < rb.r - 40 - NODE_SIZE / 2 || d > rb.r + NODE_SIZE / 2).toBe(true);
        }
      });
    }
  }

  it('oiseaux de jour, étoiles de nuit', () => {
    const ctx = sceneContexts(LEVELS_PER_WORLD * 4, 412).at(-1)!;
    const prep = prepareClouds(ctx);
    const t = (y: number) => (ctx.band.bottom - y) / (ctx.band.bottom - ctx.band.top);
    expect(prep.birds.length).toBeGreaterThan(3);
    expect(prep.birds.every((b) => t(b.y) < 0.33)).toBe(true);
    expect(prep.sparks.every((s) => t(s.y) > 0.6)).toBe(true);
    expect(prep.stars.flat().every((s) => t(s.y) > 0.55)).toBe(true);
    for (const place of ['sun', 'moon', 'balloon', 'rocket', 'shooting'] as const) expect(prep[place], place).not.toBeNull();
  });
});
