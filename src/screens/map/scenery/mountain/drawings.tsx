// Montagne : les dessins (petits dessins en <defs>, lieux, pont, cascade). Chaque dessin a son point
// d'appui au sol en (0, 0) ; la lumière vient de la gauche (flancs droits à l'ombre).
import { SNOW, SNOW_SHADE } from '../common';

export const SKY_TOP = '#a9d8f7';
export const SKY_LOW = '#e6f4fc';
export const MEADOW = '#bfe394';
export const MEADOW_LIGHT = '#d2eeae';
export const FOREST = '#8fc272';
export const SCREE = '#c9cec6';
export const SLAB = '#dadfd6';
export const SLAB_EDGE = '#b8beb3';
export const WATER = '#6bb8e0';
export const WATER_LIGHT = '#8fcdea';
export const FOAM = '#dff2fb';
export const RANGE_FAR = ['#c6d8ea', '#b2c9df'] as const;
export const RANGE_NEAR = ['#a6bfd8', '#93afcb'] as const;
const ROCK = ['#a3afba', '#c3ccd4', '#7d8a96', '#8f9ca8'] as const; // flanc, dessus, ombre, face
const SHADOW_GREEN = 'rgba(28, 52, 20, 0.2)';
const SHADOW_ROCK = 'rgba(40, 50, 60, 0.2)';
const SHADOW_SNOW = 'rgba(70, 105, 140, 0.2)';
const WOOD = '#8b5a2b';

