// Fin de dictée (docs/specs/DICTEE.md §2.5) : score en grand, les mots réussis apparaissent un à un,
// puis la fanfare (et l'étoile si la dictée est parfaite), puis les deux boutons.
import { useEffect, useState } from 'preact/hooks';
import { Icon } from '../../ui/icons/Icon';
import { IconButton } from '../../ui/IconButton';
import { playFanfare, playStar } from '../../ui/sound';

export interface DictationEndWord {
  label: string;
  /** Juste du premier coup (✓ vert), ou corrigé (pastille orange). */
  firstTry: boolean;
}

export interface DictationEndProps {
  words: readonly DictationEndWord[];
  score: number;
  total: number;
  onAgain: () => void;
  onHome: () => void;
  /** Temps de session écoulé : boutons masqués, l'écran de fin de session arrive de lui-même. */
  timeUp: boolean;
  /** Appelée une fois l'animation terminée (mots, fanfare, étoile). */
  onAnimationDone: () => void;
}

const REVEAL_STEP_MS = 120;

export function DictationEnd({ words, score, total, onAgain, onHome, timeUp, onAnimationDone }: DictationEndProps) {
  const [shown, setShown] = useState(0);
  const [done, setDone] = useState(false);
  const perfect = total > 0 && score === total;

  useEffect(() => {
    if (shown >= words.length) return undefined;
    const id = window.setTimeout(() => setShown((n) => n + 1), REVEAL_STEP_MS);
    return () => window.clearTimeout(id);
  }, [shown, words.length]);

  useEffect(() => {
    if (shown < words.length || done) return;
    setDone(true);
    if (perfect) playStar();
    playFanfare();
    onAnimationDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown, words.length, done]);

  return (
    <div class="dict-end" data-testid="dictation-end" data-score={score} data-total={total}>
      {perfect && done && <Icon name="star" size={72} class="dict-end__star" />}
      <p class="dict-end__score">
        {score} / {total}
      </p>
      <div class="dict-end__words">
        {words.slice(0, shown).map((w, i) => (
          <span key={i} class={`dict-end__word${w.firstTry ? ' dict-end__word--ok' : ' dict-end__word--fixed'}`}>
            {w.firstTry ? <Icon name="check" size={20} /> : <span class="dict-end__dot" aria-hidden="true" />}
            {w.label}
          </span>
        ))}
      </div>
      {done && !timeUp && (
        <div class="dict-end__actions">
          <IconButton size={72} onClick={onAgain} aria-label="Encore une dictée" data-testid="dictation-again">
            <Icon name="replay" size={44} />
          </IconButton>
          <IconButton size={72} onClick={onHome} aria-label="Retour à l'accueil" data-testid="to-hub">
            <Icon name="home" size={44} />
          </IconButton>
        </div>
      )}
    </div>
  );
}
