// Pièces visuelles du laboratoire des couleurs, réutilisées par le coloriage magique (Atelier.tsx) :
// fioles, récipient (Erlenmeyer) et goutte-cible. Extrait de ColorMixView.tsx (docs/specs/COLORIAGE.md
// §6.4) : DOM et comportement inchangés dans ColorMixView, qui importe désormais ces pièces d'ici.
import { useRef } from 'preact/hooks';
import type { Color } from '../../engine/types';
import { COLOR_HEX } from '../../ui/palette';

/** Objet géant qui jaillit du chaudron, un par couleur possible (résultat d'un mélange ou primaire pur). */
export const OBJECT_FOR_COLOR: Record<Color, string> = {
  red: '🍎',
  yellow: '🍌',
  blue: '🫐',
  orange: '🥕',
  green: '🐸',
  purple: '🍇',
};

/** Goutte : pointe en haut, ventre rond en bas (viewBox 48 × 56). */
export const DROP_D = 'M24 3C24 3 42 23 42 35.5A18 18 0 0 1 6 35.5C6 23 24 3 24 3Z';

const GLASS = '#a9d3ea';

/** Fiole à fond rond (viewBox 48 × 56) : col droit puis boule. */
const VIAL_D = 'M18 8V22A17 17 0 1 0 30 22V8Z';
const GLASS_FILL = 'rgba(234, 246, 253, 0.7)';

/** Erlenmeyer (viewBox 160 × 190) : col étroit, ventre large, coins arrondis. Sert aussi de masque au liquide. */
const ERLEN_D = 'M62 16V64L18 150Q9 176 36 176H124Q151 176 142 150L98 64V16Z';

export type LiquidLevel = 'empty' | 'half' | 'full';
export type LiquidFill = { kind: 'solid'; color: string } | { kind: 'swirl'; from: string; to: string };

/** Haut du liquide (ordonnée dans le viewBox) pour chaque niveau. */
const LEVEL_TOP: Record<LiquidLevel, number> = { empty: 184, half: 134, full: 84 };

let erlenmeyerIds = 0;

export function Erlenmeyer({
  level,
  fill,
  mixing,
  splashKey,
}: {
  level: LiquidLevel;
  fill: LiquidFill;
  mixing: boolean;
  splashKey: number | null;
}) {
  // Identifiants SVG propres à l'instance (masque, dégradé) : jamais de collision entre deux manches.
  const idRef = useRef<string | null>(null);
  if (idRef.current === null) {
    erlenmeyerIds += 1;
    idRef.current = `cmx-${erlenmeyerIds}`;
  }
  const id = idRef.current;
  const paint = fill.kind === 'solid' ? fill.color : `url(#${id}-swirl)`;

  return (
    <svg class="cmx-erlen" viewBox="0 0 160 190" aria-hidden="true">
      <defs>
        <clipPath id={`${id}-clip`}>
          <path d={ERLEN_D} />
        </clipPath>
        {fill.kind === 'swirl' && (
          <linearGradient id={`${id}-swirl`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0.2" stop-color={fill.from} />
            <stop offset="0.8" stop-color={fill.to} />
          </linearGradient>
        )}
      </defs>

      <ellipse cx="80" cy="182" rx="62" ry="6" fill="rgba(61, 44, 30, 0.14)" />
      <path d={ERLEN_D} fill={GLASS_FILL} />

      <g clip-path={`url(#${id}-clip)`}>
        <g class="cmx-liquid" style={{ transform: `translateY(${LEVEL_TOP[level]}px)` }}>
          <g class="cmx-liquid__wave">
            <path
              d="M-60 0Q-45 -7 -30 0T0 0T30 0T60 0T90 0T120 0T150 0T180 0T210 0V120H-60Z"
              style={{ fill: paint }}
              class="cmx-liquid__body"
            />
          </g>
          {/* Reflet clair à la surface du liquide. */}
          <path d="M-60 6H220" stroke="#ffffff" stroke-width="3" opacity="0.25" />
          {splashKey !== null && level !== 'empty' && (
            <ellipse key={splashKey} class="cmx-splash" cx="80" cy="0" rx="22" ry="5" fill="none" stroke="#ffffff" stroke-width="3" />
          )}
          {mixing && (
            <g class="cmx-bubbles">
              <circle cx="54" cy="70" r="6" />
              <circle cx="84" cy="80" r="4.5" />
              <circle cx="104" cy="66" r="5.5" />
              <circle cx="70" cy="86" r="3.5" />
            </g>
          )}
        </g>
      </g>

      {/* Verre par-dessus le liquide : contour, graduations, reflet, col. */}
      <path d={ERLEN_D} fill="none" stroke={GLASS} stroke-width="5" stroke-linejoin="round" />
      <path d="M112 112H122M117 128H127M122 144H132" stroke={GLASS} stroke-width="3" stroke-linecap="round" />
      <path d="M36 150L68 88" stroke="#ffffff" stroke-width="7" stroke-linecap="round" opacity="0.75" />
      <path d="M69 26V56" stroke="#ffffff" stroke-width="5" stroke-linecap="round" opacity="0.75" />
      <rect x="55" y="6" width="50" height="13" rx="6.5" fill={GLASS} />
    </svg>
  );
}

/** La couleur à obtenir : une grosse goutte qui respire. */
export function TargetDrop({ color }: { color: string }) {
  return (
    <svg class="cmx-target__drop" viewBox="0 0 48 56" aria-hidden="true">
      <path d={DROP_D} fill={color} />
      <path d="M24 44.5A9 9 0 0 0 33 35.5" fill="none" stroke="#000000" stroke-opacity="0.12" stroke-width="4" stroke-linecap="round" />
      <ellipse cx="16.5" cy="32" rx="3.8" ry="6.5" transform="rotate(20 16.5 32)" fill="#ffffff" opacity="0.6" />
    </svg>
  );
}

export function Flask({
  color,
  poured,
  disabled,
  onTap,
}: {
  color: Color;
  poured: boolean;
  disabled: boolean;
  onTap: (color: Color) => void;
}) {
  const hex = COLOR_HEX[color];
  // Fiole à fond rond (viewBox 48 × 56) ; une fois versée, il n'en reste qu'un fond.
  const clipId = `cmx-vial-${color}`;
  return (
    <button
      type="button"
      class={`cmx-flask${poured ? ' cmx-flask--poured' : ''}`}
      data-choice={color}
      disabled={disabled}
      onClick={() => onTap(color)}
    >
      <svg class="cmx-flask__glass" viewBox="0 0 48 56" aria-hidden="true">
        <ellipse cx="24" cy="54" rx="13" ry="2" fill="rgba(61, 44, 30, 0.12)" />
        <defs>
          <clipPath id={clipId}>
            <path d={VIAL_D} />
          </clipPath>
        </defs>
        <path d={VIAL_D} fill={GLASS_FILL} />
        <g clip-path={`url(#${clipId})`}>
          <rect
            x="0"
            y="28"
            width="48"
            height="30"
            fill={hex}
            class="cmx-flask__liquid"
            style={{ transform: `translateY(${poured ? 19 : 0}px)` }}
          />
        </g>
        <path d={VIAL_D} fill="none" stroke={GLASS} stroke-width="2.5" stroke-linejoin="round" />
        <path d="M12.5 33A12 12 0 0 1 16.5 25.5" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity="0.8" />
        <rect x="16" y="2" width="16" height="8.5" rx="3" fill="#c98a4b" />
        <rect x="16" y="2" width="16" height="3.5" rx="1.75" fill="#dba36a" />
      </svg>
    </button>
  );
}
