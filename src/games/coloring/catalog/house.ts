// Maison, dans un décor de jour (docs/specs/COLORIAGE.md §4.4, dessin de référence).
import type { Drawing } from '../model';
import { blank, circle, dot, ink, path, poly, rays, rect, ring, zone } from './build';

const BUSH_L =
  'M4 84.5 C1.5 81 3 76.5 6.5 76 C6 71 11.5 67.5 15.5 70.5 C19 67.5 24.5 70.5 23.5 75.5 C27 76.5 27.5 82 24.5 84.5 Z';
const BUSH_R =
  'M96 84.5 C98.5 81 97 76.5 93.5 76 C94 71 88.5 67.5 84.5 70.5 C81 67.5 75.5 70.5 76.5 75.5 C73 76.5 72.5 82 75.5 84.5 Z';

export const house: Drawing = {
  id: 'house',
  background: [
    zone('sky', [rect(0, 0, 100, 100)], { x: 88, y: 44 }, 1, ['blue']),
    zone('sun', [circle(15, 15, 9.5)], { x: 15, y: 15 }, 1, ['yellow', 'orange'], { life: 'pulse' }),
    ink(rays(15, 15, 11.8, 14.4), 1, { life: 'pulse' }),
    blank(
      [path('M78 19.5 C74.5 19.5 73.5 15 77 14 C77 9.5 83 8 85.5 11 C88 7 95 8.5 94.5 13.5 C98.5 14 98.5 19.5 94.5 19.5 Z')],
      2,
      { life: 'drift' },
    ),
    zone('grass', [path('M0 80 C20 76 35 77 50 79 S85 81 100 77 V100 H0 Z')], { x: 10, y: 92.5 }, 1, ['green']),
    // Touffes d'herbe.
    ink('M88 90.5 l1.2 -2.6 l1.2 2.6 M91 90.8 l1.6 -2 M63.5 96.5 l1.2 -2.6 l1.2 2.6 M16.5 86 l1.2 -2.6 l1.2 2.6', 1, {
      thin: true,
    }),
  ],
  subjects: [
    {
      figure: 'house',
      endAnimation: 'pop',
      layers: [
        blank([circle(65.2, 6.6, 2), circle(68.6, 3.6, 2.6)], 3, { endOnly: true, thin: true, life: 'drift' }),
        zone('chimney', [rect(57.5, 13, 13, 24), rect(56, 10.5, 16, 4.5, 1)], { x: 64, y: 22.5 }, 2, ['red', 'orange', 'purple'], {
          differentFrom: ['roof'],
        }),
        zone('roof', [poly([50, 20.5], [83, 49], [17, 49])], { x: 50, y: 37.5 }, 1, ['red', 'purple', 'orange'], {
          piece: true,
        }),
        // Une rangée de tuiles au bas du toit.
        ink('M26 45.2 q3 2.6 6 0 q3 2.6 6 0 q3 2.6 6 0 q3 2.6 6 0 q3 2.6 6 0 q3 2.6 6 0 q3 2.6 6 0 q3 2.6 6 0', 1, {
          thin: true,
        }),
        zone(
          'wall',
          [rect(24, 49, 52, 33, 1)],
          { x: 50, y: 55.5 },
          1,
          ['yellow', 'orange', 'red', 'blue', 'purple', 'green'],
          { piece: true, differentFrom: ['sky', 'roof', 'door', 'window-l'] },
        ),
        // Quelques briques.
        ink('M26 77 h4.5 M28.5 79.6 h4.5 M69.5 69.5 h4.5 M67 72.1 h4.5', 1, { thin: true }),
        zone('window-l', [rect(26.8, 52.5, 13.4, 13.4, 1.4)], { x: 33.5, y: 59.2 }, 2, ['blue', 'yellow'], {
          pair: 'windows',
        }),
        zone('window-r', [rect(59.8, 52.5, 13.4, 13.4, 1.4)], { x: 66.5, y: 59.2 }, 2, ['blue', 'yellow'], {
          pair: 'windows',
        }),
        // Croisillons, puis appuis de fenêtre.
        ink('M33.5 52.5 V65.9 M26.8 59.2 H40.2 M66.5 52.5 V65.9 M59.8 59.2 H73.2', 2, { thin: true }),
        ink('M25.6 67.4 H41.4 M58.6 67.4 H74.4', 2),
        zone('door', [rect(43, 62.5, 14, 19.5, 2.2)], { x: 50, y: 72.5 }, 1, ['blue', 'green', 'purple', 'red', 'orange'], {
          piece: true,
        }),
        ink(dot(54.2, 73.2, 0.9), 1, { filled: true }),
      ],
    },
  ],
  foreground: [
    zone('path', [path('M43 82 C42 88 35 93 32 100 H61 C59.5 93 57.5 88 57 82 Z')], { x: 48.5, y: 93 }, 2, ['yellow', 'orange'], {
      differentFrom: ['door'],
    }),
    zone('bush-l', [path(BUSH_L)], { x: 14, y: 78 }, 3, ['green'], { pair: 'bushes', life: 'sway' }),
    zone('bush-r', [path(BUSH_R)], { x: 86, y: 78 }, 3, ['green'], { pair: 'bushes', life: 'sway' }),
    ink('M9.5 81.5 q1.5 -1.6 3 0 M16 73.5 q1.5 -1.6 3 0 M87.5 81.5 q1.5 -1.6 3 0 M81 73.5 q1.5 -1.6 3 0', 3, { thin: true }),
    zone('flower-l', [...ring(28, 91.8, 4.3, 3.5), circle(28, 91.8, 3)], { x: 28, y: 91.8 }, 3, ['red', 'purple', 'orange', 'yellow'], {
      pair: 'flowers',
    }),
    zone('flower-r', [...ring(77, 91.8, 4.3, 3.5), circle(77, 91.8, 3)], { x: 77, y: 91.8 }, 3, ['red', 'purple', 'orange', 'yellow'], {
      pair: 'flowers',
    }),
    // Cœur des fleurs.
    ink(`${dot(28, 91.8, 2.3)} ${dot(77, 91.8, 2.3)}`, 3, { thin: true }),
  ],
};
