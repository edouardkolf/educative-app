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
  // Morpion : une grille de 3 × 3 sur un plateau, des croix rouges et des ronds bleus, trois alignés.
  tictactoe: () => (
    <>
      <ellipse cx="24" cy="43" rx="17" ry="2.5" fill={SHADOW} />
      <rect x="5" y="4" width="38" height="38" rx="7" fill="#fff7e8" stroke="#e6dcc4" stroke-width="1.5" />
      <path d="M17.7 8.5V37.5M30.3 8.5V37.5M9.5 16.7H38.5M9.5 29.3H38.5" stroke="#c9bfad" stroke-width="2.2" stroke-linecap="round" />
      <path d="M8.5 7.5L14 13M14 7.5L8.5 13" stroke="#e63946" stroke-width="3" stroke-linecap="round" />
      <path d="M21.2 20.2L26.8 25.8M26.8 20.2L21.2 25.8" stroke="#e63946" stroke-width="3" stroke-linecap="round" />
      <path d="M33.8 32.8L39.4 38.4M39.4 32.8L33.8 38.4" stroke="#e63946" stroke-width="3" stroke-linecap="round" />
      <circle cx="36.6" cy="10.4" r="3.4" fill="none" stroke="#1d7fd8" stroke-width="2.8" />
      <circle cx="11.2" cy="35.6" r="3.4" fill="none" stroke="#1d7fd8" stroke-width="2.8" />
      <path d="M8 6L40 40" stroke="#ffc53d" stroke-width="2" stroke-linecap="round" opacity="0.7" />
    </>
  ),
  // Pendu : une fleur à pétales (une erreur = un pétale qui tombe) au-dessus de trois cases de lettres.
  hangman: () => (
    <>
      <ellipse cx="24" cy="43.5" rx="17" ry="2.3" fill={SHADOW} />
      <path d="M24 22V31" stroke="#5aa469" stroke-width="2.4" stroke-linecap="round" />
      <path d="M24 28Q19 24.5 16.5 27Q20 30 24 29" fill="#7cc48a" />
      <g fill="#ff8fab">
        <ellipse cx="24" cy="7.2" rx="3.6" ry="5" />
        <ellipse cx="24" cy="7.2" rx="3.6" ry="5" transform="rotate(60 24 14)" />
        <ellipse cx="24" cy="7.2" rx="3.6" ry="5" transform="rotate(120 24 14)" />
        <ellipse cx="24" cy="7.2" rx="3.6" ry="5" transform="rotate(180 24 14)" />
        <ellipse cx="24" cy="7.2" rx="3.6" ry="5" transform="rotate(240 24 14)" />
      </g>
      <ellipse cx="33" cy="25.5" rx="3.4" ry="2.2" fill="#ffb3c6" transform="rotate(35 33 25.5)" />
      <circle cx="24" cy="14" r="4.6" fill="#ffc53d" />
      <circle cx="22.6" cy="12.6" r="1.4" fill="#fff3c4" />
      <rect x="6" y="32.5" width="10" height="9" rx="2.2" fill="#ffffff" stroke="#e6dcc4" stroke-width="1.2" />
      <rect x="19" y="32.5" width="10" height="9" rx="2.2" fill="#ffffff" stroke="#e6dcc4" stroke-width="1.2" />
      <rect x="32" y="32.5" width="10" height="9" rx="2.2" fill="#ffffff" stroke="#e6dcc4" stroke-width="1.2" />
      <path d="M21 39.5L24 34.5L27 39.5M22.2 37.6H25.8" fill="none" stroke="#1d7fd8" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M8.5 39.4H13.5M34.5 39.4H39.5" stroke="#a6978a" stroke-width="1.8" stroke-linecap="round" />
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
