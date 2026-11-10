// CONTRAT (signatures) — textes envoyés à la voix du téléphone. LECTURE.md §6. Fonctions pures.
// SOUCHE posée par l'orchestrateur : la tâche L2 implémente.
import type { SpeechStep } from '../../ui/voice';
import type { GraphemeId, ReadingGameId } from './types';

/** Débit des sons isolés et des syllabes. */
export const SOUND_RATE = 0.8;

/** Texte qui fait dire à la voix le SON du graphème : 'a', 'eu', 'leu', 'queu', 'ou'… */
export function soundText(_grapheme: GraphemeId): string {
  throw new Error('L2 : à implémenter');
}

/** Texte qui fait dire le NOM de la lettre : 'a', 'èm', 'elle'… (graphèmes d'une lettre seulement). */
export function nameText(_grapheme: GraphemeId): string {
  throw new Error('L2 : à implémenter');
}

/** Texte qui fait dire une syllabe entière : 'la', 'mi'. Jamais deux sons enchaînés. */
export function syllableText(_syllable: string): string {
  throw new Error('L2 : à implémenter');
}

/** Phrase courte de consigne d'un jeu, dite à la démonstration : « Touche la lettre qui chante. » */
export function gameInstruction(_game: ReadingGameId): string {
  throw new Error('L2 : à implémenter');
}

/** Tout ce que le banc d'écoute fait entendre : chaque son, chaque nom, chaque syllabe, chaque consigne. */
export interface BenchEntry {
  group: 'sons' | 'noms' | 'syllabes' | 'consignes' | 'mots';
  /** Ce que le parent lit : « M — son ». */
  label: string;
  steps: readonly SpeechStep[];
}
export function benchEntries(): BenchEntry[] {
  throw new Error('L2 : à implémenter');
}
