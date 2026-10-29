// Écran du pendu (docs/specs/MORPION-PENDU.md §2.2). Un mot = une partie : une case par lettre, un
// indice à lire (ou à se faire lire si la voix du téléphone est prête), un clavier de 26 lettres sans
// accent. Chaque lettre absente fait tomber un pétale de la fleur — pas de bonhomme pendu : erreur douce.
// La logique est pure (`logic.ts`) : cet écran exécute les effets (sons, voix, stockage) et la fin douce.
import { useEffect, useRef, useState } from 'preact/hooks';
import { useProfile } from '../../app/context';
import { returnTo } from '../../app/routes';
import { createRng } from '../../engine/rng';
import { IconButton } from '../../ui/IconButton';
import { Icon } from '../../ui/icons/Icon';
import { playError, playFanfare, playSuccess, playTap } from '../../ui/sound';
import { cancelSpeech, checkVoice, speak } from '../../ui/voice';
import {
  abandonHangman,
  completeHangman,
  listHangmans,
  saveHangmanGuesses,
  startHangman,
  type HangmanOutcome,
} from '../../storage/hangmans';
import type { GameEndReason } from '../../storage/types';
import { useSoftEnd } from '../useSoftEnd';
import { useActiveClock } from '../useActiveClock';
import { ALPHABET, drawWord, guess, lettersOf, MAX_MISTAKES, mistakesFor, outcomeFor, slotsFor } from './logic';
import { HANGMAN_WORDS } from './words';
import type { HangmanWord } from './types';
import { Flower } from './Flower';
import './hangman.css';

/** Animation de fin de mot (lettres révélées, fanfare) avant d'afficher « mot suivant ». */
const END_ANIMATION_MS = 1100;

interface RecordSlot {
  id: string | null;
  closed: boolean;
}

