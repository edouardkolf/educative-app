// Scène spatiale : la fusée et le robot sur la lune (docs/specs/COLORIAGE.md §4.3).
import type { Drawing } from '../model';
import { circle, poly, rect, zone } from './build';

export const space: Drawing = {
  id: 'space',
  background: [
    zone('sky', [rect(0, 0, 100, 70)], { x: 8, y: 8 }, 1, ['purple', 'blue']),
    zone('surface', [rect(0, 70, 100, 30)], { x: 50, y: 93 }, 1, ['orange', 'red']),
    zone('star-a', [circle(15, 20, 6.5)], { x: 15, y: 20 }, 3, ['yellow'], { pair: 'stars' }),
    zone('star-b', [circle(85, 15, 6.5)], { x: 85, y: 15 }, 3, ['yellow'], { pair: 'stars' }),
    zone('crater-l', [circle(65, 90, 6.5)], { x: 65, y: 90 }, 3, ['red', 'purple'], { differentFrom: ['surface'] }),
    zone('crater-r', [circle(20, 90, 6.5)], { x: 20, y: 90 }, 3, ['red', 'purple'], { differentFrom: ['surface'] }),
  ],
  subjects: [
    {
      figure: 'rocket',
      endAnimation: 'slide-up',
      layers: [
        zone('rocket-body', [rect(25, 35, 14, 27)], { x: 32, y: 48 }, 1, ['blue', 'red'], { piece: true }),
        zone('nose', [poly([32, 15], [43, 35], [21, 35])], { x: 32, y: 29 }, 1, ['red', 'orange', 'yellow'], {
          piece: true,
        }),
        zone('fin-l', [poly([25, 62], [3, 84], [25, 84])], { x: 19, y: 78 }, 2, ['yellow', 'orange'], {
          piece: true,
          pair: 'fins',
        }),
        zone('fin-r', [poly([32, 62], [54, 84], [32, 84])], { x: 38, y: 78 }, 2, ['yellow', 'orange'], {
          piece: true,
          pair: 'fins',
        }),
      ],
    },
    {
      figure: 'robot',
      endAnimation: 'hop',
      layers: [
        zone('head', [rect(64, 28, 18, 16)], { x: 73, y: 36 }, 1, ['purple', 'blue'], { piece: true }),
        zone('robot-body', [rect(62, 50, 20, 20)], { x: 72, y: 60 }, 1, ['blue', 'purple', 'orange', 'green'], {
          piece: true,
        }),
        zone('arm-l', [rect(50, 52, 14, 18)], { x: 57, y: 61 }, 2, ['orange', 'red'], { piece: true, pair: 'arms' }),
        zone('arm-r', [rect(84, 52, 14, 18)], { x: 91, y: 61 }, 2, ['orange', 'red'], { piece: true, pair: 'arms' }),
      ],
    },
  ],
  foreground: [],
};
