// Plan de la mer (calculs purs, faits une fois par carte) : îles de sable autour de groupes de niveaux,
// ponton entre elles, lieux (phare, coffre, baleine, voilier…), vie sous l'eau, vaguelettes et mouettes.
import {
  LEVELS_PER_WORLD,
  NODE_SIZE,
  PATH_WIDTH,
  findSpot,
  hash01,
  overlaps,
  placeDecor,
  type Decor,
  type DecorKind,
  type Footprint,
  type Point,
} from '../../layout';
import type { SceneContext } from '../types';
import {
  chaikin,
  contours,
  insidePolygon,
  loopD,
  nearest,
  polygonArea,
  resampleLoop,
  roundLoop,
  sampleGrid,
  smoothDisks,
  type Box,
} from './geometry';

/** Niveaux posés sur une île (rang dans le monde : 0 = premier niveau de la mer). Les autres sont sur le ponton. */
export const ISLAND_GROUPS: readonly (readonly number[])[] = [
  [1, 2],
  [4, 5, 6],
  [8, 9],
  [11, 12, 13],
  [16, 17],
];
/** Île du coffre, puis du phare (rang dans ISLAND_GROUPS), par ordre de préférence. */
const CHEST_ISLANDS = [1, 0, 2];
const LIGHTHOUSE_ISLANDS = [3, 2, 4, 0, 1];

/** Plateau rond du ponton sous un niveau posé sur l'eau. */
export const DECK_R = 50;
/** Sable autour d'un niveau d'île, depuis son centre. */
const SAND_NODE = NODE_SIZE / 2 + 20;
/** Une île reste à cette distance (axe) du chemin qui n'est pas le sien, et du centre des autres niveaux. */
const ISLAND_PATH_CLEAR = PATH_WIDTH / 2 + 16;
const ISLAND_NODE_CLEAR = DECK_R + 14;
/** Le chemin d'une île continue en ponton : on ne rogne pas l'île pour ses abords (longueur de chemin). */
const ISLAND_APPROACH = 150;

export type PlaceKind = 'lighthouse' | 'chest' | 'whale' | 'sailboat' | 'reef' | 'turtle' | 'school' | 'jumper' | 'buoy';

/** Emprises des lieux, relatives à leur point d'appui (dessins de draw.tsx, sans miroir). */
export const SHAPES: Record<PlaceKind, readonly Footprint[]> = {
  lighthouse: [
    { x: 0, y: -8, r: 30 },
    { x: 0, y: -52, r: 17 },
    { x: 0, y: -94, r: 19 },
  ],
  chest: [{ x: 0, y: -18, r: 30 }],
  whale: [
    { x: -46, y: 4, r: 30 },
    { x: 12, y: 2, r: 40 },
    { x: 16, y: -48, r: 22 },
  ],
  sailboat: [
    { x: 0, y: -6, r: 28 },
    { x: 2, y: -34, r: 18 },
  ],
  reef: [{ x: 0, y: 0, r: 38 }],
  turtle: [{ x: 0, y: 0, r: 24 }],
  school: [{ x: 0, y: 0, r: 34 }],
  jumper: [{ x: 0, y: -8, r: 30 }],
  buoy: [{ x: 0, y: -8, r: 14 }],
};

/** Lieux sous l'eau (dessinés avec le sol, sous le ponton) ; les autres sont au-dessus. */
export const UNDERWATER: readonly PlaceKind[] = ['reef', 'turtle', 'school'];

export interface Island {
  levels: number[];
  /** Bord du sable, et bord du sable sec (plus clair) un peu en retrait. */
  outline: Point[];
  inner: Point[] | null;
  box: Box;
}

export interface Landing {
  x: number;
  y: number;
  /** Direction du chemin, en degrés. */
  angle: number;
}

export interface Place {
  kind: PlaceKind;
  x: number;
  y: number;
  flip: boolean;
}

export type PropKind = 'palm' | 'parasol' | 'castle' | 'crab' | 'starfish' | 'shell';

export interface Prop {
  kind: PropKind;
  x: number;
  y: number;
  flip: boolean;
  scale: number;
}

export interface Beam {
  x: number;
  y: number;
  dir: number;
  len: number;
}

