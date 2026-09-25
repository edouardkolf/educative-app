// Formes SVG partagées (comptage, suites, intrus). Toujours décoratif : aria-hidden.
import type { Color, Shape as ShapeName } from '../engine/types';
import { COLOR_HEX } from './palette';

/** Contour un peu plus sombre que le remplissage, pour le contraste. */
function darken(hex: string, factor: number): string {
  const n = parseInt(hex.slice(1), 16);
  const channel = (shift: number) => Math.round(((n >> shift) & 0xff) * factor);
  return `#${[channel(16), channel(8), channel(0)].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

const STROKE_HEX: Record<Color, string> = Object.fromEntries(
  Object.entries(COLOR_HEX).map(([color, hex]) => [color, darken(hex, 0.65)]),
) as Record<Color, string>;

// Une étoile à 5 branches, points calculés une fois (indépendants de `size`, le viewBox fait l'échelle).
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

function shapeInner(shape: ShapeName) {
  switch (shape) {
    case 'circle':
      return <circle cx={50} cy={50} r={42} />;
    case 'square':
      return <rect x={9} y={9} width={82} height={82} rx={16} ry={16} />;
    case 'triangle':
      return <polygon points="50,8 92,90 8,90" strokeLinejoin="round" />;
    case 'diamond':
      return <polygon points="50,6 94,50 50,94 6,50" strokeLinejoin="round" />;
    case 'star':
      return <polygon points={STAR_POINTS} strokeLinejoin="round" />;
    case 'heart':
      return <path d={HEART_PATH} strokeLinejoin="round" />;
    default:
      return null;
  }
}

export function Shape(props: { shape: ShapeName; color: Color; size?: number }) {
  const size = props.size ?? 48;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-hidden="true"
      focusable="false"
    >
      <g fill={COLOR_HEX[props.color]} stroke={STROKE_HEX[props.color]} strokeWidth={4}>
        {shapeInner(props.shape)}
      </g>
    </svg>
  );
}
