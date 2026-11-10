// Fond des parties de la forêt (400 × 800, sous un voile blanc) : une clairière calme bordée de sapins et
// d'arbres sur les côtés ; le milieu reste vide pour ne pas attirer l'œil.
import { BACKDROP_HEIGHT as H, BACKDROP_WIDTH as W, hash01 } from '../../layout';
import { FLOWER_KEYS, ForestDefs } from './art';

const P = 'bd-forest-';

interface Spot {
  k: string;
  x: number;
  y: number;
  s: number;
}

/** Arbres serrés le long d'un bord, du haut vers le bas, de plus en plus clairsemés vers le milieu. */
function edgeSpots(): Spot[] {
  const out: Spot[] = [];
  for (let side = 0; side < 2; side += 1) {
    for (let i = 0; i < 12; i += 1) {
      const y = 70 + i * 64 + hash01(i * 3 + side * 50) * 24;
      const depth = hash01(i * 5 + side * 70 + 1);
      const x = 18 + depth * 44 + (i % 2) * 26;
      const round = (i + side) % 3 === 2;
      out.push({ k: round ? 'tree' : 'pine', x: side ? W - x : x, y, s: round ? 1.55 : 1.7 });
    }
  }
  return out.sort((a, b) => a.y - b.y);
}

/** Petit décor posé au pied des arbres : fleurs, buissons, herbes, loin du centre. */
function groundSpots(): Spot[] {
  const out: Spot[] = [];
  for (let i = 0; i < 26; i += 1) {
    const left = i % 2 === 0;
    const x = (left ? 50 : W - 50) + (left ? 1 : -1) * (30 + hash01(i * 7 + 2) * 60);
    const y = 40 + hash01(i * 7 + 3) * (H - 80);
    const pick = hash01(i * 7 + 4);
    const k = pick < 0.5 ? FLOWER_KEYS[i % FLOWER_KEYS.length]! : pick < 0.8 ? 'grass' : 'bush';
    out.push({ k, x, y, s: k === 'bush' ? 1.4 : 1.4 });
  }
  return out;
}

export function ForestBackdrop() {
  const trees = edgeSpots();
  const ground = groundSpots();
  return (
    <>
      <ForestDefs p={P} />
      <linearGradient id={`${P}ground`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2={H}>
        <stop offset="0" stop-color="#a6d17c" />
        <stop offset="0.5" stop-color="#b9de8f" />
        <stop offset="1" stop-color="#c6e79a" />
      </linearGradient>
      <rect x="0" y="0" width={W} height={H} fill={`url(#${P}ground)`} />
      <ellipse cx="90" cy="250" rx="210" ry="120" fill="#d3eeaa" opacity="0.55" />
      <ellipse cx="330" cy="610" rx="230" ry="130" fill="#d3eeaa" opacity="0.55" />
      <ellipse cx="200" cy="420" rx="160" ry="70" fill="#8fbf5f" opacity="0.16" />
      {ground.map((g, i) => (
        <use key={`g${i}`} href={`#${P}${g.k}`} transform={`translate(${Math.round(g.x)} ${Math.round(g.y)}) scale(${g.s})`} />
      ))}
      {trees.map((t, i) => (
        <use key={`t${i}`} href={`#${P}${t.k}`} transform={`translate(${Math.round(t.x)} ${Math.round(t.y)}) scale(${t.s})`} />
      ))}
    </>
  );
}
