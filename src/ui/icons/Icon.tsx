// Pictos d'interface dessinés dans le style du décor (aplats, un reflet clair, pas de contour noir),
// pour que les boutons parlent la même langue que la carte et les fonds de monde. Tout est en SVG
// inline : rendu identique sur tous les appareils, rien à télécharger, net à toutes les tailles.
// Par défaut un picto mesure 1em : il remplace un glyphe sans rien changer à la mise en page.
import type { JSX } from 'preact';

export type IconName =
  | 'home'
  | 'lock'
  | 'lock-muted'
  | 'next'
  | 'replay'
  | 'map'
  | 'heart'
  | 'heart-empty'
  | 'star'
  | 'star-empty'
  | 'speaker'
  | 'check'
  | 'back';

interface IconProps {
  name: IconName;
  /** Taille en px, ou toute longueur CSS ; 1em par défaut (hérite du font-size du parent). */
  size?: number | string;
  class?: string;
}

const SHADOW = 'rgba(61, 44, 30, 0.14)';

/** Étoile à cinq branches arrondies, centrée en (24, 25). */
const STAR_POINTS = '24,8 28.7,18.5 40.2,19.8 31.6,27.5 34,38.8 24,33 14,38.8 16.4,27.5 7.8,19.8 19.3,18.5';

const HEART_D =
  'M24 40.5C24 40.5 7.5 30.5 7.5 18.8C7.5 12.9 11.8 9 16.7 9C20.1 9 22.7 10.9 24 13.4C25.3 10.9 27.9 9 31.3 9C36.2 9 40.5 12.9 40.5 18.8C40.5 30.5 24 40.5 24 40.5Z';

function lockBody(body: string, shade: string, shine: string, shackle: string, hole: string): JSX.Element {
  return (
    <>
      <path d="M16.5 22V16.5a7.5 7.5 0 0 1 15 0V22" fill="none" stroke={shackle} stroke-width="4.5" stroke-linecap="round" />
      <rect x="10.5" y="20.5" width="27" height="21" rx="6.5" fill={shade} />
      <rect x="10.5" y="20.5" width="27" height="16" rx="6.5" fill={body} />
      <rect x="14" y="24" width="4" height="7.5" rx="2" fill={shine} />
      <circle cx="24" cy="29.5" r="2.8" fill={hole} />
      <rect x="22.7" y="29.5" width="2.6" height="6.2" rx="1.3" fill={hole} />
    </>
  );
}