export interface SeaPrep {
  islands: Island[];
  /** Contours des îles (attribut d), dans l'ordre de `islands`. */
  islandD: string[];
  innerD: string[];
  decks: Point[];
  landings: Landing[];
  posts: Point[];
  places: Place[];
  footprints: Footprint[];
  props: Prop[];
  beam: Beam | null;
  waves: Decor[];
  gulls: Decor[];
  /** Fonds plus sombres (attribut d). */
  deeps: string[];
}

interface Group {
  levels: number[];
  anchors: Point[];
  s0: number;
  s1: number;
  disks: Footprint[];
}

const PROP_R: Record<PropKind, { r: number; edge: number; canopy?: Footprint }> = {
  palm: { r: 10, edge: 8, canopy: { x: 6, y: -44, r: 22 } },
  parasol: { r: 22, edge: 16, canopy: { x: 0, y: -30, r: 22 } },
  castle: { r: 17, edge: 14 },
  crab: { r: 13, edge: 10 },
  starfish: { r: 9, edge: 8 },
  shell: { r: 7, edge: 7 },
};

const WISHES: readonly (readonly PropKind[])[] = [
  ['parasol', 'palm', 'castle', 'palm', 'crab', 'shell'],
  ['palm', 'palm', 'shell', 'starfish'],
  ['palm', 'starfish', 'palm', 'crab'],
  ['palm', 'shell', 'palm'],
  ['palm', 'palm', 'crab', 'starfish'],
];

const WATER_KINDS: readonly DecorKind[] = [
  { kind: 'wave', radius: 16, weight: 3 },
  { kind: 'gull', radius: 12, weight: 0.35 },
  { kind: '', radius: 16, weight: 4 },
];
const NOTHING: readonly DecorKind[] = [{ kind: '', radius: 16, weight: 1 }];

function shapeAt(kind: PlaceKind, at: Point, flip: boolean): Footprint[] {
  return SHAPES[kind].map((f) => ({ x: at.x + (flip ? -f.x : f.x), y: at.y + f.y, r: f.r }));
}

function mirrored(kind: PlaceKind, flip: boolean): Footprint[] {
  return SHAPES[kind].map((f) => ({ x: flip ? -f.x : f.x, y: f.y, r: f.r }));
}

