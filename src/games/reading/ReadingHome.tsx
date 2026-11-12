// Accueil du programme (LECTURE.md §16) : le parcours de niveaux, sans texte. On grimpe : le niveau 1 est en bas.
// Le niveau en cours pulse et lance sa séance ; un niveau gagné se rejoue ; un niveau verrouillé tremble.
import { useEffect, useRef, useState } from 'preact/hooks';
import { returnTo } from '../../app/routes';
import { IconButton } from '../../ui/IconButton';
import { Icon } from '../../ui/icons/Icon';
import { playError } from '../../ui/sound';
import { LevelIcon, TRACK_COLORS } from './LevelIcon';
import { LEVELS, levelState, type LevelProgress, type LevelState, type ReadingLevel } from './levels';

interface ReadingHomeProps {
  progress: LevelProgress;
  /** `checkVoice()` = ready. */
  voiceReady: boolean;
  onStart: (level: ReadingLevel, review: boolean) => void;
}

export function ReadingHome({ progress, voiceReady, onStart }: ReadingHomeProps) {
  const [shaking, setShaking] = useState<string | null>(null);
  const pathRef = useRef<HTMLOListElement>(null);
  const focusId = (progress.current ?? LEVELS[LEVELS.length - 1])?.id;

  useEffect(() => {
    if (shaking === null) return undefined;
    const id = window.setTimeout(() => setShaking(null), 500);
    return () => window.clearTimeout(id);
  }, [shaking]);

  // Le niveau en cours est amené au milieu de l'écran à l'ouverture.
  useEffect(() => {
    const el = pathRef.current?.querySelector<HTMLElement>('[data-focus="true"]');
    el?.scrollIntoView({ block: 'center' });
  }, [focusId]);

  function tap(level: ReadingLevel, state: LevelState) {
    if (!voiceReady) return;
    if (state === 'locked') {
      playError();
      setShaking(level.id);
      return;
    }
    onStart(level, state === 'done');
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

      <ol class="rd-path" ref={pathRef} data-testid="reading-path" data-muted={voiceReady ? undefined : 'true'}>
        {LEVELS.map((level, i) => {
          const state = levelState(progress, level);
          const colors = TRACK_COLORS[level.track];
          return (
            <li key={level.id} class="rd-step" data-side={i % 2 === 0 ? 'left' : 'right'}>
              <button
                type="button"
                class={`rd-medal${shaking === level.id ? ' rd-medal--shake' : ''}`}
                data-testid={`reading-level-${level.index}`}
                data-level={level.id}
                data-game={level.game}
                data-state={state}
                data-focus={level.id === focusId ? 'true' : undefined}
                disabled={!voiceReady}
                aria-disabled={state === 'locked' ? 'true' : undefined}
                aria-label={`Niveau ${level.index}`}
                style={`--m-main:${colors.main};--m-soft:${colors.soft};--m-dark:${colors.dark}`}
                onClick={() => tap(level, state)}
              >
                <span class="rd-medal__face">
                  <LevelIcon level={level} />
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
            </li>
          );
        })}
      </ol>
    </div>
  );
}
