// Scène de jardin : la maison et le sapin (docs/specs/COLORIAGE.md §4.3, deux sujets).
import type { Drawing } from '../model';
import { circle, poly, rect, zone } from './build';

export const garden: Drawing = {
  id: 'garden',
  background: [
    zone('sky', [rect(0, 0, 100, 65)], { x: 8, y: 8 }, 1, ['blue']),
    zone('grass', [rect(0, 65, 100, 35)], { x: 92, y: 93 }, 1, ['green']),
    zone('sun', [circle(50, 12, 9)], { x: 50, y: 12 }, 2, ['yellow', 'orange'], { life: 'pulse' }),
    zone('flower-l', [circle(40, 90, 6.5)], { x: 40, y: 90 }, 3, ['red', 'purple', 'orange', 'yellow'], {
      pair: 'flowers',
    }),
    zone('flower-r', [circle(60, 90, 6.5)], { x: 60, y: 90 }, 3, ['red', 'purple', 'orange', 'yellow'], {
      pair: 'flowers',
    }),
  ],
  subjects: [
    {
      figure: 'house',
      endAnimation: 'pop',
      layers: [
        zone('wall', [rect(2, 42, 30, 22)], { x: 10, y: 49 }, 1, ['yellow', 'orange', 'red', 'blue'], {
          piece: true,
        }),
        zone('roof', [poly([19, 26], [34, 42], [4, 42])], { x: 19, y: 35.5 }, 1, ['red', 'purple'], {
          piece: true,
        }),
        zone('door', [rect(17, 54, 16, 16)], { x: 25, y: 62 }, 1, ['blue', 'green', 'purple'], { piece: true }),
        zone('window', [circle(28, 46, 6.5)], { x: 28, y: 46 }, 2, ['blue', 'yellow']),
        zone('chimney', [rect(28, 22, 12, 16)], { x: 34, y: 30 }, 3, ['red', 'orange'], { differentFrom: ['roof'] }),
      ],
    },
    {
      figure: 'tree',
      endAnimation: 'pop',
      layers: [
        zone('foliage', [poly([76, 26], [91, 58], [61, 58])], { x: 76, y: 48 }, 1, ['green'], { piece: true }),
        zone('trunk', [rect(69, 58, 14, 16)], { x: 76, y: 66 }, 1, ['orange', 'red'], { piece: true }),
        zone('bauble-l', [circle(63, 58, 6.5)], { x: 63, y: 58 }, 2, ['red', 'blue', 'purple'], { pair: 'baubles' }),
        zone('bauble-r', [circle(89, 58, 6.5)], { x: 89, y: 58 }, 2, ['red', 'blue', 'purple'], { pair: 'baubles' }),
        zone('star', [circle(76, 20, 6.5)], { x: 76, y: 20 }, 3, ['yellow'], { life: 'twinkle' }),
      ],
    },
  ],
  foreground: [],
};
