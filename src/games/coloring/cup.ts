// Le récipient de mélange (docs/specs/COLORIAGE.md §3.1, règles R1 à R5). Logique pure, sans DOM.
// Reprend le geste appris au labo des couleurs (mixColors, PRIMARY_FLASKS).
import { mixColors } from '../../mechanics/color-mix/generate';
import type { Color } from '../../engine/types';

/** État du récipient : les gouttes versées (0, 1 ou 2, dans l'ordre) et si sa peinture a déjà servi. */
export interface CupState {
  drops: Color[];
  used: boolean;
}

export const EMPTY_CUP: CupState = { drops: [], used: false };

/** R1 : sans goutte, pas de peinture ; 1 goutte, la peinture est la goutte ; 2 gouttes, mixColors. */
export function paintOf(cup: CupState): Color | null {
  if (cup.drops.length === 0) return null;
  if (cup.drops.length === 1) return cup.drops[0] as Color;
  return mixColors(cup.drops[0] as Color, cup.drops[1] as Color);
}

/**
 * Tap sur une fiole : R2 (récipient à 0 ou 1 goutte, +1 goutte, `used` repasse à faux) ou
 * R3 (récipient plein : rinçage d'abord, puis la goutte seule).
 */
export function pourFlask(cup: CupState, flask: Color): CupState {
  if (cup.drops.length >= 2) {
    return { drops: [flask], used: false };
  }
  return { drops: [...cup.drops, flask], used: false };
}

/** R4 : un tap sur le récipient le rince ; s'il est déjà vide, rien ne se passe. */
export function rinseCup(cup: CupState): CupState {
  if (cup.drops.length === 0) return cup;
  return EMPTY_CUP;
}

/**
 * R5 : la peinture reste après chaque case. `fresh` est vrai si c'est la première application
 * depuis le dernier versement (i.e. `used` était encore faux).
 */
export function applyCupPaint(cup: CupState): { fresh: boolean; cup: CupState } {
  const fresh = !cup.used;
  return { fresh, cup: { ...cup, used: true } };
}
