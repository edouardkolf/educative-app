// Sous-état de fin de niveau (même route que Partie) : étoiles une par une, puis actions.
import { useEffect, useState } from 'preact/hooks';
import { StarRow } from '../ui/StarRow';
import { IconButton } from '../ui/IconButton';
import { playStar } from '../ui/sound';

interface LevelEndProps {
  stars: 1 | 2 | 3;
  hasNext: boolean;
  onNext: () => void;
  onReplay: () => void;
  onToMap: () => void;
}

const STAR_INTERVAL_MS = 600;

export function LevelEnd({ stars, hasNext, onNext, onReplay, onToMap }: LevelEndProps) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    setShown(0);
    const timers: number[] = [];
    for (let i = 1; i <= stars; i += 1) {
      timers.push(
        window.setTimeout(() => {
          setShown(i);
          playStar();
        }, i * STAR_INTERVAL_MS),
      );
    }
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [stars]);

  const done = shown >= stars;

  return (
    <div class="screen screen--level-end" data-testid="level-end" data-stars={shown}>
      <div class="level-end__stars">
        <StarRow count={shown as 0 | 1 | 2 | 3} size={64} animated />
      </div>
      {done && (
        <div class="level-end__actions">
          {hasNext && (
            <IconButton size={80} variant="primary" onClick={onNext} aria-label="Niveau suivant" data-testid="next">
              ▶
            </IconButton>
          )}
          <IconButton size={72} onClick={onReplay} aria-label="Rejouer" data-testid="replay">
            ↻
          </IconButton>
          <IconButton size={72} onClick={onToMap} aria-label="Retour à la carte" data-testid="to-map">
            🗺️
          </IconButton>
        </div>
      )}
    </div>
  );
}
