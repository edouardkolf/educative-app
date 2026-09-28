// CONTRAT — parties du coloriage magique (store "colorings"). Voir docs/specs/COLORIAGE.md §5.
// Les types font foi ; les corps sont écrits par la tâche « stockage v2 » (bâtis sur game-records.ts).
// Les fonctions sont des déclarations `function` (hissées) : game-records.ts les importe en retour.
import type { Color } from '../engine/types';
import type { GameEndReason, GameRecordBase } from './types';

/** Palier du code magique : 1 goutte, 2 objet gris, 3 formes + légende, 4 dé + légende. */
export type ColoringTier = 1 | 2 | 3 | 4;

/** Profile.gameSettings.coloring (arbitrage A6). `tier` absent : palier automatique. */
export interface ColoringSettings {
  tier?: ColoringTier;
}

/** Un essai = une application de peinture sur une case. */
export interface PaintAttempt {
  zoneId: string;
  /** Couleur posée. */
  paint: Color;
  /** Gouttes qui l'ont produite : 1 ou 2 primaires, dans l'ordre de versement (la recette utilisée). */
  drops: Color[];
  /** Première application de ce contenu du récipient. */
  fresh: boolean;
  /** Aide déjà montrée pour cette case : 0 aucune, 1 indice, 2 main. */
  help: 0 | 1 | 2;
  /** Temps actif de la partie (ms) au moment de l'essai. */
  at: number;
}

export interface ColoringRecord extends GameRecordBase {
  // startedAt : première case peinte de la séance (arbitrage A9) ; activeMs : écran de peinture, page visible.
  drawingId: string;
  tier: ColoringTier;
  detail: 1 | 2 | 3;
  variantSeed: number;
  /** Cases et couleurs attendues, figées au premier lancement du dessin (ordre du dessin). */
  zones: { id: string; target: Color }[];
  /** Paliers 3-4 : couleur → symbole (CodeSymbol) ; null sinon. */
  legend: Partial<Record<Color, string>> | null;
  /** Essais de CETTE partie. */
  attempts: PaintAttempt[];
  /** Partie précédente du même dessin (reprise, COLORIAGE.md §3.6). Une partie close ne se rouvre jamais. */
  resumedFrom?: string;
  /** Cases déjà peintes au début de cette partie ([] pour un nouveau dessin). */
  paintedAtStart: string[];
  /** Essais ratés par case avant cette partie ({} pour un nouveau dessin). */
  missesAtStart: Record<string, number>;
}

/** Ce que l'écran fournit à la création ; les champs communs et `attempts: []` sont posés par le stockage. */
export type ColoringInit = Omit<ColoringRecord, keyof GameRecordBase | 'attempts'>;

/** Crée la partie à la première case peinte de la séance : `in_progress`, `attempts: []`. */
export async function startColoring(_profileId: string, _init: ColoringInit): Promise<ColoringRecord> {
  throw new Error('startColoring : à implémenter (docs/specs/COLORIAGE.md §5.2)');
}

/** Ajoute l'essai et met à jour `activeMs`. Partie `in_progress` seulement. */
export async function recordPaint(_id: string, _attempt: PaintAttempt, _activeMs: number): Promise<void> {
  throw new Error('recordPaint : à implémenter (docs/specs/COLORIAGE.md §5.2)');
}

export async function completeColoring(_id: string, _activeMs: number): Promise<void> {
  throw new Error('completeColoring : à implémenter (docs/specs/COLORIAGE.md §5.2)');
}

export async function abandonColoring(_id: string, _reason: GameEndReason, _activeMs: number): Promise<void> {
  throw new Error('abandonColoring : à implémenter (docs/specs/COLORIAGE.md §5.2)');
}

/** Parties de coloriage d'un profil, triées par `startedAt` croissant. */
export async function listColorings(_profileId: string): Promise<ColoringRecord[]> {
  return [];
}

/** Toutes les cases sont dans `paintedAtStart` ou peintes par un essai (sert à la clôture au lancement). */
export function isColoringFinished(record: ColoringRecord): boolean {
  const painted = new Set(record.paintedAtStart);
  for (const attempt of record.attempts) {
    const zone = record.zones.find((z) => z.id === attempt.zoneId);
    if (zone && attempt.paint === zone.target) painted.add(zone.id);
  }
  return record.zones.every((zone) => painted.has(zone.id));
}

/** Validation à l'import (docs/specs/COLORIAGE.md §5.3). */
export function isColoringRecord(_value: unknown): _value is ColoringRecord {
  return false;
}

/** Validation de `Profile.gameSettings.coloring` : `tier` absent, ou de 1 à 4. */
export function isColoringSettings(value: unknown): value is ColoringSettings {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const { tier } = value as { tier?: unknown };
  return tier === undefined || tier === 1 || tier === 2 || tier === 3 || tier === 4;
}
