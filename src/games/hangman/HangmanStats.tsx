// Bloc de statistiques du pendu (docs/specs/MORPION-PENDU.md §5, arbitrage A7). Les indicateurs communs
// sont affichés par ChildStats ; ce bloc n'ajoute que ce qui est propre au pendu.
import type { GameStatsProps } from '../index';
import type { HangmanRecord } from '../../storage/hangmans';
import { formatPercentage } from '../../parent/format';
import { HANGMAN_WORDS } from './words';
import { MAX_MISTAKES } from './logic';
import { summarizeHangmans } from './stats';

export function HangmanStats({ records }: GameStatsProps<HangmanRecord>) {
  const s = summarizeHangmans(records);
  return (
    <section class="pa-section" data-testid="hangman-stats">
      <div class="pa-summary">
        <div class="pa-stat">
          <span class="pa-stat__value" data-testid="hangman-stats-found">
            {s.wordsFound} / {s.wordsPlayed}
          </span>
          <span class="pa-stat__label">Mots trouvés</span>
        </div>
        <div class="pa-stat">
          <span class="pa-stat__value">{formatPercentage(s.foundRate)}</span>
          <span class="pa-stat__label">Réussite</span>
        </div>
        <div class="pa-stat">
          <span class="pa-stat__value">
            {s.meanMistakesWhenFound === null ? '—' : s.meanMistakesWhenFound.toFixed(1)}
          </span>
          <span class="pa-stat__label">Erreurs par mot trouvé (sur {MAX_MISTAKES})</span>
        </div>
      </div>
      {s.recentlyMissed.length > 0 && (
        <p class="pa-muted">Derniers mots non trouvés : {s.recentlyMissed.join(', ')}.</p>
      )}
      <p class="pa-muted">
        Une partie = un mot, tiré parmi {HANGMAN_WORDS.length} sans reprendre les 40 derniers vus. Chaque lettre absente
        fait tomber un pétale ; {MAX_MISTAKES} pétales.
      </p>
    </section>
  );
}
