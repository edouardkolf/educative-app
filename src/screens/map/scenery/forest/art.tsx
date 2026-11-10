// Dessins de la forêt : tous posés en <defs> (préfixe unique par bande) puis réutilisés par <use>.
// Chaque dessin a son point d'appui au sol en (0, 0).
import type { JSX } from 'preact';

export const FLOWER_KEYS = ['fl-pink', 'fl-yellow', 'fl-white', 'fl-violet'] as const;
const FLOWER_FILL: Record<(typeof FLOWER_KEYS)[number], string> = {
  'fl-pink': '#ff8fab',
  'fl-yellow': '#ffd23f',
  'fl-white': '#ffffff',
  'fl-violet': '#b48cf2',
};

function Flower({ id, fill }: { id: string; fill: string }) {
  return (
    <g id={id} fill={fill}>
      <path d="M 0 0 L 0 -10" stroke="#4f9d44" stroke-width="2" stroke-linecap="round" />
      <circle cx="3.5" cy="-12" r="2.6" />
      <circle cx="1.1" cy="-8.7" r="2.6" />
      <circle cx="-2.8" cy="-9.9" r="2.6" />
      <circle cx="-2.8" cy="-14.1" r="2.6" />
      <circle cx="1.1" cy="-15.3" r="2.6" />
      <circle cx="0" cy="-12" r="2" fill="#f4a300" />
    </g>
  );
}

/** Le grand arbre-maison, pied du tronc en (0, 0) : porte, fenêtre ronde, chouette sur sa branche. */
function TreeHouse({ id }: { id: string }) {
  return (
    <g id={id} transform="translate(-95 -432)">
      <ellipse cx="95" cy="432" rx="72" ry="14" fill="#1c3414" opacity="0.25" />
      <path d="M 40 432 Q 60 424 62 410 L 128 410 Q 130 424 150 432 Z" fill="#7a4e26" />
      <path d="M 62 430 C 68 390 66 350 58 316 L 132 316 C 124 350 122 390 128 430 Z" fill="#8b5a2b" />
      <path d="M 74 428 C 78 390 77 352 72 318 L 86 318 C 89 352 89 390 86 428 Z" fill="#a06a36" />
      <path d="M 84 430 L 84 402 Q 95 386 106 402 L 106 430 Z" fill="#5d3a1a" />
      <circle cx="101" cy="416" r="2" fill="#ffd23f" />
      <circle cx="95" cy="362" r="11" fill="#ffe28a" stroke="#5d3a1a" stroke-width="3.5" />
      <path d="M 95 351 V 373 M 84 362 H 106" stroke="#5d3a1a" stroke-width="2" />
      <circle cx="48" cy="302" r="42" fill="#3f8f45" />
      <circle cx="142" cy="302" r="42" fill="#3f8f45" />
      <circle cx="95" cy="268" r="56" fill="#4f9d44" />
      <circle cx="60" cy="250" r="36" fill="#5fb14f" />
      <circle cx="132" cy="246" r="34" fill="#5fb14f" />
      <circle cx="78" cy="232" r="14" fill="#86cc6a" />
      <circle cx="140" cy="232" r="9" fill="#86cc6a" />
      <path d="M 128 338 H 172" stroke="#7a4e26" stroke-width="5" stroke-linecap="round" />
      <ellipse cx="156" cy="324" rx="10" ry="13" fill="#a9753f" />
      <path d="M 147 314 L 150 306 L 155 313 L 160 306 L 165 314 Z" fill="#a9753f" />
      <circle cx="152" cy="320" r="4" fill="#ffffff" />
      <circle cx="160" cy="320" r="4" fill="#ffffff" />
      <circle cx="152" cy="320" r="1.6" fill="#3d2c1e" />
      <circle cx="160" cy="320" r="1.6" fill="#3d2c1e" />
      <path d="M 154 325 L 156 329 L 158 325 Z" fill="#f4a300" />
    </g>
  );
}

