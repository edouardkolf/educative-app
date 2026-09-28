// CONTRAT — parties du coloriage magique (store "colorings"). Voir docs/specs/COLORIAGE.md §5.
// Les types font foi ; les corps sont écrits par la tâche « stockage v2 » (bâtis sur game-records.ts).
// Les fonctions sont des déclarations `function` (hissées) : game-records.ts les importe en retour.
import { COLORS, type Color } from '../engine/types';
import { mixColors } from '../mechanics/color-mix/generate';
import { finishGameRecord, isGameRecordBase, listGameRecords, startGameRecord, updateGameRecord } from './game-records';
import type { GameEndReason, GameRecordBase } from './types';
import { isFiniteNumber, isNonEmptyString, isPlainObject } from './validate';

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
export async function startColoring(profileId: string, init: ColoringInit): Promise<ColoringRecord> {
  return startGameRecord('colorings', profileId, { ...init, attempts: [] });
}

/** Ajoute l'essai et met à jour `activeMs`. Partie `in_progress` seulement. */
export async function recordPaint(id: string, attempt: PaintAttempt, activeMs: number): Promise<void> {
  await updateGameRecord('colorings', id, (record) => ({
    ...record,
    attempts: [...record.attempts, attempt],
    activeMs,
  }));
}

export async function completeColoring(id: string, activeMs: number): Promise<void> {
  await finishGameRecord('colorings', id, { status: 'completed' }, (record) => ({ ...record, activeMs }));
}

export async function abandonColoring(id: string, reason: GameEndReason, activeMs: number): Promise<void> {
  await finishGameRecord('colorings', id, { status: 'abandoned', endReason: reason }, (record) => ({
    ...record,
    activeMs,
  }));
}

/** Parties de coloriage d'un profil, triées par `startedAt` croissant. */
export async function listColorings(profileId: string): Promise<ColoringRecord[]> {
  return listGameRecords('colorings', profileId);
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

const PRIMARY_COLORS: readonly Color[] = ['red', 'yellow', 'blue'];

function isColor(value: unknown): value is Color {
  return typeof value === 'string' && (COLORS as readonly string[]).includes(value);
}

function isZone(value: unknown): value is { id: string; target: Color } {
  return isPlainObject(value) && isNonEmptyString(value.id) && isColor(value.target);
}

function isLegend(value: unknown): value is Partial<Record<Color, string>> | null {
  if (value === null) return true;
  if (!isPlainObject(value)) return false;
  return Object.entries(value).every(([key, val]) => isColor(key) && isNonEmptyString(val));
}

/** Validation à l'import (docs/specs/COLORIAGE.md §5.3). */
export function isColoringRecord(value: unknown): value is ColoringRecord {
  if (!isGameRecordBase(value)) return false;
  const v = value as unknown as Record<string, unknown>;
  if (!isNonEmptyString(v.drawingId)) return false;
  if (v.tier !== 1 && v.tier !== 2 && v.tier !== 3 && v.tier !== 4) return false;
  if (v.detail !== 1 && v.detail !== 2 && v.detail !== 3) return false;
  if (!Number.isInteger(v.variantSeed)) return false;
  if (v.resumedFrom !== undefined && !isNonEmptyString(v.resumedFrom)) return false;
  if (!Array.isArray(v.zones) || v.zones.length === 0 || !v.zones.every(isZone)) return false;
  const zones = v.zones as { id: string; target: Color }[];
  const zoneIds = new Set(zones.map((zone) => zone.id));
  if (zoneIds.size !== zones.length) return false;
  if (!isLegend(v.legend)) return false;

  if (!Array.isArray(v.paintedAtStart)) return false;
  const paintedSeen = new Set<string>();
  for (const id of v.paintedAtStart) {
    if (typeof id !== 'string' || !zoneIds.has(id) || paintedSeen.has(id)) return false;
    paintedSeen.add(id);
  }

  if (!isPlainObject(v.missesAtStart)) return false;
  for (const [id, count] of Object.entries(v.missesAtStart)) {
    if (!zoneIds.has(id) || !Number.isInteger(count) || (count as number) < 0) return false;
  }

  if (!Array.isArray(v.attempts)) return false;
  for (const attempt of v.attempts) {
    if (!isPlainObject(attempt)) return false;
    if (typeof attempt.zoneId !== 'string' || !zoneIds.has(attempt.zoneId)) return false;
    if (!isColor(attempt.paint)) return false;
    if (!Array.isArray(attempt.drops) || (attempt.drops.length !== 1 && attempt.drops.length !== 2)) return false;
    if (!attempt.drops.every((d: unknown) => isColor(d) && PRIMARY_COLORS.includes(d))) return false;
    const drops = attempt.drops as Color[];
    const expectedPaint = drops.length === 1 ? drops[0] : mixColors(drops[0] as Color, drops[1] as Color);
    if (attempt.paint !== expectedPaint) return false;
    if (typeof attempt.fresh !== 'boolean') return false;
    if (attempt.help !== 0 && attempt.help !== 1 && attempt.help !== 2) return false;
    if (!isFiniteNumber(attempt.at) || (attempt.at as number) < 0) return false;
  }

  return true;
}

/** Validation de `Profile.gameSettings.coloring` : `tier` absent, ou de 1 à 4. */
export function isColoringSettings(value: unknown): value is ColoringSettings {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const { tier } = value as { tier?: unknown };
  return tier === undefined || tier === 1 || tier === 2 || tier === 3 || tier === 4;
}
