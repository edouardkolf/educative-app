// Scène de jardin : la maison et le sapin (docs/specs/COLORIAGE.md §4.3, deux sujets).
import type { Drawing } from '../model';
import { blank, circle, dot, ink, path, poly, rays, rect, ring, star, zone } from './build';

/** Sapin à trois étages (cf. tree.ts), sommet en (76, 22), base à y = 72.2, de x = 54 à 98. */
const FOLIAGE =
  'M76 22 L86.3 38.7 L81.3 38.7 L91.6 54.6 L85.5 54.6 L98 72.2 L54 72.2 L66.5 54.6 L60.4 54.6 L70.7 38.7 L65.7 38.7 Z';

export const garden: Drawing = {
  id: 'garden',
  background: [
    zone('sky', [rect(0, 0, 100, 100)], { x: 55.5, y: 30 }, 1, ['blue']),
    zone('sun', [circle(13, 13, 9)], { x: 13, y: 13 }, 2, ['yellow', 'orange'], { life: 'pulse' }),
    ink(rays(13, 13, 11.3, 13.8, 10), 2, { life: 'pulse' }),
    blank(
      [path('M87 31 C84.5 29 84.3 25 87 26.5 C87.3 21.3 91.5 20.3 93.2 24.7 C95.2 21.5 97.6 23.3 96.8 27.5 C98 26.3 97.8 29 96 31 Z')],
      2,
      { life: 'drift' },
    ),
    zone('grass', [path('M0 74 C20 70 40 71 55 73 S85 76 100 72 V100 H0 Z')], { x: 90, y: 92 }, 1, ['green']),
    // Touffes d'herbe et pas japonais jusqu'à la porte.
    ink('M4 77 l1.2 -2.6 l1.2 2.6 M93 79 l1.2 -2.6 l1.2 2.6 M96 81 l1.6 -2 M24 96 l1.2 -2.6 l1.2 2.6 M74 95 l1.2 -2.6 l1.2 2.6', 1, {
      thin: true,
    }),
    ink('M33 85.5 a3 1.4 0 1 0 6 0 a3 1.4 0 1 0 -6 0 Z M35.5 92 a3.4 1.6 0 1 0 6.8 0 a3.4 1.6 0 1 0 -6.8 0 Z', 1, { thin: true }),
  ],
  subjects: [
    {
      figure: 'house',
      endAnimation: 'pop',
      layers: [
        blank([circle(43.5, 7, 1.8), circle(46.5, 3.6, 2.4)], 3, { endOnly: true, thin: true, life: 'drift' }),
        zone('chimney', [rect(35, 14, 13, 34), rect(33.5, 11.5, 16, 4.5, 1)], { x: 41.5, y: 22.5 }, 3, ['red', 'orange'], {
          differentFrom: ['roof'],
        }),
        zone('wall', [rect(6, 48, 40, 32, 1)], { x: 16, y: 72.5 }, 1, ['yellow', 'orange', 'red', 'blue'], {
          piece: true,
        }),
        // Quelques briques.
        ink('M28 52.5 h4.5 M30.5 55.1 h4.5', 1, { thin: true }),
        zone('roof', [poly([26, 27], [50, 48], [2, 48])], { x: 26, y: 39.5 }, 1, ['red', 'purple'], {
          piece: true,
        }),
        // Une rangée de tuiles au bas du toit.
        ink('M8 45 q2.75 2.4 5.5 0 q2.75 2.4 5.5 0 q2.75 2.4 5.5 0 q2.75 2.4 5.5 0 q2.75 2.4 5.5 0 q2.75 2.4 5.5 0 q2.75 2.4 5.5 0', 1, {
          thin: true,
        }),
        zone('door', [rect(29, 60, 14, 20, 2.2)], { x: 36, y: 70.5 }, 1, ['blue', 'green', 'purple'], { piece: true }),
        ink(dot(40, 71, 0.9), 1, { filled: true }),
        zone('window', [rect(10.5, 52, 13.4, 13.4, 1.4)], { x: 17.2, y: 58.7 }, 2, ['blue', 'yellow']),
        // Croisillons, puis appui.
        ink('M17.2 52 V65.4 M10.5 58.7 H23.9', 2, { thin: true }),
        ink('M9.3 66.9 H25.1', 2),
      ],
    },
    {
      figure: 'tree',
      endAnimation: 'pop',
      layers: [
        zone('trunk', [rect(69, 70, 14, 16, 1)], { x: 76, y: 79.5 }, 1, ['orange', 'red'], { piece: true }),
        zone('foliage', [path(FOLIAGE)], { x: 76, y: 64 }, 1, ['green'], { piece: true, pieceAs: 'triangle' }),
        ink('M71.5 34.5 q2.25 2 4.5 0 q2.25 2 4.5 0 M68 50.5 q2.67 2.2 5.33 0 q2.67 2.2 5.33 0 q2.67 2.2 5.33 0', 1, { thin: true }),
        // Attaches des boules, au bout des branches.
        ink('M64.5 38.7 h2.4 v1.8 h-2.4 Z M85.1 38.7 h2.4 v1.8 h-2.4 Z', 2, { filled: true }),
        zone('bauble-l', [circle(65.7, 47, 7)], { x: 65.7, y: 47 }, 2, ['red', 'blue', 'purple'], { pair: 'baubles' }),
        zone('bauble-r', [circle(86.3, 47, 7)], { x: 86.3, y: 47 }, 2, ['red', 'blue', 'purple'], { pair: 'baubles' }),
        // Reflets des boules.
        ink('M61.6 44.6 q1.2 -2.2 3.4 -2.8 M82.2 44.6 q1.2 -2.2 3.4 -2.8', 2, { thin: true }),
        zone('star', [star(76, 14, 10.5, 6.1)], { x: 76, y: 14 }, 3, ['yellow'], { life: 'twinkle' }),
      ],
    },
  ],
  foreground: [
    zone('flower-l', [...ring(10, 89, 4.3, 3.5), circle(10, 89, 3)], { x: 10, y: 89 }, 3, ['red', 'purple', 'orange', 'yellow'], {
      pair: 'flowers',
    }),
    zone('flower-r', [...ring(58, 90, 4.3, 3.5), circle(58, 90, 3)], { x: 58, y: 90 }, 3, ['red', 'purple', 'orange', 'yellow'], {
      pair: 'flowers',
    }),
    // Cœur des fleurs.
    ink(`${dot(10, 89, 2.3)} ${dot(58, 90, 2.3)}`, 3, { thin: true }),
  ],
};
