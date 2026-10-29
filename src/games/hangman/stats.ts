// Indicateurs propres au pendu (docs/specs/MORPION-PENDU.md §5). Fonction pure, testée sous Vitest.
import type { HangmanRecord } from '../../storage/hangmans';

export interface HangmanSummary {
  /** Mots allés au bout (trouvés ou perdus). */
  wordsPlayed: number;
  wordsFound: number;
  /** Trouvés / joués ; null sans mot joué. */
  foundRate: number | null;
  /** Erreurs moyennes sur les mots trouvés ; null sans mot trouvé. */
  meanMistakesWhenFound: number | null;
  /** Mots perdus les plus récents (au plus 5), pour en parler avec l'enfant. */
  recentlyMissed: string[];
}

export function summarizeHangmans(records: readonly HangmanRecord[]): HangmanSummary {
  const played = records.filter((r) => r.outcome !== null);
  const found = played.filter((r) => r.outcome === 'found');
  const missed = played.filter((r) => r.outcome === 'lost');
  return {
    wordsPlayed: played.length,
    wordsFound: found.length,
    foundRate: played.length === 0 ? null : found.length / played.length,
    meanMistakesWhenFound: found.length === 0 ? null : found.reduce((s, r) => s + r.mistakes, 0) / found.length,
    recentlyMissed: missed
      .slice()
      .sort((a, b) => b.startedAt - a.startedAt)
      .slice(0, 5)
      .map((r) => r.word),
  };
}
