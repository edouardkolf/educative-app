// Scène marine : le bateau en surface et le poisson dessous (docs/specs/COLORIAGE.md §4.3).
import type { Drawing } from '../model';
import { circle, poly, rect, zone } from './build';

export const sea: Drawing = {
  id: 'sea',
  background: [
    zone('sky', [rect(0, 0, 100, 35)], { x: 8, y: 8 }, 1, ['blue']),
    zone('water', [rect(0, 35, 100, 65)], { x: 93, y: 42 }, 1, ['blue', 'green'], { differentFrom: ['sky'] }),
    zone('sun', [circle(50, 10, 8)], { x: 50, y: 10 }, 2, ['yellow', 'orange'], { life: 'pulse' }),
    zone('bubble-l', [circle(30, 60, 6.5)], { x: 30, y: 60 }, 3, ['blue'], { pair: 'bubbles', life: 'drift' }),
    zone('bubble-r', [circle(30, 74, 6.5)], { x: 30, y: 74 }, 3, ['blue'], { pair: 'bubbles', life: 'drift' }),
    zone('seaweed-l', [rect(3, 70, 14, 24)], { x: 10, y: 82 }, 3, ['green']),
    zone('seaweed-r', [rect(83, 70, 14, 24)], { x: 90, y: 82 }, 3, ['green']),
  ],
  subjects: [
    {
      figure: 'boat',
      endAnimation: 'slide-right',
      layers: [
        zone('hull', [rect(15, 38, 40, 14)], { x: 35, y: 45 }, 1, ['red', 'orange'], { piece: true }),
        zone('sail', [poly([35, 8], [35, 36], [13, 36])], { x: 28, y: 29 }, 1, ['yellow', 'red'], { piece: true }),
        zone('flag', [circle(35, 8, 6.5)], { x: 35, y: 8 }, 1, ['red', 'yellow'], { life: 'sway' }),
        zone('porthole', [circle(22, 45, 6.5)], { x: 22, y: 45 }, 2, ['blue', 'yellow']),
      ],
    },
    {
      figure: 'fish',
      endAnimation: 'slide-left',
      layers: [
        zone('body', [circle(72, 68, 13)], { x: 72, y: 68 }, 1, ['orange', 'yellow'], { piece: true }),
        zone('tail', [poly([81, 56], [99, 68], [81, 80])], { x: 87, y: 68 }, 1, ['orange', 'yellow'], {
          piece: true,
        }),
        zone('fin', [poly([72, 42], [90, 60], [54, 60])], { x: 72, y: 53 }, 2, ['blue', 'purple']),
        zone('stripe', [rect(60, 78, 16, 12)], { x: 68, y: 84 }, 2, ['blue', 'purple'], { differentFrom: ['body'] }),
      ],
    },
  ],
  foreground: [],
};
