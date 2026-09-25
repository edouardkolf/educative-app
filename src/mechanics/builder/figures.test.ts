import { describe, expect, it } from 'vitest';
import { FIGURE_IDS } from '../../engine/types';
import { FIGURES, getFigure } from './figures';

// Plus petite largeur possible de `.bld-figure` (voir builder.css : width: min(78vw, 320px), au
// petit téléphone 360×640 testé en e2e) et cible tactile minimale (BuilderView.MIN_HIT_PX, §9).
const WORST_FIGURE_PX = 280;
const MIN_HIT_PX = 72;

describe('figures (builder)', () => {
  it('FIGURES a exactement une entrée par FigureId', () => {
    expect(Object.keys(FIGURES).sort()).toEqual([...FIGURE_IDS].sort());
  });

  it.each(FIGURE_IDS)('%s : au plus 5 emplacements', (id) => {
    expect(getFigure(id).slots.length).toBeGreaterThan(0);
    expect(getFigure(id).slots.length).toBeLessThanOrEqual(5);
  });

  it.each(FIGURE_IDS)('%s : tous les emplacements sont dans le repère 100×100', (id) => {
    for (const slot of getFigure(id).slots) {
      expect(slot.x - slot.w / 2).toBeGreaterThanOrEqual(0);
      expect(slot.x + slot.w / 2).toBeLessThanOrEqual(100);
      expect(slot.y - slot.h / 2).toBeGreaterThanOrEqual(0);
      expect(slot.y + slot.h / 2).toBeLessThanOrEqual(100);
      expect(slot.w).toBeGreaterThan(0);
      expect(slot.h).toBeGreaterThan(0);
    }
  });

  it.each(FIGURE_IDS)(
    '%s : le centre d\'un emplacement ne tombe jamais dans la zone tapable (≥ 72 px) d\'un autre',
    (id) => {
      // BuilderView agrandit la zone tapable de chaque emplacement à 72 px minimum (§9), quitte à
      // dépasser sa silhouette. Si le centre d'un emplacement tombe dans la zone agrandie d'un
      // voisin, un tap y est intercepté par le voisin au lieu de l'emplacement visé (bug vécu :
      // voir docs — la porte de la maison "volait" les taps destinés au corps du logis).
      const slots = getFigure(id).slots;
      const halfHitPx = (sizePercent: number) => Math.max(MIN_HIT_PX, (sizePercent / 100) * WORST_FIGURE_PX) / 2;
      const toPx = (percent: number) => (percent / 100) * WORST_FIGURE_PX;

      for (let a = 0; a < slots.length; a += 1) {
        for (let b = 0; b < slots.length; b += 1) {
          if (a === b) continue;
          const A = slots[a]!;
          const B = slots[b]!;
          const dx = Math.abs(toPx(A.x) - toPx(B.x));
          const dy = Math.abs(toPx(A.y) - toPx(B.y));
          const insideB = dx < halfHitPx(B.w) && dy < halfHitPx(B.h);
          expect(insideB, `${id} : le centre de l'emplacement ${a} tombe dans la zone tapable de l'emplacement ${b}`).toBe(
            false,
          );
        }
      }
    },
  );
});
