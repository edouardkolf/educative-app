// Mécanique « Code secret » (Mastermind en couleurs), MS et CE1 : docs/specs/JEUX-LOGIQUE.md §3.2.
import type { MechanicDefinition } from '../../engine/types';
import { CodeBreakerView } from './CodeBreakerView';
import { generateRounds } from './generate';
import type { CodeBreakerRoundData } from './types';

export const codeBreaker: MechanicDefinition<'code-breaker', CodeBreakerRoundData> = {
  id: 'code-breaker',
  generateRounds,
  View: CodeBreakerView,
  // Laisse le temps de voir la ligne s'illuminer.
  solvedDelayMs: 1300,
  // La main tape les pots dans l'ordre du code, puis ✓.
  tutorialTargets: (round) => [...round.data.code.map((color) => `color-${color}`), 'submit'],
};

export type { CodeBreakerRoundData } from './types';
export { validateCodeBreaker } from './validate';
export { scoreGuess } from './logic';
