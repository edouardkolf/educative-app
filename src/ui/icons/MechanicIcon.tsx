// Picto de chaque mécanique sur la carte : l'enfant qui ne lit pas encore reconnaît le jeu avant d'y
// entrer (dé = compter, loupe = intrus, panier = trier…). Même style que les pictos d'interface
// (Icon.tsx) : aplats, un reflet clair, pas de contour noir. Lisible sur disque blanc comme orange.
import type { JSX } from 'preact';
import type { MechanicId } from '../../engine/types';

const SHADOW = 'rgba(61, 44, 30, 0.14)';

const DRAWINGS: Record<MechanicId, () => JSX.Element> = {
  // Une suite rouge, bleu, rouge… et le bleu qui manque.
  sequence: () => (
    <>
      <circle cx="9" cy="24" r="6" fill="#e63946" />
      <circle cx="24" cy="24" r="6" fill="#1d7fd8" />
      <circle cx="39" cy="24" r="6" fill="#e63946" />
      <circle cx="7" cy="22" r="1.8" fill="#ff9aa3" />
      <circle cx="22" cy="22" r="1.8" fill="#8cc4f2" />
      <circle cx="37" cy="22" r="1.8" fill="#ff9aa3" />
    </>
  ),
  // Un dé : les points se comptent d'un coup d'œil.
  count: () => (
    <>
      <ellipse cx="24" cy="41.5" rx="13" ry="2.5" fill={SHADOW} />
      <rect x="9.5" y="9.5" width="29" height="29" rx="8" fill="#e63946" />
      <rect x="9.5" y="9.5" width="29" height="25" rx="8" fill="#ff5a66" />
      <circle cx="17" cy="17" r="3" fill="#ffffff" />
      <circle cx="31" cy="17" r="3" fill="#ffffff" />
      <circle cx="24" cy="23.5" r="3" fill="#ffffff" />
      <circle cx="17" cy="30" r="3" fill="#ffffff" />
      <circle cx="31" cy="30" r="3" fill="#ffffff" />
    </>
  ),
  // La loupe : chercher celui qui ne va pas avec les autres.
  'odd-one-out': () => (
    <>
      <path d="M28.5 28.5L38.5 38.5" stroke="#8b5a2b" stroke-width="7" stroke-linecap="round" />
      <circle cx="20" cy="20" r="11.5" fill="#bfe6ff" stroke="#f59f00" stroke-width="4.5" />
      <path d="M14 18.5a6.5 6.5 0 0 1 5-5" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" />
    </>
  ),
  // Le panier du trieur, avec une pomme et une balle dedans.
  sort: () => (
    <>
      <ellipse cx="24" cy="42.5" rx="14" ry="2.5" fill={SHADOW} />
      <path d="M14.5 23Q24 5 33.5 23" fill="none" stroke="#a86d34" stroke-width="3.2" stroke-linecap="round" />
      <circle cx="19" cy="21" r="5.5" fill="#e63946" />
      <path d="M19 15.5Q20 13 22 12.5" stroke="#4f9d44" stroke-width="1.8" stroke-linecap="round" fill="none" />
      <circle cx="29.5" cy="20.5" r="5.5" fill="#1d7fd8" />
      <circle cx="17.3" cy="19.3" r="1.4" fill="#ff9aa3" />
      <circle cx="27.8" cy="18.8" r="1.4" fill="#8cc4f2" />
      <path d="M10 25.5H38L35 38.5Q34.5 41 32 41H16Q13.5 41 13 38.5Z" fill="#d49655" />
      <path d="M11.8 31H36.2M13 36H35" stroke="#b77838" stroke-width="2" stroke-linecap="round" />
      <rect x="8" y="22.5" width="32" height="5.5" rx="2.75" fill="#b77838" />
    </>
  ),
  // La fiole du laboratoire : deux gouttes (rouge, bleu) qui deviennent violet.
  'color-mix': () => (
    <>
      <path d="M11 6C14.8 10.8 14.8 14.5 11 14.5S7.2 10.8 11 6Z" fill="#e63946" />
      <path d="M37 6C40.8 10.8 40.8 14.5 37 14.5S33.2 10.8 37 6Z" fill="#1d7fd8" />
      <path
        d="M20 10H28V19.5L36.8 35Q38.8 40.5 33.5 40.5H14.5Q9.2 40.5 11.2 35L20 19.5Z"
        fill="#eaf6fd"
        stroke="#a9d3ea"
        stroke-width="2"
        stroke-linejoin="round"
      />
      <path d="M14.5 28.5H33.5L35.9 33.8Q37.6 39 33.3 39H14.7Q10.4 39 12.1 33.8Z" fill="#8e44ad" />
      <path d="M14.5 28.5H33.5L34.6 30.8H13.4Z" fill="#a95fc8" />
      <circle cx="21" cy="34" r="1.6" fill="#d9b3ec" />
      <circle cx="26.5" cy="32" r="1.1" fill="#d9b3ec" />
      <rect x="18" y="7.5" width="12" height="4.5" rx="2.25" fill="#a9d3ea" />
    </>
  ),
  // Le constructeur : deux cubes et un toit, une petite maison de formes.
  builder: () => (
    <>
      <ellipse cx="24" cy="42.5" rx="15" ry="2.5" fill={SHADOW} />
      <path d="M13 24L24 11.5L35 24Z" fill="#1d7fd8" stroke="#1d7fd8" stroke-width="3" stroke-linejoin="round" />
      <path d="M17.5 21L23 14.8" stroke="#6fb3ee" stroke-width="2.2" stroke-linecap="round" />
      <rect x="9.5" y="26.5" width="14.5" height="14.5" rx="3" fill="#e63946" />
      <rect x="24" y="26.5" width="14.5" height="14.5" rx="3" fill="#ffc300" />
      <rect x="12" y="29" width="3.5" height="3.5" rx="1" fill="#ff9aa3" />
      <rect x="26.5" y="29" width="3.5" height="3.5" rx="1" fill="#ffe38f" />
    </>
  ),
  // Calcul : un « + » et un « − » dans deux bulles.
  calc: () => (
    <>
      <circle cx="17" cy="19" r="11" fill="#f59f00" />
      <circle cx="31" cy="30" r="11" fill="#ffffff" />
      <circle cx="31" cy="30" r="9.5" fill="#1d7fd8" />
      <path d="M17 13V25M11 19H23" stroke="#ffffff" stroke-width="3.6" stroke-linecap="round" />
      <path d="M25.5 30H36.5" stroke="#ffffff" stroke-width="3.6" stroke-linecap="round" />
    </>
  ),
  // Comparer : la balance penche du côté le plus lourd.
  compare: () => (
    <>
      <path d="M16 41H32L29 35.5H19Z" fill="#8b5a2b" stroke="#8b5a2b" stroke-width="2" stroke-linejoin="round" />
      <rect x="22.5" y="13" width="3" height="23" rx="1.5" fill="#8b5a2b" />
      <path d="M9 20L39 11" stroke="#6b4516" stroke-width="3.2" stroke-linecap="round" />
      <path d="M9 20L4.5 29M9 20L13.5 29M39 11L34.5 20M39 11L43.5 20" stroke="#a6978a" stroke-width="1.4" />
      <path d="M2.5 29H15.5Q15 35 9 35Q3 35 2.5 29Z" fill="#ffc300" />
      <path d="M32.5 20H45.5Q45 26 39 26Q33 26 32.5 20Z" fill="#ffc300" />
      <circle cx="9" cy="25.5" r="3.6" fill="#e63946" />
      <circle cx="24" cy="12.5" r="3" fill="#6b4516" />
    </>
  ),
  // Les mots : deux lettres-tuiles à assembler.
  spelling: () => (
    <>
      <g transform="rotate(-8 15.5 24)">
        <rect x="6" y="13" width="19" height="22" rx="4.5" fill="#f2d49a" />
        <rect x="6" y="13" width="19" height="19.5" rx="4.5" fill="#fff3da" />
        <text x="15.5" y="28.5" text-anchor="middle" font-size="17" font-weight="600" fill="#e63946" style={{ fontFamily: 'var(--font-display)' }}>
          a
        </text>
      </g>
      <g transform="rotate(8 32.5 26)">
        <rect x="23" y="15" width="19" height="22" rx="4.5" fill="#f2d49a" />
        <rect x="23" y="15" width="19" height="19.5" rx="4.5" fill="#fff3da" />
        <text x="32.5" y="30.5" text-anchor="middle" font-size="17" font-weight="600" fill="#1d7fd8" style={{ fontFamily: 'var(--font-display)' }}>
          b
        </text>
      </g>
    </>
  ),
  // Lire : un livre ouvert.
  read: () => (
    <>
      <ellipse cx="24" cy="42.5" rx="17" ry="2.5" fill={SHADOW} />
      <path d="M4.5 14.5V38.5Q15 36 24 40Q33 36 43.5 38.5V14.5Z" fill="#1d7fd8" />
      <path d="M24 14.5Q15.5 9.5 7 11.5V35.5Q15.5 33.5 24 37.5Z" fill="#ffffff" />
      <path d="M24 14.5Q32.5 9.5 41 11.5V35.5Q32.5 33.5 24 37.5Z" fill="#fff7e8" />
      <path d="M10.5 17.5Q15.5 16.5 20.5 18.5M10.5 22.5Q15.5 21.5 20.5 23.5M10.5 27.5Q15.5 26.5 20.5 28.5" stroke="#d6cbb8" stroke-width="1.8" stroke-linecap="round" fill="none" />
      <path d="M27.5 18.5Q32.5 16.5 37.5 17.5M27.5 23.5Q32.5 21.5 37.5 22.5M27.5 28.5Q32.5 26.5 37.5 27.5" stroke="#d6cbb8" stroke-width="1.8" stroke-linecap="round" fill="none" />
    </>
  ),
};

export function MechanicIcon({ mechanic, size = 44 }: { mechanic: MechanicId | undefined; size?: number }) {
  const draw = mechanic ? DRAWINGS[mechanic] : undefined;
  if (!draw) return null;
  return (
    <svg class={`mechanic-icon mechanic-icon--${mechanic}`} viewBox="0 0 48 48" width={size} height={size} aria-hidden="true" focusable="false">
      {draw()}
    </svg>
  );
}
