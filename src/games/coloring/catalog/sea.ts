// Scène marine : le bateau en surface et le poisson dessous (docs/specs/COLORIAGE.md §4.3).
import type { Drawing, Primitive } from '../model';
import { blank, circle, dot, ink, path, poly, rays, rect, zone } from './build';

const BODY = { cx: 38, cy: 76, r: 15 };

/** La rayure : la part du corps à droite d'une ligne courbe (même construction que fish.ts). */
function stripeShape(): Primitive {
  const points: [number, number][] = [];
  const half = Math.acos(1.5 / BODY.r); // la courbe part du bord du corps, à x = cx + 1.5
  for (let i = 0; i <= 16; i += 1) {
    const angle = -half + (2 * half * i) / 16;
    points.push([BODY.cx + BODY.r * Math.cos(angle), BODY.cy + BODY.r * Math.sin(angle)]);
  }
  const [bottom, top] = [points[points.length - 1] as [number, number], points[0] as [number, number]];
  for (let i = 1; i < 8; i += 1) {
    const t = i / 8;
    const u = 1 - t;
    const cx = BODY.cx + 3.5;
    points.push([u * u * bottom[0] + 2 * u * t * cx + t * t * top[0], u * u * bottom[1] + 2 * u * t * BODY.cy + t * t * top[1]]);
  }
  return poly(...points.map(([x, y]): [number, number] => [Math.round(x * 100) / 100, Math.round(y * 100) / 100]));
}

/** Algues ondulées de fish.ts, posées au fond. */
const SEAWEED_L =
  'M20 100 C22 92 18 88 20 80 C21 75 16 74 15 78 C14 82 15 84 14 86 C14 79 12 73 9 74.5 C6 76 9 82 8 86 C7 83 5 81 3.5 83 C2 87 5 94 4 100 Z';
const SEAWEED_R =
  'M80 100 C78 92 82 88 80 80 C79 75 84 74 85 78 C86 82 85 84 86 86 C86 79 88 73 91 74.5 C94 76 91 82 92 86 C93 83 95 81 96.5 83 C98 87 95 94 96 100 Z';

export const sea: Drawing = {
  id: 'sea',
  background: [
    zone('sky', [rect(0, 0, 100, 100)], { x: 36, y: 20 }, 1, ['blue']),
    // Mouette.
    ink('M38 8 q2.5 -2.6 5 0 q2.5 -2.6 5 0', 1, { thin: true }),
    zone('water', [path('M0 40 C15 37 30 42 50 40 S82 37 100 41 V100 H0 Z')], { x: 88, y: 61 }, 1, ['blue', 'green'], {
      differentFrom: ['sky'],
    }),
    // Remous.
    ink('M56 94 q3 -2.2 6 0 t6 0 M76 66 q2.5 -2 5 0 t5 0', 1, { thin: true }),
    zone('sun', [circle(14, 14, 8.5)], { x: 14, y: 14 }, 2, ['yellow', 'orange'], { life: 'pulse' }),
    ink(rays(14, 14, 10.6, 13), 2, { life: 'pulse' }),
    zone('bubble-l', [circle(11, 62.5, 6.5)], { x: 11, y: 62.5 }, 3, ['blue'], { pair: 'bubbles', life: 'drift' }),
    zone('bubble-r', [circle(20.5, 48, 6.5)], { x: 20.5, y: 48 }, 3, ['blue'], { pair: 'bubbles', life: 'drift' }),
    // Reflets des bulles.
    ink('M6.8 59.6 q1.2 -2 3.4 -2.6 M16.3 45.1 q1.2 -2 3.4 -2.6', 3, { thin: true }),
    zone('seaweed-l', [path(SEAWEED_L)], { x: 12, y: 92 }, 3, ['green']),
    zone('seaweed-r', [path(SEAWEED_R)], { x: 88, y: 92 }, 3, ['green']),
      ],
  subjects: [
    {
      figure: 'boat',
      endAnimation: 'slide-right',
      layers: [
        // Mât.
        ink('M74 3 V38', 1),
        zone(
          'hull',
          [path('M50 38 H98 C96.5 44 93 48.5 89 50.5 Q74 54 59 50.5 C55 48.5 51.5 44 50 38 Z')],
          { x: 79, y: 44.5 },
          1,
          ['red', 'orange'],
          { piece: true, pieceAs: 'rect' },
        ),
        zone('sail', [poly([72, 8], [72, 36], [50, 36])], { x: 64.8, y: 28.8 }, 1, ['yellow', 'red'], { piece: true }),
        zone(
          'flag',
          [path('M75 3 C82 5.5 88 8 97 11 C88 14 82 16.5 75 19 Z')],
          { x: 80.5, y: 11 },
          1,
          ['red', 'yellow'],
          { life: 'sway' },
        ),
        zone('porthole', [circle(62, 44.6, 5.8)], { x: 62, y: 44.6 }, 2, ['blue', 'yellow']),
        ink(dot(62, 44.6, 6.6), 2, { thin: true }),
      ],
    },
    {
      figure: 'fish',
      endAnimation: 'slide-left',
      layers: [
        blank([circle(20.5, 73, 1.4)], 1, { endOnly: true, thin: true, life: 'bob' }),
        blank([circle(17.8, 69.2, 1)], 1, { endOnly: true, thin: true, life: 'bob' }),
        zone('tail', [path('M50 76 L71 61.5 Q64.5 76 71 90.5 Z')], { x: 60.5, y: 76 }, 1, ['orange', 'yellow'], {
          piece: true,
          pieceAs: 'triangle',
        }),
        zone('fin', [path('M26 68 C26.5 52 33 43 47 45 C44.5 50 45 57 47.5 65 Z')], { x: 37.5, y: 55 }, 2, ['blue', 'purple']),
        zone('body', [circle(BODY.cx, BODY.cy, BODY.r)], { x: 33, y: 80 }, 1, ['orange', 'yellow'], { piece: true }),
        zone('stripe', [stripeShape()], { x: 46.5, y: 76 }, 2, ['blue', 'purple'], { differentFrom: ['body'] }),
        // Œil, puis sourire.
        ink(dot(30.5, 69.4, 1.5), 1, { filled: true }),
        ink('M23.8 78 q1.6 2.2 3.8 1', 1),
      ],
    },
  ],
  foreground: [],
};
