// Forêt : premier monde du parcours, de la lisière au cœur du bois (docs/specs/CARTE-MONDES.md).
//   t 0 → 0,3   la lisière : prairie fleurie, barrière au départ, papillons, lapin ;
//   t 0,3 → 0,65 la clairière : mare (canard, roseaux, nénuphars) et ruisseau sous un petit pont, bosquets ;
//   t 0,65 → 1  le sous-bois : sol sombre, sapins serrés en couloir, rayons de lumière, l'arbre-maison.
// Frontière d'arrivée (rivière et pont) : seulement quand le parcours reboucle après les nuages.
import { type Footprint, type Passage, type PathStone, type WorldId } from '../layout';
import { BANK, DECK_HALF, EarthPath, bandStones, wavyBandD } from './common';
import { PASSAGE_HALF } from '../layout';
import { defineScene, type PassageProps, type SceneContext } from './types';
import { CreekBridge, Fence, ForestDefs } from './forest/art';
import { GLADE_FROM, WOOD_FROM, planForest, type ForestPlan } from './forest/geometry';
import { ForestBackdrop } from './forest/backdrop';

const RIVER_FILL = '#4aa3d4';
const RIVER_HALF = 22;
const BANK_WIDTH = 9;
const BRIDGE_HALF = 36;
/** Vers la forêt : rivière qui traverse la carte, bordée des berges de chaque monde. */
function River({ passage, width, below }: { passage: Passage; width: number; below: WorldId }) {
  const { y } = passage;
  const top = y - RIVER_HALF;
  const bottom = y + RIVER_HALF;
  const ripples = [];
  for (let x = 30 + (passage.worldIndex % 3) * 17; x < width; x += 74) {
    if (Math.abs(x - passage.x) < BRIDGE_HALF + 20) continue;
    const dy = ((x / 74) % 2 < 1 ? -7 : 6) + y;
    ripples.push(
      <path key={x} d={`M ${x - 9} ${dy} Q ${x} ${dy - 5} ${x + 9} ${dy}`} stroke="#ffffff" stroke-opacity="0.7" />,
    );
  }
  return (
    <g data-testid="map-border">
      <path d={wavyBandD(width, top - BANK_WIDTH, y, passage.worldIndex)} fill={BANK[passage.world]} />
      <path d={wavyBandD(width, y, bottom + BANK_WIDTH, passage.worldIndex + 1)} fill={BANK[below]} />
      <path d={wavyBandD(width, top, bottom, passage.worldIndex + 2)} fill={RIVER_FILL} />
      <g fill="none" stroke-width="2.5" stroke-linecap="round">
        {ripples}
      </g>
    </g>
  );
}

/** Pont de bois qui enjambe la rivière. */
function BridgeSprite({ passage }: { passage: Passage }) {
  const half = DECK_HALF;
  const lines = [];
  for (let k = 1; k < 8; k += 1) {
    const ly = -BRIDGE_HALF + (k * BRIDGE_HALF * 2) / 8;
    lines.push(<path key={k} d={`M ${-half} ${ly} L ${half} ${ly}`} stroke="#8b5a2b" stroke-width="1.6" />);
  }
  return (
    <g transform={`translate(${Math.round(passage.x)} ${Math.round(passage.y)})`} data-testid="map-passage">
      <rect
        x={-half - 4}
        y={-RIVER_HALF + 2}
        width={half * 2 + 8}
        height={RIVER_HALF * 2}
        rx="6"
        fill="rgba(20,50,80,0.22)"
      />
      <rect x={-half} y={-BRIDGE_HALF} width={half * 2} height={BRIDGE_HALF * 2} rx="4" fill="#c68a4e" />
      {lines}
      <rect x={-half - 5} y={-BRIDGE_HALF - 2} width="8" height={BRIDGE_HALF * 2 + 4} rx="3" fill="#8b5a2b" />
      <rect x={half - 3} y={-BRIDGE_HALF - 2} width="8" height={BRIDGE_HALF * 2 + 4} rx="3" fill="#8b5a2b" />
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sy) => (
          <circle key={`${sx}${sy}`} cx={sx * (half + 1)} cy={sy * (BRIDGE_HALF + 1)} r="6" fill="#6e4420" />
        )),
      )}
    </g>
  );
}


