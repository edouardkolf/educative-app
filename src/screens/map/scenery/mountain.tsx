// Montagne : troisième monde.
// État de départ (avant refonte) : une grande montagne verte vue de face, dont seule la pointe est enneigée ;
// frontière d'arrivée = crête rocheuse et col à marches.
import {
  NODE_SIZE,
  SNOW_CAP,
  SUMMIT_RISE,
  hash01,
  mountainKindsAt,
  mountainShape,
  placeDecor,
  type Decor,
  type MountainShape,
  type Passage,
  type PathStone,
  type Point,
  type WorldBand,
} from '../layout';
import { DECK_HALF, DecorLayer, EarthPath, SNOW, SpriteBackdrop, bandStones, groundPatches } from './common';
import { defineScene, type PassageProps } from './types';

/** Ciel au-dessus des montagnes. */
const MOUNTAIN_SKY_TOP = '#bfe3fa';
const MOUNTAIN_SKY_LOW = '#e4f3fc';
/** Où s'arrête le chemin de terre d'une montagne : au pied de l'échelle s'il y a des nuages au-dessus,
 * sinon au fanion, un peu sous la pointe. */
function summitPathEnd(band: WorldBand, shape: MountainShape): number {
  return band.top > 0 ? shape.summit.y + SUMMIT_RISE - NODE_SIZE / 2 : shape.summit.y + 40;
}

/** Vers la montagne : une crête rocheuse barre la carte, le chemin passe par une brèche. */
function Ridge({ passage, width }: { passage: Passage; width: number }) {
  const { y } = passage;
  const gap = DECK_HALF + 12;
  const pieces: Array<[number, number]> = [
    [-6, passage.x - gap],
    [passage.x + gap, width + 6],
  ];
  return (
    <g data-testid="map-border">
      {pieces.map(([from, to]) => {
        const tops: Point[] = [];
        const snow: string[] = [];
        const n = Math.max(2, Math.round((to - from) / 26));
        for (let k = 0; k <= n; k += 1) {
          const x = from + ((to - from) * k) / n;
          const high = (k + passage.worldIndex + Math.round(from)) % 3 === 0;
          const peak = k === 0 || k === n ? y - 18 : y - (high ? 44 : 28) - ((k * 7) % 5);
          tops.push({ x, y: peak });
          if (high && k > 0 && k < n) snow.push(`M ${x - 7} ${peak + 9} L ${x} ${peak} L ${x + 7} ${peak + 9} Z`);
        }
        const d =
          `M ${from} ${y + 14} ` +
          tops.map((t) => `L ${Math.round(t.x)} ${Math.round(t.y)}`).join(' ') +
          ` L ${to} ${y + 14} Z`;
        return (
          <g key={from}>
            <path d={d} fill="#9aa6b0" />
            <path d={`M ${from} ${y + 14} L ${to} ${y + 14} L ${to} ${y + 4} L ${from} ${y + 4} Z`} fill="#8594a1" />
            {snow.map((sd) => (
              <path key={sd} d={sd} fill="#ffffff" />
            ))}
          </g>
        );
      })}
    </g>
  );
}

/** Col de montagne : marches de pierre sur le chemin, entre deux piliers à fanion. */
function PassSprite({ passage }: { passage: Passage }) {
  const half = DECK_HALF - 3;
  const steps = [];
  for (let k = 0; k < 6; k += 1) {
    const sy = 22 - k * 12;
    steps.push(
      <g key={k}>
        <rect x={-half} y={sy - 10} width={half * 2} height="10" rx="2" fill="#d6dbe0" />
        <path d={`M ${-half} ${sy} L ${half} ${sy}`} stroke="#9aa4ad" stroke-width="2" />
      </g>,
    );
  }
  return (
    <g transform={`translate(${Math.round(passage.x)} ${Math.round(passage.y)})`} data-testid="map-passage">
      {steps}
      {[-1, 1].map((sx) => {
        const cx = sx * (DECK_HALF + 9);
        return (
          <g key={sx}>
            <ellipse cx={cx} cy="16" rx="12" ry="4" fill="rgba(40,50,60,0.2)" />
            <rect x={cx - 8} y="-40" width="16" height="56" rx="5" fill="#8e99a3" />
            <rect x={cx - 8} y="-40" width="6" height="56" rx="3" fill="#a7b1ba" />
            <path d={`M ${cx - 8} -34 Q ${cx} -46 ${cx + 8} -34 Z`} fill="#ffffff" />
            <path d={`M ${cx} -40 L ${cx} -62`} stroke="#6e4420" stroke-width="2" />
            <path d={`M ${cx} -62 L ${cx + sx * 14} -57 L ${cx} -52 Z`} fill="#e63946" />
          </g>
        );
      })}
    </g>
  );
}

