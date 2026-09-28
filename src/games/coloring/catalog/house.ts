// Maison, dans un décor de jour (docs/specs/COLORIAGE.md §4.4, exemple de référence validé).
import type { Drawing } from '../model';
import { blank, circle, ellipse, poly, rect, zone } from './build';

export const house: Drawing = {
  id: 'house',
  background: [
    zone('sky', [rect(0, 0, 100, 82)], { x: 88, y: 44 }, 1, ['blue']),
    zone('sun', [circle(15, 15, 10)], { x: 15, y: 15 }, 1, ['yellow', 'orange'], { life: 'pulse' }),
    blank([ellipse(76, 15, 11, 6), circle(70, 11, 6), circle(80, 10, 7)], 2, { life: 'drift' }),
    zone('grass', [rect(0, 82, 100, 18)], { x: 10, y: 92 }, 1, ['green']),
  ],
  subjects: [
    {
      figure: 'house',
      endAnimation: 'pop',
      layers: [
        zone('chimney', [rect(58, 12, 12, 22)], { x: 64, y: 20 }, 2, ['red', 'orange', 'purple'], {
          differentFrom: ['roof'],
        }),
        zone('roof', [poly([22, 48], [50, 22], [78, 48])], { x: 50, y: 37 }, 1, ['red', 'purple', 'orange'], {
          piece: true,
        }),
        zone(
          'wall',
          [rect(28, 48, 44, 34)],
          { x: 50, y: 54 },
          1,
          ['yellow', 'orange', 'red', 'blue', 'purple', 'green'],
          { piece: true, differentFrom: ['sky', 'roof', 'door', 'window-l'] },
        ),
        zone('window-l', [rect(30.5, 53, 11, 11)], { x: 36, y: 58.5 }, 2, ['blue', 'yellow'], { pair: 'windows' }),
        zone('window-r', [rect(58.5, 53, 11, 11)], { x: 64, y: 58.5 }, 2, ['blue', 'yellow'], { pair: 'windows' }),
        zone('door', [rect(43, 62, 14, 20)], { x: 50, y: 72 }, 1, ['blue', 'green', 'purple', 'red', 'orange'], {
          piece: true,
        }),
      ],
    },
  ],
  foreground: [
    zone('path', [poly([43, 82], [57, 82], [62, 100], [38, 100])], { x: 50, y: 91 }, 2, ['yellow', 'orange'], {
      differentFrom: ['door'],
    }),
    zone('bush-l', [circle(19, 80, 7), circle(26, 83, 5)], { x: 19, y: 80 }, 3, ['green'], {
      pair: 'bushes',
      life: 'sway',
    }),
    zone('bush-r', [circle(81, 80, 7), circle(74, 83, 5)], { x: 81, y: 80 }, 3, ['green'], {
      pair: 'bushes',
      life: 'sway',
    }),
    zone('flower-l', [circle(29, 93, 6.5)], { x: 29, y: 93 }, 3, ['red', 'purple', 'orange', 'yellow'], {
      pair: 'flowers',
    }),
    zone('flower-r', [circle(71, 93, 6.5)], { x: 71, y: 93 }, 3, ['red', 'purple', 'orange', 'yellow'], {
      pair: 'flowers',
    }),
  ],
};
