// Fin de séance (LECTURE.md §2 et §16). Niveau gagné : fanfare, étoile, confettis, et le niveau suivant s'ouvre.
// Niveau pas encore gagné : pas de fête, la voix invite à réessayer. Un seul bouton (coche) ramène à l'accueil.
import { useEffect, useState } from 'preact/hooks';
import { IconButton } from '../../ui/IconButton';
import { Icon } from '../../ui/icons/Icon';
import { playFanfare } from '../../ui/sound';
import { cancelSpeech, speak } from '../../ui/voice';
import { LevelIcon, TRACK_COLORS } from './LevelIcon';
import type { ReadingLevel } from './levels';

export interface EndInfo {
  level: ReadingLevel;
  review: boolean;
  /** La séance atteint la barre du niveau (4 sur 5). */
  passed: boolean;
  /** Le niveau vient d'être gagné pour la première fois par cette séance. */
  justValidated: boolean;
  /** Niveau débloqué par cette séance, ou null. */
  next: ReadingLevel | null;
  /** Tout le parcours est maintenant fait. */
  programFinished: boolean;
}

interface ReadingEndProps {
  info: EndInfo;
  onContinue: () => void;
}

const CONFETTI_COLORS = ['#ff6f83', '#ffc53d', '#4fbd63', '#3fa7ee', '#9a78e8', '#ffa62b'];
const CONFETTI_COUNT = 18;

export function ReadingEnd({ info, onContinue }: ReadingEndProps) {
  const [ready, setReady] = useState(false);
  const colors = TRACK_COLORS[info.level.track];
  const next = info.justValidated ? info.next : null;
  const nextColors = next ? TRACK_COLORS[next.track] : null;

  useEffect(() => {
    if (info.passed) playFanfare();
    const talk = window.setTimeout(() => void speak(info.passed ? 'Bravo !' : 'On réessaie !', { rate: 0.9 }), 600);
    const show = window.setTimeout(() => setReady(true), info.justValidated ? 2200 : 1200);
    return () => {
      window.clearTimeout(talk);
      window.clearTimeout(show);
      cancelSpeech();
    };
  }, [info.justValidated, info.passed]);

  return (
    <div
      class="screen rd-end"
      data-testid="reading-end"
      data-passed={info.passed ? 'true' : 'false'}
      data-validated={info.justValidated ? 'true' : undefined}
      style={`--rd-main:${colors.main};--rd-soft:${colors.soft};--rd-dark:${colors.dark};--m-dark:${colors.dark};--medal:110px`}
    >
      {info.passed && (
        <div class="rd-confetti" aria-hidden="true">
          {Array.from({ length: CONFETTI_COUNT }, (_, i) => (
            <span
              key={i}
              class="rd-confetti__piece"
              style={`--cx:${((i * 37) % 100) - 50}vw;--cd:${(i % 6) * 110}ms;--cc:${CONFETTI_COLORS[i % CONFETTI_COLORS.length]};--cr:${(i * 53) % 360}deg`}
            />
          ))}
        </div>
      )}

      <div class="rd-end__stars" aria-hidden="true">
        {info.passed && (
          <span class="rd-end__star">
            <Icon name="star" size="100%" />
          </span>
        )}
        <span class="rd-end__medal">
          <LevelIcon level={info.level} />
        </span>
        {next !== null && nextColors && (
          <span
            class="rd-end__next"
            style={`--m-main:${nextColors.main};--m-soft:${nextColors.soft};--m-dark:${nextColors.dark};--medal:96px`}
            data-testid="reading-end-next"
          >
            <span class="rd-end__next-face">
              <LevelIcon level={next} />
            </span>
            <span class="rd-end__lock">
              <Icon name="lock" size="100%" />
            </span>
          </span>
        )}
      </div>

      <div class="rd-end__action">
        {ready && (
          <IconButton size={88} variant="primary" onClick={onContinue} aria-label="Continuer" data-testid="reading-end-continue">
            <Icon name="check" size={56} />
          </IconButton>
        )}
      </div>
    </div>
  );
}