export function HangmanScreen() {
  const { profile } = useProfile();
  const [word, setWord] = useState<HangmanWord | null>(null);
  const [guesses, setGuesses] = useState<string[]>([]);
  const [endAnimating, setEndAnimating] = useState(false);
  const [voiceReady, setVoiceReady] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [lastMiss, setLastMiss] = useState<string | null>(null);

  const guessesRef = useRef<string[]>([]);
  const recentIdsRef = useRef<string[]>([]);
  const recordRef = useRef<RecordSlot>({ id: null, closed: true });
  const writeQueueRef = useRef<Promise<void>>(Promise.resolve());
  const timersRef = useRef(new Set<number>());
  const unmountedRef = useRef(false);
  const rngRef = useRef(createRng(Date.now() >>> 0));
  const clock = useActiveClock();

  const outcome = word ? outcomeFor(word.word, guesses) : null;
  const mistakes = word ? mistakesFor(word.word, guesses) : 0;

  const softEnd = useSoftEnd({
    busy: (word !== null && guesses.length > 0 && outcome === null) || endAnimating,
    onTimeUp: async () => {
      cancelSpeech();
      await closeRecord('time-up');
    },
  });

  // Mots récents de l'enfant (pour ne pas retomber dessus), puis premier mot.
  useEffect(() => {
    if (!profile) return undefined;
    let cancelled = false;
    listHangmans(profile.id)
      .then((records) => records.map((r) => r.wordId))
      .catch(() => [] as string[])
      .then((ids) => {
        if (cancelled) return;
        recentIdsRef.current = ids;
        startWord();
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  // La voix lit l'indice si elle est prête ; sinon le bouton 🔊 n'apparaît pas (l'indice reste écrit).
  useEffect(() => {
    let cancelled = false;
    checkVoice().then((check) => {
      if (!cancelled) setVoiceReady(check.status === 'ready');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    unmountedRef.current = false;
    const timers = timersRef.current;
    return () => {
      unmountedRef.current = true;
      timers.forEach((id) => window.clearTimeout(id));
      timers.clear();
      cancelSpeech();
      if (softEnd.endedRef.current) return;
      void closeRecord(softEnd.exitReason());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function later(fn: () => void, ms: number) {
    const id = window.setTimeout(() => {
      timersRef.current.delete(id);
      fn();
    }, ms);
    timersRef.current.add(id);
  }

  function enqueue(task: () => Promise<void>): Promise<void> {
    writeQueueRef.current = writeQueueRef.current.then(task, task).catch((err) => {
      console.error('hangman write failed', err);
    });
    return writeQueueRef.current;
  }

  function closeRecord(reason: GameEndReason): Promise<void> {
    const slot = recordRef.current;
    const activeMs = clock.elapsed();
    return enqueue(async () => {
      if (slot.closed) return;
      slot.closed = true;
      if (slot.id) await abandonHangman(slot.id, reason, activeMs);
    });
  }

  function persist(current: HangmanWord, nextGuesses: string[], end: HangmanOutcome | null) {
    const slot = recordRef.current;
    const activeMs = clock.elapsed();
    const snapshot = [...nextGuesses];
    const nextMistakes = mistakesFor(current.word, snapshot);
    enqueue(async () => {
      if (slot.closed || !profile) return;
      if (!slot.id) {
        const created = await startHangman(profile.id, {
          wordId: current.id,
          word: current.word,
          maxMistakes: MAX_MISTAKES,
          guesses: snapshot,
          mistakes: nextMistakes,
        });
        if (unmountedRef.current && !end) {
          slot.closed = true;
          await abandonHangman(created.id, softEnd.exitReason(), activeMs);
          return;
        }
        slot.id = created.id;
      }
      if (end) {
        slot.closed = true;
        await completeHangman(slot.id, snapshot, nextMistakes, end, activeMs);
      } else {
        await saveHangmanGuesses(slot.id, snapshot, nextMistakes, activeMs);
      }
    });
  }

  /** Début d'une unité (un mot) : point de contrôle de la fin douce, puis tirage. */
  function startWord() {
    if (softEnd.checkpoint()) return;
    cancelSpeech();
    const next = drawWord(HANGMAN_WORDS, recentIdsRef.current, rngRef.current);
    recentIdsRef.current = [...recentIdsRef.current, next.id];
    recordRef.current = { id: null, closed: false };
    guessesRef.current = [];
    clock.reset();
    setGuesses([]);
    setLastMiss(null);
    setEndAnimating(false);
    setWord(next);
  }

  function onLetter(letter: string) {
    if (!word) return;
    const result = guess(word.word, guessesRef.current, letter);
    if (result.kind === 'ignored') return;
    guessesRef.current = result.guesses;
    setGuesses(result.guesses);
    persist(word, result.guesses, result.outcome);
    if (result.kind === 'miss') {
      setLastMiss(letter);
      playError();
    } else {
      setLastMiss(null);
      playSuccess();
    }
    if (result.outcome) {
      setEndAnimating(true);
      if (result.outcome === 'found') playFanfare();
      later(() => setEndAnimating(false), END_ANIMATION_MS);
    }
  }

  async function readHint() {
    if (!word || speaking) return;
    playTap();
    setSpeaking(true);
    await speak(word.hint, { rate: 0.85 });
    if (!unmountedRef.current) setSpeaking(false);
  }

  const goHome = () => returnTo('hub');

  if (!profile) return null;
  if (!word) return <div class="screen screen--hangman" data-testid="hangman" data-phase="loading" />;

  const slots = slotsFor(word.word, guesses);
  const inWord = lettersOf(word.word);
  const over = outcome !== null;
  const showNext = over && !endAnimating && !softEnd.timeUp;

  return (
    <div
      class="screen screen--hangman"
      data-testid="hangman"
      data-phase={over ? 'end' : 'play'}
      data-outcome={outcome ?? undefined}
      data-word={word.id}
    >
      <div class="hm-topbar">
        <IconButton size={56} onClick={goHome} aria-label="Retour à l'accueil" data-testid="to-hub">
          <Icon name="home" size={36} />
        </IconButton>
        <span class="hm-count" data-testid="hm-letter-count" aria-label={`${word.word.length} lettres`}>
          {word.word.length} lettres
        </span>
      </div>

      <Flower petals={MAX_MISTAKES} fallen={mistakes} found={outcome === 'found'} />

      <div class="hm-hint" data-testid="hm-hint">
        <p class="hm-hint__text">{word.hint}</p>
        {voiceReady && (
          <button
            type="button"
            class="hm-hint__speak"
            data-speaking={speaking ? 'true' : undefined}
            onClick={() => void readHint()}
            aria-label="Lire l'indice"
            data-testid="hm-read-hint"
          >
            <Icon name="speaker" size={32} />
          </button>
        )}
      </div>

      <div class={`hm-word hm-word--len-${Math.min(word.word.length, 10)}`} data-testid="hm-word">
        {slots.map((slot, i) => (
          <span
            key={i}
            class={`hm-slot${slot.revealed ? ' hm-slot--shown' : ''}${over && !slot.revealed ? ' hm-slot--given' : ''}`}
            data-testid={`hm-slot-${i}`}
          >
            {slot.revealed || over ? slot.char : ''}
          </span>
        ))}
      </div>

      {over ? (
        <div class="hm-end" data-testid="hm-end">
          <p class="hm-end__text">
            {outcome === 'found' ? 'Bravo, tu as trouvé !' : 'La fleur a perdu ses pétales… Le mot était :'}
          </p>
          {outcome === 'lost' && <p class="hm-end__word">{word.word}</p>}
          {showNext && (
            <IconButton size={72} onClick={startWord} aria-label="Mot suivant" data-testid="hm-next">
              <Icon name="next" size={44} />
            </IconButton>
          )}
        </div>
      ) : (
        <div class="hm-keyboard" data-testid="hm-keyboard">
          {ALPHABET.map((letter) => {
            const used = guesses.includes(letter);
            const state = used ? (inWord.has(letter) ? 'hit' : 'miss') : undefined;
            return (
              <button
                key={letter}
                type="button"
                class={`hm-key${state ? ` hm-key--${state}` : ''}${lastMiss === letter ? ' hm-key--shake' : ''}`}
                data-key={letter}
                data-state={state}
                disabled={used}
                onClick={() => onLetter(letter)}
              >
                {letter}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