/** Petits dessins répétés : définis une fois, posés avec <use href="#{prefix}{kind}">. */
export function MountainDefs({ prefix: p }: { prefix: string }) {
  const tiers = 'M -18 -8 L 0 -34 L 18 -8 Z';
  const shadeTiers = 'M 0 -34 L 18 -8 L 0 -8 Z M 0 -46 L 15 -22 L 0 -22 Z M 0 -58 L 11 -36 L 0 -36 Z';
  return (
    <defs>
      <g id={`${p}pine`}>
        <ellipse cx="2" cy="0" rx="17" ry="5" fill={SHADOW_GREEN} />
        <rect x="-3" y="-10" width="6" height="10" rx="2" fill="#6b4422" />
        <path d={tiers} fill="#256b45" />
        <path d="M -15 -22 L 0 -46 L 15 -22 Z" fill="#2f7d4f" />
        <path d="M -11 -36 L 0 -58 L 11 -36 Z" fill="#3a8c5a" />
        <path d={shadeTiers} fill="#0d3320" opacity="0.18" />
      </g>
      <g id={`${p}pinelight`}>
        <ellipse cx="2" cy="0" rx="16" ry="5" fill={SHADOW_GREEN} />
        <rect x="-3" y="-10" width="6" height="10" rx="2" fill="#7a4e26" />
        <path d={tiers} fill="#378a57" />
        <path d="M -15 -22 L 0 -46 L 15 -22 Z" fill="#43995f" />
        <path d="M -11 -36 L 0 -58 L 11 -36 Z" fill="#52a86a" />
        <path d={shadeTiers} fill="#0d3320" opacity="0.16" />
      </g>
      <g id={`${p}snowpine`}>
        <ellipse cx="2" cy="0" rx="16" ry="4.5" fill={SHADOW_SNOW} />
        <rect x="-3" y="-10" width="6" height="10" rx="2" fill="#6b4422" />
        <path d={tiers} fill="#2f7d4f" />
        <path d="M -15 -22 L 0 -46 L 15 -22 Z" fill="#378a57" />
        <path d="M -11 -36 L 0 -58 L 11 -36 Z" fill="#43995f" />
        <path d={shadeTiers} fill="#0d3320" opacity="0.16" />
        <path
          d="M -14 -9 L -9 -16 L -4 -12 L 1 -19 L 6 -13 L 11 -17 L 15 -9 L 8 -12 L 2 -9 L -4 -11 Z M -10 -23 L 0 -38 L 10 -23 L 4 -26 L 0 -22 L -4 -26 Z M -7 -37 L 0 -48 L 7 -37 L 3 -40 L 0 -36 L -3 -40 Z M -4 -50 L 0 -58 L 4 -50 L 0 -52 Z"
          fill={SNOW}
        />
      </g>
      <g id={`${p}tree`}>
        <ellipse cx="2" cy="0" rx="22" ry="6" fill={SHADOW_GREEN} />
        <rect x="-4" y="-22" width="8" height="22" rx="3" fill={WOOD} />
        <circle cx="-12" cy="-30" r="14" fill="#4f9d44" />
        <circle cx="12" cy="-30" r="14" fill="#468f3c" />
        <circle cx="0" cy="-42" r="17" fill="#5fb14f" />
        <circle cx="-5" cy="-47" r="6" fill="#86cc6a" />
      </g>
      <g id={`${p}bush`}>
        <ellipse cx="1" cy="0" rx="17" ry="4" fill={SHADOW_GREEN} />
        <circle cx="-9" cy="-8" r="9" fill="#58a646" />
        <circle cx="9" cy="-8" r="9" fill="#4f9a3f" />
        <circle cx="0" cy="-14" r="11" fill="#67b853" />
        <circle cx="-3" cy="-17" r="3.5" fill="#86cc6a" />
      </g>
      {/* Fleur : la couleur des pétales vient du <use> (fill). */}
      <g id={`${p}flower`}>
        <path d="M 0 0 L 0 -10" stroke="#4f9d44" stroke-width="2" stroke-linecap="round" />
        <circle cx="3.5" cy="-12" r="2.6" />
        <circle cx="1.1" cy="-8.7" r="2.6" />
        <circle cx="-2.8" cy="-9.9" r="2.6" />
        <circle cx="-2.8" cy="-14.1" r="2.6" />
        <circle cx="1.1" cy="-15.3" r="2.6" />
        <circle cx="0" cy="-12" r="2" fill="#f4a300" />
      </g>
      <g id={`${p}edelweiss`}>
        <path d="M 0 0 L 0 -6" stroke="#7d9a6a" stroke-width="1.8" stroke-linecap="round" />
        <path
          d="M 0 -8 L -6 -11 L -1.5 -9.5 L -4 -14.5 L 0 -10.5 L 4 -14.5 L 1.5 -9.5 L 6 -11 L 1.5 -7.5 L 3.5 -3 L 0 -6.5 L -3.5 -3 L -1.5 -7.5 Z"
          fill="#ffffff"
          stroke="#c9d3c4"
          stroke-width="0.8"
          stroke-linejoin="round"
        />
        <circle cx="0" cy="-8.6" r="1.5" fill="#e8d36a" />
      </g>
      <path
        id={`${p}grass`}
        d="M -6 0 Q -6 -6 -9 -10 M 0 0 Q 0 -8 1 -13 M 6 0 Q 6 -6 9 -9"
        stroke="#6aa84f"
        stroke-width="2.4"
        stroke-linecap="round"
        fill="none"
      />
      <path
        id={`${p}tuft`}
        d="M -5 0 Q -5 -5 -8 -8 M 0 0 Q 0 -7 1 -11 M 5 0 Q 5 -5 8 -7"
        stroke="#8ea869"
        stroke-width="2.2"
        stroke-linecap="round"
        fill="none"
      />
      <g id={`${p}fern`}>
        <ellipse cx="0" cy="0" rx="11" ry="3" fill={SHADOW_GREEN} />
        <path d="M 0 0 Q -4 -8 -12 -10 M 0 0 Q 0 -10 2 -15 M 0 0 Q 5 -7 12 -8" stroke="#3f8a4f" stroke-width="3" stroke-linecap="round" fill="none" />
      </g>
      <g id={`${p}mushroom`}>
        <rect x="-2.5" y="-8" width="5" height="8" rx="2.5" fill="#fff7e8" />
        <path d="M -8 -7 Q 0 -19 8 -7 Z" fill="#e63946" />
        <circle cx="-2" cy="-11" r="1.5" fill="#ffffff" />
      </g>
      <g id={`${p}stone`}>
        <ellipse cx="1" cy="0" rx="11" ry="3" fill={SHADOW_ROCK} />
        <path d="M -10 0 L -7 -8 L 0 -11 L 7 -8 L 10 0 Z" fill={ROCK[3]} />
        <path d="M -7 -8 L 0 -11 L 7 -8 L 0 -6 Z" fill={ROCK[1]} />
        <path d="M 0 -6 L 7 -8 L 10 0 L 3 0 Z" fill={ROCK[2]} />
      </g>
      <g id={`${p}crag`}>
        <ellipse cx="1" cy="0" rx="17" ry="4" fill={SHADOW_ROCK} />
        <path d="M -16 0 L -12 -12 L -3 -21 L 8 -17 L 15 -6 L 13 0 Z" fill={ROCK[3]} />
        <path d="M -12 -12 L -3 -21 L 8 -17 L 1 -10 Z" fill={ROCK[1]} />
        <path d="M 1 -10 L 8 -17 L 15 -6 L 13 0 L 4 0 Z" fill={ROCK[2]} />
        <path d="M -16 0 L -12 -12 L 1 -10 L 4 0 Z" fill={ROCK[0]} />
      </g>
      <g id={`${p}snowcrag`}>
        <use href={`#${p}crag`} />
        <path d="M -12 -12 L -3 -21 L 8 -17 L 4 -13 L -1 -15 L -6 -10 Z" fill={SNOW} />
      </g>
      {/* Éboulis : quelques pierres anguleuses en tas. */}
      <g id={`${p}scree`}>
        <ellipse cx="0" cy="0" rx="15" ry="3.5" fill={SHADOW_ROCK} />
        <path d="M -14 0 L -12 -6 L -6 -8 L -3 -3 L -4 0 Z" fill={ROCK[0]} />
        <path d="M -12 -6 L -6 -8 L -5 -5 Z" fill={ROCK[1]} />
        <path d="M 1 0 L 3 -8 L 9 -10 L 13 -4 L 12 0 Z" fill={ROCK[3]} />
        <path d="M 3 -8 L 9 -10 L 8 -6 Z" fill={ROCK[1]} />
        <path d="M 8 -6 L 9 -10 L 13 -4 L 12 0 Z" fill={ROCK[2]} />
        <path d="M -5 1 L -3 -4 L 1 -5 L 3 0 Z" fill={ROCK[1]} />
      </g>
      <g id={`${p}drift`}>
        <path d="M -18 0 Q -14 -9 -4 -8 Q 2 -15 10 -9 Q 18 -8 18 0 Z" fill={SNOW_SHADE} />
        <path d="M -15 -2 Q -12 -8 -4 -7 Q 2 -13 9 -8 Q 15 -7 15 -2 Z" fill="#ffffff" />
      </g>
      <g id={`${p}pebbles`} fill="#9ea89f">
        <circle cx="-8" cy="-2" r="2.4" />
        <circle cx="-2" cy="3" r="1.8" />
        <circle cx="5" cy="-3" r="2.2" />
        <circle cx="9" cy="3" r="1.6" />
        <circle cx="1" cy="-6" r="1.5" />
      </g>
      <g id={`${p}cloud`}>
        <circle cx="-13" cy="-12" r="10" fill="#ffffff" />
        <circle cx="2" cy="-18" r="13" fill="#ffffff" />
        <circle cx="15" cy="-11" r="9" fill="#ffffff" />
        <rect x="-22" y="-12" width="44" height="9" rx="4.5" fill="#ffffff" />
      </g>
      <g id={`${p}cow`}>
        <ellipse cx="2" cy="0" rx="19" ry="4" fill={SHADOW_GREEN} />
        <path d="M -10 -6 V 0 M -5 -6 V 0 M 6 -6 V 0 M 11 -6 V 0" stroke="#e6e0d6" stroke-width="3.4" stroke-linecap="round" />
        <ellipse cx="0" cy="-13" rx="15" ry="9" fill="#f4f0ea" />
        <ellipse cx="-5" cy="-15" rx="6" ry="4.5" fill={WOOD} />
        <circle cx="7" cy="-10" r="3.5" fill={WOOD} />
        <path d="M -15 -14 Q -20 -10 -18 -4" stroke="#d8cfc2" stroke-width="2" stroke-linecap="round" fill="none" />
        <ellipse cx="17" cy="-19" rx="7" ry="6" fill="#f4f0ea" />
        <ellipse cx="21" cy="-16" rx="4" ry="3.2" fill="#f5c2b8" />
        <circle cx="16" cy="-21" r="1.3" fill="#3d2c1e" />
        <path d="M 12 -24 L 10 -29 M 20 -25 L 22 -30" stroke="#c9b28a" stroke-width="2.2" stroke-linecap="round" />
        <path d="M 11 -14 Q 14 -12 17 -14" stroke="#e63946" stroke-width="1.6" fill="none" />
        <circle cx="14" cy="-9" r="2.8" fill="#ffc531" stroke="#d99a00" stroke-width="0.8" />
      </g>
    </defs>
  );
}

