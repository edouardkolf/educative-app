// Montagne : troisième monde, l'ascension. Quatre étages du pied au sommet, sur toute la bande :
// l'alpage (vaches, chalet), la forêt de sapins (torrent, cascade, pont de pierre), le pierrier (bouquetin,
// marmotte, névés), la neige (refuge, bonhomme de neige). Derrière, des chaînes en bleu de distance.
// Frontière d'arrivée : falaises sortant de la mer, col à marches. Voir docs/specs/CARTE-MONDES.md.
import {
  NODE_SIZE,
  PATH_WIDTH,
  SUMMIT_RISE,
  hash01,
  mountainShape,
  onMountain,
  smoothPathD,
  type MountainShape,
  type PathStone,
  type Point,
  type WorldBand,
} from '../layout';
import { DECK_HALF, EarthPath, SNOW, SNOW_SHADE, bandStones } from './common';
import { defineScene, type PassageProps, type SceneContext } from './types';
import { MountainBackdrop, RangePeak } from './mountain/backdrop';
import { Cliffs, Col } from './mountain/border';
import {
  Cairn,
  Cascade,
  Chalet,
  Eagle,
  FOREST,
  IbexRock,
  MEADOW,
  MEADOW_LIGHT,
  Marmot,
  MountainDefs,
  RANGE_FAR,
  RANGE_NEAR,
  Refuge,
  SCREE,
  SKY_LOW,
  SKY_TOP,
  SLAB,
  SLAB_EDGE,
  Snowman,
  StoneBridge,
  WATER,
  WATER_LIGHT,
} from './mountain/drawings';
import { BROOK_HALF, STREAM_HALF, planMountain, yAt, type Placed, type Prepared } from './mountain/geometry';

const r = (n: number) => Math.round(n * 10) / 10;
const prefixOf = (band: WorldBand) => `mountain-${band.worldIndex}-`;
const FLOWERS = ['#ff8fab', '#ffd23f', '#ffffff', '#b48cf2', '#ff8fab', '#ffd23f'];

/** Où s'arrête le chemin de terre : au pied de l'échelle s'il y a des nuages au-dessus, sinon au fanion,
 * un peu sous la pointe. */
function summitPathEnd(band: WorldBand, shape: MountainShape): number {
  return band.top > 0 ? shape.summit.y + SUMMIT_RISE - NODE_SIZE / 2 : shape.summit.y + 40;
}

function outlineD(shape: MountainShape): string {
  const { rows } = shape;
  return (
    `M ${rows.map((row) => `${r(row.left)} ${r(row.y)}`).join(' L ')} ` +
    `L ${rows
      .map((row) => `${r(row.right)} ${r(row.y)}`)
      .reverse()
      .join(' L ')} Z`
  );
}

/** Région au-dessus d'une lisière (jusqu'en haut de la bande). */
function aboveEdgeD(edge: readonly Point[], top: number, smooth: boolean): string {
  const line = smooth ? smoothPathD([...edge]) : `M ${edge.map((p) => `${r(p.x)} ${r(p.y)}`).join(' L ')}`;
  const last = edge[edge.length - 1] as Point;
  const first = edge[0] as Point;
  return `${line} L ${r(last.x)} ${r(top)} L ${r(first.x)} ${r(top)} Z`;
}

/** Flanc à l'ombre : à droite d'une arête qui descend de la pointe en s'écartant. */
function shadeD(shape: MountainShape, width: number, bottom: number): string {
  const { summit } = shape;
  const H = bottom - summit.y;
  const pts: string[] = [];
  for (let y = summit.y, k = 0; y < bottom + 40; y += 36, k += 1) {
    const u = (y - summit.y) / H;
    const jag = u < 0.45 ? (hash01(k * 13 + 7) - 0.5) * 10 : 0;
    pts.push(`${r(summit.x + 3 + (y - summit.y) * 0.07 + u * u * width * 0.32 + jag)} ${r(Math.min(y, bottom))}`);
  }
  return `M ${r(summit.x)} ${r(summit.y)} L ${pts.join(' L ')} L ${width + 60} ${r(bottom)} L ${width + 60} ${r(summit.y)} Z`;
}

