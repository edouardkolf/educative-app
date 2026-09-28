// Sapin de Noël, la nuit (docs/specs/COLORIAGE.md §4.3).
import type { Drawing } from '../model';
import { circle, poly, rect, zone } from './build';

export const tree: Drawing = {
  id: 'tree',
  background: [
    zone('night-sky', [rect(0, 0, 100, 80)], { x: 85, y: 15 }, 1, ['purple', 'blue']),
    zone('moon', [circle(15, 15, 9)], { x: 15, y: 15 }, 1, ['yellow'], { life: 'pulse' }),
    zone('hill', [rect(0, 80, 100, 20)], { x: 6, y: 90 }, 1, ['blue', 'purple', 'green'], {
      differentFrom: ['night-sky'],
    }),
  ],
  subjects: [
    {
      figure: 'tree',
      endAnimation: 'pop',
      layers: [
        zone('foliage', [poly([50, 24], [30, 56], [70, 56])], { x: 50, y: 40 }, 1, ['green'], { piece: true }),
        zone('trunk', [rect(44, 72, 12, 16)], { x: 50, y: 80 }, 1, ['orange', 'red'], { piece: true }),
        zone('star', [poly([50, 6], [64, 24], [36, 24])], { x: 50, y: 18 }, 1, ['yellow'], { life: 'twinkle' }),
        zone('bauble-l', [circle(38, 46, 6.5)], { x: 38, y: 46 }, 2, ['red', 'blue', 'purple'], { pair: 'baubles-1' }),
        zone('bauble-r', [circle(62, 46, 6.5)], { x: 62, y: 46 }, 2, ['red', 'blue', 'purple'], { pair: 'baubles-1' }),
        zone('bauble2-l', [circle(35, 62, 6.5)], { x: 35, y: 62 }, 3, ['red', 'blue', 'orange'], { pair: 'baubles-2' }),
        zone('bauble2-r', [circle(65, 62, 6.5)], { x: 65, y: 62 }, 3, ['red', 'blue', 'orange'], { pair: 'baubles-2' }),
      ],
    },
  ],
  foreground: [
    zone('gift-l', [rect(14, 84, 16, 14)], { x: 22, y: 91 }, 2, ['red', 'purple', 'blue'], { pair: 'gifts' }),
    zone('gift-r', [rect(70, 84, 16, 14)], { x: 78, y: 91 }, 2, ['red', 'purple', 'blue'], { pair: 'gifts' }),
  ],
};
