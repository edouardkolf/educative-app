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
  | 'back'
  // Espace parent
  | 'children'
  | 'folder'
  | 'gear'
  | 'stats'
  | 'edit'
  | 'plus'
  | 'clock-plus'
  | 'export'
  | 'import'
  | 'key'
  | 'shield';

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

  // ---------- Espace parent ----------

  // Deux enfants côte à côte : l'onglet « Enfants ».
  children: () => (
    <>
      <ellipse cx="24" cy="43" rx="17" ry="2.5" fill={SHADOW} />
      <path d="M4.5 42Q5 31 15 31Q25 31 25.5 42Z" fill="#1d7fd8" />
      <circle cx="15" cy="20" r="8.5" fill="#ffd3a8" />
      <path d="M6.5 19.5Q7 10.5 15 10.5Q23 10.5 23.5 19.5Q19 14.5 11 16.5Z" fill="#8b5a2b" />
      <path d="M22.5 42Q23 32.5 33 32.5Q43 32.5 43.5 42Z" fill="#e63946" />
      <circle cx="33" cy="23" r="7.5" fill="#f0bf8e" />
      <path d="M25.3 22Q25.5 14.5 33 14.5Q40.5 14.5 40.7 22Q37 17.5 29 19Z" fill="#f2a516" />
      <circle cx="41" cy="18" r="3" fill="#f2a516" />
      <circle cx="12.3" cy="21.5" r="1.2" fill="#3d2c1e" />
      <circle cx="17.7" cy="21.5" r="1.2" fill="#3d2c1e" />
      <circle cx="30.8" cy="24.3" r="1.1" fill="#3d2c1e" />
      <circle cx="35.2" cy="24.3" r="1.1" fill="#3d2c1e" />
    </>
  ),
  // Une chemise cartonnée : l'onglet « Données » (sauvegarde, restauration).
  folder: () => (
    <>
      <ellipse cx="24" cy="42.5" rx="17" ry="2.5" fill={SHADOW} />
      <path d="M6 13.5Q6 10 9.5 10H18.5L22 14H38.5Q42 14 42 17.5V37Q42 40.5 38.5 40.5H9.5Q6 40.5 6 37Z" fill="#e0a526" />
      <rect x="10" y="16.5" width="28" height="15" rx="2" fill="#ffffff" />
      <path d="M13.5 21H30M13.5 25.5H26" stroke="#d6cbb8" stroke-width="2" stroke-linecap="round" />
      <path d="M6 22.5Q6 20 8.5 20H39.5Q42 20 42 22.5V37Q42 40.5 38.5 40.5H9.5Q6 40.5 6 37Z" fill="#ffc53d" />
      <path d="M9.5 24.5H22" stroke="#ffe38f" stroke-width="2.4" stroke-linecap="round" />
    </>
  ),
  // Une roue dentée : l'onglet « Réglages ».
  gear: () => (
    <>
      <g transform="translate(24 24)">
        {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
          <rect key={a} x="-4.2" y="-19" width="8.4" height="10" rx="2.4" fill="#6f8fa8" transform={`rotate(${a})`} />
        ))}
        <circle r="13.5" fill="#6f8fa8" />
        <circle r="13.5" fill="#8fb0c9" transform="translate(0 -1.5) scale(.93)" />
        <circle r="5.5" fill="#fff7e8" />
        <path d="M-9 -4.5A10 10 0 0 1 -4 -9.3" fill="none" stroke="#c4d8e8" stroke-width="2.4" stroke-linecap="round" />
      </g>
    </>
  ),
  // Trois barres qui montent : les statistiques.
  stats: () => (
    <>
      <rect x="7" y="25" width="9" height="15" rx="3" fill="#1d7fd8" />
      <rect x="19.5" y="17" width="9" height="23" rx="3" fill="#f59f00" />
      <rect x="32" y="8.5" width="9" height="31.5" rx="3" fill="#43a047" />
      <rect x="9" y="27.5" width="2.4" height="6" rx="1.2" fill="#8cc4f2" />
      <rect x="21.5" y="19.5" width="2.4" height="8" rx="1.2" fill="#ffd27a" />
      <rect x="34" y="11" width="2.4" height="10" rx="1.2" fill="#9ad49c" />
      <rect x="4.5" y="39.5" width="39" height="3.5" rx="1.75" fill="#a6978a" />
    </>
  ),
  // Un crayon de couleur : modifier.
  edit: () => (
    <g transform="rotate(45 24 24)">
      <rect x="18" y="4" width="12" height="8" rx="3" fill="#ff8fa0" />
      <rect x="18" y="10.5" width="12" height="4" fill="#a6978a" />
      <rect x="18" y="14" width="12" height="20" fill="#ffc53d" />
      <rect x="18" y="14" width="4" height="20" fill="#ffe38f" />
      <rect x="26" y="14" width="4" height="20" fill="#f2a516" />
      <path d="M18 34H30L24 44Z" fill="#f5d6a8" stroke="#f5d6a8" stroke-width="1.5" stroke-linejoin="round" />
      <path d="M22 40.7L24 44L26 40.7Z" fill="#5a3a12" stroke="#5a3a12" stroke-width="1.5" stroke-linejoin="round" />
    </g>
  ),
  // Un « + » dans une pastille blanche, lisible sur un bouton orange.
  plus: () => (
    <>
      <circle cx="24" cy="24" r="17" fill="#ffffff" />
      <path d="M24 15.5V32.5M15.5 24H32.5" stroke="#e0861a" stroke-width="5" stroke-linecap="round" />
    </>
  ),
  // Un réveil avec un petit « + » : du temps de jeu en plus aujourd'hui.
  'clock-plus': () => (
    <>
      <path d="M11 14.5L15.5 9.5M37 14.5L32.5 9.5" stroke="#e63946" stroke-width="4.5" stroke-linecap="round" />
      <circle cx="22.5" cy="26" r="15" fill="#e63946" />
      <circle cx="22.5" cy="26" r="11.5" fill="#ffffff" />
      <path d="M22.5 18.5V26L27.5 29" fill="none" stroke="#3d2c1e" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
      <circle cx="37" cy="36" r="8.5" fill="#43a047" />
      <path d="M37 31.5V40.5M32.5 36H41.5" stroke="#ffffff" stroke-width="3" stroke-linecap="round" />
    </>
  ),
  // Une flèche qui sort du bac : sauvegarder vers un fichier.
  export: () => (
    <>
      <path d="M6 27V36.5Q6 41 10.5 41H37.5Q42 41 42 36.5V27" fill="none" stroke="#b77838" stroke-width="5" stroke-linecap="round" />
      <path d="M24 30V9" stroke="#1d7fd8" stroke-width="5.5" stroke-linecap="round" />
      <path d="M14.5 17.5L24 8L33.5 17.5" fill="none" stroke="#1d7fd8" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round" />
    </>
  ),
  // Une flèche qui entre dans le bac : restaurer depuis un fichier.
  import: () => (
    <>
      <path d="M6 27V36.5Q6 41 10.5 41H37.5Q42 41 42 36.5V27" fill="none" stroke="#b77838" stroke-width="5" stroke-linecap="round" />
      <path d="M24 7V29" stroke="#43a047" stroke-width="5.5" stroke-linecap="round" />
      <path d="M14.5 20.5L24 30L33.5 20.5" fill="none" stroke="#43a047" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round" />
    </>
  ),
  // Une clé dorée : le code parent.
  key: () => (
    <>
      <path d="M22 26L40 26M34 26V33M39 26V31" stroke="#f2a516" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
      <circle cx="15" cy="26" r="10" fill="#f2a516" />
      <circle cx="15" cy="24.8" r="9" fill="#ffc53d" />
      <circle cx="13" cy="25" r="3.4" fill="#fff7e8" />
      <path d="M9.5 20.5A6.5 6.5 0 0 1 14 17.8" fill="none" stroke="#ffe38f" stroke-width="2.2" stroke-linecap="round" />
    </>
  ),
  // Un bouclier vert coché : le stockage est protégé.
  shield: () => (
    <>
      <path d="M24 6L39 11.5V23Q39 35 24 42Q9 35 9 23V11.5Z" fill="#43a047" stroke="#43a047" stroke-width="3" stroke-linejoin="round" />
      <path d="M24 6L39 11.5V23Q39 35 24 42Z" fill="#2e7d32" opacity="0.45" />
      <path d="M16.5 24L22 29.5L32 18.5" fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" />
    </>
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
