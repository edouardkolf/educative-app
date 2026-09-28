// Poisson qui nage sous l'eau (docs/specs/COLORIAGE.md §4.3).
import type { Drawing } from '../model';
import { circle, poly, rect, zone } from './build';

export const fish: Drawing = {
  id: 'fish',
  background: [
    zone('water', [rect(0, 0, 100, 70)], { x: 90, y: 10 }, 1, ['blue']),
    zone('sand', [rect(0, 70, 100, 30)], { x: 6, y: 93 }, 1, ['yellow', 'orange'], { differentFrom: ['water'] }),
    zone('seaweed-1', [rect(82, 53, 16, 24)], { x: 90, y: 65 }, 1, ['green']),
    zone('seaweed-2', [rect(3, 48, 16, 26)], { x: 11, y: 61 }, 2, ['green']),
    zone('seaweed-3', [rect(6, 20, 14, 20)], { x: 13, y: 30 }, 2, ['green']),
    zone('shell', [circle(70, 85, 7)], { x: 70, y: 85 }, 2, ['orange', 'red', 'yellow']),
  ],
  subjects: [
    {
      figure: 'fish',
      endAnimation: 'slide-left',
      layers: [
        zone('body', [circle(45, 45, 14)], { x: 45, y: 45 }, 1, ['orange', 'red', 'yellow'], { piece: true }),
        zone('tail', [poly([58, 33], [85, 45], [58, 57])], { x: 66, y: 45 }, 1, ['orange', 'yellow'], {
          piece: true,
        }),
        zone('fin', [poly([40, 15], [51, 39], [29, 39])], { x: 40, y: 31 }, 1, ['blue', 'purple']),
        zone('stripe', [rect(30, 53, 20, 14)], { x: 40, y: 60 }, 2, ['blue', 'purple', 'yellow'], {
          differentFrom: ['body'],
        }),
      ],
    },
  ],
  foreground: [
    zone('starfish', [circle(55, 90, 7)], { x: 55, y: 90 }, 3, ['orange', 'red', 'purple']),
    zone('pebble-l', [circle(20, 92, 6.5)], { x: 20, y: 92 }, 3, ['blue', 'purple'], { pair: 'pebbles' }),
    zone('pebble-r', [circle(35, 93, 6.5)], { x: 35, y: 93 }, 3, ['blue', 'purple'], { pair: 'pebbles' }),
  ],
};
