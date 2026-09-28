// Château fort sur la colline (docs/specs/COLORIAGE.md §4.3).
import type { Drawing } from '../model';
import { circle, poly, rect, zone } from './build';

export const castle: Drawing = {
  id: 'castle',
  background: [
    zone('sky', [rect(0, 0, 100, 60)], { x: 10, y: 10 }, 1, ['blue']),
    zone('hill', [rect(0, 60, 100, 40)], { x: 6, y: 93 }, 1, ['green']),
    zone('sun', [circle(50, 11, 10)], { x: 50, y: 11 }, 2, ['yellow', 'orange'], { life: 'pulse' }),
  ],
  subjects: [
    {
      figure: 'castle',
      endAnimation: 'pop',
      layers: [
        zone('wall', [rect(30, 54, 40, 31)], { x: 50, y: 62 }, 1, ['yellow', 'orange', 'red'], { piece: true }),
        zone('tower-l', [rect(10, 38, 18, 47)], { x: 19, y: 75 }, 1, ['orange', 'red', 'purple'], {
          piece: true,
          pair: 'towers',
        }),
        zone('tower-r', [rect(72, 38, 18, 47)], { x: 81, y: 75 }, 1, ['orange', 'red', 'purple'], {
          piece: true,
          pair: 'towers',
        }),
        zone('door', [rect(43, 72, 14, 18)], { x: 50, y: 81 }, 1, ['blue', 'green', 'purple']),
        zone('roof-l', [poly([19, 16], [32, 38], [6, 38])], { x: 19, y: 31 }, 2, ['red', 'purple'], {
          piece: true,
          pair: 'roofs',
        }),
        zone('roof-r', [poly([81, 16], [94, 38], [68, 38])], { x: 81, y: 31 }, 2, ['red', 'purple'], {
          piece: true,
          pair: 'roofs',
        }),
        zone('window-l', [circle(38, 73, 6.5)], { x: 38, y: 73 }, 2, ['yellow', 'blue'], { pair: 'windows' }),
        zone('window-r', [circle(62, 73, 6.5)], { x: 62, y: 73 }, 2, ['yellow', 'blue'], { pair: 'windows' }),
        zone('flag-l', [poly([28, 0], [43, 15], [13, 15])], { x: 28, y: 9 }, 3, ['red', 'yellow'], {
          pair: 'flags',
          life: 'sway',
        }),
        zone('flag-r', [poly([72, 0], [87, 15], [57, 15])], { x: 72, y: 9 }, 3, ['red', 'yellow'], {
          pair: 'flags',
          life: 'sway',
        }),
      ],
    },
  ],
  foreground: [zone('path', [rect(38, 88, 24, 12)], { x: 50, y: 94 }, 3, ['yellow', 'orange'], { differentFrom: ['door'] })],
};