/** Chalet d'alpage : rondins, volets rouges, fenêtres allumées, fumée qui monte de la cheminée. */
export function Chalet() {
  return (
    <g>
      <ellipse cx="2" cy="0" rx="42" ry="7" fill={SHADOW_GREEN} />
      <rect x="-30" y="-34" width="60" height="34" rx="3" fill="#c68a4e" />
      <rect x="10" y="-34" width="20" height="34" fill="#a8713d" opacity="0.35" />
      <path d="M -30 -23 H 30 M -30 -12 H 30" stroke="#a8713d" stroke-width="1.6" />
      <rect x="14" y="-62" width="9" height="16" fill="#8e99a3" />
      <path d="M -38 -30 L 0 -62 L 38 -30 Z" fill="#7a4e26" />
      <path d="M -38 -30 L 0 -62 L 38 -30 L 32 -30 L 0 -56 L -32 -30 Z" fill="#5d3a1a" />
      <rect x="-7" y="-20" width="14" height="20" rx="2" fill="#5d3a1a" />
      <rect x="-25" y="-25" width="12" height="11" fill="#ffe28a" stroke="#5d3a1a" stroke-width="1.5" />
      <rect x="13" y="-25" width="12" height="11" fill="#ffe28a" stroke="#5d3a1a" stroke-width="1.5" />
      <rect x="-29" y="-26" width="4" height="13" fill="#e63946" />
      <rect x="25" y="-26" width="4" height="13" fill="#e63946" />
      <path d="M -36 2 L -36 -10 M -46 2 L -46 -10 M -50 -7 H -32" stroke={WOOD} stroke-width="2.4" stroke-linecap="round" />
      <circle cx="19" cy="-70" r="5" fill="#ffffff" opacity="0.9" />
      <circle cx="24" cy="-82" r="7" fill="#ffffff" opacity="0.8" />
      <circle cx="18" cy="-97" r="9" fill="#ffffff" opacity="0.65" />
    </g>
  );
}

