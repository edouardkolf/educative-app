// Données d'affichage propres à la mécanique « code-breaker » (Code secret).
import type { CodeBreakerParams, Color } from '../../engine/types';

export interface CodeBreakerRoundData {
  /** Le code secret, de gauche à droite. */
  code: Color[];
  /** Pots proposés à l'enfant, dans l'ordre des paramètres. */
  colors: Color[];
  feedback: CodeBreakerParams['feedback'];
  maxGuesses: number;
}
