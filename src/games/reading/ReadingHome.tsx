// Accueil du programme (LECTURE.md §2) : un chemin de cinq médaillons, sans texte. L'étape en cours pulse et lance
// la séance ; une étape validée se rejoue en révision ; une étape verrouillée tremble sans rien lancer.
import { useEffect, useState } from 'preact/hooks';
import { returnTo } from '../../app/routes';
import { IconButton } from '../../ui/IconButton';
import { Icon } from '../../ui/icons/Icon';
import { playError } from '../../ui/sound';
import { gatedItems } from './curriculum';
import { STAGE_COLORS, StageIcon } from './StageIcon';
import { READING_STAGES, type ReadingProgress, type ReadingStage } from './types';

export type StageState = 'done' | 'current' | 'locked';

export function stageState(progress: ReadingProgress, stage: ReadingStage): StageState {
  if (progress.finished || stage < progress.stage) return 'done';
  return stage === progress.stage ? 'current' : 'locked';
}

/** Items acquis / items à acquérir (ceux qui bloquent le passage) de l'étape. */
export function stageGauge(progress: ReadingProgress, stage: ReadingStage): { acquired: number; total: number } {
  let items: string[] = [];
  try {
    items = gatedItems(stage);
  } catch {
    items = [];
  }
  const acquired = items.filter((id) => progress.items[id]?.state === 'acquired').length;
  return { acquired, total: items.length };
}

interface ReadingHomeProps {
  progress: ReadingProgress;
  /** `checkVoice()` = ready. */
  voiceReady: boolean;
  onStart: (stage: ReadingStage, review: boolean) => void;
}

export function ReadingHome({ progress, voiceReady, onStart }: ReadingHomeProps) {
  const [shaking, setShaking] = useState<ReadingStage | null>(null);

  useEffect(() => {
    if (shaking === null) return undefined;
    const id = window.setTimeout(() => setShaking(null), 500);
    return () => window.clearTimeout(id);
  }, [shaking]);

  function tap(stage: ReadingStage, state: StageState) {
    if (!voiceReady) return;
    if (state === 'locked') {
      playError();
      setShaking(stage);
      return;
    }
    onStart(stage, state === 'done');
  }

  return (
    <div class="screen rd-home" data-testid="reading-home" data-voice={voiceReady ? 'ready' : 'off'}>
      <header class="rd-topbar rd-topbar--home">
        <IconButton size={56} onClick={() => returnTo('hub')} aria-label="Retour à l'accueil" data-testid="to-hub">
          <Icon name="home" size={36} />
        </IconButton>
        {!voiceReady && (
          <div class="rd-unavailable" data-testid="reading-unavailable" role="status" aria-label="Le son du téléphone est coupé">
            <Icon name="speaker-off" size={64} />
          </div>
        )}
      </header>

      <ol class="rd-path" data-muted={voiceReady ? undefined : 'true'}>
        {READING_STAGES.map((stage, i) => {
          const state = stageState(progress, stage);
          const colors = STAGE_COLORS[stage];
          const gauge = state === 'current' ? stageGauge(progress, stage) : null;
          const pct = gauge && gauge.total > 0 ? Math.round((gauge.acquired / gauge.total) * 100) : 0;
          return (
            <li key={stage} class="rd-step" data-side={i % 2 === 0 ? 'left' : 'right'}>
              <button
                type="button"
                class={`rd-medal${shaking === stage ? ' rd-medal--shake' : ''}`}
                data-testid={`reading-stage-${stage}`}
                data-state={state}
                disabled={!voiceReady}
                aria-disabled={state === 'locked' ? 'true' : undefined}
                aria-label={`Étape ${stage}`}
                style={`--m-main:${colors.main};--m-soft:${colors.soft};--m-dark:${colors.dark}`}
                onClick={() => tap(stage, state)}
              >
                <span class="rd-medal__face">
                  <StageIcon stage={stage} />
                </span>
                {state === 'current' && (
                  <span class="rd-medal__badge rd-medal__badge--play" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="60%" height="60%">
                      <path d="M8 5.5L19 12L8 18.5Z" fill="#fff" stroke="#fff" stroke-width="2.4" stroke-linejoin="round" />
                    </svg>
                  </span>
                )}
                {state === 'done' && (
                  <span class="rd-medal__badge rd-medal__badge--done" aria-hidden="true">
                    <Icon name="check" size="62%" />
                  </span>
                )}
                {state === 'locked' && (
                  <span class="rd-medal__badge rd-medal__badge--lock" aria-hidden="true">
                    <Icon name="lock" size="68%" />
                  </span>
                )}
              </button>
              {gauge && (
                <div
                  class="rd-gauge"
                  data-testid={`reading-gauge-${stage}`}
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={gauge.total}
                  aria-valuenow={gauge.acquired}
                  style={`--m-main:${colors.main}`}
                >
                  <span class="rd-gauge__fill" style={`width:${pct}%`} />
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
