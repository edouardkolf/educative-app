// Logique pure d'une manche de « Devine le nombre » : bornes encore possibles, propositions, raté.

export type GuessHint = 'higher' | 'lower' | 'found';

export interface GuessState {
  secret: number;
  /** Plage complète de la manche. */
  min: number;
  max: number;
  maxGuesses: number;
  /** Bornes encore possibles (incluses). Elles ne s'élargissent jamais. */
  low: number;
  high: number;
  /** Propositions faites, dans l'ordre (y compris celles hors des bornes possibles). */
  guesses: number[];
  /** Dernier retour donné, null avant la première proposition. */
  lastHint: GuessHint | null;
  /** Vrai dès que le budget est dépassé sans avoir trouvé ; reste vrai ensuite. */
  missed: boolean;
  found: boolean;
}

export interface GuessResult {
  state: GuessState;
  hint: GuessHint;
  /** Vrai UNE seule fois : à la proposition qui dépasse le budget sans trouver. */
  justMissed: boolean;
}

export function createGuessState(secret: number, min: number, max: number, maxGuesses: number): GuessState {
  return { secret, min, max, maxGuesses, low: min, high: max, guesses: [], lastHint: null, missed: false, found: false };
}

export function applyGuess(state: GuessState, n: number): GuessResult {
  if (state.found) return { state, hint: 'found', justMissed: false };

  const hint: GuessHint = n === state.secret ? 'found' : n < state.secret ? 'higher' : 'lower';
  const guesses = [...state.guesses, n];
  // « Plus grand » : le secret est > n ; une proposition déjà éliminée ne change rien.
  const low = hint === 'higher' ? Math.max(state.low, n + 1) : state.low;
  const high = hint === 'lower' ? Math.min(state.high, n - 1) : state.high;
  const overBudget = hint !== 'found' && guesses.length > state.maxGuesses;
  const justMissed = overBudget && !state.missed;

  return {
    hint,
    justMissed,
    state: {
      ...state,
      guesses,
      low,
      high,
      lastHint: hint,
      found: hint === 'found',
      missed: state.missed || overBudget,
    },
  };
}

/** Un nombre est encore possible s'il est dans les bornes courantes. */
export function isPossible(state: GuessState, n: number): boolean {
  return n >= state.low && n <= state.high;
}
