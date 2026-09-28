// Indicateur discret (ARCHITECTURE §8) : un soleil entouré d'un anneau qui se vide selon le temps
// restant. Affiché sur le hub et la carte seulement (docs/specs/HUB.md §2.1) : jamais en partie ni
// dans un jeu, pour ne jamais montrer de compte à rebours pendant que l'enfant se concentre.
import { Emoji } from './Emoji';

export function TimeRing({ ratio }: { ratio: number }) {
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.max(0, Math.min(1, ratio)));
  return (
    <div class="time-ring" data-testid="time-ring" aria-hidden="true">
      <svg class="time-ring__ring" viewBox="0 0 40 40" width={40} height={40}>
        <circle class="time-ring__track" cx="20" cy="20" r={radius} />
        <circle
          class="time-ring__progress"
          cx="20"
          cy="20"
          r={radius}
          style={{ strokeDasharray: circumference, strokeDashoffset: offset }}
        />
      </svg>
      <span class="time-ring__sun">
        <Emoji char="☀️" />
      </span>
    </div>
  );
}
