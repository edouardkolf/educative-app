// Mer : deuxième monde, d'île en île. L'eau fonce en montant (lagon clair → bleu du large) ; le chemin
// devient un ponton de bois sur l'eau, qui relie de vraies îles de sable où il redevient un sentier de
// sable. Vie marine sous l'eau en silhouettes ; lieux : phare, coffre au trésor, baleine, voilier.
// Frontière d'arrivée (depuis la forêt) : plage et départ du ponton. Voir docs/specs/CARTE-MONDES.md.
import { BACKDROP_HEIGHT, BACKDROP_WIDTH, PATH_WIDTH, type Passage, type Point } from '../layout';
import { DECK_HALF, roomySide } from './common';
import {
  BeamLight,
  Chest,
  DEEP_LIFE,
  LAGOON,
  POST,
  PlaceDrawing,
  Posts,
  PropDrawing,
  SAND,
  SAND_DRY,
  SAND_WET,
  SeaDefs,
  WATER_SHADOW,
  WATER_STOPS,
  WOOD,
  WOOD_DARK,
} from './sea/draw';
import { UNDERWATER, planSea, type SeaPrep } from './sea/plan';
import type { JSX } from 'preact';
import { defineScene, type PassageProps, type SceneContext } from './types';

const SAND_PATH_EDGE = '#d4b77c';
const SAND_PATH_FILL = '#ead39f';
const SAND_PATH_WORN = '#f7ebc8';

const prefix = (ctx: SceneContext) => `sea-${ctx.band.worldIndex}-`;