const DRAWINGS: Record<IconName, () => JSX.Element> = {
  home: () => (
    <>
      <ellipse cx="24" cy="42.5" rx="15" ry="2.5" fill={SHADOW} />
      <rect x="30.5" y="9.5" width="5.5" height="9" rx="1.5" fill="#b5563f" />
      <rect x="11" y="20" width="26" height="21.5" rx="3" fill="#ffe2b8" />
      <rect x="11" y="36" width="26" height="5.5" rx="2.5" fill="#f5cd96" />
      <path d="M8 22.5L24 9.5L40 22.5Z" fill="#e63946" stroke="#e63946" stroke-width="4.5" stroke-linejoin="round" />
      <path d="M15.5 17.5L22.5 11.8" stroke="#ff7b86" stroke-width="2.4" stroke-linecap="round" />
      <path d="M19.5 41.5V32a4.5 4.5 0 0 1 9 0v9.5Z" fill="#8b5a2b" />
      <circle cx="26" cy="36" r="1.1" fill="#ffc93c" />
      <rect x="29.5" y="25.5" width="5.5" height="5.5" rx="1.5" fill="#8ecfe8" />
      <rect x="13" y="25.5" width="5.5" height="5.5" rx="1.5" fill="#8ecfe8" />
    </>
  ),
  lock: () => lockBody('#ffc53d', '#f2a516', '#ffe38f', '#a6978a', '#6b4516'),
  // Niveau pas encore ouvert sur la carte : le même cadenas, en retrait pour laisser briller le niveau en cours.
  'lock-muted': () => lockBody('#c9bfad', '#b6ab98', '#ddd5c7', '#b3a898', '#8f846f'),
  next: () => (
    <>
      <path d="M18.5 13.5L35 24.5L18.5 35.5Z" fill="#e0861a" stroke="#e0861a" stroke-width="6" stroke-linejoin="round" transform="translate(0 1.6)" />
      <path d="M18.5 13.5L35 24.5L18.5 35.5Z" fill="#ffffff" stroke="#ffffff" stroke-width="6" stroke-linejoin="round" />
    </>
  ),
  replay: () => (
    <>
      <path d="M34.3 21.2A11 11 0 1 1 25.9 14.2" fill="none" stroke="#f59f00" stroke-width="5" stroke-linecap="round" />
      <path d="M31 15.2L24.4 9.6L23.3 18.4Z" fill="#f59f00" stroke="#f59f00" stroke-width="3" stroke-linejoin="round" />
    </>
  ),
  map: () => (
    <>
      <ellipse cx="24" cy="42.5" rx="16" ry="2.5" fill={SHADOW} />
      <g stroke-width="2" stroke-linejoin="round">
        <path d="M7.5 13L18 9.5V36L7.5 39.5Z" fill="#fff1c9" stroke="#fff1c9" />
        <path d="M18 9.5L30 13V39.5L18 36Z" fill="#ffe09a" stroke="#ffe09a" />
        <path d="M30 13L40.5 9.5V36L30 39.5Z" fill="#fff1c9" stroke="#fff1c9" />
      </g>
      <path d="M30.5 29.5C33 28 36 28.8 40.5 27V36L30.5 39.5Z" fill="#8ecfe8" />
      <ellipse cx="13" cy="19.5" rx="3.6" ry="3" fill="#7cc26a" />
      <ellipse cx="22.5" cy="30" rx="3.2" ry="2.6" fill="#7cc26a" />
      <path
        d="M10.5 33C13 27.5 17 25.5 20.5 24.5S27 20 29.5 19"
        fill="none"
        stroke="#e63946"
        stroke-width="2"
        stroke-linecap="round"
        stroke-dasharray="0.1 4"
      />
      <path d="M34.5 23.5C31 19.8 30.8 17.4 30.8 16.3a3.7 3.7 0 0 1 7.4 0C38.2 17.4 38 19.8 34.5 23.5Z" fill="#e63946" />
      <circle cx="34.5" cy="16.4" r="1.4" fill="#ffffff" />
    </>
  ),
  heart: () => (
    <>
      <path d={HEART_D} fill="#ef4050" stroke="#ef4050" stroke-width="2" stroke-linejoin="round" />
      <path d="M24 40.5C24 40.5 30 36.9 34.8 31.5C30.5 34 27 35 24 35Z" fill="#d42f40" opacity="0.55" />
      <ellipse cx="15.2" cy="17.2" rx="3" ry="4.4" transform="rotate(-32 15.2 17.2)" fill="#ff9aa3" />
    </>
  ),
  'heart-empty': () => (
    <>
      <path d={HEART_D} fill="#ddd5c7" stroke="#ddd5c7" stroke-width="2" stroke-linejoin="round" />
      <ellipse cx="15.2" cy="17.2" rx="3" ry="4.4" transform="rotate(-32 15.2 17.2)" fill="#ece6db" />
    </>
  ),
  star: () => (
    <>
      <polygon points={STAR_POINTS} fill="#ffc93c" stroke="#ffc93c" stroke-width="4" stroke-linejoin="round" />
      <path d="M24 33L34 38.8L31.6 27.5L40.2 19.8Z" fill="#f5a623" opacity="0.55" />
      <ellipse cx="19.6" cy="21.4" rx="2.4" ry="3.6" transform="rotate(35 19.6 21.4)" fill="#fff0b3" />
    </>
  ),
  'star-empty': () => (
    <polygon points={STAR_POINTS} fill="#e2dacb" stroke="#e2dacb" stroke-width="4" stroke-linejoin="round" />
  ),
  speaker: () => (
    <>
      <path d="M9 19.5H15L23 12.5V35.5L15 28.5H9Z" fill="#6b4f3a" stroke="#6b4f3a" stroke-width="3" stroke-linejoin="round" />
      <path d="M29 18.5Q33 24 29 29.5" fill="none" stroke="#f59f00" stroke-width="3.6" stroke-linecap="round" />
      <path d="M34 13.5Q41.5 24 34 34.5" fill="none" stroke="#f59f00" stroke-width="3.6" stroke-linecap="round" />
    </>
  ),
  check: () => (
    <path d="M12.5 25L21 33.5L36 15.5" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" />
  ),
  back: () => (
    <path d="M29 12L17 24L29 36" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" />
  ),
};

export function Icon({ name, size = '1em', class: extraClass }: IconProps) {
  return (
    <svg
      class={`icon icon--${name}${extraClass ? ` ${extraClass}` : ''}`}
      viewBox="0 0 48 48"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
    >
      {DRAWINGS[name]()}
    </svg>
  );
}
