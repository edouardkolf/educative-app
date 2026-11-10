// Fusée qui décolle dans la nuit étoilée (docs/specs/COLORIAGE.md §4.3).
import type { Drawing, Primitive } from '../model';
import { blank, circle, dot, ink, path, poly, rect, star, zone } from './build';

const PLANET = { cx: 78.5, cy: 36.5, r: 14.3 };
/**
 * Anneau incliné : ellipse extérieure, et ellipse intérieure remontée, pour que le bord avant (qui
 * passe devant la planète) soit large et le bord arrière (caché par la planète) fin.
 */
const RING = { A: 21.5, B: 10.5, a: 15, b: 2.5, lift: 5.5, tilt: (-14 * Math.PI) / 180 };

type Pt = [number, number];
const r2 = (v: number) => Math.round(v * 100) / 100;

/** Point (x, y) du repère de l'anneau (centre de la planète, axe de l'anneau horizontal) vers la feuille. */
function toSheet(x: number, y: number): Pt {
  const c = Math.cos(RING.tilt);
  const s = Math.sin(RING.tilt);
  return [PLANET.cx + x * c - y * s, PLANET.cy + x * s + y * c];
}
const outer = (t: number): Pt => toSheet(RING.A * Math.cos(t), RING.B * Math.sin(t));
const inner = (t: number): Pt => toSheet(RING.a * Math.cos(t), -RING.lift + RING.b * Math.sin(t));
const onPlanet = (t: number): Pt => [PLANET.cx + PLANET.r * Math.cos(t), PLANET.cy + PLANET.r * Math.sin(t)];
const insidePlanet = ([x, y]: Pt) => Math.hypot(x - PLANET.cx, y - PLANET.cy) < PLANET.r;
const angleOf = ([x, y]: Pt) => Math.atan2(y - PLANET.cy, x - PLANET.cx);

/** Angle de `curve` où elle passe le bord de la planète, entre `out` (dehors) et `inside` (dedans). */
function crossing(curve: (t: number) => Pt, out: number, inside: number): number {
  let lo = out;
  let hi = inside;
  for (let i = 0; i < 40; i += 1) {
    const mid = (lo + hi) / 2;
    if (insidePlanet(curve(mid))) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}

function arc(curve: (t: number) => Pt, from: number, to: number, steps: number): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i <= steps; i += 1) pts.push(curve(from + ((to - from) * i) / steps));
  return pts;
}

/**
 * La part visible de l'anneau, peinte après la planète : tout l'anneau, sauf sa moitié arrière là où
 * la planète la cache. Le bord avant passe donc devant la planète, le bord arrière derrière.
 */
function ringShape(): Primitive {
  const top = -Math.PI / 2;
  const oL = crossing(outer, -Math.PI, top);
  const oR = crossing(outer, 0, top);
  const iL = crossing(inner, -Math.PI, top);
  const iR = crossing(inner, 0, top);
  const pts: Pt[] = [
    ...arc(outer, -Math.PI, oL, 10),
    // Le long de la planète, de l'arc extérieur à l'arc intérieur.
    ...arc(onPlanet, angleOf(outer(oL)), angleOf(inner(iL)), 4).slice(1, -1),
    // Arc intérieur : du point d'entrée par la pointe gauche, tout le bas, puis jusqu'à la sortie à droite.
    ...arc(inner, iL, -Math.PI, 6),
    ...arc(inner, Math.PI, 0, 28).slice(1),
    ...arc(inner, 0, iR, 6).slice(1),
    ...arc(onPlanet, angleOf(inner(iR)), angleOf(outer(oR)), 4).slice(1, -1),
    ...arc(outer, oR, 0, 10),
    ...arc(outer, 0, Math.PI, 32).slice(1, -1),
  ];
  return poly(...pts.map(([x, y]): Pt => [r2(x), r2(y)]));
}

/** Deux bandes courbes sur le bas de la planète (dans le repère de l'anneau). */
function planetBands(): string {
  const bands: Pt[] = [
    [13.4, 2.5],
    [11.6, 7.2],
  ];
  return bands
    .map(([half, y]) => {
      const [x0, y0] = toSheet(-half, y);
      const [qx, qy] = toSheet(0, y + 2.4);
      const [x1, y1] = toSheet(half, y);
      return `M${r2(x0)} ${r2(y0)} Q${r2(qx)} ${r2(qy)} ${r2(x1)} ${r2(y1)}`;
    })
    .join(' ');
}

