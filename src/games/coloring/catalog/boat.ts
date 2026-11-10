// Bateau en mer, sous le soleil (docs/specs/COLORIAGE.md §4.3).
import type { Drawing } from '../model';
import { blank, circle, dot, ellipse, ink, path, poly, rays, rect, zone } from './build';

const BUOY = { cx: 86, cy: 88.5, r: 8.5 };

/** Bandes de la bouée : deux traits rayonnants par bande, hors du disque du code. */
function buoyBands(): string {
  let d = '';
  for (const center of [45, 135, 225, 315]) {
    for (const offset of [-13, 13]) {
      const angle = ((center + offset) * Math.PI) / 180;
      const [cos, sin] = [Math.cos(angle), Math.sin(angle)];
      const r2 = (v: number) => Math.round(v * 100) / 100;
      d += `M${r2(BUOY.cx + 5.8 * cos)} ${r2(BUOY.cy + 5.8 * sin)} L${r2(BUOY.cx + BUOY.r * cos)} ${r2(BUOY.cy + BUOY.r * sin)} `;
    }
  }
  return d.trim();
}

export const boat: Drawing = {
  id: 'boat',
  background: [
    zone('sky', [rect(0, 0, 100, 100)], { x: 88, y: 45 }, 1, ['blue']),
    zone('sun', [circle(15, 15, 9.5)], { x: 15, y: 15 }, 1, ['yellow', 'orange'], { life: 'pulse' }),
    ink(rays(15, 15, 11.8, 14.4), 1, { life: 'pulse' }),
    blank(
      [path('M80 32 C76.5 32 75.5 27.5 79 26.5 C79 22 85 20.5 87.5 23.5 C90 19.5 97 21 96.5 26 C99.5 26.5 99.5 32 96.5 32 Z')],
      2,
      { life: 'drift' },
    ),
    // Mouettes.
    ink('M22 36 q2.5 -2.6 5 0 q2.5 -2.6 5 0 M76 42 q2 -2 4 0 q2 -2 4 0', 2, { thin: true }),
    zone('sea', [path('M0 60 C14 56.5 28 62 46 60 S80 56.5 100 60.5 V100 H0 Z')], { x: 92.5, y: 72 }, 1, ['blue', 'green'], {
      differentFrom: ['sky'],
    }),
    // Remous.
    ink('M4 76 q3 -2.2 6 0 t6 0 M4 64.5 q3 -2.2 6 0 t6 0 M88 62.5 q2.5 -2 5 0', 1, { thin: true }),
  ],
  subjects: [
    {
      figure: 'boat',
      endAnimation: 'slide-right',
      layers: [
        // Mât.
        ink('M50 3 V69', 1),
        zone(
          'hull',
          [path('M14 68.5 H86 C84 76.5 80 82.5 74.5 86.5 Q50 91.5 25.5 86.5 C20 82.5 16 76.5 14 68.5 Z')],
          { x: 50, y: 79 },
          1,
          ['red', 'orange'],
          { piece: true, pieceAs: 'rect' },
        ),
        // Liston le long du pont.
        ink('M16.2 72 H83.8', 1, { thin: true }),
        zone('sail', [poly([47.5, 20], [47.5, 65], [19, 65])], { x: 39.5, y: 55 }, 1, ['red', 'yellow', 'orange'], {
          piece: true,
        }),
        // Lattes de la grand-voile.
        ink('M38.6 33.5 L47.5 31 M30.6 46 L47.5 42', 1, { thin: true }),
        zone(
          'flag',
          [path('M51 3 C60 5.5 69 9 81 13 C69 17 60 20.5 51 23 Z')],
          { x: 58, y: 13 },
          1,
          ['red', 'yellow', 'purple'],
          { life: 'sway' },
        ),
        zone('sail2', [poly([52.5, 25], [52.5, 54], [77, 54])], { x: 60, y: 46.3 }, 2, ['blue']),
        zone('cabin', [rect(57.5, 55.5, 19, 14, 2)], { x: 67, y: 62.5 }, 2, ['yellow', 'blue', 'red']),
        // Toit de la cabine.
        ink('M56 55.5 H78', 2),
        zone('porthole-l', [circle(34, 79.5, 6.3)], { x: 34, y: 79.5 }, 2, ['yellow', 'orange'], { pair: 'portholes' }),
        zone('porthole-r', [circle(66, 79.5, 6.3)], { x: 66, y: 79.5 }, 2, ['yellow', 'orange'], { pair: 'portholes' }),
        // Hublots cerclés.
        ink(`${dot(34, 79.5, 7.6)} ${dot(66, 79.5, 7.6)}`, 2, { thin: true }),
      ],
    },
  ],
  foreground: [
    // Vague au premier plan, qui cache la quille.
    zone(
      'wave',
      [path('M30 100 V93 C33 89 38 87.5 42 89.5 C45.5 85.5 51.5 84.8 55 87.5 C58.5 84.8 64.5 85.5 68 89.5 C72 87.5 76.5 89 79 93 V100 Z')],
      { x: 55, y: 93.5 },
      3,
      ['blue', 'green'],
    ),
    // Écume sur les crêtes.
    ink('M37 91 q2 -1.6 4 0 M48.5 88.3 q2 -1.6 4 0 M61.5 88.3 q2 -1.6 4 0 M71 91 q2 -1.6 4 0', 3, { thin: true }),
    zone('fish', [ellipse(16, 92, 9.5, 6.8), poly([24, 92], [32.5, 86], [32.5, 98])], { x: 17, y: 92 }, 3, ['orange', 'yellow'], {
      life: 'bob',
    }),
    // Œil et sourire.
    ink(dot(10, 89.8, 0.9), 3, { filled: true }),
    ink('M8 93.6 q1.4 1.5 3 0.5', 3, { thin: true }),
    zone('buoy', [circle(BUOY.cx, BUOY.cy, BUOY.r)], { x: BUOY.cx, y: BUOY.cy }, 3, ['red', 'orange'], { life: 'bob' }),
    // Bandes et trou de la bouée.
    ink(`${buoyBands()} ${dot(BUOY.cx, BUOY.cy, 2.6)}`, 3, { thin: true }),
  ],
};
