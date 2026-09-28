// Légende du code magique (paliers 3-4, docs/specs/COLORIAGE.md §2.3) : une entrée par couleur du
// dessin, symbole au trait au-dessus d'une goutte `TargetDrop`. Non tapable, hauteur ≥ 40 px.
import type { Color } from '../../engine/types';
import { COLORS } from '../../engine/types';
import { TargetDrop } from '../../mechanics/color-mix/parts';
import { COLOR_HEX } from '../../ui/palette';
import type { CodeSymbol } from './model';
import { dotPositions } from '../../mechanics/count/generate';

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

function symbolInner(symbol: CodeSymbol) {
  if (symbol.startsWith('dice-')) {
    const n = Number(symbol.slice('dice-'.length));
    return (
      <g>
        <rect x={6} y={6} width={88} height={88} rx={14} fill="none" stroke="var(--ink)" stroke-width={5} />
        {dotPositions(n).map((d, i) => (
          <circle key={i} cx={10 + d.x * 80} cy={10 + d.y * 80} r={7} fill="var(--ink)" />
        ))}
      </g>
    );
  }
  const common = { fill: 'none', stroke: 'var(--ink)', 'stroke-width': 6, 'stroke-linejoin': 'round' as const };
  switch (symbol) {
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

export interface LegendProps {
  legend: Partial<Record<Color, CodeSymbol>>;
  /** Couleur dont l'entrée pulse (aide graduée). */
  hinted: Color | null;
}

/** Une entrée par couleur, dans l'ordre de `COLORS`. */
export function Legend({ legend, hinted }: LegendProps) {
  const entries = COLORS.filter((c) => legend[c] !== undefined);
  return (
    <div class="clr-legend" aria-hidden="true">
      {entries.map((color) => {
        const symbol = legend[color] as CodeSymbol;
        return (
          <div key={color} class={`clr-legend__entry${hinted === color ? ' clr-legend__entry--hint' : ''}`} data-choice={`legend-${color}`}>
            <svg class="clr-legend__symbol" viewBox="0 0 100 100">
              {symbolInner(symbol)}
            </svg>
            <span class="clr-legend__drop">
              <TargetDrop color={COLOR_HEX[color]} />
            </span>
          </div>
        );
      })}
    </div>
  );
}
