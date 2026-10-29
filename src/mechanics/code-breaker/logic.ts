// Logique pure du Code secret : notation d'un essai (règles du Mastermind) et règle du raté.
import type { Shape as ShapeName, Color } from '../../engine/types';

export type Mark = 'exact' | 'present' | 'absent';

export interface GuessScore {
  /** Une marque par position de l'essai. */
  marks: Mark[];
  exact: number;
  present: number;
}

/** Forme associée à chaque couleur (aide pour les daltoniens et pour les non-lecteurs). */
export const COLOR_SHAPE: Record<Color, ShapeName> = {
  red: 'circle',
  blue: 'square',
  yellow: 'triangle',
  green: 'star',
  purple: 'heart',
  orange: 'diamond',
};

/**
 * Note `guess` contre `code`. Les bien placés sont retirés d'abord ; une couleur n'est ensuite « présente »
 * qu'autant de fois qu'il en reste dans le code (doublons gérés comme au Mastermind).
 */
export function scoreGuess(code: readonly string[], guess: readonly string[]): GuessScore {
  const marks: Mark[] = guess.map(() => 'absent');
  const remaining = new Map<string, number>();
  guess.forEach((color, i) => {
    if (color === code[i]) marks[i] = 'exact';
    else if (code[i] !== undefined) remaining.set(code[i]!, (remaining.get(code[i]!) ?? 0) + 1);
  });
  guess.forEach((color, i) => {
    if (marks[i] === 'exact') return;
    const left = remaining.get(color) ?? 0;
    if (left > 0) {
      marks[i] = 'present';
      remaining.set(color, left - 1);
    }
  });
  return {
    marks,
    exact: marks.filter((m) => m === 'exact').length,
    present: marks.filter((m) => m === 'present').length,
  };
}

export function isCracked(score: GuessScore, length: number): boolean {
  return score.exact === length;
}

/** Vrai quand le budget d'essais vient d'être épuisé sans trouver et que le raté n'a pas encore été signalé. */
export function shouldEmitMiss(guessCount: number, maxGuesses: number, cracked: boolean, alreadyEmitted: boolean): boolean {
  return !cracked && !alreadyEmitted && guessCount >= maxGuesses;
}