function SeaGround({ ctx, prep }: { ctx: SceneContext; prep: SeaPrep }) {
  const { band, width } = ctx;
  const pre = prefix(ctx);
  const bandRect = `M -60 ${band.top - 120} H ${width + 60} V ${band.bottom + 120} H -60 Z`;
  return (
    <g data-world="sea">
      <defs>
        <linearGradient id={`${pre}water`} gradientUnits="userSpaceOnUse" x1="0" y1={band.bottom} x2="0" y2={band.top}>
          {WATER_STOPS.map(([o, c]) => (
            <stop key={o} offset={o} stop-color={c} />
          ))}
        </linearGradient>
        <SeaDefs pre={pre} />
        {prep.islandD.map((d, i) => (
          <path key={i} id={`${pre}isl${i}`} d={d} />
        ))}
        {/* Le ponton ne se dessine que sur l'eau, le sentier de sable que sur les îles. */}
        <clipPath id={`${pre}sea`}>
          <path d={`${bandRect} ${prep.islandD.join(' ')}`} clip-rule="evenodd" />
        </clipPath>
        <clipPath id={`${pre}land`}>
          {prep.islandD.map((_, i) => (
            <use key={i} href={`#${pre}isl${i}`} />
          ))}
        </clipPath>
      </defs>
      <rect x="0" y={band.top} width={width} height={band.bottom - band.top} fill={`url(#${pre}water)`} />
      <g fill="#1f6aa8" opacity="0.2">
        {prep.deeps.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
      {prep.places
        .filter((p) => UNDERWATER.includes(p.kind))
        .map((p, i) => (
          <PlaceDrawing key={i} place={p} pre={pre} />
        ))}
      {prep.waves.map((w, i) => (
        <use
          key={i}
          href={`#${pre}wave`}
          transform={`translate(${Math.round(w.x)} ${Math.round(w.y)}) scale(${(w.flip ? -w.scale : w.scale).toFixed(2)} ${w.scale.toFixed(2)})`}
        />
      ))}
      {/* Lagon clair autour des îles. */}
      <g fill="none" stroke={LAGOON} stroke-linejoin="round">
        {prep.islandD.map((_, i) => (
          <g key={i}>
            <use href={`#${pre}isl${i}`} stroke-width="64" stroke-opacity="0.28" />
            <use href={`#${pre}isl${i}`} stroke-width="30" stroke-opacity="0.6" />
          </g>
        ))}
      </g>
      {prep.islandD.map((_, i) => (
        <use key={i} href={`#${pre}isl${i}`} fill={SAND} stroke={SAND_WET} stroke-width="7" stroke-linejoin="round" />
      ))}
      <g fill={SAND_DRY}>
        {prep.innerD.map((d, i) => (d ? <path key={i} d={d} /> : null))}
      </g>
      <PostRings posts={prep.posts} />
    </g>
  );
}

/** Ronds dans l'eau au pied des pieux (sous le ponton). */
function PostRings({ posts }: { posts: readonly Point[] }) {
  if (posts.length === 0) return null;
  const d = posts.map((p) => `M${(p.x - 8).toFixed(1)} ${(p.y + 3).toFixed(1)}a8 2.6 0 1 0 16 0a8 2.6 0 1 0 -16 0`).join('');
  return <path d={d} fill="none" stroke="#ffffff" stroke-opacity="0.55" stroke-width="1.4" />;
}

/** Ponton de bois sur l'eau (ombre portée, bords, planches), sentier de sable sur les îles. */
function SeaPath({ ctx, prep }: { ctx: SceneContext; prep: SeaPrep }) {
  const pre = prefix(ctx);
  const { d } = ctx;
  return (
    <>
      <g clip-path={`url(#${pre}sea)`} fill="none" stroke-linejoin="round">
        <path d={d} stroke={WATER_SHADOW} stroke-width={PATH_WIDTH} transform="translate(3 7)" />
        <path d={d} stroke={WOOD_DARK} stroke-width={PATH_WIDTH} />
        <path d={d} stroke={WOOD} stroke-width={PATH_WIDTH - 8} />
        <path d={d} stroke={WOOD_DARK} stroke-opacity="0.65" stroke-width={PATH_WIDTH - 8} stroke-dasharray="1.6 9.4" />
      </g>
      <g clip-path={`url(#${pre}land)`} fill="none" stroke-linejoin="round" stroke-linecap="round">
        <path d={d} stroke={SAND_PATH_EDGE} stroke-width={PATH_WIDTH} />
        <path d={d} stroke={SAND_PATH_FILL} stroke-width={PATH_WIDTH - 8} />
        <path d={d} stroke={SAND_PATH_WORN} stroke-width="12" stroke-dasharray="38 26" opacity="0.8" />
      </g>
      {prep.landings.map((l, i) => (
        <use key={i} href={`#${pre}landing`} transform={`translate(${l.x} ${l.y}) rotate(${l.angle})`} />
      ))}
      <Posts posts={prep.posts} />
      {prep.decks.map((p, i) => (
        <use key={i} href={`#${pre}deck`} transform={`translate(${Math.round(p.x)} ${Math.round(p.y)})`} />
      ))}
    </>
  );
}

function SeaAbove({ ctx, prep }: { ctx: SceneContext; prep: SeaPrep }) {
  const pre = prefix(ctx);
  const items: Array<{ y: number; el: JSX.Element }> = [];
  prep.props.forEach((p, i) => items.push({ y: p.y, el: <PropDrawing key={`p${i}`} prop={p} pre={pre} /> }));
  prep.places.forEach((p, i) => {
    if (UNDERWATER.includes(p.kind)) return;
    items.push({ y: p.y, el: <PlaceDrawing key={`l${i}`} place={p} pre={pre} /> });
  });
  prep.gulls.forEach((g, i) =>
    items.push({
      y: g.y - 30,
      el: (
        <use
          key={`g${i}`}
          href={`#${pre}gull`}
          transform={`translate(${Math.round(g.x)} ${Math.round(g.y)}) scale(${g.flip ? -1 : 1} 1)`}
        />
      ),
    }),
  );
  items.sort((a, b) => a.y - b.y);
  return (
    <g data-world="sea">
      {prep.beam && <BeamLight beam={prep.beam} />}
      {items.map((it) => it.el)}
    </g>
  );
}

/** Bord haut de la plage (eau), plus haut sous le panneau d'entrée pour qu'il reste au sec. */
function beachTop(x: number, passage: Passage, sign: Point): number {
  return passage.y - 14 - 46 * Math.exp(-(((x - sign.x) / 60) ** 2)) + Math.sin(x / 37 + passage.worldIndex) * 2.5;
}

/** Vers la mer : la forêt finit sur une plage de sable, l'écume marque le bord de l'eau. */
function Beach({ passage, ctx }: PassageProps) {
  const { width, sign } = ctx;
  const { y } = passage;
  const xs: number[] = [];
  for (let x = -8; x <= width + 8; x += 8) xs.push(x);
  const top = xs.map((x) => `${x} ${beachTop(x, passage, sign).toFixed(1)}`);
  const bottom = xs.map((x) => `${x} ${(y + 26 + Math.sin(x / 41 + passage.worldIndex * 2) * 3).toFixed(1)}`).reverse();
  const shallow = xs.map((x) => `${x} ${(beachTop(x, passage, sign) - 18).toFixed(1)}`);
  const edge = `M ${top.join(' L ')}`;
  return (
    <g data-world="sea">
      <path d={`M ${shallow.join(' L ')} L ${[...top].reverse().join(' L ')} Z`} fill={LAGOON} opacity="0.7" />
      <path d={`M ${top.join(' L ')} L ${bottom.join(' L ')} Z`} fill={SAND} />
      <path d={edge} fill="none" stroke={SAND_WET} stroke-width="6" transform="translate(0 3)" />
      <path d={edge} fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round" stroke-opacity="0.95" />
      {[0.14, 0.86].map((f, k) => {
        const x = Math.round(width * f);
        if (Math.abs(x - passage.x) < 60 || Math.abs(x - sign.x) < 40) return null;
        return (
          <path key={k} transform={`translate(${x} ${Math.round(y + 12)})`} d="M -6 0 Q 0 -12 6 0 Z" fill="#ffc2c7" />
        );
      })}
    </g>
  );
}

/** Départ du ponton : about sur la plage, pieux, et une barque amarrée du côté libre. */
function PierStart({ passage, ctx }: PassageProps) {
  const side = -roomySide(passage, ctx.width);
  const half = PATH_WIDTH / 2;
  const boatX = side * (DECK_HALF + 40);
  return (
    <g transform={`translate(${Math.round(passage.x)} ${Math.round(passage.y)})`} data-world="sea">
      <rect x={-half - 3} y="-3.5" width={PATH_WIDTH + 6} height="7" rx="2.5" fill={WOOD_DARK} />
      {[-30, -62].map((py) =>
        [-1, 1].map((sx) => (
          <g key={`${py}${sx}`}>
            <ellipse cx={sx * (half + 1.5)} cy={py + 3} rx="8" ry="2.6" fill="none" stroke="#ffffff" stroke-opacity="0.6" stroke-width="1.4" />
            <circle cx={sx * (half + 1.5)} cy={py} r="3.8" fill={POST} />
          </g>
        )),
      )}
      {[-1, 1].map((sx) => (
        <circle key={sx} cx={sx * (half + 2)} cy="0" r="4.8" fill={POST} />
      ))}
      <g transform={`translate(${boatX} -40)`}>
        <path d={`M ${-side * 15} -1 Q ${-side * 26} 6 ${-side * (DECK_HALF + 40 - half - 4)} -22`} stroke={WOOD_DARK} stroke-width="1.3" fill="none" />
        <ellipse cx="2" cy="7" rx="22" ry="4.5" fill={WATER_SHADOW} />
        <path d="M -19 -3 Q 0 -6 19 -3 L 13 7 Q 0 9 -13 7 Z" fill="#e63946" />
        <path d="M -17 -3 Q 0 -5 17 -3 L 15 0 Q 0 -1 -15 0 Z" fill="#ffffff" />
        <path d="M -6 -1 L 6 -1" stroke={WOOD_DARK} stroke-width="2.4" stroke-linecap="round" />
        <path d="M -24 9 Q 0 15 24 9" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" opacity="0.7" />
      </g>
    </g>
  );
}

/** Le parcours finit en mer : un coffre au trésor ouvert au bout du chemin, sur sa petite île. */
function TreasureEnd({ at }: { at: Point }) {
  return (
    <g transform={`translate(${Math.round(at.x)} ${Math.round(at.y + 8)})`} data-testid="map-end">
      <Chest scale={1.7} mark={false} />
      <g fill="#fff2a8">
        <path d="M -30 -66 l 3 7 l 7 3 l -7 3 l -3 7 l -3 -7 l -7 -3 l 7 -3 Z" />
        <path d="M 30 -78 l 2 5 l 5 2 l -5 2 l -2 5 l -2 -5 l -5 -2 l 5 -2 Z" />
      </g>
    </g>
  );
}

/** Fond d'une partie : eau calme du lagon, coin d'île avec palmier, bancs de poissons, vaguelettes. */
function SeaBackdrop() {
  const pre = 'bd-sea-';
  const W = BACKDROP_WIDTH;
  const H = BACKDROP_HEIGHT;
  // Vaguelettes réparties à la main : un semis régulier, sans amas.
  const waves: Point[] = [
    [70, 70], [310, 110], [170, 200], [40, 300], [350, 340], [200, 410],
    [290, 520], [150, 560], [230, 740], [380, 590],
  ].map(([x, y]) => ({ x: x!, y: y! }));
  return (
    <>
      <defs>
        <linearGradient id={`${pre}water`} gradientUnits="userSpaceOnUse" x1="0" y1={H} x2="0" y2="0">
          <stop offset="0" stop-color="#a8e5e6" />
          <stop offset="1" stop-color="#6cc2e2" />
        </linearGradient>
        <SeaDefs pre={pre} />
      </defs>
      <rect x="0" y="0" width={W} height={H} fill={`url(#${pre}water)`} />
      <path d="M 300 0 C 360 40 420 60 420 140 L 420 0 Z M 420 300 C 340 330 300 420 340 500 C 370 560 420 560 420 560 Z" fill="#1f6aa8" opacity="0.14" />
      {[
        [300, 230, 1],
        [80, 470, -1],
      ].map(([x, y, s]) => (
        <g key={x} opacity="0.35" transform={`translate(${x} ${y}) scale(${s! * 1.3} 1.3)`}>
          {[
            [0, 0, 1],
            [22, 12, 0.8],
            [-14, 16, 0.9],
            [12, -14, 0.75],
          ].map(([fx, fy, fs]) => (
            <use key={`${fx}`} href={`#${pre}fish`} transform={`translate(${fx} ${fy}) scale(${fs})`} />
          ))}
        </g>
      ))}
      {waves.map((p, k) => (
        <use key={k} href={`#${pre}wave`} transform={`translate(${p.x.toFixed(0)} ${p.y.toFixed(0)}) scale(1.4)`} />
      ))}
      <path d="M -20 650 C 60 610 150 640 190 700 C 220 750 200 800 200 820 L -20 820 Z" fill="none" stroke={LAGOON} stroke-width="44" stroke-opacity="0.5" />
      <path d="M -20 650 C 60 610 150 640 190 700 C 220 750 200 800 200 820 L -20 820 Z" fill={SAND} stroke={SAND_WET} stroke-width="7" />
      <path d="M -20 690 C 50 660 130 680 160 720 C 180 750 172 800 172 820 L -20 820 Z" fill={SAND_DRY} />
      <use href={`#${pre}palm`} transform="translate(70 742) scale(1.6)" />
      <use href={`#${pre}gull`} transform="translate(236 40) scale(1.3)" />
      <use href={`#${pre}gull`} transform="translate(276 64) scale(-1 1)" />
      <use href={`#${pre}turtle`} fill={DEEP_LIFE} opacity="0.3" transform="translate(320 640) rotate(-30) scale(1.4)" />
    </>
  );
}

export const sea = defineScene<SeaPrep>({
  prepare: planSea,
  Ground: SeaGround,
  Path: SeaPath,
  Border: Beach,
  Passage: PierStart,
  Above: SeaAbove,
  End: ({ at }) => <TreasureEnd at={at} />,
  footprints: (prep) => prep.footprints,
  Backdrop: SeaBackdrop,
});
