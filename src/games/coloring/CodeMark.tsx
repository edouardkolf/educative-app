// Code magique d'une case non peinte (docs/specs/COLORIAGE.md §2.3, §3.4). Un bouton HTML au-dessus
// du SVG, centré sur l'ancre : diamètre visuel = 10 % du dessin (≥ 30 px), zone tapable ≥ 72 px,
// comme les emplacements agrandis du constructeur (`bld-slot-hit`).
import type { Color } from '../../engine/types';
import { OBJECT_FOR_COLOR, TargetDrop } from '../../mechanics/color-mix/parts';
import { Emoji } from '../../ui/Emoji';
import { COLOR_HEX } from '../../ui/palette';
import { recipeFor } from '../../mechanics/color-mix/generate';
import type { CodeSymbol } from './model';
import type { ColoringTier } from '../../storage/colorings';
import { HIT_RADIUS_PX } from './model';
import { dotPositions } from '../../mechanics/count/generate';

const HIT_PX = HIT_RADIUS_PX * 2; // 72 px, cible tactile minimale

// Repris de src/ui/Shape.tsx (shapeInner) : Shape impose une couleur, alors que le code est au trait.
function starPoints(cx: number, cy: number, outerR: number, innerR: number): string {
  const points: string[] = [];
  for (let i = 0; i < 10; i += 1) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    points.push(`${(cx + r * Math.cos(angle)).toFixed(2)},${(cy + r * Math.sin(angle)).toFixed(2)}`);
  }
  return points.join(' ');
}
const STAR_POINTS = starPoints(50, 50, 44, 18.5);
const HEART_PATH =
  'M 50 88 C 50 88 10 58 10 32 C 10 14 26 6 40 6 C 48 6 50 14 50 20 ' +
  'C 50 14 52 6 60 6 C 74 6 90 14 90 32 C 90 58 50 88 50 88 Z';

function ShapeOutline({ shape }: { shape: Exclude<CodeSymbol, `dice-${number}`> }) {
  const common = { fill: 'none', stroke: 'var(--ink)', 'stroke-width': 6, 'stroke-linejoin': 'round' as const };
  switch (shape) {
    case 'circle':
      return <circle cx={50} cy={50} r={40} {...common} />;
    case 'square':
      return <rect x={11} y={11} width={78} height={78} rx={14} ry={14} {...common} />;
    case 'triangle':
      return <polygon points="50,10 90,88 10,88" {...common} />;
    case 'diamond':
      return <polygon points="50,7 93,50 50,93 7,50" {...common} />;
    case 'star':
      return <polygon points={STAR_POINTS} {...common} />;
    case 'heart':
      return <path d={HEART_PATH} {...common} />;
    default:
      return null;
  }
}

function DiceOutline({ symbol }: { symbol: `dice-${1 | 2 | 3 | 4 | 5 | 6}` }) {
  const n = Number(symbol.slice('dice-'.length));
  const dots = dotPositions(n);
  return (
    <g>
      <rect x={6} y={6} width={88} height={88} rx={14} fill="none" stroke="var(--ink)" stroke-width={5} />
      {dots.map((d, i) => (
        <circle key={i} cx={10 + d.x * 80} cy={10 + d.y * 80} r={7} fill="var(--ink)" />
      ))}
    </g>
  );
}

export interface CodeMarkProps {
  zoneId: string;
  target: Color;
  tier: ColoringTier;
  /** Symbole de légende (paliers 3-4), issu de `legendFor`. */
  symbol: CodeSymbol | undefined;
  /** Position de l'ancre, en pourcentage du dessin. */
  xPct: number;
  yPct: number;
  /** Diamètre visuel en px (10 % du dessin, ≥ 30 px). */
  visualPx: number;
  /** Indice en cours (aide de niveau 1) : l'objet reprend sa couleur, ou le code pulse. */
  hinted: boolean;
  onTap: () => void;
}

/** Le code magique d'une case (goutte, objet gris, forme ou dé), tapable directement. */
export function CodeMark({ zoneId, target, tier, symbol, xPct, yPct, visualPx, hinted, onTap }: CodeMarkProps) {
  const recipe = recipeFor(target);
  return (
    <button
      type="button"
      class={`clr-code${hinted ? ' clr-code--hint' : ''}`}
      data-choice={`zone-${zoneId}`}
      data-target={target}
      data-recipe={recipe.join(',')}
      style={{ left: `${xPct}%`, top: `${yPct}%`, width: `${HIT_PX}px`, height: `${HIT_PX}px` }}
      onClick={onTap}
    >
      <span class="clr-code__visual" style={{ width: `${visualPx}px`, height: `${visualPx}px` }} aria-hidden="true">
        {tier === 1 && <TargetDrop color={COLOR_HEX[target]} />}
        {tier === 2 && (
          <Emoji char={OBJECT_FOR_COLOR[target]} class={hinted ? undefined : 'clr-code__gray'} />
        )}
        {tier >= 3 && symbol && !symbol.startsWith('dice-') && (
          <svg viewBox="0 0 100 100">
            <ShapeOutline shape={symbol as Exclude<CodeSymbol, `dice-${number}`>} />
          </svg>
        )}
        {tier === 4 && symbol && symbol.startsWith('dice-') && (
          <svg viewBox="0 0 100 100">
            <DiceOutline symbol={symbol as `dice-${1 | 2 | 3 | 4 | 5 | 6}`} />
          </svg>
        )}
      </span>
    </button>
  );
}