/** Refuge de haute montagne : pierre et bois, toit chargé de neige, fenêtre chaude. */
export function Refuge() {
  return (
    <g>
      <ellipse cx="3" cy="0" rx="32" ry="5" fill={SHADOW_SNOW} />
      <rect x="-22" y="-26" width="44" height="26" rx="2" fill="#a06a36" />
      <rect x="-22" y="-8" width="44" height="8" fill="#9aa4ad" />
      <path d="M -22 -4 H 22 M -12 -8 V -4 M 2 -8 V -4 M 14 -8 V -4" stroke="#7d8892" stroke-width="1" />
      <rect x="8" y="-26" width="14" height="26" fill="#5d3a1a" opacity="0.2" />
      <rect x="12" y="-58" width="7" height="14" fill="#8e99a3" />
      <path d="M -28 -24 L 0 -48 L 28 -24 Z" fill="#7a4e26" />
      <path d="M -29 -23 L 0 -49 L 29 -23 L 22 -26 L 14 -22 L 6 -28 L -2 -24 L -10 -29 L -18 -24 Z" fill={SNOW} />
      <path d="M 0 -49 L 29 -23 L 22 -26 L 14 -22 L 6 -28 Z" fill={SNOW_SHADE} />
      <rect x="-6" y="-16" width="11" height="16" rx="2" fill="#5d3a1a" />
      <rect x="-18" y="-20" width="8" height="8" fill="#ffe28a" stroke="#5d3a1a" stroke-width="1.5" />
      <rect x="10" y="-20" width="8" height="8" fill="#ffe28a" stroke="#5d3a1a" stroke-width="1.5" />
      <path d="M 18 -1 L 30 -1 L 30 -9" stroke="#7a4e26" stroke-width="2" fill="none" />
      <circle cx="16" cy="-64" r="4" fill="#ffffff" opacity="0.9" />
      <circle cx="20" cy="-74" r="5.5" fill="#ffffff" opacity="0.75" />
    </g>
  );
}

