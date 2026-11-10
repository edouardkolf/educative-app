// Fin de séance (LECTURE.md §2) : fanfare, étoile qui grandit, confettis ; si une étape vient d'être validée,
// le médaillon suivant s'ouvre (fête plus longue). Un seul bouton (coche) ramène à l'accueil : jamais d'enchaînement.
import { useEffect, useState } from 'preact/hooks';
import { IconButton } from '../../ui/IconButton';
import { Icon } from '../../ui/icons/Icon';
import { playFanfare } from '../../ui/sound';
import { cancelSpeech, speak } from '../../ui/voice';
import { STAGE_COLORS, StageIcon } from './StageIcon';
import type { ReadingStage } from './types';

export interface EndInfo {
  stage: ReadingStage;
  review: boolean;
  /** L'étape vient d'être validée par cette séance. */
  justValidated: boolean;
  /** Le programme entier est maintenant validé. */
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
  const colors = STAGE_COLORS[info.stage];
  const next: ReadingStage | null = info.justValidated && info.stage < 5 ? ((info.stage + 1) as ReadingStage) : null;

  useEffect(() => {
    playFanfare();
    const talk = window.setTimeout(() => void speak('Bravo !', { rate: 0.9 }), 600);
    const show = window.setTimeout(() => setReady(true), info.justValidated ? 2200 : 1200);
    return () => {
      window.clearTimeout(talk);
      window.clearTimeout(show);
      cancelSpeech();
    };
  }, [info.justValidated]);

  return (
    <div
      class="screen rd-end"
      data-testid="reading-end"
      data-validated={info.justValidated ? 'true' : undefined}
      style={`--rd-main:${colors.main};--rd-soft:${colors.soft};--rd-dark:${colors.dark}`}
    >
      <div class="rd-confetti" aria-hidden="true">
        {Array.from({ length: CONFETTI_COUNT }, (_, i) => (
          <span
            key={i}
            class="rd-confetti__piece"
            style={`--cx:${((i * 37) % 100) - 50}vw;--cd:${(i % 6) * 110}ms;--cc:${CONFETTI_COLORS[i % CONFETTI_COLORS.length]};--cr:${(i * 53) % 360}deg`}
          />
        ))}
      </div>

      <div class="rd-end__stars" aria-hidden="true">
        <span class="rd-end__star">
          <Icon name="star" size="100%" />
        </span>
        <span class="rd-end__medal">
          <StageIcon stage={info.stage} />
        </span>
        {next !== null && (
          <span
            class="rd-end__next"
            style={`--m-main:${STAGE_COLORS[next].main};--m-soft:${STAGE_COLORS[next].soft}`}
            data-testid="reading-end-next"
          >
            <span class="rd-end__next-face">
              <StageIcon stage={next} />
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