const round = ([x, y]: Pt) => ({ x: r2(x), y: r2(y) });
/** Ancres : la planète au-dessus de l'anneau, l'anneau au milieu de son bord avant. */
const PLANET_ANCHOR = round(toSheet(0, -8.7));
const RING_ANCHOR = round(toSheet(0, (RING.B - RING.lift + RING.b) / 2));

/** Un peu de poussière d'étoiles, toujours blanche. */
function specks(points: Pt[], detail: 1 | 2 | 3) {
  return points.map(([x, y]) => blank([circle(x, y, 0.9)], detail, { thin: true, life: 'twinkle' }));
}

// Ailerons arrondis, inscrits dans les triangles du constructeur.
const FIN_L = 'M34 55 C25.5 61 20.5 71 19.5 90 L34 82.5 Z';
const FIN_R = 'M54 55 C62.5 61 67.5 71 68.5 90 L54 82.5 Z';

export const rocket: Drawing = {
  id: 'rocket',
  background: [
    zone('night-sky', [rect(0, 0, 100, 100)], { x: 88, y: 89 }, 1, ['purple', 'blue']),
    ...specks([[30, 6], [93, 6], [4, 30], [60, 60], [25, 57], [74, 92], [6, 92]], 1),
    zone('moon', [circle(15, 15, 9.5)], { x: 15, y: 15 }, 1, ['yellow'], { life: 'pulse' }),
    // Cratères.
    ink(`${dot(8.6, 13, 1.2)} ${dot(21.3, 17.5, 1)} ${dot(14, 22.2, 0.9)}`, 1, { thin: true }),
    zone('star-a', [star(14, 42, 10.5, 6)], { x: 14, y: 42 }, 2, ['yellow'], { pair: 'stars-1', life: 'twinkle' }),
    zone('star-b', [star(86, 70, 10.5, 6)], { x: 86, y: 70 }, 2, ['yellow'], { pair: 'stars-1', life: 'twinkle' }),
    zone('planet', [circle(PLANET.cx, PLANET.cy, PLANET.r)], PLANET_ANCHOR, 2, ['orange', 'red', 'purple']),
    // Bandes de la planète, que le bord avant de l'anneau recouvre au niveau 3.
    ink(planetBands(), 2, { thin: true }),
    zone('ring', [ringShape()], RING_ANCHOR, 3, ['orange', 'yellow'], { differentFrom: ['planet'] }),
    zone('star-c', [star(66, 12, 10.5, 6)], { x: 66, y: 12 }, 3, ['yellow'], { pair: 'stars-2', life: 'twinkle' }),
    zone('star-d', [star(11, 69, 10.5, 6)], { x: 11, y: 69 }, 3, ['yellow'], { pair: 'stars-2', life: 'twinkle' }),
  ],
  subjects: [
    {
      figure: 'rocket',
      endAnimation: 'slide-up',
      layers: [
        // Flammes du décollage, sous la fusée.
        blank([path('M36 74 C34 83 39 89 44 98 C49 89 54 83 52 74 Z')], 1, { endOnly: true }),
        ink('M40 78 C39.5 84 42 87.5 44 92 C46 87.5 48.5 84 48 78', 1, { endOnly: true, thin: true }),
        zone('body', [rect(34, 33, 20, 44, 3)], { x: 44, y: 62 }, 1, ['blue', 'red', 'purple'], { piece: true }),
        // Bande et rivets.
        ink('M34 69 H54 M34 73 H54', 1, { thin: true }),
        ink(`${dot(38, 71, 0.7)} ${dot(44, 71, 0.7)} ${dot(50, 71, 0.7)}`, 1, { filled: true }),
        zone('nose', [poly([44, 8], [57.5, 37], [30.5, 37])], { x: 44, y: 28 }, 1, ['red', 'orange', 'yellow'], {
          piece: true,
        }),
        zone('fin-l', [path(FIN_L)], { x: 28, y: 76 }, 1, ['yellow', 'orange'], {
          piece: true,
          pieceAs: 'triangle',
          pair: 'fins',
        }),
        zone('fin-r', [path(FIN_R)], { x: 60, y: 76 }, 1, ['yellow', 'orange'], {
          piece: true,
          pieceAs: 'triangle',
          pair: 'fins',
        }),
        zone('porthole', [circle(44, 46, 7)], { x: 44, y: 46 }, 2, ['blue', 'yellow', 'green']),
        // Hublot cerclé, avec ses rivets.
        ink(dot(44, 46, 8.6), 2, { thin: true }),
        ink(`${dot(44, 36.4, 0.6)} ${dot(53.6, 46, 0.6)} ${dot(44, 55.6, 0.6)} ${dot(34.4, 46, 0.6)}`, 2, { filled: true }),
      ],
    },
  ],
  foreground: [],
};
