// Nuages : quatrième et dernier monde ; le parcours s'y achève.
// État de départ (avant refonte) : ciel uni semé de nuages, chemin de nuages ; frontière d'arrivée = mer de
// nuages percée par l'échelle plantée au sommet de la montagne.
import { NODE_SIZE, PATH_WIDTH, SUMMIT_SPACING, hash01, placeDecor, type Decor, type Passage, type Point } from '../layout';
import { CLOUD_PATH, CLOUD_PATH_CORE, CLOUD_PATH_SHADE, DecorLayer, DefaultEnd, FlatGround, SpriteBackdrop, resample } from './common';
import { defineScene, type PassageProps } from './types';

const GROUND = '#bfe3fa';
const PATCH = '#d3edfd';

/** Vers les nuages : le sommet perce une mer de nuages qui barre la carte. Dessinée par-dessus le
 * chemin, pour que le sentier de terre s'y enfonce et en ressorte en nuage. */
function CloudSea({ passage, width }: { passage: Passage; width: number }) {
  const puffs = [];
  for (let x = -16, k = 0; x < width + 30; x += 24, k += 1) {
    const seed = passage.worldIndex * 97 + k;
    puffs.push({ x, y: passage.y + (hash01(seed) - 0.5) * 10, r: 17 + hash01(seed + 40) * 9 });
  }
  return (
    <g data-testid="map-border">
      {puffs.map((p) => (
        <circle key={`s${p.x}`} cx={p.x} cy={p.y + 6} r={p.r} fill={CLOUD_PATH_SHADE} />
      ))}
      {puffs.map((p) => (
        <circle key={p.x} cx={p.x} cy={p.y} r={p.r} fill={CLOUD_PATH} />
      ))}
    </g>
  );
}

/** Du sommet aux nuages : une échelle de bois dressée sur la pointe, qui file dans la mer de nuages. */
function Ladder({ passage }: { passage: Passage }) {
  const bottom = SUMMIT_SPACING / 2 - NODE_SIZE / 2 + 6;
  const top = 4;
  const half = 11;
  const rungs = [];
  for (let y = bottom - 10; y > top; y -= 13) {
    rungs.push(<path key={y} d={`M ${-half} ${y} L ${half} ${y}`} stroke="#a8713d" stroke-width="3.2" stroke-linecap="round" />);
  }
  return (
    <g transform={`translate(${Math.round(passage.x)} ${Math.round(passage.y)})`} data-testid="map-passage">
      <path d={`M ${-half + 3} ${bottom + 2} L ${half + 3} ${bottom + 2}`} stroke="rgba(40,50,60,0.2)" stroke-width="6" stroke-linecap="round" />
      {rungs}
      {[-1, 1].map((sx) => (
        <path
          key={sx}
          d={`M ${sx * half} ${bottom} L ${sx * half} ${top}`}
          stroke="#8b5a2b"
          stroke-width="4.5"
          stroke-linecap="round"
        />
      ))}
    </g>
  );
}

/** Chemin de nuages : des bourrelets blancs de part et d'autre, un cœur lisse, une ombre bleutée. */
function CloudPath({ d, samples }: { d: string; samples: readonly Point[] }) {
  const half = PATH_WIDTH / 2;
  const puffs = resample(samples, 12).flatMap((p, i) =>
    [-1, 1].map((side) => {
      const r = 7 + hash01(i * 2 + (side > 0 ? 1 : 0)) * 4;
      const off = half - r * 0.55;
      return { x: p.x + p.nx * off * side, y: p.y + p.ny * off * side, r, key: `${i}${side}` };
    }),
  );
  return (
    <>
      {puffs.map((p) => (
        <circle key={`s${p.key}`} cx={p.x.toFixed(1)} cy={(p.y + 3.5).toFixed(1)} r={p.r.toFixed(1)} fill={CLOUD_PATH_SHADE} />
      ))}
      {puffs.map((p) => (
        <circle key={p.key} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r={p.r.toFixed(1)} fill={CLOUD_PATH} />
      ))}
      <path d={d} class="map-scenery__path" stroke={CLOUD_PATH} stroke-width={PATH_WIDTH - 8} />
      <path d={d} class="map-scenery__path map-scenery__path--worn" stroke={CLOUD_PATH_CORE} stroke-width={PATH_WIDTH - 22} />
    </>
  );
}


interface Prep {
  decor: Decor[];
}

export const clouds = defineScene<Prep>({
  prepare: (ctx) => ({
    decor: placeDecor(ctx.band, ctx.width, [...ctx.bandSamples], [...ctx.nodes, ctx.sign, ...(ctx.end ? [ctx.end] : [])]),
  }),
  Ground: ({ ctx }) => <FlatGround ctx={ctx} ground={GROUND} patch={PATCH} />,
  Path: ({ ctx }) => (
    <g data-testid="map-cloud-path">
      <CloudPath d={ctx.d} samples={ctx.bandSamples} />
    </g>
  ),
  Passage: ({ passage, ctx }: PassageProps) => (
    <g>
      <Ladder passage={passage} />
      <CloudSea passage={passage} width={ctx.width} />
    </g>
  ),
  Above: ({ prep }) => <DecorLayer decor={prep.decor} />,
  End: ({ at }) => <DefaultEnd at={at} />,
  Backdrop: () => <SpriteBackdrop world="clouds" ground={GROUND} patch={PATCH} />,
});
