// Logique pure du pendu (docs/specs/MORPION-PENDU.md §3.2). L'enfant propose des lettres sans accent :
// « e » révèle aussi é, è, ê et ë. Chaque lettre absente fait tomber un pétale de la fleur ; plus de
// pétale, le mot est montré. Aucun accès au DOM : testée sous Vitest.
import type { Rng } from '../../engine/types';
import type { HangmanOutcome } from '../../storage/hangmans';
import type { HangmanWord } from './types';

/** Pétales de la fleur = erreurs permises. Généreux : le pendu classique en laisse souvent moins. */
export const MAX_MISTAKES = 8;
/** Le tirage évite les mots des N dernières parties de l'enfant. */
export const RECENT_WINDOW = 40;

export const ALPHABET: readonly string[] = 'abcdefghijklmnopqrstuvwxyz'.split('');

/** Lettre de base, sans accent ni cédille (é → e, ç → c, î → i). Hors a–z : chaîne vide. */
export function baseLetter(char: string): string {
  const base = char.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  return /^[a-z]$/.test(base) ? base : '';
}

/** Lettres de base distinctes du mot. */
export function lettersOf(word: string): Set<string> {
  return new Set(Array.from(word).map(baseLetter).filter(Boolean));
}

export interface Slot {
  /** Caractère affiché une fois révélé (avec son accent). */
  char: string;
  revealed: boolean;
}

export function slotsFor(word: string, guesses: readonly string[]): Slot[] {
  const guessed = new Set(guesses);
  return Array.from(word).map((char) => ({ char, revealed: guessed.has(baseLetter(char)) }));
}

export function mistakesFor(word: string, guesses: readonly string[]): number {
  const letters = lettersOf(word);
  return guesses.filter((g) => !letters.has(g)).length;
}

export function isFound(word: string, guesses: readonly string[]): boolean {
  const guessed = new Set(guesses);
  return Array.from(lettersOf(word)).every((l) => guessed.has(l));
}

export function outcomeFor(word: string, guesses: readonly string[], maxMistakes = MAX_MISTAKES): HangmanOutcome | null {
  if (isFound(word, guesses)) return 'found';
  if (mistakesFor(word, guesses) >= maxMistakes) return 'lost';
  return null;
}

export type GuessResult =
  | { kind: 'ignored' }
  | { kind: 'hit' | 'miss'; guesses: string[]; outcome: HangmanOutcome | null };

/** Propose `letter` : ignorée si déjà proposée, hors alphabet ou partie finie ; sinon juste ou fausse. */
export function guess(word: string, guesses: readonly string[], letter: string, maxMistakes = MAX_MISTAKES): GuessResult {
  const l = baseLetter(letter);
  if (!l || guesses.includes(l) || outcomeFor(word, guesses, maxMistakes) !== null) return { kind: 'ignored' };
  const next = [...guesses, l];
  return {
    kind: lettersOf(word).has(l) ? 'hit' : 'miss',
    guesses: next,
    outcome: outcomeFor(word, next, maxMistakes),
  };
}

/**
 * Tire un mot au hasard parmi ceux que l'enfant n'a pas vus dans ses `RECENT_WINDOW` dernières parties
 * (`recentIds`, du plus ancien au plus récent). Si tout a été vu récemment, le plus anciennement vu
 * redevient possible : on n'exclut que la fin de la liste.
 */
export function drawWord(words: readonly HangmanWord[], recentIds: readonly string[], rng: Rng): HangmanWord {
  if (words.length === 0) throw new Error('drawWord: catalogue vide');
  const window = Math.min(RECENT_WINDOW, words.length - 1);
  const excluded = new Set(window > 0 ? recentIds.slice(-window) : []);
  const candidates = words.filter((w) => !excluded.has(w.id));
  return rng.pick(candidates.length > 0 ? candidates : words);
}
