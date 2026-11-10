// Scène spatiale : la fusée et le robot sur la lune (docs/specs/COLORIAGE.md §4.3).
import type { Drawing } from '../model';
import { blank, circle, dot, ellipse, ink, path, poly, rect, star, zone } from './build';

/** Petit cratère à l'encre : une ellipse plate et l'ombre de son bord. */
function pit(cx: number, cy: number, rx: number): string {
  const ry = rx * 0.42;
  return `M${cx - rx} ${cy} a${rx} ${ry} 0 1 0 ${2 * rx} 0 a${rx} ${ry} 0 1 0 ${-2 * rx} 0 Z`;
}

/** Bourrelet d'un cratère tapable : un arc au-dessus de son bord haut. */
function lip(cx: number, cy: number, rx: number, ry: number): string {
  return `M${cx - rx} ${cy} A${rx} ${ry} 0 0 1 ${cx + rx} ${cy}`;
}

/** Poussière d'étoiles, toujours blanche. */
function specks(points: [number, number][], detail: 1 | 2 | 3) {
  return points.map(([x, y]) => blank([circle(x, y, 0.9)], detail, { thin: true, life: 'twinkle' }));
}

export const space: Drawing = {
  id: 'space',
  background: [
    zone('sky', [rect(0, 0, 100, 100)], { x: 50, y: 38 }, 1, ['purple', 'blue']),
    ...specks([[6, 6], [40, 4], [62, 10], [96, 34], [44, 58], [5, 40], [58, 30]], 1),
    zone('surface', [path('M0 73 C18 69 32 70 48 74 S80 76 100 71 V100 H0 Z')], { x: 15, y: 93.5 }, 1, ['orange', 'red']),
    // Petits cratères.
    ink(`${pit(93.5, 80.5, 4)} ${pit(59, 80.5, 3.2)} ${pit(33, 95.5, 2.6)}`, 1, { thin: true }),
    zone('star-a', [star(89, 14, 10, 6)], { x: 89, y: 14 }, 3, ['yellow'], { pair: 'stars' }),
    zone('star-b', [star(49, 14, 10, 6)], { x: 49, y: 14 }, 3, ['yellow'], { pair: 'stars' }),
    zone('crater-l', [ellipse(82.5, 91.5, 10.5, 7)], { x: 82.5, y: 91.5 }, 3, ['red', 'purple'], { differentFrom: ['surface'] }),
    zone('crater-r', [ellipse(54.5, 92.5, 10.5, 6.5)], { x: 54.5, y: 92.5 }, 3, ['red', 'purple'], { differentFrom: ['surface'] }),
    ink(`${lip(82.5, 91.5, 12.5, 9)} ${lip(54.5, 92.5, 12.5, 8.5)}`, 3, { thin: true }),
  ],
  subjects: [
    {
      figure: 'rocket',
      endAnimation: 'slide-up',
      layers: [
        // Flammes du décollage.
        blank([path('M18.5 72 C17 80 21 86 25 94 C29 86 33 80 31.5 72 Z')], 1, { endOnly: true }),
        ink('M22 76 C21.6 81 23.4 84 25 88 C26.6 84 28.4 81 28 76', 1, { endOnly: true, thin: true }),
        zone('rocket-body', [rect(17, 35, 16, 39, 3)], { x: 25, y: 59 }, 1, ['blue', 'red'], { piece: true }),
        // Hublot cerclé, puis bande et rivets.
        ink(`${dot(25, 45, 4.4)} ${dot(25, 45, 2.8)}`, 1, { thin: true }),
        ink('M17 67 H33 M17 71 H33', 1, { thin: true }),
        ink(`${dot(20.5, 69, 0.6)} ${dot(25, 69, 0.6)} ${dot(29.5, 69, 0.6)}`, 1, { filled: true }),
        zone('nose', [poly([25, 10], [36.5, 37], [13.5, 37])], { x: 25, y: 28.5 }, 1, ['red', 'orange', 'yellow'], {
          piece: true,
        }),
        zone('fin-l', [path('M17 51 C8.5 57 3.5 68 3 87 L17 80 Z')], { x: 10.8, y: 75 }, 2, ['yellow', 'orange'], {
          piece: true,
          pieceAs: 'triangle',
          pair: 'fins',
        }),
        zone('fin-r', [path('M33 51 C41.5 57 46.5 68 47 87 L33 80 Z')], { x: 39.2, y: 75 }, 2, ['yellow', 'orange'], {
          piece: true,
          pieceAs: 'triangle',
          pair: 'fins',
        }),
      ],
    },
    {
      figure: 'robot',
      endAnimation: 'hop',
      layers: [
        // Antenne et sa boule, cou.
        ink(`M73 27 V21.6 ${dot(73, 19.4, 2.2)}`, 1, { life: 'sway' }),
        ink('M69 46.5 H77 V50.5 H69 Z', 1, { thin: true }),
        zone('head', [rect(62, 27, 22, 20, 4)], { x: 73, y: 37 }, 1, ['purple', 'blue'], { piece: true }),
        // Yeux, puis sourire.
        ink(`${dot(66.6, 31.6, 1.6)} ${dot(79.4, 31.6, 1.6)}`, 1, { filled: true }),
        ink('M68.5 43.4 Q73 45.8 77.5 43.4', 1),
        zone('robot-body', [rect(61, 50, 24, 27, 3)], { x: 73, y: 67 }, 1, ['blue', 'purple', 'orange', 'green'], {
          piece: true,
        }),
        // Boutons et jauge.
        ink(`${dot(65.5, 55, 1.1)} ${dot(69.5, 55, 1.1)}`, 1, { filled: true }),
        ink('M75.5 57.5 A4 4 0 0 1 83.5 57.5 Z M79.5 57.5 L81.8 54.6', 1, { thin: true }),
        zone('arm-l', [rect(47.5, 51, 13, 21, 4.5)], { x: 54, y: 62 }, 2, ['orange', 'red'], { piece: true, pair: 'arms' }),
        zone('arm-r', [rect(85.5, 51, 13, 21, 4.5)], { x: 92, y: 62 }, 2, ['orange', 'red'], { piece: true, pair: 'arms' }),
        // Épaules et pinces.
        ink(`${dot(54, 54, 1.1)} ${dot(92, 54, 1.1)}`, 2, { thin: true }),
        ink('M51 71.5 C50 76.5 58 76.5 57 71.5 M89 71.5 C88 76.5 96 76.5 95 71.5', 2),
      ],
    },
  ],
  foreground: [],
};
