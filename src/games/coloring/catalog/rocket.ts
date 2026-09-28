// Fusée qui décolle dans la nuit étoilée (docs/specs/COLORIAGE.md §4.3).
import type { Drawing } from '../model';
import { circle, ellipse, poly, rect, zone } from './build';

export const rocket: Drawing = {
  id: 'rocket',
  background: [
    zone('night-sky', [rect(0, 0, 100, 100)], { x: 85, y: 85 }, 1, ['purple', 'blue']),
    zone('moon', [circle(15, 15, 9)], { x: 15, y: 15 }, 1, ['yellow'], { life: 'pulse' }),
    zone('star-a', [circle(20, 75, 6.5)], { x: 20, y: 75 }, 2, ['yellow'], { pair: 'stars-1', life: 'twinkle' }),
    zone('star-b', [circle(90, 25, 6.5)], { x: 90, y: 25 }, 2, ['yellow'], { pair: 'stars-1', life: 'twinkle' }),
    zone('planet', [circle(80, 50, 9)], { x: 80, y: 50 }, 2, ['orange', 'red', 'purple']),
    zone('ring', [ellipse(80, 63, 16, 6)], { x: 80, y: 63 }, 3, ['orange', 'yellow'], { differentFrom: ['planet'] }),
    zone('star-c', [circle(30, 20, 6.5)], { x: 30, y: 20 }, 3, ['yellow'], { pair: 'stars-2', life: 'twinkle' }),
    zone('star-d', [circle(70, 20, 6.5)], { x: 70, y: 20 }, 3, ['yellow'], { pair: 'stars-2', life: 'twinkle' }),
  ],
  subjects: [
    {
      figure: 'rocket',
      endAnimation: 'slide-up',
      layers: [
        zone('body', [rect(42, 33, 16, 42)], { x: 50, y: 55 }, 1, ['blue', 'red', 'purple'], { piece: true }),
        zone('nose', [poly([50, 13], [61, 37], [39, 37])], { x: 50, y: 29 }, 1, ['red', 'orange', 'yellow'], {
          piece: true,
        }),
        zone('fin-l', [poly([48, 60], [20, 84], [48, 84])], { x: 40.5, y: 76.5 }, 1, ['yellow', 'orange'], {
          piece: true,
          pair: 'fins',
        }),
        zone('fin-r', [poly([52, 60], [80, 84], [52, 84])], { x: 59.5, y: 76.5 }, 1, ['yellow', 'orange'], {
          piece: true,
          pair: 'fins',
        }),
        zone('porthole', [circle(50, 42, 6.5)], { x: 50, y: 42 }, 2, ['blue', 'yellow', 'green']),
      ],
    },
  ],
  foreground: [],
};