export function Snowman() {
  return (
    <g>
      <ellipse cx="2" cy="0" rx="15" ry="4" fill={SHADOW_SNOW} />
      <circle cx="0" cy="-11" r="12" fill="#ffffff" stroke={SNOW_SHADE} stroke-width="2" />
      <circle cx="0" cy="-29" r="8.5" fill="#ffffff" stroke={SNOW_SHADE} stroke-width="2" />
      <path d="M -6 -36 L 6 -36 L 5 -45 L -5 -45 Z" fill="#3d4a5c" />
      <rect x="-8" y="-37" width="16" height="2.5" rx="1" fill="#3d4a5c" />
      <circle cx="-3" cy="-30" r="1.3" fill="#3d2c1e" />
      <circle cx="3" cy="-30" r="1.3" fill="#3d2c1e" />
      <path d="M 0 -28 L 8 -26 L 0 -25 Z" fill="#f4830f" />
      <rect x="-7.5" y="-23" width="15" height="4" rx="2" fill="#e63946" />
      <path d="M 4 -21 L 7 -13" stroke="#e63946" stroke-width="3" stroke-linecap="round" />
      <circle cx="0" cy="-14" r="1.2" fill="#3d2c1e" />
      <circle cx="0" cy="-8" r="1.2" fill="#3d2c1e" />
      <path d="M -10 -15 L -20 -24 M 10 -15 L 20 -23 M -17 -21 L -20 -19 M 17 -20 L 20 -18" stroke="#7a4e26" stroke-width="2" stroke-linecap="round" />
    </g>
  );
}

/** Bouquetin sur son rocher. */
export function IbexRock({ prefix }: { prefix: string }) {
  return (
    <g>
      <use href={`#${prefix}crag`} transform="scale(1.7 1.5)" />
      <g transform="translate(-2 -29)">
        <path d="M -8 -7 V 3 M -3 -7 V 3 M 5 -7 V 3 M 9 -7 V 3" stroke="#8a6a44" stroke-width="2.4" stroke-linecap="round" />
        <ellipse cx="0" cy="-12" rx="12" ry="7" fill="#b08a5a" />
        <ellipse cx="2" cy="-9" rx="8" ry="3" fill="#d8c1a0" />
        <path d="M 9 -15 L 11 -22" stroke="#b08a5a" stroke-width="5" stroke-linecap="round" />
        <circle cx="13" cy="-23" r="5" fill="#b08a5a" />
        <path d="M 11 -27 Q 7 -39 -2 -36 M 15 -27 Q 13 -39 6 -40" fill="none" stroke="#6b5a48" stroke-width="2.4" stroke-linecap="round" />
        <circle cx="14" cy="-24" r="1.2" fill="#3d2c1e" />
        <path d="M 15 -19 L 15 -15" stroke="#f4f0ea" stroke-width="2" stroke-linecap="round" />
        <path d="M -12 -14 L -15 -16" stroke="#8a6a44" stroke-width="2.4" stroke-linecap="round" />
      </g>
    </g>
  );
}

/** Marmotte dressée devant un caillou. */
export function Marmot({ prefix }: { prefix: string }) {
  return (
    <g>
      <use href={`#${prefix}crag`} transform="translate(14 0) scale(0.9)" />
      <ellipse cx="-4" cy="0" rx="9" ry="2.5" fill={SHADOW_ROCK} />
      <ellipse cx="-4" cy="-9" rx="6.5" ry="9" fill="#a9753f" />
      <ellipse cx="-4" cy="-7" rx="3.6" ry="6" fill="#e2c39a" />
      <circle cx="-4" cy="-20" r="5.5" fill="#a9753f" />
      <circle cx="-8" cy="-24" r="1.8" fill="#a9753f" />
      <circle cx="0" cy="-24" r="1.8" fill="#a9753f" />
      <circle cx="-6" cy="-21" r="1" fill="#3d2c1e" />
      <circle cx="-2" cy="-21" r="1" fill="#3d2c1e" />
      <ellipse cx="-4" cy="-18" rx="2" ry="1.4" fill="#e2c39a" />
      <path d="M -8 -12 L -6 -9 M 0 -12 L -2 -9" stroke="#8a5c2e" stroke-width="2" stroke-linecap="round" />
    </g>
  );
}

/** Cairn : pierres plates empilées qui balisent le sentier. */
export function Cairn() {
  return (
    <g>
      <ellipse cx="2" cy="0" rx="13" ry="3.5" fill={SHADOW_ROCK} />
      <ellipse cx="0" cy="-3" rx="11" ry="4.5" fill={ROCK[3]} />
      <ellipse cx="1" cy="-9" rx="9" ry="4" fill={ROCK[0]} />
      <ellipse cx="-1" cy="-14.5" rx="7.5" ry="3.5" fill={ROCK[3]} />
      <ellipse cx="0" cy="-19.5" rx="5.5" ry="3" fill={ROCK[0]} />
      <ellipse cx="0.5" cy="-24" rx="3.5" ry="2.6" fill={ROCK[1]} />
      <path d="M -10 -4 Q -4 -7 6 -6 M -7 -15 Q -2 -17 5 -16" stroke={ROCK[1]} stroke-width="1.4" fill="none" stroke-linecap="round" />
    </g>
  );
}

