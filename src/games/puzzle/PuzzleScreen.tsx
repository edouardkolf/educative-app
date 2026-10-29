// SOUCHE (T0) — écran générique des jeux libres de logique, écrit par la tâche T6
// (docs/specs/JEUX-LOGIQUE.md §4). Contrat : props `{ game: PuzzleGameId }`, maison `data-testid="to-hub"`.
import { returnTo } from '../../app/routes';
import { IconButton } from '../../ui/IconButton';
import { Icon } from '../../ui/icons/Icon';
import type { PuzzleGameId } from '../../storage/puzzles';

export interface PuzzleScreenProps {
  game: PuzzleGameId;
}

export function PuzzleScreen({ game }: PuzzleScreenProps) {
  return (
    <div class="screen screen--puzzle" data-testid="puzzle" data-game={game}>
      <IconButton size={56} onClick={() => returnTo('hub')} aria-label="Retour à l'accueil" data-testid="to-hub">
        <Icon name="home" size={36} />
      </IconButton>
    </div>
  );
}
