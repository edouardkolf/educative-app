// Bonhomme de neige, au pied du sapin (docs/specs/COLORIAGE.md §4.3).
import type { Drawing } from '../model';
import { blank, circle, dot, ellipse, ink, path, poly, rays, rect, ring, zone } from './build';

const GROUND = 'M0 76 C18 70 36 72 50 74 S82 76 100 70 V100 H0 Z';

/** Sapin à deux étages, de sommet (cx, top), large de 30 à la base (top + 28). */
function fir(cx: number, top: number): string {
  const p = (dx: number, dy: number) => `${cx + dx} ${top + dy}`;
  return `M${p(0, 0)} L${p(8.5, 12)} L${p(5, 12)} L${p(15, 28)} L${p(-15, 28)} L${p(-5, 12)} L${p(-8.5, 12)} Z`;
}

/** Festons de neige sous les étages d'un sapin (cf. tree.ts). */
function firGarland(cx: number, top: number): string {
  const y1 = top + 10.2;
  const y2 = top + 24;
  return `M${cx - 4.5} ${y1} q2.25 2 4.5 0 q2.25 2 4.5 0 M${cx - 10} ${y2} q2.5 2.2 5 0 q2.5 2.2 5 0 q2.5 2.2 5 0 q2.5 2.2 5 0`;
}

/** Flocons : petits ronds blancs dans le ciel. */
function flakes(points: [number, number][]) {
  return points.map(([x, y]) => circle(x, y, 1.1));
}

export const snowman: Drawing = {
  id: 'snowman',
  background: [
    zone('sky', [rect(0, 0, 100, 100)], { x: 7, y: 28 }, 1, ['blue']),
    ...flakes([[33, 5], [67, 4], [94, 34], [4, 48], [96, 60], [30, 30]]).map((flake) => blank([flake], 1, { thin: true })),
    ...flakes([[66, 30], [28, 62], [74, 58], [4, 63], [94, 47], [36, 8]]).map((flake) =>
      blank([flake], 3, { thin: true, life: 'twinkle' }),
    ),
    zone('sun', [circle(85, 15, 9.5)], { x: 85, y: 15 }, 1, ['yellow', 'orange'], { life: 'pulse' }),
    ink(rays(85, 15, 11.8, 14.4, 10), 1, { life: 'pulse' }),
    // Neige au sol (blanche), que la colline colore au niveau 3.
    blank([path(GROUND)], 1),
    zone('hill', [path(GROUND)], { x: 10, y: 92 }, 3, ['blue', 'purple'], { differentFrom: ['sky'] }),
    // Sapin de droite : tronc, puis feuillage.
    zone('tree-trunk', [rect(77, 76, 14, 16, 1)], { x: 84, y: 86 }, 2, ['orange', 'red']),
    zone('tree', [path(fir(84, 52))], { x: 84, y: 73 }, 1, ['green']),
    ink(firGarland(84, 52), 1, { thin: true }),
    // Sapin de gauche, avec un petit tronc à l'encre.
    ink('M12.5 80 V86.5 H19.5 V80', 3, { thin: true }),
    zone('tree2', [path(fir(16, 52))], { x: 16, y: 73 }, 3, ['green']),
    ink(firGarland(16, 52), 3, { thin: true }),
  ],
  subjects: [
    {
      figure: 'snowman',
      endAnimation: 'hop',
      layers: [
        // Boule du bas un peu tassée par son poids : une pièce rond.
        { ...blank([ellipse(50, 85, 19, 15)], 1, { piece: true }), pieceAs: 'circle' },
        blank([circle(50, 62, 13.5)], 1, { piece: true }),
        blank([circle(50, 37, 13)], 1, { piece: true }),
        // Bras en branches (les doigts disparaissent sous les gants).
        ink('M38 57 L19 47.5 M27 51.5 L25 46.5 M19 47.5 L15.5 46 M19 47.5 L17.5 44', 1),
        ink('M62 57 L81 47.5 M73 51.5 L75 46.5 M81 47.5 L84.5 46 M81 47.5 L82.5 44', 1),
        // Boutons en charbon, yeux et sourire.
        ink(`${dot(49.5, 60, 1.4)} ${dot(49.5, 66.5, 1.4)} ${dot(49.5, 73, 1.4)}`, 1, { filled: true }),
        ink(`${dot(42.5, 30.5, 1.5)} ${dot(56.5, 29.5, 1.5)}`, 1, { filled: true }),
        ink(`${dot(39.4, 40.2, 0.8)} ${dot(40.4, 42.8, 0.8)} ${dot(42.4, 44.8, 0.8)}`, 1, { filled: true }),
        zone('hat', [rect(39, 4, 22, 20, 2.5), rect(32, 22, 36, 4.5, 2.2)], { x: 53.5, y: 11.5 }, 1, ['blue', 'purple', 'red']),
        // Ruban du chapeau, noué en cocarde sur le côté.
        zone(
          'band',
          [rect(39, 18, 22, 4.5), ...ring(41.5, 20, 4.3, 3.5), circle(41.5, 20, 3)],
          { x: 41.5, y: 20 },
          2,
          ['red', 'orange'],
          { differentFrom: ['hat'] },
        ),
        ink(dot(41.5, 20, 2.3), 2, { thin: true }),
        // Nez en carotte, avec ses stries.
        zone('nose', [path('M48 32 C42 32.5 42 44.5 48 45 C56 45 66 43 77 40 C66 36.5 56 32 48 32 Z')], { x: 49.5, y: 38.5 }, 1, [
          'orange',
        ]),
        ink('M60 35.6 l-1 2.2 M66 37.6 l-1 2 M71 38.8 l-0.8 1.6', 1, { thin: true }),
        // Écharpe : le tour du cou et un pan qui pend.
        zone(
          'scarf',
          [rect(36.5, 46, 27, 8.5, 4), path('M54 51 L68 51 L70 71 L56.5 71.5 Z')],
          { x: 62.2, y: 61 },
          1,
          ['red', 'green', 'purple'],
        ),
        ink('M56.2 68 H69.7 M57.5 71.5 v3 M60.5 71.4 v3 M63.5 71.3 v3 M66.5 71.2 v3 M44 46 v8.5', 1, { thin: true }),
        zone('mitten-l', [rect(11.5, 34, 13, 15, 6), ellipse(25.2, 41.5, 2.8, 4)], { x: 18, y: 40.5 }, 2, ['red', 'orange'], {
          pair: 'mittens',
        }),
        zone('mitten-r', [rect(75.5, 34, 13, 15, 6), ellipse(74.8, 41.5, 2.8, 4)], { x: 82, y: 40.5 }, 2, ['red', 'orange'], {
          pair: 'mittens',
        }),
        // Revers des gants.
        ink('M11.7 46 H24.3 M75.7 46 H88.3', 2, { thin: true }),
      ],
    },
  ],
  foreground: [
    // Rouge-gorge qui volette : corps, tête et queue.
    zone(
      'bird',
      [circle(21, 16, 7.5), circle(28.5, 10.5, 4.5), poly([14.5, 14], [6, 9], [7.5, 18.5])],
      { x: 21, y: 16.5 },
      3,
      ['red', 'blue'],
      { life: 'bob' },
    ),
    ink('M32.6 9.2 L36.4 10.8 L32.6 12.2 Z', 3, { filled: true, life: 'bob' }),
    ink(dot(29.5, 9.6, 1), 3, { filled: true, life: 'bob' }),
    ink('M16 15 q4 5.5 9.5 1.5', 3, { thin: true, life: 'bob' }),
  ],
};
