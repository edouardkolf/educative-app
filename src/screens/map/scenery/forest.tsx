// Forêt : premier monde du parcours.
// État de départ (avant refonte) : sol uni semé d'arbres ; frontière d'arrivée = rivière et pont de bois
// (seulement quand le parcours reboucle après les nuages).
import {
  PASSAGE_HALF,
  placeDecor,
  type Decor,
  type Passage,
} from '../layout';
import { BANK, DECK_HALF, DecorLayer, EarthPath, FlatGround, SpriteBackdrop, bandStones, wavyBandD } from './common';
import { defineScene, type PassageProps } from './types';
import type { PathStone, WorldId } from '../layout';

const GROUND = '#b5d98a';
const PATCH = '#c4e39c';

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


interface Prep {
  decor: Decor[];
  stones: PathStone[];
}

export const forest = defineScene<Prep>({
  prepare: (ctx) => ({
    decor: placeDecor(ctx.band, ctx.width, [...ctx.bandSamples], [...ctx.nodes, ctx.sign]),
    stones: bandStones(ctx),
  }),
  Ground: ({ ctx }) => <FlatGround ctx={ctx} ground={GROUND} patch={PATCH} />,
  Path: ({ ctx, prep }) => <EarthPath d={ctx.d} stones={prep.stones} />,
  Border: ({ passage, ctx, below }: PassageProps) => <River passage={passage} width={ctx.width} below={below.band.world} />,
  Passage: ({ passage }: PassageProps) => <BridgeSprite passage={passage} />,
  Above: ({ prep }) => <DecorLayer decor={prep.decor} />,
  Backdrop: () => <SpriteBackdrop world="forest" ground={GROUND} patch={PATCH} />,
});