/** Une montagne dessinée de face : flanc éclairé à gauche, flanc à l'ombre à droite, pointe arrondie,
 * et une calotte de neige si elle est haute. */
function Peak({ x, tip, half, base, light, dark, snow }: {
  x: number;
  tip: number;
  half: number;
  base: number;
  light: string;
  dark: string;
  snow: boolean;
}) {
  const r = (n: number) => Math.round(n * 10) / 10;
  const round = 6;
  const f = round / (base - tip);
  const body =
    `M ${r(x - half)} ${r(base)} L ${r(x - half * f)} ${r(tip + round)} ` +
    `Q ${r(x)} ${r(tip - 2)} ${r(x + half * f)} ${r(tip + round)} L ${r(x + half)} ${r(base)} Z`;
  const shade = `M ${r(x)} ${r(tip)} L ${r(x + half)} ${r(base)} L ${r(x + half * 0.18)} ${r(base)} Z`;
  const depth = Math.min(60, (base - tip) * 0.2);
  const g = depth / (base - tip);
  const cap = snow
    ? `M ${r(x - half * f)} ${r(tip + round)} Q ${r(x)} ${r(tip - 2)} ${r(x + half * f)} ${r(tip + round)} ` +
      `L ${r(x + half * g)} ${r(tip + depth)} L ${r(x + half * g * 0.4)} ${r(tip + depth * 0.72)} ` +
      `L ${r(x)} ${r(tip + depth * 0.95)} L ${r(x - half * g * 0.4)} ${r(tip + depth * 0.7)} L ${r(x - half * g)} ${r(tip + depth)} Z`
    : '';
  return (
    <g>
      <path d={body} fill={light} />
      <path d={shade} fill={dark} />
      {cap && <path d={cap} fill={SNOW} />}
    </g>
  );
}

/**
 * Montagne : une grande montagne verte vue de face, dont la pointe coiffe le dernier niveau ;
 * derrière, les montagnes voisines puis une chaîne lointaine bleutée, et le ciel au-dessus.
 */
function MountainGround({ band, shape, width }: { band: WorldBand; shape: MountainShape; width: number }) {
  const id = `mountain-${band.worldIndex}`;
  const { rows, summit } = shape;
  const r = (n: number) => Math.round(n * 10) / 10;
  const H = band.bottom - summit.y;
  const at = (t: number) => band.bottom - t * H; // ordonnée d'une altitude (0 au pied, 1 à la pointe)
  const outline =
    `M ${rows.map((row) => `${r(row.left)} ${r(row.y)}`).join(' L ')} ` +
    `L ${rows
      .map((row) => `${r(row.right)} ${r(row.y)}`)
      .reverse()
      .join(' L ')} Z`;
  // Arête : de la pointe, elle descend en biais ; à sa droite, le flanc à l'ombre.
  const ridge = rows.map((row) => ({ x: summit.x + (row.y - summit.y) * 0.14, y: row.y }));
  const shade = `M ${ridge.map((p) => `${r(p.x)} ${r(p.y)}`).join(' L ')} L ${width + 80} ${r(band.bottom)} L ${width + 80} ${r(summit.y)} Z`;
  let snow = `M -80 ${r(band.top - 2)} L ${width + 80} ${r(band.top - 2)}`;
  const snowY = summit.y + SNOW_CAP;
  for (let x = width + 80, k = 0; x >= -80; x -= 14, k += 1) {
    snow += ` L ${x} ${r(snowY + (k % 2 === 0 ? 8 : -6) + hash01(band.worldIndex * 71 + k) * 6)}`;
  }
  snow += ' Z';
  const far = [
    { x: width * 0.1, t: 0.93 },
    { x: width * 0.9, t: 0.97 },
    { x: width * 0.62, t: 0.9 },
  ];
  const near = [
    { x: -width * 0.04, t: 0.8, light: '#a3d27a', dark: '#8cc466' },
    { x: width * 1.04, t: 0.76, light: '#a3d27a', dark: '#8cc466' },
    { x: width * 0.2, t: 0.62, light: '#99cc70', dark: '#83bd5f' },
    { x: width * 0.84, t: 0.58, light: '#99cc70', dark: '#83bd5f' },
  ];
  return (
    <g data-world={band.world}>
      <defs>
        <linearGradient id={`${id}-sky`} gradientUnits="userSpaceOnUse" x1="0" y1={band.top} x2="0" y2={at(0.6)}>
          <stop offset="0" stop-color={MOUNTAIN_SKY_TOP} />
          <stop offset="1" stop-color={MOUNTAIN_SKY_LOW} />
        </linearGradient>
        <clipPath id={`${id}-clip`}>
          <path d={outline} />
        </clipPath>
      </defs>
      <rect x="0" y={band.top} width={width} height={band.bottom - band.top} fill={`url(#${id}-sky)`} />
      {far.map((p) => (
        <Peak
          key={`f${p.x}`}
          x={p.x}
          tip={at(p.t)}
          half={H * p.t * 0.5}
          base={band.bottom}
          light="#b3d9d2"
          dark="#9cc9c0"
          snow
        />
      ))}
      {near.map((p) => (
        <Peak
          key={`n${p.x}`}
          x={p.x}
          tip={at(p.t)}
          half={H * p.t * 0.46}
          base={band.bottom}
          light={p.light}
          dark={p.dark}
          snow={false}
        />
      ))}
      <path d={outline} fill="#b0d985" stroke="#8cc466" stroke-width="2.5" stroke-linejoin="round" />
      <g clip-path={`url(#${id}-clip)`}>
        {groundPatches(band).map((cy, i) => (
          <ellipse
            key={i}
            cx={i % 2 === 0 ? width * 0.22 : width * 0.78}
            cy={cy}
            rx={width * 0.34}
            ry="70"
            fill="#bde195"
          />
        ))}
        <path d={shade} fill="rgba(70, 120, 40, 0.13)" />
        <path d={snow} fill={SNOW} />
      </g>
    </g>
  );
}

