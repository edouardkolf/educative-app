// Mécanique « pendu » : trouver un mot lettre par lettre (docs/specs/JEUX-LOGIQUE.md §3.5).
import type { MechanicDefinition } from '../../engine/types';
import { generateRounds } from './generate';
import { HangmanView } from './HangmanView';
import type { HangmanRoundData } from './types';

export const hangman: MechanicDefinition<'hangman', HangmanRoundData> = {
  id: 'hangman',
  generateRounds,
  View: HangmanView,
  solvedDelayMs: 1200,
  tutorialTargets: (round) => {
    const word = round.data.words[0];
    return word ? [`letter-${Array.from(word.word)[0]}`] : [];
  },
};

export type { HangmanRoundData } from './types';
export { validateHangman } from './validate';
