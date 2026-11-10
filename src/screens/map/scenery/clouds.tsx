// Nuages : quatrième et dernier monde, du jour à la nuit ; le parcours s'y achève au château de nuages.
// Le ciel change en montant (jour bleu, coucher de soleil pêche et rose, nuit violette puis bleu nuit) ;
// nuages et chemin prennent la teinte de leur étape (dégradés aux coordonnées de la carte).
// Lieux : arc-en-ciel au-dessus du chemin, montgolfière, soleil couchant, fusée, lune, étoile filante.
// Frontière d'arrivée : l'échelle plantée au sommet de la montagne perce une mer de nuages.
import { BACKDROP_HEIGHT, BACKDROP_WIDTH } from '../layout';
import {
  Balloon,
  Birds,
  CastleDraw,
  CloudGroup,
  CloudPathDraw,
  CloudSea,
  CloudsDefs,
  Gradient,
  Ladder,
  Moon,
  RainbowArc,
  Rocket,
  SKY,
  ShootingStar,
  StarDots,
  Sun,
  circleD,
  sunCloud,
} from './clouds/drawings';
import { prepareClouds, rainbowFeet, type Cloud, type CloudsPrep } from './clouds/geometry';
import { defineScene, type PassageProps } from './types';

/** Étincelles (étoiles à quatre branches) semées dans la nuit. */
function Sparks({ id, sparks }: { id: string; sparks: CloudsPrep['sparks'] }) {
  return (
    <>
      {sparks.map((s, i) => (
        <use key={i} href={`#${id}spark`} transform={`translate(${Math.round(s.x)} ${Math.round(s.y - 8)}) scale(${(s.scale * 0.8).toFixed(2)})`} />
      ))}
    </>
  );
}

/** Fond d'une partie : un ciel de fin d'après-midi, des bancs de nuages sur les bords, rien au centre. */
function Backdrop() {
  const id = 'bd-clouds-';
  const clouds: Cloud[] = [
    { x: 30, y: 760, s: 2.4, flip: false, shape: 1 },
    { x: 380, y: 610, s: 1.9, flip: true, shape: 1 },
    { x: 330, y: 790, s: 1.5, flip: true, shape: 0 },
    { x: 40, y: 430, s: 1.6, flip: false, shape: 0 },
    { x: 372, y: 300, s: 2.1, flip: true, shape: 1 },
    { x: 20, y: 150, s: 1.8, flip: false, shape: 1 },
    { x: 250, y: 120, s: 1.1, flip: true, shape: 0 },
    { x: 150, y: 560, s: 0.9, flip: false, shape: 0 },
  ];
  const sky: typeof SKY = [
    [0, '#c4e4fa'],
    [0.35, '#d9ecfb'],
    [0.62, '#ffe7cc'],
    [0.82, '#fcd2d4'],
    [1, '#e2d3f2'],
  ];
  return (
    <>
      <CloudsDefs id={id} bottom={1657} top={-1200} />
      <defs>
        <Gradient id={`${id}bsky`} stops={sky} bottom={BACKDROP_HEIGHT} top={0} />
      </defs>
      <rect x="0" y="0" width={BACKDROP_WIDTH} height={BACKDROP_HEIGHT} fill={`url(#${id}bsky)`} />
      <path d={[[60, 60], [300, 40], [180, 210], [350, 180], [90, 300]].map(([x, y]) => circleD(x!, y!, 1.8)).join('')} fill="#ffffff" />
      <use href={`#${id}spark`} transform="translate(120 90) scale(1.2)" />
      <use href={`#${id}spark`} transform="translate(320 110) scale(0.9)" />
      <CloudGroup id={id} clouds={clouds} />
      <Birds birds={[{ x: 110, y: 690, scale: 1.4, flip: false }, { x: 140, y: 676, scale: 1.1, flip: false }, { x: 290, y: 470, scale: 1.2, flip: true }]} />
    </>
  );
}

export const clouds = defineScene<CloudsPrep>({
  prepare: prepareClouds,
  Ground: ({ ctx, prep }) => {
    const { band, width } = ctx;
    const { id } = prep;
    return (
      <g data-world={band.world}>
        <CloudsDefs id={id} bottom={band.bottom} top={band.top} />
        <rect x="-4" y={band.top} width={width + 8} height={band.bottom - band.top} fill={`url(#${id}sky)`} />
        <StarDots stars={prep.stars} />
        {prep.sun && <Sun at={prep.sun} />}
        {prep.moon && <Moon at={prep.moon} />}
        {prep.shooting && <ShootingStar id={id} at={prep.shooting} />}
        {prep.rainbow && <RainbowArc rb={prep.rainbow} />}
      </g>
    );
  },
  Path: ({ ctx, prep }) => <CloudPathDraw id={prep.id} d={ctx.d} />,
  Border: ({ passage, ctx }: PassageProps) => <CloudSea passage={passage} width={ctx.width} back />,
  Passage: ({ passage, ctx }: PassageProps) => (
    <g>
      <Ladder passage={passage} />
      <CloudSea passage={passage} width={ctx.width} back={false} />
    </g>
  ),
  Above: ({ prep }) => {
    const { id } = prep;
    const big: Cloud[] = [
      ...prep.banks,
      ...(prep.rainbow ? rainbowFeet(prep.rainbow) : []),
      ...(prep.sun ? [sunCloud(prep.sun, prep.sun.side)] : []),
    ];
    return (
      <g>
        <Sparks id={id} sparks={prep.sparks} />
        <Birds birds={prep.birds} />
        <CloudGroup id={id} clouds={prep.clouds} />
        <CloudGroup id={id} clouds={big} />
        {prep.balloon && <Balloon at={prep.balloon} />}
        {prep.rocket && <Rocket at={prep.rocket} />}
      </g>
    );
  },
  End: ({ prep }) => (prep.castle ? <CastleDraw id={prep.id} castle={prep.castle} /> : null),
  footprints: (prep) => prep.footprints,
  Backdrop,
});
