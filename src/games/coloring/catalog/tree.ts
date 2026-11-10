// Sapin de Noël, la nuit (docs/specs/COLORIAGE.md §4.3).
import type { Drawing } from '../model';
import { blank, circle, dot, ink, path, rect, star, zone } from './build';

/** Nœud d'un cadeau, posé au milieu de son bord haut. */
function bow(x: number, y: number): string {
  return `M${x} ${y} c-3.6 -4.6 -6.2 -1 0 0 c6.2 -1 3.6 -4.6 0 0`;
}

/** Flocons : petits ronds blancs dans le ciel. */
function flakes(points: [number, number][]) {
  return points.map(([x, y]) => circle(x, y, 1.1));
}

export const tree: Drawing = {
  id: 'tree',
  background: [
    zone('night-sky', [rect(0, 0, 100, 100)], { x: 85, y: 15 }, 1, ['purple', 'blue']),
    ...flakes([[31, 7], [70, 8], [90, 36], [9, 41], [93, 60], [8, 63]]).map((flake) => blank([flake], 1, { thin: true })),
    ...flakes([[71, 28], [27, 27], [16, 52], [84, 49], [66, 3.5], [22, 72]]).map((flake) =>
      blank([flake], 3, { thin: true, life: 'twinkle' }),
    ),
    zone('moon', [circle(16, 16, 9.5)], { x: 16, y: 16 }, 1, ['yellow'], { life: 'pulse' }),
    // Cratères.
    ink(`${dot(9.6, 19.8, 1.2)} ${dot(21.6, 10, 1)} ${dot(21, 22, 0.8)}`, 1, { thin: true }),
    zone('hill', [path('M0 86 C25 79 45 80 60 84 S90 86 100 81 V100 H0 Z')], { x: 7, y: 93 }, 1, ['blue', 'purple', 'green'], {
      differentFrom: ['night-sky'],
    }),
  ],
  subjects: [
    {
      figure: 'tree',
      endAnimation: 'pop',
      layers: [
        zone('trunk', [rect(43, 74, 14, 16, 1)], { x: 50, y: 83.5 }, 1, ['orange', 'red'], { piece: true }),
        // Sapin à trois étages, inscrit dans le triangle du constructeur.
        zone(
          'foliage',
          [path('M50 19 L63.5 38 L57 38 L70.5 56 L62.5 56 L79 76 L21 76 L37.5 56 L29.5 56 L43 38 L36.5 38 Z')],
          { x: 50, y: 66 },
          1,
          ['green'],
          { piece: true, pieceAs: 'triangle' },
        ),
        ink('M44.5 31 q2.7 2.4 5.5 0 q2.7 2.4 5.5 0 M40 49.5 q3.3 2.6 6.6 0 q3.3 2.6 6.6 0 q3.3 2.6 6.6 0', 1, { thin: true }),
        zone('star', [star(50, 12, 11.5, 6.2)], { x: 50, y: 12 }, 1, ['yellow'], { life: 'twinkle' }),
        // Attaches des boules, au bout des branches.
        ink('M34.6 38 h2.8 v2 h-2.8 Z M62.6 38 h2.8 v2 h-2.8 Z', 2, { filled: true }),
        zone('bauble-l', [circle(36, 47.2, 7.5)], { x: 36, y: 47.2 }, 2, ['red', 'blue', 'purple'], { pair: 'baubles-1' }),
        zone('bauble-r', [circle(64, 47.2, 7.5)], { x: 64, y: 47.2 }, 2, ['red', 'blue', 'purple'], { pair: 'baubles-1' }),
        ink('M28.1 56 h2.8 v2 h-2.8 Z M69.1 56 h2.8 v2 h-2.8 Z', 3, { filled: true }),
        zone('bauble2-l', [circle(29.5, 65.2, 7.5)], { x: 29.5, y: 65.2 }, 3, ['red', 'blue', 'orange'], { pair: 'baubles-2' }),
        zone('bauble2-r', [circle(70.5, 65.2, 7.5)], { x: 70.5, y: 65.2 }, 3, ['red', 'blue', 'orange'], { pair: 'baubles-2' }),
      ],
    },
  ],
  foreground: [
    zone('gift-l', [rect(14, 80.5, 17, 14.5, 1.2)], { x: 22.5, y: 87.8 }, 2, ['red', 'purple', 'blue'], { pair: 'gifts' }),
    ink(`M22.5 80.5 V95 ${bow(22.5, 80.5)}`, 2, { thin: true }),
    zone('gift-r', [rect(70, 77, 14, 18, 1.2)], { x: 77, y: 86 }, 2, ['red', 'purple', 'blue'], { pair: 'gifts' }),
    ink(`M77 77 V95 ${bow(77, 77)}`, 2, { thin: true }),
  ],
};
