// Mécanique « orthographe des mots invariables » : génère les manches et les affiche.
import type { ChoiceId, MechanicDefinition, Round } from '../../engine/types';
import { generateRounds } from './generate';
import { SpellingView } from './SpellingView';
import type { SpellingRoundData } from './types';

/**
 * Suite de `data-choice` pour la main du tutoriel : en mode "tiles", les étiquettes dans l'ordre du
 * mot puis "tiles-ok" ; sinon le comportement par défaut du moteur (taper la bonne réponse).
 */
function tutorialTargets(round: Round<SpellingRoundData>): ChoiceId[] {
  if (round.data.mode !== 'tiles') return [round.answer];
  const { letters, tiles } = round.data;
  const used = new Set<number>();
  const targets: ChoiceId[] = [];
  for (const letter of letters) {
    const index = tiles.findIndex((tile, i) => tile === letter && !used.has(i));
    if (index === -1) continue; // ne devrait pas arriver (les lettres du mot sont toujours dans `tiles`)
    used.add(index);
    targets.push(`tile-${index}`);
  }
  targets.push('tiles-ok');
  return targets;
}

/** Le mot remis dans sa phrase reste affiché le temps de relire la phrase entière. */
export const SENTENCE_REVEAL_MS = 2500;

export const spelling: MechanicDefinition<'spelling', SpellingRoundData> = {
  id: 'spelling',
  generateRounds,
  View: SpellingView,
  tutorialTargets,
  solvedDelayMs: (round) => (round.data.sentence ? SENTENCE_REVEAL_MS : 900),
};

export type { SpellingRoundData } from './types';