function SkyAndRanges({ ctx, shape, id }: { ctx: SceneContext; shape: MountainShape; id: string }) {
  const { band, width } = ctx;
  const base = yAt(shape, 0.5);
  const peak = (x: number, t: number, slope: number, colors: readonly [string, string]) => {
    const tip = yAt(shape, t);
    return <RangePeak key={`${x}${t}`} x={x} tip={tip} base={base} half={(base - tip) * slope} colors={colors} />;
  };
  const offRock = (x: number, y: number, rad: number) =>
    !onMountain(shape, x - rad, y) && !onMountain(shape, x + rad, y) && !onMountain(shape, x, y - 20) && y > band.top + 40;
  const clouds = [
    { x: width * 0.13, t: 0.975, s: 1.1 },
    { x: width * 0.87, t: 0.94, s: 1 },
    { x: width * 0.06, t: 0.885, s: 0.85 },
    { x: width * 0.95, t: 0.86, s: 0.8 },
  ]
    .map((c) => ({ ...c, y: yAt(shape, c.t) }))
    .filter((c) => offRock(c.x, c.y, 26 * c.s));
  const eagle = { x: shape.summit.x > width / 2 ? width * 0.2 : width * 0.8, y: yAt(shape, 0.93) };
  return (
    <>
      <rect x="0" y={band.top} width={width} height={band.bottom - band.top} fill={`url(#${id}sky)`} />
      {peak(width * 0.1, 0.985, 0.55, RANGE_FAR)}
      {peak(width * 0.93, 0.955, 0.5, RANGE_FAR)}
      {peak(-width * 0.06, 0.9, 0.5, RANGE_NEAR)}
      {peak(width * 1.07, 0.885, 0.5, RANGE_NEAR)}
      {clouds.map((c) => (
        <use key={c.x} href={`#${id}cloud`} transform={`translate(${r(c.x)} ${r(c.y)}) scale(${c.s})`} />
      ))}
      {offRock(eagle.x, eagle.y, 36) && (
        <g transform={`translate(${r(eagle.x)} ${r(eagle.y)})`}>
          <Eagle />
        </g>
      )}
    </>
  );
}

