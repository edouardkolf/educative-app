// Mer : deuxième monde.
// État de départ (avant refonte) : eau unie, sentier de terre posé sur l'eau ; frontière d'arrivée = plage et
// ponton de bois avec une barque.
import { PASSAGE_HALF, placeDecor, type Decor, type Passage, type PathStone } from '../layout';
import { DECK_HALF, DecorLayer, EarthPath, FlatGround, SpriteBackdrop, bandStones, roomySide, wavyBandD } from './common';
import { defineScene, type PassageProps } from './types';

const GROUND = '#8ecfe8';
const PATCH = '#a3daee';
const SAND = '#f3e2b0';

/** Vers la mer : la terre finit sur une plage, l'écume marque le bord de l'eau. */
function Shore({ passage, width }: { passage: Passage; width: number }) {
  const { y } = passage;
  return (
    <g data-testid="map-border">
      <path d={wavyBandD(width, y - 18, y - 2, passage.worldIndex)} fill="#b3e2f2" />
      <path d={wavyBandD(width, y - 4, y + 26, passage.worldIndex + 1)} fill={SAND} />
      <path
        d={wavyBandD(width, y - 4, y - 4, passage.worldIndex + 1).replace(/ L -4 [^Z]*Z$/, '')}
        fill="none"
        stroke="#ffffff"
        stroke-width="3"
        stroke-linecap="round"
        stroke-opacity="0.9"
      />
    </g>
  );
}

/** Ponton de bois qui part de la plage et avance dans la mer ; une barque est amarrée à côté. */
function PierSprite({ passage, width }: { passage: Passage; width: number }) {
  const half = DECK_HALF;
  const top = -PASSAGE_HALF;
  const bottom = 14;
  const side = -roomySide(passage, width);
  const lines = [];
  for (let ly = bottom - 8; ly > top; ly -= 8) {
    lines.push(<path key={ly} d={`M ${-half} ${ly} L ${half} ${ly}`} stroke="#8b5a2b" stroke-width="1.5" />);
  }
  const posts = [-6, -25, top + 2];
  const boatX = side * (half + 34);
  return (
    <g transform={`translate(${Math.round(passage.x)} ${Math.round(passage.y)})`} data-testid="map-passage">
      {posts.flatMap((py) =>
        [-1, 1].map((sx) => (
          <ellipse
            key={`r${py}${sx}`}
            cx={sx * (half + 1)}
            cy={py + 3}
            rx="9"
            ry="3"
            fill="none"
            stroke="#ffffff"
            stroke-opacity="0.7"
            stroke-width="1.5"
          />
        )),
      )}
      <rect x={-half + 3} y={top + 5} width={half * 2} height={bottom - top - 5} rx="3" fill="rgba(20,50,80,0.2)" />
      <rect x={-half} y={top} width={half * 2} height={bottom - top} rx="3" fill="#c68a4e" />
      {lines}
      {posts.flatMap((py) =>
        [-1, 1].map((sx) => <circle key={`${py}${sx}`} cx={sx * (half + 1)} cy={py} r="5" fill="#6e4420" />),
      )}
      <g transform={`translate(${boatX} -18)`}>
        {/* Amarre jusqu'au poteau du milieu du ponton. */}
        <path
          d={`M ${-side * 14} -2 Q ${-side * 24} 3 ${-side * 33} -7`}
          stroke="#8b5a2b"
          stroke-width="1.2"
          fill="none"
        />
        <ellipse cx="0" cy="8" rx="20" ry="4" fill="rgba(20,50,80,0.2)" />
        <path d="M -18 -2 L 18 -2 L 12 8 L -12 8 Z" fill="#e63946" />
        <path d="M -18 -2 L 18 -2 L 17 1 L -17 1 Z" fill="#ffffff" />
        <path d="M 0 -2 L 0 -30" stroke="#6e4420" stroke-width="2" />
        <path d="M 2 -28 L 16 -6 L 2 -6 Z" fill="#fff7e8" />
      </g>
    </g>
  );
}


interface Prep {
  decor: Decor[];
  stones: PathStone[];
}

export const sea = defineScene<Prep>({
  prepare: (ctx) => ({
    decor: placeDecor(ctx.band, ctx.width, [...ctx.bandSamples], [...ctx.nodes, ctx.sign]),
    stones: bandStones(ctx),
  }),
  Ground: ({ ctx }) => <FlatGround ctx={ctx} ground={GROUND} patch={PATCH} />,
  Path: ({ ctx, prep }) => <EarthPath d={ctx.d} stones={prep.stones} />,
  Border: ({ passage, ctx }: PassageProps) => <Shore passage={passage} width={ctx.width} />,
  Passage: ({ passage, ctx }: PassageProps) => <PierSprite passage={passage} width={ctx.width} />,
  Above: ({ prep }) => <DecorLayer decor={prep.decor} />,
  Backdrop: () => <SpriteBackdrop world="sea" ground={GROUND} patch={PATCH} />,
});
