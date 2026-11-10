// Château fort sur la colline (docs/specs/COLORIAGE.md §4.3).
import type { Drawing } from '../model';
import { blank, circle, dot, ink, path, poly, rays, rect, zone } from './build';

/** Bloc crénelé (mur, tour) de x0 à x1, du sommet `top` à `bottom`, avec des merlons [début, fin] hauts de `h`. */
function crenellated(x0: number, x1: number, top: number, bottom: number, merlons: [number, number][], h: number): string {
  let d = `M${x0} ${bottom} V${top}`;
  for (const [a, b] of merlons) d += ` H${a} V${top - h} H${b} V${top}`;
  return `${d} H${x1} V${bottom} Z`;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Drapeau qui flotte vers la droite, accroché au mât en x = mx. */
function flag(mx: number): string {
  const x = (v: number) => round(mx + v);
  return `M${x(0.5)} 2 C${x(5)} 0.4 ${x(9)} 4.2 ${x(13.5)} 2.6 C${x(15.5)} 1.9 ${x(17.5)} 1.7 ${x(19)} 2.2 L${x(16)} 8.7 L${x(19)} 15.2 C${x(17.5)} 14.7 ${x(15.5)} 14.9 ${x(13.5)} 15.6 C${x(9)} 17.2 ${x(5)} 13.4 ${x(0.5)} 15.2 Z`;
}

/** Fenêtre en arc : rectangle au sommet arrondi. */
function arched(x: number, y: number, w: number, h: number): string {
  const r = w / 2;
  const k = r * 0.55;
  return `M${x} ${y + h} V${y + r} C${x} ${round(y + r - k)} ${round(x + r - k)} ${y} ${x + r} ${y} C${round(x + r + k)} ${y} ${x + w} ${round(y + r - k)} ${x + w} ${y + r} V${y + h} Z`;
}

const WALL_MERLONS: [number, number][] = [
  [33.5, 38.1],
  [40.6, 45.2],
  [47.7, 52.3],
  [54.8, 59.4],
  [61.9, 66.5],
];

export const castle: Drawing = {
  id: 'castle',
  background: [
    zone('sky', [rect(0, 0, 100, 100)], { x: 50, y: 32 }, 1, ['blue']),
    zone('sun', [circle(59, 13.5, 9)], { x: 59, y: 13.5 }, 2, ['yellow', 'orange'], { life: 'pulse' }),
    ink(rays(59, 13.5, 11.3, 13.8, 10), 2, { life: 'pulse' }),
    blank([path('M3.5 13 C0.8 13 0.8 8.5 3.8 8 C4.3 4 9.8 3 11.8 6 C14.3 4.5 17.8 6.5 16.8 9.5 C18.8 10 18.8 13 16.3 13 Z')], 2, {
      life: 'drift',
    }),
    zone('hill', [path('M0 68 C14 60 30 57 50 57 S86 60 100 68 V100 H0 Z')], { x: 12, y: 91 }, 1, ['green']),
    // Touffes d'herbe.
    ink('M4 76 l1.2 -2.6 l1.2 2.6 M92 78 l1.2 -2.6 l1.2 2.6 M95 80.5 l1.6 -2 M24 97 l1.2 -2.6 l1.2 2.6 M80 95 l1.2 -2.6 l1.2 2.6', 1, {
      thin: true,
    }),
  ],
  subjects: [
    {
      figure: 'castle',
      endAnimation: 'pop',
      layers: [
        // Mâts des drapeaux, plantés au sommet des toits.
        ink('M21 18 V1.2 M79 18 V1.2', 3),
        zone('wall', [path(crenellated(27, 73, 48, 84, WALL_MERLONS, 5))], { x: 50, y: 54 }, 1, ['yellow', 'orange', 'red'], {
          piece: true,
          pieceAs: 'rect',
        }),
        // Meurtrières et quelques pierres du mur.
        ink('M35.4 70 V61.2 a1 1 0 0 1 2 0 V70 Z M62.6 70 V61.2 a1 1 0 0 1 2 0 V70 Z', 1, { filled: true }),
        ink('M32.5 78.5 h4 v2.4 h-4 Z M63 53 h4 v2.4 h-4 Z', 1, { thin: true }),
        zone('tower-l', [path(crenellated(11, 31, 38, 84, [[11, 16], [18.5, 23.5], [26, 31]], 4.5))], { x: 21, y: 76 }, 1, ['orange', 'red', 'purple'], {
          piece: true,
          pieceAs: 'rect',
          pair: 'towers',
        }),
        zone('tower-r', [path(crenellated(69, 89, 38, 84, [[69, 74], [76.5, 81.5], [84, 89]], 4.5))], { x: 79, y: 76 }, 1, ['orange', 'red', 'purple'], {
          piece: true,
          pieceAs: 'rect',
          pair: 'towers',
        }),
        ink('M24.5 43 h4 v2.4 h-4 Z M71.5 43 h4 v2.4 h-4 Z', 1, { thin: true }),
        zone('door', [path('M42 84 V71 C42 66 46 63.5 50 62 C54 63.5 58 66 58 71 V84 Z')], { x: 50, y: 76.5 }, 1, [
          'blue',
          'green',
          'purple',
        ]),
        // Planches et anneau de la porte.
        ink('M46 65 V84 M50 62 V84 M54 65 V84', 1, { thin: true }),
        ink(`${dot(55.8, 75, 1.1)}`, 1, { thin: true }),
        zone('roof-l', [poly([21, 18], [35, 39.5], [7, 39.5])], { x: 21, y: 32 }, 2, ['red', 'purple'], {
          piece: true,
          pair: 'roofs',
        }),
        zone('roof-r', [poly([79, 18], [93, 39.5], [65, 39.5])], { x: 79, y: 32 }, 2, ['red', 'purple'], {
          piece: true,
          pair: 'roofs',
        }),
        // Tuiles au bas des toits.
        ink('M10.5 37.2 q2.6 2.2 5.25 0 q2.6 2.2 5.25 0 q2.6 2.2 5.25 0 q2.6 2.2 5.25 0', 2, { thin: true }),
        ink('M68.5 37.2 q2.6 2.2 5.25 0 q2.6 2.2 5.25 0 q2.6 2.2 5.25 0 q2.6 2.2 5.25 0', 2, { thin: true }),
        zone('window-l', [path(arched(14, 50, 14, 17))], { x: 21, y: 59.5 }, 2, ['yellow', 'blue'], { pair: 'windows' }),
        zone('window-r', [path(arched(72, 50, 14, 17))], { x: 79, y: 59.5 }, 2, ['yellow', 'blue'], { pair: 'windows' }),
        // Croisillons, puis appuis.
        ink('M21 50 V67 M14 59 H28 M79 50 V67 M72 59 H86', 2, { thin: true }),
        ink('M12.8 68.6 H29.2 M70.8 68.6 H87.2', 2),
        zone('flag-l', [path(flag(21))], { x: 29.5, y: 8.8 }, 3, ['red', 'yellow'], {
          pair: 'flags',
          life: 'sway',
        }),
        zone('flag-r', [path(flag(79))], { x: 87.5, y: 8.8 }, 3, ['red', 'yellow'], {
          pair: 'flags',
          life: 'sway',
        }),
      ],
    },
  ],
  foreground: [
    zone(
      'path',
      [path('M43 84 C43 88 38 89 38.5 93 C39 96.5 44 97 43 100 H64 C65 96 59.5 94 59.5 91 C59.5 88 57 87 57 84 Z')],
      { x: 50, y: 92 },
      3,
      ['yellow', 'orange'],
      { differentFrom: ['door'] },
    ),
    ink(`${dot(45, 89, 0.6)} ${dot(54, 95, 0.6)} ${dot(50, 98, 0.6)}`, 3, { filled: true }),
  ],
};