/** Toutes les pièces réutilisées de la bande ; `p` est le préfixe des identifiants. */
export function ForestDefs({ p }: { p: string }) {
  return (
    <defs>
      <g id={`${p}tree`}>
        <ellipse cx="0" cy="0" rx="22" ry="6" fill="#28401a" opacity="0.18" />
        <rect x="-4" y="-22" width="8" height="22" rx="3" fill="#8b5a2b" />
        <circle cx="-12" cy="-30" r="14" fill="#4f9d44" />
        <circle cx="12" cy="-30" r="14" fill="#4f9d44" />
        <circle cx="0" cy="-42" r="17" fill="#5fb14f" />
        <circle cx="-5" cy="-47" r="6" fill="#86cc6a" />
      </g>
      <g id={`${p}pine`}>
        <ellipse cx="0" cy="0" rx="16" ry="5" fill="#1c3414" opacity="0.22" />
        <rect x="-3" y="-10" width="6" height="10" rx="2" fill="#6b4422" />
        <path d="M -18 -8 L 0 -34 L 18 -8 Z" fill="#256b45" />
        <path d="M -15 -22 L 0 -46 L 15 -22 Z" fill="#2f7d4f" />
        <path d="M -11 -36 L 0 -58 L 11 -36 Z" fill="#3a8c5a" />
      </g>
      <g id={`${p}bush`}>
        <ellipse cx="0" cy="0" rx="18" ry="4" fill="#28401a" opacity="0.16" />
        <circle cx="-9" cy="-8" r="9" fill="#58a646" />
        <circle cx="9" cy="-8" r="9" fill="#58a646" />
        <circle cx="0" cy="-14" r="11" fill="#67b853" />
        <circle cx="4" cy="-12" r="2" fill="#e63946" />
        <circle cx="-6" cy="-7" r="2" fill="#e63946" />
      </g>
      {FLOWER_KEYS.map((k) => (
        <Flower key={k} id={`${p}${k}`} fill={FLOWER_FILL[k]} />
      ))}
      <g id={`${p}mush`}>
        <rect x="-3" y="-10" width="6" height="10" rx="3" fill="#fff7e8" />
        <path d="M -10 -9 Q 0 -24 10 -9 Z" fill="#e63946" />
        <circle cx="-3" cy="-14" r="1.8" fill="#fff" />
        <circle cx="4" cy="-12" r="1.5" fill="#fff" />
      </g>
      <path
        id={`${p}grass`}
        d="M -6 0 Q -6 -6 -9 -10 M 0 0 Q 0 -8 1 -13 M 6 0 Q 6 -6 9 -9"
        stroke="#6aa84f"
        stroke-width="2.4"
        stroke-linecap="round"
        fill="none"
      />
      <g id={`${p}fly`}>
        <circle r="7" fill="#fff3a3" opacity="0.4" />
        <circle r="2.6" fill="#fff8c9" />
      </g>
      {[
        ['bfly-orange', '#ff8a3d'],
        ['bfly-violet', '#b48cf2'],
      ].map(([k, fill]) => (
        <g key={k} id={`${p}${k}`} fill={fill}>
          <path d="M 0 0 Q -9 -10 -8 -2 Q -8 5 0 0 Q 9 -10 8 -2 Q 8 5 0 0 Z" />
          <path d="M 0 -3 L 0 3" stroke="#5d3a1a" stroke-width="1.4" stroke-linecap="round" />
        </g>
      ))}
      <TreeHouse id={`${p}house`} />
      <g id={`${p}rabbit`}>
        <ellipse cx="0" cy="0" rx="14" ry="4" fill="#28401a" opacity="0.16" />
        <ellipse cx="0" cy="-10" rx="12" ry="9" fill="#f4f0ea" />
        <circle cx="10" cy="-18" r="7" fill="#f4f0ea" />
        <ellipse cx="8" cy="-30" rx="2.6" ry="8" fill="#f4f0ea" />
        <ellipse cx="14" cy="-29" rx="2.6" ry="8" fill="#f4f0ea" />
        <ellipse cx="8" cy="-30" rx="1" ry="5" fill="#ffc2c7" />
        <circle cx="12" cy="-19" r="1.3" fill="#3d2c1e" />
        <circle cx="-12" cy="-10" r="4" fill="#ffffff" />
      </g>
      <g id={`${p}duck`}>
        <ellipse cx="0" cy="0" rx="12" ry="8" fill="#ffd23f" />
        <circle cx="10" cy="-10" r="6.5" fill="#ffd23f" />
        <path d="M 15 -11 L 23 -9 L 15 -6 Z" fill="#f4830f" />
        <circle cx="11" cy="-12" r="1.3" fill="#3d2c1e" />
        <path d="M -17 9 Q 0 15 17 9" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" opacity="0.8" />
      </g>
      <g id={`${p}lily`}>
        <circle r="9" fill="#4f9d44" />
        <path d="M 0 0 L 9 -3" stroke="#6bb8e0" stroke-width="2" />
        <circle cx="-2" cy="-2" r="3" fill="#ff8fab" />
      </g>
      <g id={`${p}reeds`}>
        <path d="M -8 0 L -6 -30 M 2 0 L 5 -22 M 10 4 L 12 -16" stroke="#4f9d44" stroke-width="2.4" stroke-linecap="round" />
        <rect x="-9" y="-42" width="6" height="14" rx="3" fill="#7a4e26" />
        <rect x="2" y="-34" width="6" height="14" rx="3" fill="#7a4e26" />
      </g>
    </defs>
  );
}

/** Barrière de bois entre deux abscisses : deux lisses et un poteau tous les 30 px environ. */
export function Fence({ x0, x1, y }: { x0: number; x1: number; y: number }) {
  const n = Math.max(1, Math.round((x1 - x0) / 30));
  const posts = [];
  for (let i = 0; i <= n; i += 1) posts.push(x0 + ((x1 - x0) * i) / n);
  return (
    <g>
      <path d={`M ${x0} ${y - 8} H ${x1} M ${x0} ${y + 4} H ${x1}`} stroke="#c68a4e" stroke-width="5" stroke-linecap="round" />
      <path
        d={posts.map((x) => `M ${Math.round(x)} ${y - 16} V ${y + 12}`).join(' ')}
        stroke="#8b5a2b"
        stroke-width="6"
        stroke-linecap="round"
      />
    </g>
  );
}

/** Pont de bois posé en travers du ruisseau : planches en travers du chemin, rambardes le long. */
export function CreekBridge({ x, y, angle }: { x: number; y: number; angle: number }): JSX.Element {
  return (
    <g transform={`translate(${Math.round(x)} ${Math.round(y)}) rotate(${angle.toFixed(1)})`}>
      <rect x="-27" y="-30" width="54" height="56" rx="5" fill="#14324f" opacity="0.2" />
      <rect x="-22" y="-32" width="44" height="64" rx="4" fill="#c68a4e" />
      <path d="M -22 -22 H 22 M -22 -11 H 22 M -22 0 H 22 M -22 11 H 22 M -22 22 H 22" stroke="#8b5a2b" stroke-width="1.6" />
      <rect x="-27" y="-34" width="7" height="68" rx="3" fill="#8b5a2b" />
      <rect x="20" y="-34" width="7" height="68" rx="3" fill="#8b5a2b" />
    </g>
  );
}
