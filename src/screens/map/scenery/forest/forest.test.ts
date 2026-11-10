// La forêt : ruisseau et mare placés loin des niveaux, pont sur le croisement, arbre-maison présent.
import { describe, expect, it } from 'vitest';
import { LEVELS_PER_WORLD, NODE_SIZE, PATH_WIDTH } from '../../layout';
import { sceneContexts } from '../../MapScenery';
import { planForest } from './geometry';

describe('forêt', () => {
  for (const width of [360, 390, 412, 430]) {
    it(`mare, ruisseau et arbre-maison tiennent dans une bande complète (${width} px)`, () => {
      const ctx = sceneContexts(LEVELS_PER_WORLD * 4, width)[0]!;
      const plan = planForest(ctx);
      expect(plan.creek, 'ruisseau').not.toBeNull();
      expect(plan.house, 'arbre-maison').not.toBeNull();
      const creek = plan.creek!;
      // Aucun niveau sur l'eau (ruisseau comme mare).
      for (const n of ctx.nodes) {
        for (const p of creek.points) expect(Math.hypot(p.x - n.x, p.y - n.y)).toBeGreaterThan(NODE_SIZE / 2 + 16);
        expect(Math.hypot(creek.pond.x - n.x, creek.pond.y - n.y)).toBeGreaterThan(NODE_SIZE / 2 + creek.pond.rx * 0.6);
      }
      // Le pont est sur le chemin.
      const onPath = Math.min(...ctx.samples.map((p) => Math.hypot(p.x - creek.crossing.x, p.y - creek.crossing.y)));
      expect(onPath).toBeLessThan(PATH_WIDTH / 4);
    });
  }

  it('un monde incomplet reste dessinable (7 niveaux)', () => {
    const ctx = sceneContexts(7, 412)[0]!;
    expect(() => planForest(ctx)).not.toThrow();
  });
});
