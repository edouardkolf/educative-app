// Vue « Devine le nombre » : droite graduée, retour plus grand / plus petit, tuiles ou pavé numérique.
import { useState } from 'preact/hooks';
import { MISS } from '../../engine/types';
import type { MechanicViewProps } from '../../engine/types';
import { Icon } from '../../ui/icons/Icon';
import { applyGuess, createGuessState, isPossible } from './logic';
import type { GuessState } from './logic';
import type { GuessNumberRoundData } from './types';
import './guess-number.css';

const KEYPAD_ORDER = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'ok'] as const;

function percent(value: number, state: GuessState): number {
  return (value / (state.max - state.min + 1)) * 100;
}

/** Droite graduée : zone encore possible colorée, zone éliminée grisée, repère de la dernière proposition. */
function NumberLine({ state }: { state: GuessState }) {
  const left = percent(state.low - state.min, state);
  const right = percent(state.high - state.min + 1, state);
  const last = state.guesses[state.guesses.length - 1];
  const lastPos = last === undefined ? null : Math.min(100, Math.max(0, percent(last - state.min + 0.5, state)));

  return (
    <div class="gn-line">
      <div class="gn-line__bar">
        <div class="gn-line__zone" style={{ left: `${left}%`, width: `${right - left}%` }} />
        {lastPos !== null && (
          <div class="gn-line__pin" style={{ left: `${lastPos}%` }} key={state.guesses.length}>
            <span class="gn-line__pin-label">{last}</span>
          </div>
        )}
      </div>
      <div class="gn-line__ends">
        <span>{state.min}</span>
        <span>{state.max}</span>
      </div>
      <div class="gn-line__bounds" aria-live="polite">
        <span class="gn-bound">{state.low}</span>
        <span class="gn-bounds__dash">à</span>
        <span class="gn-bound">{state.high}</span>
      </div>
    </div>
  );
}

function Feedback({ state, solved }: { state: GuessState; solved: boolean }) {
  const last = state.guesses[state.guesses.length - 1];
  if (state.found || solved) {
    return (
      <div class="gn-feedback gn-feedback--found" key="found">
        <span class="gn-feedback__num">{state.secret}</span>
        <span class="gn-feedback__word">Trouvé !</span>
      </div>
    );
  }
  if (last === undefined || state.lastHint === null) {
    return <div class="gn-feedback gn-feedback--idle" />;
  }
  const higher = state.lastHint === 'higher';
  return (
    <div class={`gn-feedback ${higher ? 'gn-feedback--up' : 'gn-feedback--down'}`} key={state.guesses.length}>
      <span class="gn-feedback__num">{last}</span>
      <span class="gn-feedback__word">{higher ? 'Plus grand ↑' : 'Plus petit ↓'}</span>
    </div>
  );
}

function Pips({ state }: { state: GuessState }) {
  const used = state.guesses.length;
  return (
    <div class={`gn-pips${state.missed ? ' gn-pips--over' : ''}`} aria-hidden="true">
      {Array.from({ length: state.maxGuesses }, (_, i) => (
        <span key={i} class={`gn-pip${i < used ? ' gn-pip--used' : ''}`} />
      ))}
    </div>
  );
}

export function GuessNumberView({ round, solved, onChoose }: MechanicViewProps<GuessNumberRoundData>) {
  const { secret, min, max, maxGuesses, input } = round.data;
  const fresh = () => createGuessState(secret, min, max, maxGuesses);
  // L'état est lié à la manche : une nouvelle manche repart de zéro même si la vue n'est pas remontée.
  const [box, setBox] = useState<{ round: typeof round; state: GuessState }>(() => ({ round, state: fresh() }));
  const [typed, setTyped] = useState('');
  const state = box.round === round ? box.state : fresh();
  const typedOfRound = box.round === round ? typed : '';
  const locked = solved || state.found;

  const guess = (n: number) => {
    if (locked) return;
    const result = applyGuess(state, n);
    setBox({ round, state: result.state });
    setTyped('');
    if (result.hint === 'found') onChoose(round.answer);
    else if (result.justMissed) onChoose(MISS);
  };

  const maxDigits = String(max).length;
  const press = (key: (typeof KEYPAD_ORDER)[number]) => {
    if (locked) return;
    if (key === 'del') setTyped(typedOfRound.slice(0, -1));
    else if (key === 'ok') {
      if (typedOfRound !== '') guess(Number(typedOfRound));
    } else if (typedOfRound.length < maxDigits && typedOfRound !== '0') {
      setTyped(typedOfRound + key);
    }
  };

  const tiles = [];
  if (input === 'tiles') {
    for (let n = min; n <= max; n += 1) {
      const out = !isPossible(state, n);
      tiles.push(
        <button
          key={n}
          type="button"
          class={`gn-tile${out ? ' gn-tile--out' : ''}${locked && n === secret ? ' gn-tile--found' : ''}`}
          data-choice={`num-${n}`}
          disabled={out || locked}
          onClick={() => guess(n)}
        >
          {n}
        </button>,
      );
    }
  }

  return (
    <div class="gn-view" data-answer={round.answer}>
      <NumberLine state={state} />
      <Feedback state={state} solved={solved} />
      <Pips state={state} />
      {input === 'tiles' ? (
        <div class={`gn-tiles${max - min + 1 > 20 ? ' gn-tiles--dense' : ''}`}>{tiles}</div>
      ) : (
        <div class="gn-keypad">
          <div class="gn-field">{typedOfRound || '?'}</div>
          <div class="gn-keypad__grid">
            {KEYPAD_ORDER.map((key) => (
              <button
                key={key}
                type="button"
                class={`gn-key${key === 'ok' ? ' gn-key--ok' : ''}`}
                data-choice={`key-${key}`}
                aria-label={key === 'ok' ? 'Valider' : key === 'del' ? 'Effacer' : undefined}
                disabled={locked || ((key === 'ok' || key === 'del') && typedOfRound === '')}
                onClick={() => press(key)}
              >
                {key === 'ok' ? <Icon name="check" size="1.1em" /> : key === 'del' ? '⌫' : key}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