export function planSea(ctx: SceneContext): SeaPrep {
  const { band, width, samples, nodes } = ctx;
  const seed = band.worldIndex * 977 + 31;
  const first = band.worldIndex * LEVELS_PER_WORLD;
  const yAt = (t: number) => band.bottom - t * (band.bottom - band.top);
  const here = new Set(ctx.levels);

  // Abscisse curviligne des échantillons, et échantillon de chaque niveau.
  const arc: number[] = [0];
  for (let s = 1; s < samples.length; s += 1) {
    arc.push(arc[s - 1]! + Math.hypot(samples[s]!.x - samples[s - 1]!.x, samples[s]!.y - samples[s - 1]!.y));
  }
  const sampleOf = (p: Point) => {
    let best = 0;
    let bd = Infinity;
    samples.forEach((q, s) => {
      const d = (q.x - p.x) ** 2 + (q.y - p.y) ** 2;
      if (d < bd) {
        bd = d;
        best = s;
      }
    });
    return best;
  };
  const normalAt = (s: number) => {
    const a = samples[Math.max(0, s - 1)]!;
    const b = samples[Math.min(samples.length - 1, s + 1)]!;
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    return { nx: -(b.y - a.y) / len, ny: (b.x - a.x) / len, tx: (b.x - a.x) / len, ty: (b.y - a.y) / len };
  };

  // 1. Les groupes de niveaux qui seront des îles (et le bout du chemin, si le parcours finit ici).
  const groups: Group[] = [];
  for (const g of ISLAND_GROUPS) {
    const levels = g.map((k) => first + k).filter((i) => here.has(i));
    if (levels.length === 0) continue;
    const anchors = levels.map((i) => nodes[i]!);
    groups.push({ levels, anchors, s0: sampleOf(anchors[0]!), s1: sampleOf(anchors[anchors.length - 1]!), disks: [] });
  }
  if (ctx.end) {
    const last = Math.max(...ctx.levels);
    const tail = groups[groups.length - 1];
    const endSample = samples.length - 1;
    if (tail && tail.levels.includes(last)) {
      tail.anchors.push(ctx.end);
      tail.s1 = endSample;
    } else {
      groups.push({ levels: [], anchors: [ctx.end], s0: endSample, s1: endSample, disks: [] });
    }
  }

  // 2. Forme de base de chaque île : un ruban le long de son chemin, un rond par niveau, une ou deux avancées.
  groups.forEach((g, gi) => {
    const h = (k: number) => hash01(seed + gi * 131 + k);
    const rNode = SAND_NODE + h(1) * 8;
    const rPath = 26 + h(2) * 8;
    const phase = h(3) * Math.PI * 2;
    for (let s = g.s0; s <= g.s1; s += 1) {
      const p = samples[s]!;
      g.disks.push({ x: p.x, y: p.y, r: rPath * (1 + 0.22 * Math.sin(arc[s]! / 46 + phase)) });
    }
    for (const a of g.anchors) g.disks.push({ x: a.x, y: a.y, r: a === ctx.end ? rNode + 22 : rNode });
    // Au bout du chemin, l'îlot du trésor s'élargit un peu vers le haut (place du coffre).
    if (ctx.end && g.anchors.includes(ctx.end)) g.disks.push({ x: ctx.end.x, y: ctx.end.y - 26, r: rNode + 8 });
    const lobes = g.s1 > g.s0 ? 1 + (h(4) < 0.6 ? 1 : 0) : 0;
    for (let l = 0; l < lobes; l += 1) {
      const s = g.s0 + Math.floor(h(10 + l) * (g.s1 - g.s0 + 1));
      const p = samples[s]!;
      const { nx, ny } = normalAt(s);
      const off = 30 + h(20 + l) * 22;
      let side = h(30 + l) < 0.5 ? -1 : 1;
      if (p.x + nx * off * side < 30 || p.x + nx * off * side > width - 30) side = -side;
      g.disks.push({ x: p.x + nx * off * side, y: p.y + ny * off * side, r: 34 + h(40 + l) * 14 });
    }
  });

  const sign = { x: ctx.sign.x, y: ctx.sign.y - 20, r: 36 };
  const places: Place[] = [];
  const placeFoot: Footprint[] = [sign];
  if (ctx.end) placeFoot.push({ x: ctx.end.x, y: ctx.end.y - 20, r: 56 });
  const islandTaken = (g: Group) =>
    g.disks.filter((_, k) => k % 3 === 0 || k >= g.s1 - g.s0 + 1).map((d) => ({ x: d.x, y: d.y, r: d.r + 26 }));

  // 3. Le coffre et le phare, chacun sur une île : on cherche leur place, puis l'île s'avance jusqu'à eux.
  const onIsland = (kind: PlaceKind, order: readonly number[]) => {
    for (const gi of order) {
      const g = groups[gi];
      if (!g || g.levels.length === 0) continue;
      const ys = g.anchors.map((a) => a.y);
      const mid = g.anchors[Math.floor(g.anchors.length / 2)]!;
      const side = mid.x < width / 2 ? 1 : -1;
      const reach = SHAPES[kind][0]!.r;
      const spot = findSpot({
        shape: mirrored(kind, false),
        prefer: { x: mid.x + side * 120, y: mid.y },
        within: {
          x0: Math.max(reach + 4, mid.x - 180),
          x1: Math.min(width - reach - 4, mid.x + 180),
          y0: Math.min(...ys) - 30,
          y1: Math.max(...ys) + 50,
        },
        samples,
        nodes: [...nodes, ctx.sign],
        taken: placeFoot,
        pathMargin: 30,
        nodeMargin: 30,
      });
      if (!spot) continue;
      // Avancée de sable jusqu'au lieu, depuis le point le plus proche du chemin de l'île.
      let s = g.s0;
      for (let k = g.s0; k <= g.s1; k += 1) {
        if (Math.hypot(samples[k]!.x - spot.x, samples[k]!.y - spot.y) < Math.hypot(samples[s]!.x - spot.x, samples[s]!.y - spot.y)) s = k;
      }
      const from = samples[s]!;
      const base = { x: spot.x, y: spot.y - 8 };
      const dist = Math.hypot(base.x - from.x, base.y - from.y);
      const n = Math.max(1, Math.ceil(dist / 14));
      for (let k = 0; k <= n; k += 1) {
        const f = k / n;
        g.disks.push({ x: from.x + (base.x - from.x) * f, y: from.y + (base.y - from.y) * f, r: 40 + (reach + 22 - 40) * f });
      }
      places.push({ kind, x: spot.x, y: spot.y, flip: false });
      placeFoot.push(...shapeAt(kind, spot, false));
      return;
    }
  };
  if (!ctx.end) onIsland('chest', CHEST_ISLANDS);
  onIsland('lighthouse', LIGHTHOUSE_ISLANDS);

  // 4. Contours des îles : union lisse des disques, rognée loin du chemin des autres et des autres niveaux.
  const islands: Island[] = [];
  const fields: Array<(x: number, y: number) => number> = [];
  for (const g of groups) {
    const box: Box = {
      x0: Math.min(...g.disks.map((d) => d.x - d.r)) - 12,
      y0: Math.min(...g.disks.map((d) => d.y - d.r)) - 12,
      x1: Math.max(...g.disks.map((d) => d.x + d.r)) + 12,
      y1: Math.max(...g.disks.map((d) => d.y + d.r)) + 12,
    };
    const near = (p: Point, m: number) => p.x > box.x0 - m && p.x < box.x1 + m && p.y > box.y0 - m && p.y < box.y1 + m;
    const a0 = arc[g.s0]! - ISLAND_APPROACH;
    const a1 = arc[g.s1]! + ISLAND_APPROACH;
    const extPath = samples.filter((p, s) => (arc[s]! < a0 || arc[s]! > a1) && near(p, 80));
    const own = new Set(g.levels);
    const extNodes = [...nodes.filter((p, i) => !own.has(i) && near(p, 120)), ctx.sign];
    const union = smoothDisks(g.disks, 7);
    const field = (x: number, y: number) =>
      Math.min(
        union(x, y),
        nearest(extPath, x, y) - ISLAND_PATH_CLEAR,
        nearest(extNodes, x, y) - ISLAND_NODE_CLEAR,
        y - band.top - 70,
        band.bottom - y - 70,
      );
    const grid = sampleGrid(field, box, 5);
    const biggest = (level: number) => {
      const loops = contours(grid, level);
      if (loops.length === 0) return null;
      const loop = loops.reduce((a, b) => (Math.abs(polygonArea(b)) > Math.abs(polygonArea(a)) ? b : a));
      return roundLoop(chaikin(resampleLoop(loop, 7), 1));
    };
    const outline = biggest(0);
    if (!outline) continue;
    islands.push({ levels: g.levels, outline, inner: biggest(15), box });
    fields.push(field);
  }
  const insideAny = (x: number, y: number) =>
    islands.some((il) => x > il.box.x0 && x < il.box.x1 && y > il.box.y0 && y < il.box.y1 && insidePolygon(il.outline, x, y));
  const nearIsland = (x: number, y: number, m: number) =>
    islands.some(
      (il) =>
        x > il.box.x0 - m &&
        x < il.box.x1 + m &&
        y > il.box.y0 - m &&
        y < il.box.y1 + m &&
        (insidePolygon(il.outline, x, y) || nearest(il.outline, x, y) < m),
    );

  // 5. Le ponton : plateaux sous les niveaux posés sur l'eau, abouts au bord du sable, pieux.
  const onIslandLevel = new Set(islands.flatMap((il) => il.levels));
  const decks = ctx.levels.filter((i) => !onIslandLevel.has(i)).map((i) => nodes[i]!);
  const inBand = (p: Point, m: number) => p.y > band.top - m && p.y < band.bottom + m;
  const landings: Landing[] = [];
  for (let s = 0; s + 1 < samples.length; s += 1) {
    const a = samples[s]!;
    const b = samples[s + 1]!;
    if (!inBand(a, 0) && !inBand(b, 0)) continue;
    const ia = insideAny(a.x, a.y);
    if (ia === insideAny(b.x, b.y)) continue;
    let lo = 0;
    let hi = 1;
    for (let k = 0; k < 12; k += 1) {
      const m = (lo + hi) / 2;
      if (insideAny(a.x + (b.x - a.x) * m, a.y + (b.y - a.y) * m) === ia) lo = m;
      else hi = m;
    }
    const m = (lo + hi) / 2;
    landings.push({
      x: Math.round((a.x + (b.x - a.x) * m) * 10) / 10,
      y: Math.round((a.y + (b.y - a.y) * m) * 10) / 10,
      angle: Math.round((Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI),
    });
  }
  const posts: Point[] = [];
  let next = 0;
  for (let s = 0; s < samples.length; s += 1) {
    if (arc[s]! < next) continue;
    const p = samples[s]!;
    if (p.y < band.top + 40 || p.y > band.bottom - 60) continue;
    const { nx, ny, tx, ty } = normalAt(s);
    if (nodes.some((n) => Math.hypot(n.x - p.x, n.y - p.y) < DECK_R + 8)) continue;
    if ([-18, 0, 18].some((k) => insideAny(p.x + tx * k, p.y + ty * k))) continue;
    if (landings.some((l) => Math.hypot(l.x - p.x, l.y - p.y) < 22)) continue;
    const off = PATH_WIDTH / 2 + 1.5;
    posts.push({ x: Math.round((p.x + nx * off) * 10) / 10, y: Math.round((p.y + ny * off) * 10) / 10 });
    posts.push({ x: Math.round((p.x - nx * off) * 10) / 10, y: Math.round((p.y - ny * off) * 10) / 10 });
    next = arc[s]! + 58;
  }

  // 6. Petits dessins des îles : palmiers, parasol, château de sable, crabe…
  const props: Prop[] = [];
  const clearOfPath = (x: number, y: number, r: number) =>
    samples.every((p) => Math.abs(p.y - y) > r + PATH_WIDTH || Math.hypot(p.x - x, p.y - y) >= PATH_WIDTH / 2 + r) &&
    nodes.every((n) => Math.hypot(n.x - x, n.y - y) >= NODE_SIZE / 2 + r);
  islands.forEach((il, ii) => {
    const field = fields[ii]!;
    const wishes = il.levels.length === 0 ? (['palm', 'palm'] as const) : WISHES[ii % WISHES.length]!;
    const cands: Array<Point & { o: number }> = [];
    let k = 0;
    for (let y = il.box.y0; y <= il.box.y1; y += 9) {
      for (let x = il.box.x0; x <= il.box.x1; x += 9) {
        cands.push({ x, y, o: hash01(seed + ii * 7919 + (k += 1)) });
      }
    }
    cands.sort((a, b) => a.o - b.o);
    wishes.forEach((kind, wi) => {
      const spec = PROP_R[kind];
      const flip = hash01(seed + ii * 53 + wi) < 0.5;
      for (const c of cands) {
        if (c.x < 8 || c.x > width - 8) continue;
        if (field(c.x, c.y) < spec.edge) continue;
        if (!clearOfPath(c.x, c.y, spec.r + 4)) continue;
        if (Math.hypot(c.x - ctx.sign.x, c.y - ctx.sign.y) < 40 + spec.r) continue;
        const foot: Footprint[] = [{ x: c.x, y: c.y, r: spec.r }];
        if (spec.canopy) {
          const cx = c.x + (flip ? -spec.canopy.x : spec.canopy.x);
          const cy = c.y + spec.canopy.y;
          if (!clearOfPath(cx, cy, spec.canopy.r + 4)) continue;
          if (cx < -6 || cx > width + 6) continue;
          foot.push({ x: cx, y: cy, r: spec.canopy.r });
        }
        if (overlaps(foot, placeFoot, 4)) continue;
        if (props.some((p) => Math.hypot(p.x - c.x, p.y - c.y) < PROP_R[p.kind].r + spec.r + 10)) continue;
        props.push({ kind, x: Math.round(c.x), y: Math.round(c.y), flip, scale: kind === 'palm' ? 1 + hash01(seed + ii * 59 + wi) * 0.25 : 1 });
        placeFoot.push(...foot);
        break;
      }
    });
  });

  // 7. En mer : chaque lieu dans sa tranche d'altitude, du côté où il y a de la place, hors des îles.
  const taken: Footprint[] = [...placeFoot, ...groups.flatMap(islandTaken)];
  const pathXAt = (y: number) => samples.reduce((a, b) => (Math.abs(b.y - y) < Math.abs(a.y - y) ? b : a)).x;
  const atSea = (kind: PlaceKind, t: number, spread: number, opts: { near?: boolean; overflow?: number } = {}) => {
    const y = yAt(t);
    const px = pathXAt(y);
    const awayLeft = px > width / 2;
    const flip = kind === 'whale' ? !awayLeft : hash01(seed + Math.round(t * 1000)) < 0.5;
    const shape = mirrored(kind, flip);
    const up = Math.min(...shape.map((f) => f.y - f.r));
    const down = Math.max(...shape.map((f) => f.y + f.r));
    const reach = Math.max(...shape.map((f) => Math.abs(f.x) + f.r));
    const over = opts.overflow ?? 0;
    const prefer = opts.near ? { x: px + (awayLeft ? -70 : 70), y } : { x: awayLeft ? width * 0.2 : width * 0.8, y };
    const spot = findSpot({
      shape,
      prefer,
      within: {
        x0: reach * (1 - over) + 2,
        x1: width - reach * (1 - over) - 2,
        y0: Math.max(yAt(t + spread), band.top + 50 - up),
        y1: Math.min(yAt(t - spread), band.bottom - 44 - down),
      },
      samples,
      nodes: [...nodes, ctx.sign],
      taken,
      pathMargin: 10,
      nodeMargin: 14,
    });
    if (!spot) return;
    places.push({ kind, x: spot.x, y: spot.y, flip });
    taken.push(...shapeAt(kind, spot, flip));
  };
  atSea('whale', 0.8, 0.14, { overflow: 0.3 });
  atSea('sailboat', 0.27, 0.15);
  atSea('reef', 0.55, 0.14);
  atSea('turtle', 0.18, 0.12);
  atSea('jumper', 0.46, 0.12);
  atSea('buoy', 0.36, 0.1, { near: true });
  atSea('buoy', 0.7, 0.1, { near: true });
  for (const t of [0.1, 0.38, 0.62, 0.9]) atSea('school', t, 0.1);

  // Faisceau du phare : vers le bord de l'écran, aussi long que possible sans passer sur le chemin.
  let beam: Beam | null = null;
  const light = places.find((p) => p.kind === 'lighthouse');
  if (light) {
    const lx = light.x;
    const ly = light.y - 93;
    const dir = lx < width / 2 ? -1 : 1;
    for (let len = 150; len >= 60; len -= 15) {
      let ok = true;
      for (let d = 18; d <= len && ok; d += 12) {
        const spread = (26 * d) / len;
        const x = lx + dir * d;
        const y = ly - d * 0.12;
        ok = clearOfPath(x, y, spread + 4);
      }
      if (ok) {
        beam = { x: lx, y: ly, dir, len };
        break;
      }
    }
  }

  // 8. Vaguelettes et mouettes, sur l'eau seulement.
  const decor = placeDecor(
    band,
    width,
    [...ctx.bandSamples],
    [...nodes, ctx.sign],
    (x, y) => (nearIsland(x, y, 28) ? NOTHING : WATER_KINDS),
    places.map((p) => shapeAt(p.kind, p, p.flip)).flat(),
  );

  // Fonds plus sombres, au large surtout, sur les bords.
  const deeps: string[] = [];
  [0.34, 0.56, 0.76, 0.93].forEach((t, k) => {
    const cy = yAt(t);
    const ry = Math.min(170, cy - band.top - 40, band.bottom - cy - 40);
    if (ry < 80) return;
    const left = (k + band.worldIndex) % 2 === 0;
    const cx = left ? -width * 0.08 : width * 1.08;
    const rx = width * (0.36 + hash01(seed + 300 + k) * 0.12);
    const pts: Point[] = [];
    for (let i = 0; i < 9; i += 1) {
      const a = (i / 9) * Math.PI * 2;
      const j = 0.82 + hash01(seed + 310 + k * 17 + i) * 0.3;
      pts.push({ x: cx + Math.cos(a) * rx * j, y: cy + Math.sin(a) * ry * j });
    }
    deeps.push(loopD(pts));
  });

  return {
    islands,
    islandD: islands.map((il) => loopD(il.outline)),
    innerD: islands.map((il) => (il.inner ? loopD(il.inner) : '')),
    decks,
    landings,
    posts,
    places,
    footprints: places.flatMap((p) => shapeAt(p.kind, p, p.flip)),
    props,
    beam,
    waves: decor.filter((d) => d.kind === 'wave'),
    gulls: decor.filter((d) => d.kind === 'gull'),
    deeps,
  };
}
