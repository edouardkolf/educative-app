// Variantes de couleurs, légende et graine (docs/specs/COLORIAGE.md §3.5). Logique pure.
import { SHAPES } from '../../engine/types';
import type { Color } from '../../engine/types';
import { createRng } from '../../engine/rng';
import type { CodeSymbol, Detail, Drawing, ZoneLayer } from './model';
import type { ColoringTier } from '../../storage/colorings';

const SECONDARY_COLORS = new Set<Color>(['orange', 'green', 'purple']);

/** Minimums de couleurs distinctes/secondaires par palier (docs/specs/COLORIAGE.md §3.4). */
const COLOR_MINIMUMS: Record<ColoringTier, { distinct: number; secondary: number }> = {
  1: { distinct: 3, secondary: 1 },
  2: { distinct: 4, secondary: 2 },
  3: { distinct: 4, secondary: 2 },
  4: { distinct: 5, secondary: 3 },
};

const MAX_ATTEMPTS = 200;

/** FNV-1a 32 bits : hash déterministe d'une chaîne, utilisé pour dériver une graine numérique. */
export function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Toutes les cases (kind "zone") du dessin, dans l'ordre de peinture, tous niveaux confondus. */
function allZones(drawing: Drawing): ZoneLayer[] {
  const layers = [...drawing.background, ...drawing.subjects.flatMap((s) => s.layers), ...(drawing.foreground ?? [])];
  return layers.filter((l): l is ZoneLayer => l.kind === 'zone');
}

/** Les cases présentes à ce niveau de détail. */
function zonesForDetail(drawing: Drawing, detail: Detail): ZoneLayer[] {
  return allZones(drawing).filter((z) => z.detail <= detail);
}

function tryAssign(zones: readonly ZoneLayer[], rng: ReturnType<typeof createRng>): Map<string, Color> {
  const assignment = new Map<string, Color>();
  const pairColor = new Map<string, Color>();
  for (const zone of zones) {
    if (zone.pair) {
      let color = pairColor.get(zone.pair);
      if (color === undefined) {
        color = rng.pick(zone.palette);
        pairColor.set(zone.pair, color);
      }
      assignment.set(zone.id, color);
    } else {
      assignment.set(zone.id, rng.pick(zone.palette));
    }
  }
  return assignment;
}

function isValidAssignment(
  zones: readonly ZoneLayer[],
  assignment: ReadonlyMap<string, Color>,
  tier: ColoringTier,
): boolean {
  const ids = new Set(zones.map((z) => z.id));
  for (const zone of zones) {
    if (!zone.differentFrom) continue;
    for (const otherId of zone.differentFrom) {
      if (!ids.has(otherId)) continue; // ignoré si absent à ce niveau (§3.5)
      if (assignment.get(otherId) === assignment.get(zone.id)) return false;
    }
  }
  const colors = new Set(assignment.values());
  const minimums = COLOR_MINIMUMS[tier];
  if (colors.size < minimums.distinct) return false;
  let secondaryCount = 0;
  for (const c of colors) if (SECONDARY_COLORS.has(c)) secondaryCount += 1;
  return secondaryCount >= minimums.secondary;
}

/**
 * Tire une couleur par case (docs/specs/COLORIAGE.md §3.5) : jusqu'à 200 tirages avec `createRng(seed)`,
 * garde le premier valide (pair respecté, differentFrom respecté, minimums du palier atteints).
 * Si aucun n'est valide, revient aux couleurs naturelles (`palette[0]`).
 */
export function assignColors(
  drawing: Drawing,
  detail: Detail,
  tier: ColoringTier,
  seed: number,
): { id: string; target: Color }[] {
  const zones = zonesForDetail(drawing, detail);
  const rng = createRng(seed);
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const assignment = tryAssign(zones, rng);
    if (isValidAssignment(zones, assignment, tier)) {
      return zones.map((z) => ({ id: z.id, target: assignment.get(z.id) as Color }));
    }
  }
  return zones.map((z) => ({ id: z.id, target: z.palette[0] as Color }));
}

function signaturesEqual(a: readonly Color[], b: readonly Color[]): boolean {
  return a.length === b.length && a.every((c, i) => c === b[i]);
}

/**
 * Le plus petit k ≥ 0 pour lequel la variante obtenue (via `fnv1a(profileId|drawingId|k)`) a une
 * signature de couleurs différente des `recentSignatures` fournies (les 5 dernières, au même niveau
 * de détail, à l'appelant de les fournir).
 */
export function nextVariantSeed(
  profileId: string,
  drawing: Drawing,
  detail: Detail,
  tier: ColoringTier,
  recentSignatures: readonly (readonly Color[])[],
): number {
  const maxK = 1000;
  for (let k = 0; k < maxK; k += 1) {
    const seed = fnv1a(`${profileId}|${drawing.id}|${k}`);
    const signature = assignColors(drawing, detail, tier, seed).map((z) => z.target);
    if (!recentSignatures.some((sig) => signaturesEqual(sig, signature))) return seed;
  }
  // Repli improbable (§3.5 ne prévoit pas d'échec) : la dernière graine essayée.
  return fnv1a(`${profileId}|${drawing.id}|${maxK - 1}`);
}

/**
 * Légende (docs/specs/COLORIAGE.md §3.5) : palier < 3, pas de légende. Palier 3, une forme de
 * `SHAPES` par couleur (mélangées). Palier 4, une face de dé (1 à 6) par couleur (mélangées).
 */
export function legendFor(
  colors: readonly Color[],
  tier: ColoringTier,
  seed: number,
): Partial<Record<Color, CodeSymbol>> | null {
  if (tier < 3) return null;
  const rng = createRng(seed);
  const symbols: CodeSymbol[] =
    tier === 3 ? rng.shuffle(SHAPES) : rng.shuffle([1, 2, 3, 4, 5, 6] as const).map((n) => `dice-${n}` as const);
  const legend: Partial<Record<Color, CodeSymbol>> = {};
  colors.forEach((color, index) => {
    legend[color] = symbols[index];
  });
  return legend;
}