interface Prep extends ForestPlan {
  stones: PathStone[];
}

const WATER = '#6bb8e0';
const WATER_RIM = '#8fbf5f';

type XY = [number, number];
const pt = (x: number, y: number) => `${Math.round(x * 10) / 10} ${Math.round(y * 10) / 10}`;
const mid = (a: XY, b: XY): XY => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];

/** Courbe fermée et lisse passant près des points (arrondis par les milieux des côtés). */
function closedD(pts: XY[]): string {
  const n = pts.length;
  const start = mid(pts[n - 1]!, pts[0]!);
  let d = `M ${pt(...start)}`;
  for (let i = 0; i < n; i += 1) {
    const p = pts[i]!;
    const m = mid(p, pts[(i + 1) % n]!);
    d += ` Q ${pt(...p)} ${pt(...m)}`;
  }
  return `${d} Z`;
}

/** Tache douce, plus large que l'écran, entre deux ordonnées (bords haut et bas ondulés). */
function patchD(width: number, yTop: number, yBottom: number, seed: number): string {
  const xs = [-50, width * 0.28, width * 0.66, width + 50];
  const top = xs.map((x, i): XY => [x, yTop + (i % 2 ? -1 : 1) * (14 + 16 * ((seed + i) % 3))]);
  const bottom = [...xs].reverse().map((x, i): XY => [x, yBottom + (i % 2 ? 1 : -1) * (14 + 16 * ((seed + i + 1) % 3))]);
  return closedD([...top, [width + 90, (yTop + yBottom) / 2], ...bottom, [-90, (yTop + yBottom) / 2]]);
}

/** Bande sombre le long d'un bord du sous-bois : c'est elle qui fait le couloir. */
function woodSideD(side: 'left' | 'right', width: number, yLow: number, yHigh: number): string {
  const pts: XY[] = [];
  for (let y = yLow; y >= yHigh; y -= 44) {
    const t = (yLow - y) / (yLow - yHigh);
    const w = 52 + 70 * Math.min(1, t * 1.6) + 20 * Math.sin(y / 63 + (side === 'left' ? 0 : 2));
    pts.push([side === 'left' ? w : width - w, y]);
  }
  const edge = side === 'left' ? -60 : width + 60;
  return closedD([[edge, yLow + 30], ...pts, [edge, yHigh - 10]]);
}

function pondD(cx: number, cy: number, rx: number, ry: number): string {
  const n = 9;
  const pts: XY[] = [];
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * Math.PI * 2 + 0.3;
    const j = 0.92 + 0.14 * Math.sin(i * 2.3 + 1);
    pts.push([cx + Math.cos(a) * rx * j, cy + Math.sin(a) * ry * j]);
  }
  return closedD(pts);
}