/** Fin de parcours au sommet : un fanion planté sur la pointe. */
function SummitFlag({ at }: { at: Point }) {
  return (
    <g transform={`translate(${Math.round(at.x)} ${Math.round(at.y + 42)})`}>
      <path d="M 0 0 L 0 -34" stroke="#6e4420" stroke-width="2.4" stroke-linecap="round" />
      <path d="M 0 -34 L 18 -28 L 0 -21 Z" fill="#e63946" />
    </g>
  );
}


interface Prep {
  shape: MountainShape;
  decor: Decor[];
  stones: PathStone[];
  /** Le chemin de terre s'arrête là (au-dessus : le ciel et l'échelle). */
  pathTop: number;
}

export const mountain = defineScene<Prep>({
  prepare: (ctx) => {
    const shape = mountainShape(ctx.band, ctx.width, ctx.samples, ctx.nodes);
    const pathTop = summitPathEnd(ctx.band, shape);
    return {
      shape,
      pathTop,
      decor: placeDecor(ctx.band, ctx.width, [...ctx.bandSamples], [...ctx.nodes, ctx.sign], mountainKindsAt(ctx.band, shape)),
      stones: bandStones(ctx, (st) => st.y - st.rx >= pathTop + 20),
    };
  },
  Ground: ({ ctx, prep }) => <MountainGround band={ctx.band} shape={prep.shape} width={ctx.width} />,
  Path: ({ ctx, prep }) => {
    const id = `mountain-path-${ctx.band.worldIndex}`;
    return (
      <>
        <defs>
          <clipPath id={id}>
            <rect x="-50" y={prep.pathTop} width={ctx.width + 100} height={ctx.band.bottom - prep.pathTop} />
          </clipPath>
        </defs>
        <g clip-path={`url(#${id})`}>
          <EarthPath d={ctx.d} stones={prep.stones} />
        </g>
      </>
    );
  },
  Border: ({ passage, ctx }: PassageProps) => <Ridge passage={passage} width={ctx.width} />,
  Passage: ({ passage }: PassageProps) => <PassSprite passage={passage} />,
  Above: ({ ctx, prep }) => (
    <>
      <DecorLayer decor={prep.decor} />
      {ctx.band.top === 0 && <SummitFlag at={prep.shape.summit} />}
    </>
  ),
  Backdrop: () => <SpriteBackdrop world="mountain" ground="#cbdcae" patch="#dbe7c4" />,
});
