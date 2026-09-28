// Pictos des tuiles de jeu du hub (docs/specs/HUB.md §2.1). Même style que MechanicIcon : aplats, un
// reflet clair, pas de contour noir, viewBox 48. Doivent se distinguer de la fiole de `color-mix`.
import type { JSX } from 'preact';
import type { GameId } from '../../games';

const SHADOW = 'rgba(61, 44, 30, 0.14)';

const DRAWINGS: Record<GameId, () => JSX.Element> = {
  // Dictée : une page de cahier à lignes, un crayon, deux arcs de son (la voix dictée).
  dictation: () => (
    <>
      <ellipse cx="24" cy="42.5" rx="16" ry="2.5" fill={SHADOW} />
      <rect x="8" y="7" width="27" height="34" rx="3" fill="#fff7e8" stroke="#e6dcc4" stroke-width="1.5" />
      <path d="M13 15H30M13 20.5H30M13 26H26" stroke="#bcd6e8" stroke-width="1.8" stroke-linecap="round" />
      <path d="M13 15H30" stroke="#e63946" stroke-width="1.4" stroke-linecap="round" opacity="0.35" />
      <g transform="rotate(38 33 30)">
        <rect x="30.5" y="10" width="7" height="24" rx="2" fill="#ffc53d" />
        <rect x="30.5" y="10" width="7" height="6" fill="#f2a516" />
        <path d="M30.5 34H37.5L34 41Z" fill="#f5d6a8" />
        <path d="M32.7 38.2L34 41L35.3 38.2Z" fill="#5a3a12" />
      </g>
      <path d="M38 16Q41.5 20 38 24" fill="none" stroke="#f59f00" stroke-width="2.6" stroke-linecap="round" />
      <path d="M41.5 12.5Q47.5 20 41.5 27.5" fill="none" stroke="#f59f00" stroke-width="2.6" stroke-linecap="round" />
    </>
  ),
  // Coloriage : un dessin à zones à moitié colorié, un pinceau, trois gouttes primaires.
  coloring: () => (
    <>
      <ellipse cx="24" cy="42.5" rx="17" ry="2.5" fill={SHADOW} />
      <path
        d="M7.5 34.5V11.5Q7.5 8.5 10.5 8.5H31.5Q34.5 8.5 34.5 11.5V34.5Q34.5 37.5 31.5 37.5H10.5Q7.5 37.5 7.5 34.5Z"
        fill="#fff7e8"
        stroke="#e6dcc4"
        stroke-width="1.5"
      />
      <path d="M7.5 23H21V37.5H10.5Q7.5 37.5 7.5 34.5Z" fill="#ffe38f" />
      <path d="M21 8.5H31.5Q34.5 8.5 34.5 11.5V23H21Z" fill="#8ecfe8" />
      <path d="M13 23V37.5" stroke="#e6dcc4" stroke-width="1.4" />
      <path d="M21 8.5V37.5M7.5 23H34.5" stroke="#c9bfad" stroke-width="1.4" />
      <g transform="rotate(-30 39 33)">
        <rect x="36.5" y="10" width="5" height="20" rx="2" fill="#a6978a" />
        <path d="M35 28H43L40.5 38.5Q39 41.5 37.5 38.5Z" fill="#e63946" />
      </g>
      <circle cx="11" cy="6.5" r="3.4" fill="#e63946" />
      <circle cx="19" cy="4.5" r="3.4" fill="#f2c94c" />
      <circle cx="27" cy="6.5" r="3.4" fill="#1d7fd8" />
    </>
  ),
};

export function GameIcon({ id, size = 112 }: { id: GameId; size?: number }) {
  const draw = DRAWINGS[id];
  return (
    <svg class={`game-icon game-icon--${id}`} viewBox="0 0 48 48" width={size} height={size} aria-hidden="true" focusable="false">
      {draw()}
    </svg>
  );
}
