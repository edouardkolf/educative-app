// Voiture qui roule sur la route (docs/specs/COLORIAGE.md §4.3).
import type { Drawing } from '../model';
import { blank, circle, dot, ink, path, rays, rect, ring, zone } from './build';

/** Enjoliveur d'une roue : un cercle fin et le moyeu. */
function hubcap(cx: number, cy: number): string {
  return `${dot(cx, cy, 5.6)} ${dot(cx, cy, 1.4)}`;
}

export const car: Drawing = {
  id: 'car',
  background: [
    zone('sky', [rect(0, 0, 100, 100)], { x: 16, y: 14 }, 1, ['blue']),
    zone('sun', [circle(86, 14, 9.5)], { x: 86, y: 14 }, 1, ['yellow', 'orange'], { life: 'pulse' }),
    ink(rays(86, 14, 11.8, 14.4), 1, { life: 'pulse' }),
    blank(
      [path('M34 20 C30.5 20 29.5 15.5 33 14.5 C33 10 39 8.5 41.5 11.5 C44 7.5 51 9 50.5 14 C54.5 14.5 54.5 20 50.5 20 Z')],
      2,
      { life: 'drift' },
    ),
    zone('grass', [path('M0 54 C20 50 40 52 55 54 S85 55 100 51 V100 H0 Z')], { x: 92, y: 64 }, 1, ['green']),
    // Touffes d'herbe.
    ink('M22 55.5 l1.2 -2.6 l1.2 2.6 M66 56 l1.2 -2.6 l1.2 2.6 M50 84 l1.2 -2.6 l1.2 2.6', 1, { thin: true }),
    blank([path('M0 87 C30 85.5 70 85.5 100 87 V100 H0 Z')], 1),
    // Tirets de la route.
    ink('M5 94 h9 M23 94 h9 M41 94 h9 M59 94 h9 M77 94 h9 M95 94 h5', 1),
    zone('tree-trunk', [rect(4, 46, 14, 27, 1.5)], { x: 11, y: 63 }, 2, ['orange', 'red']),
    // Écorce.
    ink('M7 56 q1.5 2 0 4 M15 66 q-1.5 2 0 4', 2, { thin: true }),
    zone(
      'tree-top',
      [circle(11.5, 34, 10), circle(6, 42.5, 6), circle(18, 42, 6.5), circle(11.5, 46, 6)],
      { x: 11.5, y: 36 },
      2,
      ['green'],
    ),
    ink('M4.5 29 q1.5 -1.6 3 0 M16.5 28 q1.5 -1.6 3 0 M17 46 q1.5 -1.6 3 0', 2, { thin: true }),
  ],
  subjects: [
    {
      figure: 'car',
      endAnimation: 'slide-right',
      layers: [
        zone('windshield', [rect(36, 37, 30, 24, 7)], { x: 51, y: 47 }, 1, ['blue', 'yellow'], { piece: true }),
        // Reflet sur la vitre.
        ink('M39.5 46 l5 -5 M39.5 51.5 l6 -6', 1, { thin: true }),
        zone('body', [rect(20, 57, 64, 21, 7)], { x: 28, y: 64 }, 1, ['red', 'blue', 'yellow', 'green', 'purple', 'orange'], {
          piece: true,
        }),
        zone('wheel-l', [circle(34, 80, 9)], { x: 34, y: 80 }, 1, ['purple', 'red', 'blue'], {
          piece: true,
          pair: 'wheels',
        }),
        zone('wheel-r', [circle(70, 80, 9)], { x: 70, y: 80 }, 1, ['purple', 'red', 'blue'], {
          piece: true,
          pair: 'wheels',
        }),
        ink(`${hubcap(34, 80)} ${hubcap(70, 80)}`, 1, { thin: true }),
        zone('headlight', [circle(77.5, 64, 6)], { x: 77.5, y: 64 }, 2, ['yellow', 'orange']),
        // Faisceau du phare.
        ink('M85 61.2 l3 -1.4 M85.5 64 h3 M85 66.8 l3 1.4', 2, { thin: true }),
        zone('door', [rect(45, 58, 16, 17, 2.5)], { x: 53, y: 66.5 }, 3, ['red', 'blue', 'green', 'purple'], {
          differentFrom: ['body'],
        }),
        // Poignée.
        ink('M55.5 60.6 h3.5', 3),
      ],
    },
  ],
  foreground: [
    zone('flower-l', [...ring(11, 78.5, 4.3, 3.5), circle(11, 78.5, 3)], { x: 11, y: 78.5 }, 3, ['red', 'purple', 'orange', 'yellow'], {
      pair: 'flowers',
    }),
    zone('flower-r', [...ring(92, 78.5, 4.3, 3.5), circle(92, 78.5, 3)], { x: 92, y: 78.5 }, 3, ['red', 'purple', 'orange', 'yellow'], {
      pair: 'flowers',
    }),
    // Cœur des fleurs.
    ink(`${dot(11, 78.5, 2.3)} ${dot(92, 78.5, 2.3)}`, 3, { thin: true }),
  ],
};