function MountainGround({ ctx, prep }: { ctx: SceneContext; prep: Prep }) {
  const { band, width } = ctx;
  const { shape, plan } = prep;
  const id = prefixOf(band);
  const outline = outlineD(shape);
  const top = band.top - 10;
  const [e0, e1, e2] = plan.edges;
  const t = plan.torrent;
  return (
    <g data-world={band.world}>
      <MountainDefs prefix={id} />
      <defs>
        <linearGradient id={`${id}sky`} gradientUnits="userSpaceOnUse" x1="0" y1={shape.summit.y - 100} x2="0" y2={yAt(shape, 0.75)}>
          <stop offset="0" stop-color={SKY_TOP} />
          <stop offset="1" stop-color={SKY_LOW} />
        </linearGradient>
        <linearGradient id={`${id}shade`} gradientUnits="userSpaceOnUse" x1="0" y1={shape.summit.y} x2="0" y2={band.bottom}>
          <stop offset="0" stop-color="#2f5a85" stop-opacity="0.13" />
          <stop offset="1" stop-color="#2f5a85" stop-opacity="0.04" />
        </linearGradient>
        <clipPath id={`${id}clip`}>
          <path d={outline} />
        </clipPath>
      </defs>
      <SkyAndRanges ctx={ctx} shape={shape} id={id} />
      <g clip-path={`url(#${id}clip)`}>
        <rect x="-60" y={top} width={width + 120} height={band.bottom - top} fill={MEADOW} />
        {plan.patches
          .filter((p) => p.kind === 'clearing')
          .map((p) => (
            <ellipse key={p.seed} cx={r(p.x)} cy={r(p.y)} rx={r(p.r * 1.5)} ry={r(p.r * 0.7)} fill={MEADOW_LIGHT} />
          ))}
        <path d={aboveEdgeD(e0, top, true)} fill={FOREST} />
        <path d={aboveEdgeD(e1, top, true)} fill={SCREE} />
        {plan.patches.map((p) => {
          const at = `translate(${r(p.x)} ${r(p.y)})`;
          if (p.kind === 'slab') {
            const a = hash01(p.seed + 5) * 0.6 - 0.3;
            const c = Math.cos(a);
            const s = Math.sin(a);
            const q = [
              [-1, -0.45],
              [0.8, -0.6],
              [1, 0.35],
              [-0.7, 0.5],
            ].map(([u, v]) => `${r((u! * c - v! * s) * p.r)} ${r((u! * s + v! * c) * p.r * 0.7)}`);
            return <path key={p.seed} d={`M ${q.join(' L ')} Z`} transform={at} fill={SLAB} stroke={SLAB_EDGE} stroke-width="1.2" stroke-linejoin="round" />;
          }
          if (p.kind === 'snowpatch') {
            const d = `M ${-p.r} 0 Q ${r(-p.r * 0.7)} ${r(-p.r * 0.55)} 0 ${r(-p.r * 0.5)} Q ${r(p.r * 0.8)} ${r(-p.r * 0.6)} ${p.r} 0 Q 0 ${r(p.r * 0.3)} ${-p.r} 0 Z`;
            return (
              <g key={p.seed} transform={at}>
                <path d={d} fill={SNOW_SHADE} transform="translate(1 2)" />
                <path d={d} fill={SNOW} />
              </g>
            );
          }
          if (p.kind === 'pebbles') return <use key={p.seed} href={`#${id}pebbles`} transform={at} />;
          return null;
        })}
        <path d={aboveEdgeD(e2, top, false)} fill={SNOW} />
        {plan.patches
          .filter((p) => p.kind === 'sastrugi')
          .map((p) => (
            <path
              key={p.seed}
              d={`M ${r(p.x - p.r)} ${r(p.y)} Q ${r(p.x)} ${r(p.y - p.r * 0.4)} ${r(p.x + p.r)} ${r(p.y)}`}
              stroke={SNOW_SHADE}
              stroke-width="3"
              stroke-linecap="round"
              fill="none"
            />
          ))}
        <path d={shadeD(shape, width, band.bottom)} fill={`url(#${id}shade)`} />
        {t && t.stream.length > 1 && (
          <>
            <path d={smoothPathD(t.stream)} stroke="#a9b1ab" stroke-width={STREAM_HALF * 2 + 6} stroke-linecap="round" fill="none" />
            <path d={smoothPathD(t.stream)} stroke={WATER_LIGHT} stroke-width={STREAM_HALF * 2} stroke-linecap="round" fill="none" />
            <path d={smoothPathD(t.stream)} stroke="#ffffff" stroke-width="1.8" stroke-dasharray="6 16" stroke-linecap="round" fill="none" />
            {/* Le névé où naît le torrent. */}
            <g transform={`translate(${r(t.stream[0]!.x)} ${r(t.stream[0]!.y)})`}>
              <path d="M -22 4 Q -18 -8 -2 -9 Q 14 -12 22 0 Q 8 8 -22 4 Z" fill={SNOW_SHADE} />
              <path d="M -19 2 Q -15 -7 -2 -7 Q 12 -10 19 -1 Q 6 5 -19 2 Z" fill={SNOW} />
            </g>
          </>
        )}
        {t && (
          <>
            <path d={t.brookD} stroke="#77ad5c" stroke-width={BROOK_HALF * 2 + 10} stroke-linecap="round" fill="none" />
            <path d={t.brookD} stroke={WATER} stroke-width={BROOK_HALF * 2} stroke-linecap="round" fill="none" />
            <path d={t.brookD} stroke="#ffffff" stroke-width="2.4" stroke-dasharray="9 24" stroke-linecap="round" fill="none" opacity="0.75" />
          </>
        )}
      </g>
      <path d={outline} fill="none" stroke="rgba(70, 100, 130, 0.28)" stroke-width="2.5" stroke-linejoin="round" />
    </g>
  );
}

/** Fin de parcours au sommet : un fanion planté sur la pointe. */
function SummitFlag({ at }: { at: Point }) {
  return (
    <g transform={`translate(${Math.round(at.x)} ${Math.round(at.y + 42)})`}>
      <ellipse cx="1" cy="0" rx="8" ry="2.5" fill="rgba(70, 105, 140, 0.25)" />
      <path d="M 0 0 L 0 -34" stroke="#6e4420" stroke-width="2.4" stroke-linecap="round" />
      <path d="M 0 -34 L 18 -28 L 0 -21 Z" fill="#e63946" />
    </g>
  );
}

