// Bateau en mer, sous le soleil (docs/specs/COLORIAGE.md §4.3).
import type { Drawing } from '../model';
import { circle, poly, rect, zone } from './build';

export const boat: Drawing = {
  id: 'boat',
  background: [
    zone('sky', [rect(0, 0, 100, 60)], { x: 15, y: 15 }, 1, ['blue']),
    zone('sun', [circle(88, 15, 10)], { x: 88, y: 15 }, 1, ['yellow', 'orange'], { life: 'pulse' }),
    zone('sea', [rect(0, 60, 100, 40)], { x: 92, y: 67 }, 1, ['blue', 'green'], { differentFrom: ['sky'] }),
  ],
  subjects: [
    {
      figure: 'boat',
      endAnimation: 'slide-right',
      layers: [
        zone('hull', [rect(20, 72, 60, 18)], { x: 50, y: 79 }, 1, ['red', 'orange'], {
          piece: true,
        }),
        zone('sail', [poly([50, 28], [50, 70], [22, 70])], { x: 40, y: 55 }, 1, ['red', 'yellow', 'orange'], {
          piece: true,
        }),
        zone('flag', [poly([50, 10], [72, 20], [50, 30])], { x: 58, y: 20 }, 1, ['red', 'yellow', 'purple'], {
          life: 'sway',
        }),
        zone('sail2', [poly([50, 30], [50, 64], [74, 64])], { x: 58, y: 53 }, 2, ['blue']),
        zone('cabin', [rect(58, 60, 18, 16)], { x: 67, y: 68 }, 2, ['yellow', 'blue', 'red']),
        zone('porthole-l', [circle(36, 80, 6.5)], { x: 36, y: 80 }, 2, ['yellow', 'orange'], { pair: 'portholes' }),
        zone('porthole-r', [circle(64, 80, 6.5)], { x: 64, y: 80 }, 2, ['yellow', 'orange'], { pair: 'portholes' }),
      ],
    },
  ],
  foreground: [
    zone('wave', [rect(0, 62, 18, 14)], { x: 9, y: 69 }, 3, ['blue', 'green']),
    zone('fish', [circle(18, 90, 7)], { x: 18, y: 90 }, 3, ['orange', 'yellow'], { life: 'bob' }),
    zone('buoy', [circle(85, 88, 7)], { x: 85, y: 88 }, 3, ['red', 'orange'], { life: 'bob' }),
  ],
};
