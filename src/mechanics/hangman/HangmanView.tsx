// Vue du pendu : comme l'écran libre (nombre de lettres, cases, indice, fleur, clavier de 26 lettres).
// Mot perdu : il s'affiche en orange ~2 s, MISS, puis le mot de réserve suivant. Mot trouvé : fête, puis réussite.
import { useEffect, useRef, useState } from 'preact/hooks';
import { MISS, type MechanicViewProps } from '../../engine/types';
import { Flower } from '../../games/hangman/Flower';
import '../../games/hangman/hangman.css';
import { ALPHABET, guess, lettersOf, mistakesFor, outcomeFor, slotsFor } from '../../games/hangman/logic';
import { Icon } from '../../ui/icons/Icon';
import { playTap } from '../../ui/sound';
import { cancelSpeech, checkVoice, speak } from '../../ui/voice';
import { nextWordIndex } from './generate';
import type { HangmanRoundData } from './types';
import './hangman.css';

const LOST_SHOWN_MS = 2000;
const FOUND_SHOWN_MS = 500;

export function HangmanView({ round, solved, onChoose }: MechanicViewProps<HangmanRoundData>) {
  const { words, maxMistakes } = round.data;
  const [wordIndex, setWordIndex] = useState(0);
  const [guesses, setGuesses] = useState<string[]>([]);
  const [lastMiss, setLastMiss] = useState<string | null>(null);
  const [voiceReady, setVoiceReady] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const guessesRef = useRef<string[]>([]);
  const wordIndexRef = useRef(0);
  const timers = useRef(new Set<number>());
  const unmounted = useRef(false);
  const latest = useRef({ onChoose, solved, round });
  latest.current = { onChoose, solved, round };

  const current = words[wordIndex] ?? words[0];
  const outcome = current ? outcomeFor(current.word, guesses, maxMistakes) : null;

  useEffect(() => {
    unmounted.current = false;
    let cancelled = false;
    checkVoice().then((check) => {
      if (!cancelled) setVoiceReady(check.status === 'ready');
    });
    const pending = timers.current;
    return () => {
      cancelled = true;
      unmounted.current = true;
      pending.forEach((id) => window.clearTimeout(id));
      pending.clear();
      cancelSpeech();
    };
  }, []);

  function later(fn: () => void, ms: number) {
    const id = window.setTimeout(() => {
      timers.current.delete(id);
      if (!unmounted.current) fn();
    }, ms);
    timers.current.add(id);
  }

  if (!current) return null;

  function onLetter(letter: string) {
    if (solved || !current || outcomeFor(current.word, guessesRef.current, maxMistakes) !== null) return;
    const result = guess(current.word, guessesRef.current, letter, maxMistakes);
    if (result.kind === 'ignored') return;
    guessesRef.current = result.guesses;
    setGuesses(result.guesses);
    setLastMiss(result.kind === 'miss' ? letter : null);
    if (result.outcome === 'found') {
      later(() => latest.current.onChoose(latest.current.round.answer), FOUND_SHOWN_MS);
    } else if (result.outcome === 'lost') {
      cancelSpeech();
      later(() => {
        latest.current.onChoose(MISS);
        const next = nextWordIndex(wordIndexRef.current, words.length);
        wordIndexRef.current = next;
        guessesRef.current = [];
        setWordIndex(next);
        setGuesses([]);
        setLastMiss(null);
      }, LOST_SHOWN_MS);
    }
  }

  async function readHint() {
    if (!current || speaking) return;
    playTap();
    setSpeaking(true);
    await speak(current.hint, { rate: 0.85 });
    if (!unmounted.current) setSpeaking(false);
  }

  const slots = slotsFor(current.word, guesses);
  const inWord = lettersOf(current.word);
  const over = outcome !== null;

  return (
    <div class="hm-view" data-word={current.id} data-outcome={outcome ?? undefined}>
      <span class="hm-count" aria-label={`${current.word.length} lettres`}>
        {current.word.length} lettres
      </span>

      <Flower petals={maxMistakes} fallen={mistakesFor(current.word, guesses)} found={outcome === 'found'} />

      <div class="hm-hint">
        <p class="hm-hint__text">{current.hint}</p>
        {voiceReady && (
          <button
            type="button"
            class="hm-hint__speak"
            data-speaking={speaking ? 'true' : undefined}
            onClick={() => void readHint()}
            aria-label="Lire l'indice"
          >
            <Icon name="speaker" size={32} />
          </button>
        )}
      </div>

      <div class={`hm-word hm-word--len-${Math.min(current.word.length, 10)}`}>
        {slots.map((slot, i) => (
          <span
            key={i}
            class={`hm-slot${slot.revealed ? ' hm-slot--shown' : ''}${over && !slot.revealed ? ' hm-slot--given' : ''}`}
          >
            {slot.revealed || over ? slot.char : ''}
          </span>
        ))}
      </div>

      <div class="hm-keyboard">
        {ALPHABET.map((letter) => {
          const used = guesses.includes(letter);
          const state = used ? (inWord.has(letter) ? 'hit' : 'miss') : undefined;
          return (
            <button
              key={letter}
              type="button"
              class={`hm-key${state ? ` hm-key--${state}` : ''}${lastMiss === letter ? ' hm-key--shake' : ''}`}
              data-key={letter}
              data-choice={`letter-${letter}`}
              data-state={state}
              disabled={used || over || solved}
              onClick={() => onLetter(letter)}
            >
              {letter}
            </button>
          );
        })}
      </div>
    </div>
  );
}
