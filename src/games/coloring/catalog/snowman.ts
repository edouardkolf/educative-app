// Bonhomme de neige, au pied du sapin (docs/specs/COLORIAGE.md §4.3).
import type { Drawing } from '../model';
import { circle, poly, rect, zone } from './build';
import { blank } from './build';

export const snowman: Drawing = {
  id: 'snowman',
  background: [
    zone('sky', [rect(0, 0, 100, 75)], { x: 6, y: 6 }, 1, ['blue']),
    zone('sun', [circle(85, 15, 10)], { x: 85, y: 15 }, 1, ['yellow', 'orange'], { life: 'pulse' }),
    zone('hill', [rect(0, 75, 100, 25)], { x: 6, y: 85 }, 3, ['blue', 'purple'], { differentFrom: ['sky'] }),
    zone('tree', [poly([80, 50], [92, 70], [68, 70])], { x: 80, y: 63 }, 1, ['green']),
    zone('tree-trunk', [rect(72, 72, 16, 18)], { x: 80, y: 81 }, 2, ['orange', 'red']),
    zone('tree2', [poly([20, 55], [32, 75], [8, 75])], { x: 20, y: 68 }, 3, ['green']),
  ],
  subjects: [
    {
      figure: 'snowman',
      endAnimation: 'hop',
      layers: [
        blank([circle(50, 80, 18)], 1, { piece: true }),
        blank([circle(50, 50, 13)], 1, { piece: true }),
        blank([circle(50, 25, 10)], 1, { piece: true }),
        zone('hat', [rect(34, 2, 32, 20)], { x: 50, y: 8 }, 1, ['blue', 'purple', 'red']),
        zone('band', [rect(34, 15, 32, 12)], { x: 50, y: 21 }, 2, ['red', 'orange'], { differentFrom: ['hat'] }),
        zone('nose', [circle(62, 22, 6.5)], { x: 62, y: 22 }, 1, ['orange']),
        zone('scarf', [rect(33, 30, 34, 14)], { x: 50, y: 37 }, 1, ['red', 'green', 'purple']),
        zone('mitten-l', [circle(25, 55, 7)], { x: 25, y: 55 }, 2, ['red', 'orange'], { pair: 'mittens' }),
        zone('mitten-r', [circle(72, 52, 7)], { x: 72, y: 52 }, 2, ['red', 'orange'], { pair: 'mittens' }),
      ],
    },
  ],
  foreground: [zone('bird', [circle(25, 20, 6.5)], { x: 25, y: 20 }, 3, ['red', 'blue'], { life: 'bob' })],
};