/** Cascade : le torrent tombe d'une marche de rocher dans une vasque claire. Appui : centre de la vasque. */
export function Cascade({ prefix }: { prefix: string }) {
  return (
    <g>
      <path d="M -44 -2 L -42 -34 L -36 -58 L -22 -74 L -6 -84 L 12 -82 L 28 -70 L 40 -48 L 44 -2 Z" fill={ROCK[3]} />
      <path d="M -42 -34 L -36 -58 L -22 -74 L -6 -84 L 12 -82 L 28 -70 L 12 -64 L -8 -68 L -24 -52 Z" fill={ROCK[1]} />
      <path d="M 12 -64 L 28 -70 L 40 -48 L 44 -2 L 20 -2 L 18 -36 Z" fill={ROCK[2]} />
      <path d="M -44 -2 L -42 -34 L -24 -52 L -22 -2 Z" fill={ROCK[0]} />
      <path d="M -38 -50 Q -32 -62 -22 -66 M 18 -76 Q 26 -74 32 -64 M -30 -26 Q -26 -30 -22 -28" stroke="#5f9e4a" stroke-width="5" stroke-linecap="round" fill="none" />
      <path d="M -11 -80 Q 0 -86 11 -80 L 10 -6 L -10 -6 Z" fill={FOAM} />
      <path d="M -5 -80 V -10 M 4 -78 V -12" stroke={WATER_LIGHT} stroke-width="3" stroke-linecap="round" />
      <ellipse cx="0" cy="3" rx="38" ry="14" fill="#77ad5c" />
      <ellipse cx="0" cy="2" rx="33" ry="11.5" fill={WATER} />
      <ellipse cx="-8" cy="5" rx="14" ry="3.5" fill={WATER_LIGHT} />
      <circle cx="-10" cy="-3" r="6" fill="#ffffff" />
      <circle cx="2" cy="-6" r="7.5" fill="#ffffff" />
      <circle cx="12" cy="-2" r="5.5" fill="#ffffff" />
      <use href={`#${prefix}stone`} transform="translate(-34 8) scale(0.9)" />
      <use href={`#${prefix}stone`} transform="translate(30 10) scale(-0.8 0.8)" />
    </g>
  );
}

/** Pont de pierre, dans l'axe du chemin (repère local : y le long du chemin, x en travers). */
export function StoneBridge({ half }: { half: number }) {
  const len = 27;
  const w = half + 2;
  return (
    <g>
      <rect x={-w - 4} y={-len + 6} width={w * 2 + 12} height={len * 2} rx="6" fill="rgba(20, 50, 80, 0.22)" />
      <rect x={-w} y={-len} width={w * 2} height={len * 2} rx="5" fill="#d6dbe0" />
      <path
        d={`M ${-w} -13 H ${w} M ${-w} 0 H ${w} M ${-w} 13 H ${w} M -8 ${-len} V -13 M 8 -13 V 0 M -8 0 V 13 M 8 13 V ${len}`}
        stroke="#a7b0b8"
        stroke-width="1.6"
      />
      {[-1, 1].map((s) => (
        <g key={s}>
          <rect x={s > 0 ? w - 3 : -w - 5} y={-len - 3} width="8" height={len * 2 + 6} rx="3" fill={s > 0 ? '#7f8b96' : '#8e99a3'} />
          <rect x={s > 0 ? w - 3 : -w - 5} y={-len - 3} width="4" height={len * 2 + 6} rx="2" fill={s > 0 ? '#8e99a3' : '#b3bdc6'} />
        </g>
      ))}
    </g>
  );
}

/** Aigle qui plane, ailes ouvertes. */
export function Eagle() {
  return (
    <g>
      <path d="M -30 0 Q -14 -14 0 0 Q 14 -14 30 0 Q 14 -4 0 6 Q -14 -4 -30 0 Z" fill="#5b4a3a" />
      <path d="M -30 0 L -36 3 L -29 3 Z M 30 0 L 36 3 L 29 3 Z" fill="#5b4a3a" />
      <circle cx="0" cy="3" r="3.2" fill="#f4f0ea" />
      <path d="M -3 7 L 0 12 L 3 7 Z" fill="#5b4a3a" />
    </g>
  );
}
