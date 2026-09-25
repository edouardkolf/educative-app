// Sous-état de fin de niveau (même route que Partie) : étoiles une par une, puis actions.
import { useEffect, useMemo, useState } from 'preact/hooks';
import { StarRow } from '../ui/StarRow';
import { IconButton } from '../ui/IconButton';
import { playFanfare, playStar } from '../ui/sound';

interface LevelEndProps {
  stars: 1 | 2 | 3;
  hasNext: boolean;
  onNext: () => void;
  onReplay: () => void;
  onToMap: () => void;
  /** Appelé une fois (quand l'animation des étoiles se termine) : minuteur, écran de fin différé. */
  onDone?: () => void;
  /**
   * F4 : le temps est déjà écoulé pendant cet écran. Suivant/Rejouer démarreraient une nouvelle
   * partie qui serait comptée en abandon 3 s plus tard (l'écran de fin va s'afficher de lui-même) —
   * on n'affiche donc plus que les étoiles, aucune action.
   */
  timeUp?: boolean;
}

const STAR_INTERVAL_MS = 600;
const CONFETTI_COUNT = 26;
const CONFETTI_MS = 2800;
const CONFETTI_COLORS = ['#ffb347', '#ff6b6b', '#4dd0e1', '#81c784', '#ba68c8', '#ffd54f'];
const CONFETTI_EMOJIS = ['⭐', '🎉', '✨'];

interface ConfettiPiece {
  left: number;
  delayMs: number;
  durationMs: number;
  color: string;
  rotate: number;
  emoji: string;
}

function makeConfetti(): ConfettiPiece[] {
  return Array.from({ length: CONFETTI_COUNT }, () => ({
    left: Math.random() * 100,
    delayMs: Math.random() * 400,
    durationMs: 1800 + Math.random() * 900,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)] as string,
    rotate: Math.random() * 360,
    emoji: CONFETTI_EMOJIS[Math.floor(Math.random() * CONFETTI_EMOJIS.length)] as string,
  }));
}

export function LevelEnd({ stars, hasNext, onNext, onReplay, onToMap, onDone, timeUp = false }: LevelEndProps) {
  const [shown, setShown] = useState(0);
  const [celebrate, setCelebrate] = useState(false);
  const confetti = useMemo(makeConfetti, []);

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

  useEffect(() => {
    if (done) onDone?.();
    // Ne doit se déclencher qu'au moment où l'animation se termine, pas à chaque changement de `onDone`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  // Niveau terminé : pluie d'étoiles/confettis + fanfare, une fois. Respecte prefers-reduced-motion
  // (pas de pluie animée, mais la fanfare reste : un signal sonore de réussite n'est pas un mouvement).
  useEffect(() => {
    if (!done) return undefined;
    playFanfare();
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    if (reduced) return undefined;
    setCelebrate(true);
    const timer = window.setTimeout(() => setCelebrate(false), CONFETTI_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  return (
    <div class="screen screen--level-end" data-testid="level-end" data-stars={shown}>
      {celebrate && (
        <div class="level-end__confetti" aria-hidden="true">
          {confetti.map((piece, i) => (
            <span
              key={i}
              class="level-end__confetti-piece"
              style={{
                left: `${piece.left}%`,
                animationDelay: `${piece.delayMs}ms`,
                animationDuration: `${piece.durationMs}ms`,
                color: piece.color,
                transform: `rotate(${piece.rotate}deg)`,
              }}
            >
              {piece.emoji}
            </span>
          ))}
        </div>
      )}
      <div class="level-end__stars">
        <StarRow count={shown as 0 | 1 | 2 | 3} size={64} animated />
      </div>
      {done && !timeUp && (
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
