// Montagne : chaînes lointaines (bleu de distance) et fond d'une partie.
import { BACKDROP_HEIGHT, BACKDROP_WIDTH } from '../../layout';
import { FOREST, MEADOW, MEADOW_LIGHT, MountainDefs, RANGE_FAR, RANGE_NEAR, SKY_LOW, SKY_TOP } from './drawings';

const r = (n: number) => Math.round(n * 10) / 10;

/** Un sommet lointain : flanc éclairé, flanc à l'ombre, calotte de neige dentelée. */
export function RangePeak({ x, tip, base, half, colors }: { x: number; tip: number; base: number; half: number; colors: readonly [string, string] }) {
  const s = half / (base - tip);
  const d = Math.min(110, (base - tip) * 0.32);
  const sd = s * d;
  const cap =
    `M ${r(x)} ${r(tip)} L ${r(x + sd)} ${r(tip + d)} L ${r(x + sd * 0.55)} ${r(tip + d * 0.86)} ` +
    `L ${r(x + sd * 0.18)} ${r(tip + d * 1.04)} L ${r(x - sd * 0.25)} ${r(tip + d * 0.84)} ` +
    `L ${r(x - sd * 0.62)} ${r(tip + d * 1.0)} L ${r(x - sd)} ${r(tip + d * 0.92)} Z`;
  return (
    <>
      <path d={`M ${r(x - half)} ${r(base)} L ${r(x)} ${r(tip)} L ${r(x + half)} ${r(base)} Z`} fill={colors[0]} />
      <path d={`M ${r(x)} ${r(tip)} L ${r(x + half)} ${r(base)} L ${r(x + half * 0.25)} ${r(base)} Z`} fill={colors[1]} />
      <path d={cap} fill="#ffffff" />
    </>
  );
}

/** Fond d'une partie : ciel, deux chaînes bleutées, une lisière de sapins et l'alpage au premier plan. */
export function MountainBackdrop() {
  const p = 'bd-mountain-';
  const W = BACKDROP_WIDTH;
  const H = BACKDROP_HEIGHT;
  const hills = `M -10 ${H} L -10 520 C 40 488 90 500 140 512 C 200 526 250 494 310 500 C 350 504 380 514 410 506 L 410 ${H} Z`;
  const meadow = `M -10 ${H} L -10 628 C 60 604 130 622 200 616 C 270 610 340 596 410 612 L 410 ${H} Z`;
  const pines: Array<[number, number, number]> = [
    [8, 522, 1.1], [34, 512, 0.95], [62, 516, 1.05], [300, 506, 1], [326, 510, 1.1], [354, 514, 0.95], [384, 512, 1.05],
    [110, 520, 0.85], [250, 508, 0.85],
  ];
  const flowers: Array<[number, number, string]> = [
    [40, 700, '#ff8fab'], [90, 752, '#ffd23f'], [150, 690, '#ffffff'], [262, 740, '#ff8fab'], [318, 686, '#ffd23f'], [372, 760, '#ffffff'],
    [200, 776, '#b48cf2'],
  ];
  return (
    <>
      <MountainDefs prefix={p} />
      <defs>
        <linearGradient id={`${p}sky`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="560">
          <stop offset="0" stop-color={SKY_TOP} />
          <stop offset="1" stop-color={SKY_LOW} />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width={W} height={H} fill={`url(#${p}sky)`} />
      <use href={`#${p}cloud`} transform="translate(72 130) scale(1.3)" />
      <use href={`#${p}cloud`} transform="translate(336 96)" />
      <use href={`#${p}cloud`} transform="translate(214 206) scale(0.8)" />
      <RangePeak x={46} tip={246} base={640} half={190} colors={RANGE_FAR} />
      <RangePeak x={350} tip={226} base={640} half={200} colors={RANGE_FAR} />
      <RangePeak x={196} tip={300} base={640} half={170} colors={RANGE_FAR} />
      <RangePeak x={-30} tip={350} base={640} half={170} colors={RANGE_NEAR} />
      <RangePeak x={128} tip={392} base={640} half={160} colors={RANGE_NEAR} />
      <RangePeak x={276} tip={372} base={640} half={170} colors={RANGE_NEAR} />
      <RangePeak x={430} tip={340} base={640} half={170} colors={RANGE_NEAR} />
      <path d={hills} fill={FOREST} />
      {pines.map(([x, y, s]) => (
        <use key={x} href={`#${p}pine`} transform={`translate(${x} ${y}) scale(${s})`} />
      ))}
      <path d={meadow} fill={MEADOW} />
      <ellipse cx="96" cy="716" rx="120" ry="44" fill={MEADOW_LIGHT} />
      <ellipse cx="330" cy="748" rx="110" ry="40" fill={MEADOW_LIGHT} />
      {flowers.map(([x, y, c]) => (
        <use key={x} href={`#${p}flower`} fill={c} transform={`translate(${x} ${y}) scale(1.5)`} />
      ))}
      <use href={`#${p}cow`} transform="translate(56 664) scale(1.2)" />
      <use href={`#${p}tree`} transform="translate(372 650) scale(1.1)" />
    </>
  );
}
