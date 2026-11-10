// Robot dans son atelier (docs/specs/COLORIAGE.md §4.3).
import type { Drawing } from '../model';
import { blank, circle, dot, ink, path, rect, zone } from './build';

/** Pied arrondi devant, posé sur le bas de la feuille. */
function foot(x: number): string {
  return `M${x} 100 V94 C${x} 90 ${x + 2.5} 88.2 ${x + 6} 88.2 H${x + 12} C${x + 15.5} 88.2 ${x + 18} 90 ${x + 18} 94 V100 Z`;
}

/** Pince au bout d'un bras (centrée en x, sous le bras qui finit en y). */
function claw(x: number, y: number): string {
  return `M${x - 3.6} ${y - 0.5} C${x - 4.6} ${y + 5.5} ${x + 4.6} ${y + 5.5} ${x + 3.6} ${y - 0.5}`;
}

export const robot: Drawing = {
  id: 'robot',
  background: [
    zone('wall', [rect(0, 0, 100, 100)], { x: 12, y: 30 }, 1, ['blue', 'purple']),
    zone('floor', [rect(0, 72, 100, 28)], { x: 90, y: 78.5 }, 1, ['orange', 'yellow'], { differentFrom: ['wall'] }),
    // Plinthe, puis lames du parquet.
    ink('M0 68.5 H100', 1, { thin: true }),
    ink('M0 79 H9 M3 75.5 H14 M97 81 H100', 1, { thin: true }),
    // Tableau : la ficelle, puis le cadre autour de la toile.
    ink('M77 9.5 L83.5 4 L90 9.5', 3, { thin: true }),
    ink('M72.5 9 H94.5 Q96 9 96 10.5 V29.5 Q96 31 94.5 31 H72.5 Q71 31 71 29.5 V10.5 Q71 9 72.5 9 Z', 3),
    zone('picture', [rect(73.5, 11.5, 20, 17, 1)], { x: 83.5, y: 20 }, 3, ['red', 'yellow', 'blue']),
    zone('rug', [rect(4, 85, 92, 14, 7)], { x: 14, y: 92 }, 3, ['red', 'purple', 'blue'], { differentFrom: ['floor'] }),
    // Franges et liseré du tapis.
    ink('M5 88 H2 M4 92 H1.5 M5 96 H2 M95 88 H98 M96 92 H98.5 M95 96 H98 M22 86.5 V97.5 M78 86.5 V97.5', 3, {
      thin: true,
    }),
  ],
  subjects: [
    {
      figure: 'robot',
      endAnimation: 'hop',
      layers: [
        zone('body', [rect(31, 42.5, 38, 33.5, 3)], { x: 50, y: 69 }, 1, ['blue', 'purple', 'orange'], { piece: true }),
        // Jauge (cadran et aiguille), puis trois boutons.
        ink('M57.5 54 A4.5 4.5 0 0 1 66.5 54 Z M62 54 L64.6 50.6', 1, { thin: true }),
        ink(`${dot(58, 59, 1.1)} ${dot(62, 59, 1.1)} ${dot(66, 59, 1.1)}`, 1, { filled: true }),
        // Cou et oreilles.
        ink('M45.5 39 H54.5 V43 H45.5 Z', 1, { thin: true }),
        ink('M35 26 h3 v8 h-3 Z M62 26 h3 v8 h-3 Z', 1, { filled: true }),
        zone('head', [rect(38, 18.5, 24, 21.5, 3.5)], { x: 50, y: 29.5 }, 1, ['purple', 'blue', 'orange'], { piece: true }),
        // Yeux, puis sourire.
        ink(`${dot(42.6, 24.4, 1.7)} ${dot(57.4, 24.4, 1.7)}`, 1, { filled: true }),
        ink('M44.5 36.6 Q50 39.6 55.5 36.6', 1),
        zone('arm-l', [rect(18, 44, 13, 28, 4.5)], { x: 24.5, y: 62.5 }, 1, ['orange', 'red'], { piece: true, pair: 'arms' }),
        zone('arm-r', [rect(69, 44, 13, 28, 4.5)], { x: 75.5, y: 62.5 }, 1, ['orange', 'red'], { piece: true, pair: 'arms' }),
        // Épaules (boulons), coudes, pinces.
        ink(`${dot(24.5, 47.8, 1.3)} ${dot(75.5, 47.8, 1.3)}`, 1, { thin: true }),
        ink('M18 52.5 H31 M18 54.5 H31 M69 52.5 H82 M69 54.5 H82', 1, { thin: true }),
        ink(`${claw(24.5, 72)} ${claw(75.5, 72)}`, 1),
        // Au niveau 1, les jambes ne sont pas encore des cases : des jambes blanches évitent un robot qui flotte.
        blank([rect(33.5, 75.5, 14, 13, 1.5)], 1),
        blank([rect(52.5, 75.5, 14, 13, 1.5)], 1),
        zone('leg-l', [rect(33.5, 75.5, 14, 13, 1.5)], { x: 40.5, y: 82 }, 2, ['blue', 'purple'], { pair: 'legs' }),
        zone('leg-r', [rect(52.5, 75.5, 14, 13, 1.5)], { x: 59.5, y: 82 }, 2, ['blue', 'purple'], { pair: 'legs' }),
        zone('screen', [rect(35.5, 46.5, 19, 15, 2.5)], { x: 45, y: 54 }, 2, ['yellow', 'green'], { differentFrom: ['body'] }),
        // Reflet de l'écran.
        ink('M37.6 52 V49.6 Q37.6 48.6 38.6 48.6 H41', 2, { thin: true }),
        // Tige de l'antenne, puis sa boule.
        ink('M50 18.5 V14', 2, { life: 'sway' }),
        zone('antenna', [circle(50, 8, 6.9)], { x: 50, y: 8 }, 2, ['red', 'yellow'], { life: 'sway' }),
        zone('foot-l', [path(foot(31.5))], { x: 40.5, y: 94.3 }, 3, ['orange', 'red'], { pair: 'feet' }),
        zone('foot-r', [path(foot(50.5))], { x: 59.5, y: 94.3 }, 3, ['orange', 'red'], { pair: 'feet' }),
      ],
    },
  ],
  foreground: [],
};
