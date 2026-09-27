// Sous-état « plus de vies » (même route que Partie) : un visage triste, puis rejouer ou revenir à la carte.
// Jamais de relance automatique : c'est l'enfant (ou le parent) qui choisit de continuer ou de s'arrêter.
import { IconButton } from '../ui/IconButton';
import { WorldBackdrop } from './map/WorldBackdrop';
import type { WorldId } from './map/layout';

interface LevelFailedProps {
  world?: WorldId | null;
  onReplay: () => void;
  onToMap: () => void;
}

export function LevelFailed({ world, onReplay, onToMap }: LevelFailedProps) {
  return (
    <div class="screen screen--level-failed" data-testid="level-failed">
      {world && <WorldBackdrop world={world} veil="soft" />}
      <div class="level-failed__face" aria-hidden="true">
        😢
      </div>
      <div class="level-end__actions">
        <IconButton size={72} onClick={onReplay} aria-label="Rejouer" data-testid="replay">
          ↻
        </IconButton>
        <IconButton size={72} onClick={onToMap} aria-label="Retour à la carte" data-testid="to-map">
          🗺️
        </IconButton>
      </div>
    </div>
  );
}
