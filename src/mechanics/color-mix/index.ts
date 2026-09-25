// Mécanique « color-mix » (laboratoire des couleurs) : génère les manches et les affiche.
import type { Color, MechanicDefinition } from '../../engine/types';
import { ColorMixView } from './ColorMixView';
import { generateRounds, recipeFor } from './generate';
import type { ColorMixRoundData } from './types';

export const colorMix: MechanicDefinition<'color-mix', ColorMixRoundData> = {
  id: 'color-mix',
  generateRounds,
  View: ColorMixView,
  // L'objet révélé reste ~3 s à l'écran avant d'enchaîner (voir ColorMixView : MIX_MS + cette valeur).
  solvedDelayMs: 3000,
  // La main du tutoriel doit mimer les deux versements (les deux fioles de la recette).
  tutorialTargets: (round) => recipeFor(round.answer as Color),
};

export type { ColorMixRoundData } from './types';