function Item({ item, id }: { item: Placed; id: string }) {
  const { kind, x, y, scale, flip } = item;
  const tr = `translate(${r(x)} ${r(y)}) scale(${r(flip ? -scale * 100 : scale * 100) / 100} ${r(scale * 100) / 100})`;
  switch (kind) {
    case 'chalet':
      return <g transform={tr}><Chalet /></g>;
    case 'refuge':
      return <g transform={tr}><Refuge /></g>;
    case 'snowman':
      return <g transform={tr}><Snowman /></g>;
    case 'ibex':
      return <g transform={tr}><IbexRock prefix={id} /></g>;
    case 'marmot':
      return <g transform={tr}><Marmot prefix={id} /></g>;
    case 'cairn':
      return <g transform={tr}><Cairn /></g>;
    case 'cascade':
      return <g transform={tr}><Cascade prefix={id} /></g>;
    case 'flower': {
      const color = FLOWERS[Math.floor(hash01(Math.round(x * 7 + y * 3)) * FLOWERS.length)];
      return <use href={`#${id}flower`} fill={color} transform={tr} />;
    }
    default:
      return <use href={`#${id}${kind}`} transform={tr} />;
  }
}

interface Prep {
  shape: MountainShape;
  plan: Prepared;
  stones: PathStone[];
  /** Le chemin de terre s'arrête là (au-dessus : le ciel et l'échelle). */
  pathTop: number;
}

export const mountain = defineScene<Prep>({
  prepare: (ctx) => {
    const shape = mountainShape(ctx.band, ctx.width, ctx.samples, ctx.nodes);
    const pathTop = summitPathEnd(ctx.band, shape);
    const plan = planMountain(ctx, shape);
    const bridge = plan.torrent?.bridge;
    return {
      shape,
      pathTop,
      plan,
      stones: bandStones(
        ctx,
        (st) => st.y - st.rx >= pathTop + 20 && (!bridge || Math.hypot(st.x - bridge.x, st.y - bridge.y) > 40),
      ),
    };
  },
  Ground: ({ ctx, prep }) => <MountainGround ctx={ctx} prep={prep} />,
  Path: ({ ctx, prep }) => {
    const id = `${prefixOf(ctx.band)}path`;
    return (
      <>
        <defs>
          <clipPath id={id}>
            <rect x="-50" y={prep.pathTop} width={ctx.width + 100} height={ctx.band.bottom - prep.pathTop} />
          </clipPath>
        </defs>
        <g clip-path={`url(#${id})`}>
          {/* Liseré plus sombre : le sentier se détache aussi bien sur la neige et la pierre que sur l'herbe. */}
          <path d={ctx.d} class="map-scenery__path" stroke="rgba(80, 62, 30, 0.2)" stroke-width={PATH_WIDTH + 5} />
          <EarthPath d={ctx.d} stones={prep.stones} />
        </g>
      </>
    );
  },
  Border: ({ passage, ctx }: PassageProps) => <Cliffs passage={passage} width={ctx.width} sign={ctx.sign} />,
  Passage: ({ passage }: PassageProps) => <Col passage={passage} />,
  Above: ({ ctx, prep }) => {
    const id = prefixOf(ctx.band);
    const bridge = prep.plan.torrent?.bridge;
    const items = [...prep.plan.places, ...prep.plan.decor].sort((a, b) => a.y - b.y || a.x - b.x);
    return (
      <>
        {bridge && (
          <g transform={`translate(${r(bridge.x)} ${r(bridge.y)}) rotate(${r(bridge.angle - 90)})`} data-testid="map-mountain-bridge">
            <StoneBridge half={DECK_HALF} />
          </g>
        )}
        {items.map((item, i) => (
          <Item key={i} item={item} id={id} />
        ))}
        {ctx.band.top === 0 && <SummitFlag at={prep.shape.summit} />}
      </>
    );
  },
  footprints: (prep) => prep.plan.footprints,
  Backdrop: () => <MountainBackdrop />,
});