function ForestGround({ ctx, prep }: { ctx: SceneContext; prep: Prep }) {
  const { band, width } = ctx;
  const p = `forest-${band.worldIndex}-`;
  const H = band.bottom - band.top;
  const at = (t: number) => band.bottom - H * t;
  const { creek } = prep;
  const wood = at(WOOD_FROM - 0.04);
  const topEdge = band.top + (ctx.passageOut ? 22 : 0);
  return (
    <g data-world="forest">
      <ForestDefs p={p} />
      <linearGradient id={`${p}ground`} gradientUnits="userSpaceOnUse" x1="0" y1={band.bottom} x2="0" y2={band.top}>
        <stop offset="0" stop-color="#c6e79a" />
        <stop offset="0.4" stop-color="#b4da88" />
        <stop offset="0.62" stop-color="#a0cc76" />
        <stop offset="0.8" stop-color="#86b966" />
        <stop offset="1" stop-color="#76ac5c" />
      </linearGradient>
      <rect x="0" y={band.top} width={width} height={H} fill={`url(#${p}ground)`} />
      {/* lisière : prairie claire ; clairière : la zone la plus claire */}
      <path d={patchD(width, at(GLADE_FROM), at(0.02), 1)} fill="#d6efae" opacity="0.55" />
      <path d={patchD(width, at(WOOD_FROM + 0.03), at(GLADE_FROM - 0.03), 2)} fill="#e0f5b8" opacity="0.9" />
      {/* sous-bois : les bords s'assombrissent */}
      <path d={woodSideD('left', width, wood, topEdge)} fill="#5f9a4b" opacity="0.55" />
      <path d={woodSideD('right', width, wood, topEdge)} fill="#5f9a4b" opacity="0.55" />
      {creek && (
        <g fill="none" stroke-linecap="round">
          <path d={creek.d} stroke={WATER_RIM} stroke-width="32" />
          <path d={pondD(creek.pond.x, creek.pond.y, creek.pond.rx + 4, creek.pond.ry + 4)} fill={WATER_RIM} stroke={WATER_RIM} stroke-width="8" stroke-linejoin="round" />
          <path d={creek.d} stroke={WATER} stroke-width="20" />
          <path d={creek.d} stroke="#ffffff" stroke-width="2.4" stroke-dasharray="9 24" opacity="0.75" />
          <path d={pondD(creek.pond.x, creek.pond.y, creek.pond.rx, creek.pond.ry)} fill={WATER} stroke="none" />
          <ellipse cx={creek.pond.x - 4 * creek.side} cy={creek.pond.y - 22} rx="34" ry="9" fill="#8fcdea" opacity="0.8" stroke="none" />
        </g>
      )}
    </g>
  );
}

function ForestAbove({ ctx, prep }: { ctx: SceneContext; prep: Prep }) {
  const { band } = ctx;
  const p = `forest-${band.worldIndex}-`;
  const { creek } = prep;
  return (
    <g>
      {prep.fence.map(([x0, x1]) => (
        <Fence key={x0} x0={x0} x1={x1} y={band.bottom - 26} />
      ))}
      {creek && <CreekBridge x={creek.crossing.x} y={creek.crossing.y} angle={creek.angle} />}
      <g fill="#fff7c2" opacity="0.17">
        {prep.rays.map((r, i) => (
          <path key={i} d={r.d} />
        ))}
      </g>
      {prep.items.map((it, i) => (
        <use
          key={i}
          href={`#${p}${it.k}`}
          transform={`translate(${Math.round(it.x)} ${Math.round(it.y)}) scale(${it.flip ? -it.s : it.s} ${it.s})`}
        />
      ))}
      {prep.glows.map((g, i) => (
        <use key={`g${i}`} href={`#${p}fly`} transform={`translate(${Math.round(g.x)} ${Math.round(g.y)})`} />
      ))}
    </g>
  );
}

export const forest = defineScene<Prep>({
  prepare: (ctx) => ({ ...planForest(ctx), stones: bandStones(ctx) }),
  Ground: ({ ctx, prep }) => <ForestGround ctx={ctx} prep={prep} />,
  Path: ({ ctx, prep }) => <EarthPath d={ctx.d} stones={prep.stones} />,
  Border: ({ passage, ctx, below }: PassageProps) => <River passage={passage} width={ctx.width} below={below.band.world} />,
  Passage: ({ passage }: PassageProps) => <BridgeSprite passage={passage} />,
  Above: ({ ctx, prep }) => <ForestAbove ctx={ctx} prep={prep} />,
  footprints: (prep): Footprint[] => prep.footprints,
  Backdrop: () => <ForestBackdrop />,
});