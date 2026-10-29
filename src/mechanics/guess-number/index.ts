// Mécanique « Devine le nombre » (CE1) : bornes qui se resserrent, plus grand / plus petit.
import type { MechanicDefinition } from '../../engine/types';
import { generateRounds } from './generate';
import { GuessNumberView } from './GuessNumberView';
import type { GuessNumberRoundData } from './types';

export const guessNumber: MechanicDefinition<'guess-number', GuessNumberRoundData> = {
  id: 'guess-number',
  generateRounds,
  View: GuessNumberView,
  // Laisse voir l'animation du nombre trouvé.
  solvedDelayMs: 1200,
  // Tutoriel : la main tape directement le nombre secret.
  tutorialTargets(round) {
    const { secret, input } = round.data;
    return input === 'tiles' ? [`num-${secret}`] : [...String(secret)].map((d) => `key-${d}`).concat('key-ok');
  },
};

export type { GuessNumberRoundData } from './types';
export { validateGuessNumber } from './validate';
