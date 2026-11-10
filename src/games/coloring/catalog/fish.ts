// Poisson qui nage sous l'eau (docs/specs/COLORIAGE.md §4.3).
import type { Drawing, Primitive } from '../model';
import { blank, circle, dot, ellipse, ink, path, poly, rect, star, zone } from './build';

const BODY = { cx: 48, cy: 36, r: 17 };

/** La rayure : la part du corps à droite d'une ligne courbe (arc du corps, puis retour par la courbe). */
function stripeShape(): Primitive {
  const points: [number, number][] = [];
  const half = Math.acos((51 - BODY.cx) / BODY.r); // la courbe part du bord du corps, à x = 51
  for (let i = 0; i <= 16; i += 1) {
    const angle = -half + (2 * half * i) / 16;
    points.push([BODY.cx + BODY.r * Math.cos(angle), BODY.cy + BODY.r * Math.sin(angle)]);
  }
  const [bottom, top] = [points[points.length - 1] as [number, number], points[0] as [number, number]];
  for (let i = 1; i < 8; i += 1) {
    const t = i / 8;
    const u = 1 - t;
    points.push([u * u * bottom[0] + 2 * u * t * 54 + t * t * top[0], u * u * bottom[1] + 2 * u * t * BODY.cy + t * t * top[1]]);
  }
  return poly(...points.map(([x, y]): [number, number] => [Math.round(x * 100) / 100, Math.round(y * 100) / 100]));
}

const SEAWEED_1 =
  'M82 84 C80 76 84 72 82 64 C81 59 86 58 87 62 C88 66 87 68 88 70 C88 63 90 57 93 58.5 C96 60 93 66 94 70 C95 67 97 65 98.5 67 C100 71 97 78 98 84 Z';
const SEAWEED_2 =
  'M20 84 C22 76 18 72 20 64 C21 59 16 58 15 62 C14 66 15 68 14 70 C14 63 12 57 9 58.5 C6 60 9 66 8 70 C7 67 5 65 3.5 67 C2 71 5 78 4 84 Z';

export const fish: Drawing = {
  id: 'fish',
  background: [
    zone('water', [rect(0, 0, 100, 100)], { x: 90, y: 10 }, 1, ['blue']),
    // Remous.
    ink('M8 12 q3 -2.2 6 0 t6 0 M66 62 q3 -2.2 6 0 t6 0 M10 30 q3 -2.2 6 0 t6 0 M72 6 q3 -2.2 6 0', 1, { thin: true }),
    zone('sand', [path('M0 76 C18 71 34 73 50 75 S84 78 100 73 V100 H0 Z')], { x: 6, y: 93 }, 1, ['yellow', 'orange'], {
      differentFrom: ['water'],
    }),
    ink([dot(90, 92, 0.6), dot(94, 96, 0.6), dot(86, 96.5, 0.6), dot(62, 97.5, 0.6), dot(46, 79.5, 0.6), dot(60, 80.5, 0.6)].join(' '), 1, {
      filled: true,
    }),
    zone(
      'seaweed-3',
      [path('M19.5 80 C17.5 70 23.5 64 20.5 56 C18.5 50 24 45 29.5 46.5 C36 48.5 34 56 36 64 C37 72 36 80 36 80 Z')],
      { x: 28.2, y: 64 },
      2,
      ['green'],
      { life: 'sway' },
    ),
    zone('seaweed-2', [path(SEAWEED_2)], { x: 12, y: 76 }, 2, ['green'], { life: 'sway' }),
    zone('seaweed-1', [path(SEAWEED_1)], { x: 90, y: 76 }, 1, ['green'], { life: 'sway' }),
    zone(
      'shell',
      [path('M64.5 92 C61.5 84 66 77.5 73 77.5 C80 77.5 84.5 84 81.5 92 Q73 96.5 64.5 92 Z')],
      { x: 73, y: 86 },
      2,
      ['orange', 'red', 'yellow'],
    ),
    // Côtes du coquillage.
    ink('M73 93.4 V79 M72 93.2 L66.6 80.6 M74 93.2 L79.4 80.6 M71.2 92.8 L63.6 85.4 M74.8 92.8 L82.4 85.4', 2, { thin: true }),
  ],
  subjects: [
    {
      figure: 'fish',
      endAnimation: 'slide-left',
      layers: [
        blank([circle(28.5, 31, 1.7)], 1, { endOnly: true, thin: true, life: 'bob' }),
        blank([circle(25, 25.5, 2.3)], 1, { endOnly: true, thin: true, life: 'bob' }),
        blank([circle(27.5, 18.5, 1.4)], 1, { endOnly: true, thin: true, life: 'bob' }),
        zone('tail', [path('M56 36 L87 21 Q80 36 87 51 Z')], { x: 74.5, y: 36 }, 1, ['orange', 'yellow'], {
          piece: true,
          pieceAs: 'triangle',
        }),
        zone('fin', [path('M35 25 C36 6 46 2 62 5 C58 12 59 20 61 27 Z')], { x: 50, y: 12.5 }, 1, ['blue', 'purple']),
        zone('body', [circle(BODY.cx, BODY.cy, BODY.r)], { x: 41.5, y: 41.5 }, 1, ['orange', 'red', 'yellow'], { piece: true }),
        zone('stripe', [stripeShape()], { x: 58.6, y: 36 }, 2, ['blue', 'purple', 'yellow'], { differentFrom: ['body'] }),
        // Œil, puis sourire.
        ink(dot(39.5, 28.5, 1.7), 1, { filled: true }),
        ink('M32.6 38.6 q1.9 2.6 4.6 1.2', 1),
      ],
    },
  ],
  foreground: [
    zone('starfish', [star(54, 89.5, 10.2, 6.3)], { x: 54, y: 89.5 }, 3, ['orange', 'red', 'purple']),
    zone('pebble-l', [ellipse(20, 91.5, 8, 7)], { x: 20, y: 91.5 }, 3, ['blue', 'purple'], { pair: 'pebbles' }),
    zone('pebble-r', [ellipse(36, 93, 8, 7)], { x: 36, y: 93 }, 3, ['blue', 'purple'], { pair: 'pebbles' }),
  ],
};
