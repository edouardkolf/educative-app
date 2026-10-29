// Vue du Code secret. Aucun texte : pions colorés (avec forme), marques, pots, ✓.
import { useEffect, useRef, useState } from 'preact/hooks';
import { MISS } from '../../engine/types';
import type { Color, MechanicViewProps } from '../../engine/types';
import { Icon } from '../../ui/icons/Icon';
import { Shape } from '../../ui/Shape';
import { COLOR_HEX } from '../../ui/palette';
import { COLOR_SHAPE, isCracked, scoreGuess, shouldEmitMiss } from './logic';
import type { GuessScore } from './logic';
import type { CodeBreakerRoundData } from './types';
import './code-breaker.css';

interface PlayedGuess {
  colors: Color[];
  score: GuessScore;
}

function Peg({ color, size }: { color: Color; size: number }) {
  return (
    <span class="cb-peg" style={{ width: `${size}px`, height: `${size}px` }}>
      <Shape shape={COLOR_SHAPE[color]} color={color} size={Math.round(size * 0.84)} />
    </span>
  );
}

function PositionalMark({ mark }: { mark: GuessScore['marks'][number] }) {
  if (mark === 'exact') {
    return (
      <span class="cb-mark cb-mark--exact">
        <Icon name="check" size={14} />
      </span>
    );
  }
  return <span class={`cb-mark${mark === 'present' ? ' cb-mark--present' : ''}`} />;
}

function PlayedRow({ guess, feedback, lit }: { guess: PlayedGuess; feedback: CodeBreakerRoundData['feedback']; lit: boolean }) {
  return (
    <div class={`cb-row cb-row--played${lit ? ' is-lit' : ''}`}>
      <div class="cb-row__pegs">
        {guess.colors.map((color, i) => (
          <div class="cb-cell" key={i}>
            <Peg color={color} size={36} />
            {feedback === 'positional' && <PositionalMark mark={guess.score.marks[i]!} />}
          </div>
        ))}
      </div>
      {feedback === 'counts' && (
        <div class="cb-counts">
          {Array.from({ length: guess.score.exact }, (_, i) => (
            <span key={`e${i}`} class="cb-dot cb-dot--exact" />
          ))}
          {Array.from({ length: guess.score.present }, (_, i) => (
            <span key={`p${i}`} class="cb-dot cb-dot--present" />
          ))}
        </div>
      )}
    </div>
  );
}

export function CodeBreakerView({ round, solved, onChoose }: MechanicViewProps<CodeBreakerRoundData>) {
  const { code, colors, feedback, maxGuesses } = round.data;
  const length = code.length;
  const [history, setHistory] = useState<PlayedGuess[]>([]);
  const [slots, setSlots] = useState<(Color | null)[]>(() => Array.from({ length }, () => null));
  const [cracked, setCracked] = useState(false);
  const missSent = useRef(false);
  const historyRef = useRef<HTMLDivElement>(null);

  // L'historique défile (jamais l'écran) : on garde la dernière ligne visible.
  useEffect(() => {
    const el = historyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [history.length]);

  const locked = solved || cracked;
  const complete = slots.every((s) => s !== null);
  const empty = slots.every((s) => s === null);

  function pick(color: Color) {
    if (locked) return;
    const free = slots.indexOf(null);
    if (free === -1) return;
    setSlots(slots.map((s, i) => (i === free ? color : s)));
  }

  function clear(index: number) {
    if (locked || slots[index] === null) return;
    setSlots(slots.map((s, i) => (i === index ? null : s)));
  }

  function submit() {
    if (locked || !complete) return;
    const guess = slots as Color[];
    const score = scoreGuess(code, guess);
    const found = isCracked(score, length);
    const next = [...history, { colors: guess, score }];
    setHistory(next);
    setSlots(Array.from({ length }, () => null));
    if (found) {
      setCracked(true);
      onChoose(round.answer);
    } else if (shouldEmitMiss(next.length, maxGuesses, false, missSent.current)) {
      missSent.current = true;
      onChoose(MISS);
    }
  }

  const potCols = colors.length > 4 ? Math.ceil(colors.length / 2) : colors.length;

  return (
    <div class="cb-view">
      <div class="cb-history" ref={historyRef}>
        {history.map((guess, i) => (
          <PlayedRow key={i} guess={guess} feedback={feedback} lit={locked && i === history.length - 1 && isCracked(guess.score, length)} />
        ))}
      </div>

      <div class="cb-row cb-row--current">
        <div class="cb-row__pegs">
          {slots.map((color, i) => (
            <button
              key={i}
              type="button"
              class={`cb-slot${color ? ' is-filled' : ''}`}
              data-choice={`slot-${i}`}
              onClick={() => clear(i)}
            >
              {color && <Peg color={color} size={48} />}
            </button>
          ))}
        </div>
        <button
          type="button"
          class={`cb-submit${complete && !locked ? ' is-ready' : ''}`}
          data-choice="submit"
          disabled={!complete || locked}
          onClick={submit}
        >
          <Icon name="check" size={36} />
        </button>
      </div>

      <div class={`cb-pots${empty && !locked ? ' is-hint' : ''}`} style={{ gridTemplateColumns: `repeat(${potCols}, 60px)` }}>
        {colors.map((color) => (
          <button
            key={color}
            type="button"
            class="cb-pot"
            data-choice={`color-${color}`}
            style={{ '--pot': COLOR_HEX[color] }}
            onClick={() => pick(color)}
          >
            <Shape shape={COLOR_SHAPE[color]} color={color} size={44} />
          </button>
        ))}
      </div>
    </div>
  );
}
