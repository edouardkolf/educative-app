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
  // Devine le nombre : une grande bulle « ? » et des chiffres qui flottent autour.
  'guess-number': () => (
    <>
      <ellipse cx="24" cy="43.5" rx="14" ry="2.3" fill={SHADOW} />
      <path d="M8 8H40Q44 8 44 12V29Q44 33 40 33H29L22 41L22.5 33H8Q4 33 4 29V12Q4 8 8 8Z" fill="#ffc53d" />
      <path d="M8 8H40Q44 8 44 12V15H4V12Q4 8 8 8Z" fill="#ffd978" />
      <path d="M18.5 16.5Q18.5 11.5 24 11.5Q29.5 11.5 29.5 16Q29.5 19.5 24 21.5V24" fill="none" stroke="#7a4b00" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" />
      <circle cx="24" cy="28.6" r="2.2" fill="#7a4b00" />
      {/* Chiffres dessinés en traits (pas de <text>) : le hub ne contient aucun texte (HUB.md §3, règle 2). */}
      <g fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M7 18H14.5L10.5 26" stroke="#e63946" />
        <path d="M33.5 18H40L36.8 21.4Q41 21.6 41 24Q41 26.4 37.2 26.4Q34.8 26.4 33.6 25" stroke="#1d7fd8" />
      </g>
    </>
  ),
  // Code secret : quatre pions colorés dans une rangée, cachés à moitié derrière un cadenas.
  'code-breaker': () => (
    <>
      <ellipse cx="24" cy="43.5" rx="18" ry="2.3" fill={SHADOW} />
      <rect x="3" y="26" width="42" height="14" rx="7" fill="#fff7e8" stroke="#e6dcc4" stroke-width="1.5" />
      <circle cx="10.5" cy="33" r="4.4" fill="#e63946" />
      <circle cx="21" cy="33" r="4.4" fill="#1d7fd8" />
      <circle cx="31.5" cy="33" r="4.4" fill="#2faa5a" />
      <circle cx="9" cy="31.5" r="1.3" fill="#ff9aa3" />
      <circle cx="19.5" cy="31.5" r="1.3" fill="#8cc4f2" />
      <circle cx="30" cy="31.5" r="1.3" fill="#9de0b4" />
      <path d="M16.5 17V13.5Q16.5 6 24 6Q31.5 6 31.5 13.5V17" fill="none" stroke="#a6978a" stroke-width="4" stroke-linecap="round" />
      <rect x="11" y="15.5" width="26" height="17" rx="5" fill="#ffc53d" />
      <rect x="11" y="15.5" width="26" height="7" rx="5" fill="#ffd978" />
      <circle cx="24" cy="23.5" r="2.6" fill="#7a4b00" />
      <rect x="22.8" y="24" width="2.4" height="5" rx="1.2" fill="#7a4b00" />
      <circle cx="39.5" cy="33" r="3.2" fill="#f59f00" />
      <circle cx="38.7" cy="32.2" r="1" fill="#ffe38f" />
    </>
  ),
  // Robot : un petit robot, une flèche, un coffre au trésor.
  robot: () => (
    <>
      <ellipse cx="24" cy="43.5" rx="19" ry="2.3" fill={SHADOW} />
      <path d="M24 5V8" stroke="#8b86e8" stroke-width="2" stroke-linecap="round" />
      <circle cx="24" cy="4.6" r="2.2" fill="#e63946" />
      <rect x="7" y="8" width="22" height="17" rx="5.5" fill="#6c63ff" />
      <rect x="7" y="8" width="22" height="7" rx="5.5" fill="#8b86ff" />
      <circle cx="14.5" cy="17" r="3.2" fill="#ffffff" />
      <circle cx="21.5" cy="17" r="3.2" fill="#ffffff" />
      <circle cx="15" cy="17.5" r="1.5" fill="#3d2c6e" />
      <circle cx="22" cy="17.5" r="1.5" fill="#3d2c6e" />
      <rect x="10" y="26.5" width="16" height="10" rx="3.5" fill="#5a52e0" />
      <rect x="11.5" y="36.5" width="5" height="4.5" rx="1.8" fill="#3d2c6e" />
      <rect x="19.5" y="36.5" width="5" height="4.5" rx="1.8" fill="#3d2c6e" />
      <path d="M31 31H37M34.5 27.5L38 31L34.5 34.5" fill="none" stroke="#f59f00" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
      <rect x="32" y="12" width="13" height="9" rx="2.5" fill="#c98a3a" />
      <path d="M32 15Q32 10 38.5 10Q45 10 45 15Z" fill="#e0a24e" />
      <rect x="37.2" y="14" width="2.6" height="4" rx="1" fill="#ffd34d" />
      <circle cx="40" cy="6.5" r="1.8" fill="#ffd34d" />
      <path d="M33.5 6.5H35M38 3.5V5" stroke="#ffd34d" stroke-width="1.4" stroke-linecap="round" />
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
