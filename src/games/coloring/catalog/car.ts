// Voiture qui roule sur la route (docs/specs/COLORIAGE.md §4.3).
import type { Drawing } from '../model';
import { blank, circle, ellipse, rect, zone } from './build';

export const car: Drawing = {
  id: 'car',
  background: [
    zone('sky', [rect(0, 0, 100, 55)], { x: 15, y: 12 }, 1, ['blue']),
    zone('sun', [circle(88, 15, 10)], { x: 88, y: 15 }, 1, ['yellow', 'orange'], { life: 'pulse' }),
    blank([ellipse(60, 8, 10, 4)], 2, { life: 'drift' }),
    blank([rect(0, 94, 100, 6)], 1),
    zone('grass', [rect(0, 78, 100, 22)], { x: 90, y: 86 }, 1, ['green']),
    zone('tree-top', [circle(10, 58, 9)], { x: 10, y: 58 }, 2, ['green']),
    zone('tree-trunk', [rect(4, 64, 14, 16)], { x: 11, y: 72 }, 2, ['orange', 'red']),
  ],
  subjects: [
    {
      figure: 'car',
      endAnimation: 'slide-right',
      layers: [
        zone('body', [rect(20, 55, 68, 25)], { x: 28, y: 64 }, 1, [
          'red',
          'blue',
          'yellow',
          'green',
          'purple',
          'orange',
        ], { piece: true }),
        zone('windshield', [rect(40, 40, 24, 18)], { x: 52, y: 49 }, 1, ['blue', 'yellow'], { piece: true }),
        zone('wheel-l', [circle(30, 82, 9)], { x: 30, y: 82 }, 1, ['purple', 'red', 'blue'], {
          piece: true,
          pair: 'wheels',
        }),
        zone('wheel-r', [circle(70, 82, 9)], { x: 70, y: 82 }, 1, ['purple', 'red', 'blue'], {
          piece: true,
          pair: 'wheels',
        }),
        zone('headlight', [circle(80, 62, 7)], { x: 80, y: 62 }, 2, ['yellow', 'orange']),
        zone('door', [rect(50, 60, 16, 16)], { x: 58, y: 68 }, 3, ['red', 'blue', 'green', 'purple'], {
          differentFrom: ['body'],
        }),
      ],
    },
  ],
  foreground: [
    zone('flower-l', [circle(15, 92, 6.5)], { x: 15, y: 92 }, 3, ['red', 'purple', 'orange', 'yellow'], {
      pair: 'flowers',
    }),
    zone('flower-r', [circle(38, 92, 6.5)], { x: 38, y: 92 }, 3, ['red', 'purple', 'orange', 'yellow'], {
      pair: 'flowers',
    }),
  ],
};
