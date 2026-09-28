// Robot dans son atelier (docs/specs/COLORIAGE.md §4.3).
import type { Drawing } from '../model';
import { circle, rect, zone } from './build';

export const robot: Drawing = {
  id: 'robot',
  background: [
    zone('wall', [rect(0, 0, 100, 70)], { x: 10, y: 10 }, 1, ['blue', 'purple']),
    zone('floor', [rect(0, 70, 100, 30)], { x: 90, y: 90 }, 1, ['orange', 'yellow'], { differentFrom: ['wall'] }),
    zone('picture', [rect(75, 20, 18, 14)], { x: 84, y: 27 }, 3, ['red', 'yellow', 'blue']),
    zone('rug', [rect(20, 86, 60, 14)], { x: 50, y: 93 }, 3, ['red', 'purple', 'blue'], { differentFrom: ['floor'] }),
  ],
  subjects: [
    {
      figure: 'robot',
      endAnimation: 'hop',
      layers: [
        zone('body', [rect(36, 40, 28, 32)], { x: 44, y: 60 }, 1, ['blue', 'purple', 'orange'], { piece: true }),
        zone('head', [rect(38, 15, 24, 22)], { x: 50, y: 26 }, 1, ['purple', 'blue', 'orange'], { piece: true }),
        zone('arm-l', [rect(14, 42, 16, 26)], { x: 22, y: 55 }, 1, ['orange', 'red'], { piece: true, pair: 'arms' }),
        zone('arm-r', [rect(70, 42, 16, 26)], { x: 78, y: 55 }, 1, ['orange', 'red'], { piece: true, pair: 'arms' }),
        zone('leg-l', [rect(30, 68, 16, 15)], { x: 38, y: 75 }, 2, ['blue', 'purple'], { pair: 'legs' }),
        zone('leg-r', [rect(54, 68, 16, 15)], { x: 62, y: 75 }, 2, ['blue', 'purple'], { pair: 'legs' }),
        zone('screen', [rect(47, 39, 18, 14)], { x: 56, y: 46 }, 2, ['yellow', 'green'], { differentFrom: ['body'] }),
        zone('antenna', [circle(50, 8, 6.5)], { x: 50, y: 8 }, 2, ['red', 'yellow'], { life: 'sway' }),
        zone('foot-l', [rect(26, 86, 18, 14)], { x: 35, y: 93 }, 3, ['orange', 'red'], { pair: 'feet' }),
        zone('foot-r', [rect(56, 86, 18, 14)], { x: 65, y: 93 }, 3, ['orange', 'red'], { pair: 'feet' }),
      ],
    },
  ],
  foreground: [],
};
