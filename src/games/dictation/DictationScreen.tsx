// Écran de la dictée quotidienne (docs/specs/DICTEE.md §2, §3.6, §6). Un seul écran, en phases
// `choose`, `word`, `copy`, `solved`, `end`, `unavailable`. La machine (`machine.ts`) est pure : cet
// écran exécute ses effets (voix, sons, stockage) et gère les délais (300 ms avant un mot, 500 ms
// avant la relecture automatique en `copy`).
import { useEffect, useRef, useState } from 'preact/hooks';
import { useProfile } from '../../app/context';
import { returnTo } from '../../app/routes';
import { createRng } from '../../engine/rng';
import { IconButton } from '../../ui/IconButton';
import { Icon } from '../../ui/icons/Icon';
import { playError, playSuccess } from '../../ui/sound';
import { cancelSpeech, checkVoice, speak, speakSequence, type SpeakResult, type VoiceProblem } from '../../ui/voice';
import { useSoftEnd } from '../useSoftEnd';
import {
  abandonDictation,
  completeDictation,
  listDictations,
  saveDictationItem,
  startDictation,
} from '../../storage/dictations';
import type { DictationItem, DictationPlannedWord, DictationRecord } from '../../storage/dictations';
import { normalizeAnswer, diffLetters } from './answer';
import { defaultSeriesId, drawDictation } from './draw';
import { createInitialState, isComplete, step, unitInProgress } from './machine';
import type { DictationAction, DictationEffect, DictationState } from './machine';
import { DICTATION_SERIES } from './series';
import { DICTATION_WORDS } from './words';
import { DictationKeyboard } from './DictationKeyboard';
import { SeriesPicker } from './SeriesPicker';
import { DictationEnd } from './DictationEnd';
import type { DictationWord } from './types';
import './dictation.css';

type UnavailableReason = 'muted' | VoiceProblem;

function currentWord(s: DictationState): DictationWord | null {
  const planned = s.words[s.index];
  if (!planned) return null;
  return DICTATION_WORDS.get(planned.wordId) ?? null;
}

function currentSentence(s: DictationState, word: DictationWord): string {
  const planned = s.words[s.index];
  return word.sentences[planned?.sentenceIndex ?? 0] ?? word.sentences[0] ?? '';
}

function displayTyped(typed: string): string {
  if (typed.length <= 16) return typed;
  return `…${typed.slice(-16)}`;
}

function fieldFontSize(len: number): string {
  if (len > 10) return '30px';
  if (len > 6) return '34px';
  return '40px';
}

function drawWords(seriesId: string): { seed: number; planned: DictationPlannedWord[]; expected: string[] } {
  const series = DICTATION_SERIES.find((s) => s.id === seriesId) ?? DICTATION_SERIES[0]!;
  const seed = Date.now() >>> 0;
  const rng = createRng(seed);
  const planned = drawDictation(series, DICTATION_SERIES, rng);
  const expected = planned.map((p) => DICTATION_WORDS.get(p.wordId)?.text ?? '');
  return { seed, planned, expected };
}

export function DictationScreen() {
  const { profile } = useProfile();
  const [state, setState] = useState<DictationState>(createInitialState());
  const [availability, setAvailability] = useState<'checking' | 'available' | 'unavailable'>('checking');
  const [unavailableReason, setUnavailableReason] = useState<UnavailableReason>('no-api');
  const [records, setRecords] = useState<readonly DictationRecord[]>([]);
  const [rejectedKey, setRejectedKey] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [endAnimating, setEndAnimating] = useState(false);

  const stateRef = useRef(state);
  stateRef.current = state;
  const dictationIdRef = useRef<string | null>(null);
  const writeQueueRef = useRef<Promise<void>>(Promise.resolve());
  const failedStreakRef = useRef(0);
  const nextTimeoutRef = useRef<number | null>(null);
  const rejectTimeoutRef = useRef<number | null>(null);
  const unmountedRef = useRef(false);

  const softEnd = useSoftEnd({
    busy: unitInProgress(state) || state.phase === 'solved' || (state.phase === 'end' && endAnimating),
    onTimeUp: async () => {
      cancelSpeech();
      const id = dictationIdRef.current;
      if (id && !isComplete(stateRef.current)) {
        enqueue(() => abandonDictation(id, 'time-up'));
        await writeQueueRef.current;
      }
    },
  });

  // Vérifie la voix à chaque montage (§6.3) : `soundOn` se charge de façon asynchrone.
  useEffect(() => {
    let cancelled = false;
    checkVoice().then((check) => {
      if (cancelled) return;
      if (check.status === 'ready') {
        setAvailability('available');
        return;
      }
      setUnavailableReason(check.status === 'muted' ? 'muted' : (check.problem ?? 'no-api'));
      // Ne coupe une dictée déjà en cours que par la règle des deux échecs consécutifs (§7).
      if (stateRef.current.phase === 'choose') setAvailability('unavailable');
      else setAvailability('available');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!profile) return undefined;
    let cancelled = false;
    listDictations(profile.id).then((r) => {
      if (!cancelled) setRecords(r);
    });
    return () => {
      cancelled = true;
    };
  }, [profile?.id]);

  // Ferme la dictée à la sortie (démontage), sauf si la fin douce l'a déjà fait (F4/F7/F8).
  useEffect(() => {
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
      if (softEnd.endedRef.current) return;
      const id = dictationIdRef.current;
      if (!id) return;
      const reason = softEnd.exitReason();
      if (isComplete(stateRef.current)) {
        enqueue(() => completeDictation(id));
      } else {
        enqueue(() => abandonDictation(id, reason));
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function enqueue(task: () => Promise<void>): Promise<void> {
    writeQueueRef.current = writeQueueRef.current.then(task, task).catch((err) => {
      console.error('dictation write failed', err);
    });
    return writeQueueRef.current;
  }

  function trackSpeechResult(result: SpeakResult) {
    if (result === 'ended') {
      failedStreakRef.current = 0;
      return;
    }
    if (result !== 'failed') return;
    failedStreakRef.current += 1;
    if (failedStreakRef.current < 2) return;
    if (stateRef.current.phase !== 'word' && stateRef.current.phase !== 'copy') return;
    void closeAsUnavailable();
  }

  async function closeAsUnavailable() {
    const id = dictationIdRef.current;
    dictationIdRef.current = null;
    if (id && !isComplete(stateRef.current)) {
      enqueue(() => abandonDictation(id, 'quit'));
    }
    const check = await checkVoice();
    if (unmountedRef.current) return;
    setUnavailableReason(check.status === 'muted' ? 'muted' : (check.problem ?? 'no-api'));
    setAvailability('unavailable');
    stateRef.current = createInitialState();
    setState(stateRef.current);
  }

  async function playIntro(word: DictationWord, sentence: string) {
    setSpeaking(true);
    const wordText = `${word.say ?? word.text}.`;
    const sentenceText = sentence.replace('___', word.text);
    const result = await speakSequence([
      { text: wordText, rate: 0.8 },
      { pauseMs: 600 },
      { text: sentenceText, rate: 0.9 },
      { pauseMs: 600 },
      { text: wordText, rate: 0.8 },
    ]);
    if (!unmountedRef.current) setSpeaking(false);
    trackSpeechResult(result);
  }

  async function playWordOnly(s: DictationState) {
    const word = currentWord(s);
    if (!word) return;
    setSpeaking(true);
    const result = await speak(`${word.say ?? word.text}.`, { rate: 0.8 });
    if (!unmountedRef.current) setSpeaking(false);
    trackSpeechResult(result);
  }

  async function playSentenceOnly(s: DictationState) {
    const word = currentWord(s);
    if (!word) return;
    const result = await speak(currentSentence(s, word).replace('___', word.text), { rate: 0.9 });
    trackSpeechResult(result);
  }

  function handleSave(item: DictationItem, seriesId: string, seed: number, words: DictationPlannedWord[], willBeComplete: boolean) {
    enqueue(async () => {
      let id = dictationIdRef.current;
      if (!id) {
        if (!profile) return;
        const created = await startDictation(profile.id, { seriesId, seed, words });
        if (unmountedRef.current) {
          // F8 : démonté pendant la création — close dès sa création, sans compter ce mot.
          await abandonDictation(created.id, 'quit');
          return;
        }
        dictationIdRef.current = created.id;
        id = created.id;
      }
      await saveDictationItem(id, item);
      if (willBeComplete) await completeDictation(id);
    });
  }

  function scheduleNext(ms: number) {
    if (nextTimeoutRef.current !== null) window.clearTimeout(nextTimeoutRef.current);
    nextTimeoutRef.current = window.setTimeout(() => {
      nextTimeoutRef.current = null;
      if (softEnd.checkpoint()) return; // fin douce : ne pas commencer le mot suivant
      dispatch({ type: 'next', now: Date.now() });
    }, ms);
  }

  function runEffects(effects: readonly DictationEffect[], newState: DictationState, opts: { immediateIntro?: boolean; delayWordMs?: number }) {
    for (const effect of effects) {
      if (effect.kind === 'speak') {
        if (effect.what === 'intro') {
          const word = currentWord(newState);
          if (!word) continue;
          const sentence = currentSentence(newState, word);
          if (opts.immediateIntro) void playIntro(word, sentence);
          else window.setTimeout(() => void playIntro(word, sentence), 300);
        } else if (effect.what === 'word') {
          const delay = opts.delayWordMs ?? 0;
          if (delay > 0) window.setTimeout(() => void playWordOnly(newState), delay);
          else void playWordOnly(newState);
        } else {
          void playSentenceOnly(newState);
        }
      } else if (effect.kind === 'sound') {
        if (effect.what === 'success') playSuccess();
        else playError();
      } else if (effect.kind === 'save') {
        const seriesId = newState.seriesId;
        if (seriesId) handleSave(effect.item, seriesId, newState.seed, newState.words, isComplete(newState));
      } else if (effect.kind === 'next-after') {
        scheduleNext(effect.ms);
      } else if (effect.kind === 'finished') {
        setEndAnimating(true);
      }
    }
  }

  function dispatch(action: DictationAction, opts: { immediateIntro?: boolean; delayWordMs?: number } = {}) {
    const { state: newState, effects } = step(stateRef.current, action);
    stateRef.current = newState;
    setState(newState);
    runEffects(effects, newState, opts);
  }

  function startNewDictation(seriesId: string) {
    if (softEnd.checkpoint()) return;
    const { seed, planned, expected } = drawWords(seriesId);
    dictationIdRef.current = null;
    failedStreakRef.current = 0;
    setEndAnimating(false);
    dispatch(
      { type: 'start', seriesId, seed, words: planned, expected, now: Date.now() },
      { immediateIntro: true },
    );
  }

  function onKey(char: string) {
    const before = stateRef.current.typed;
    dispatch({ type: 'key', char, now: Date.now() });
    if (stateRef.current.phase === 'copy' && stateRef.current.typed === before) {
      setRejectedKey(char);
      if (rejectTimeoutRef.current !== null) window.clearTimeout(rejectTimeoutRef.current);
      rejectTimeoutRef.current = window.setTimeout(() => setRejectedKey(null), 320);
    } else {
      setRejectedKey(null);
    }
  }

  const onErase = () => dispatch({ type: 'erase' });
  const onValidate = () => dispatch({ type: 'validate', now: Date.now() }, { delayWordMs: 500 });
  const onReplayWord = () => dispatch({ type: 'replay', what: 'word' });
  const onReplaySentence = () => dispatch({ type: 'replay', what: 'sentence' });
  const goHome = () => returnTo('hub');

  if (!profile) return null;

  const screenPhase = availability === 'unavailable' ? 'unavailable' : state.phase;

  if (screenPhase === 'unavailable') {
    return (
      <div class="screen screen--dictation" data-testid="dictation" data-phase="unavailable">
        <div class="dict-unavailable" data-testid="dictation-unavailable" data-reason={unavailableReason}>
          <Icon name="speaker-off" size={120} />
          <p class="dict-unavailable__line">
            {unavailableReason === 'muted' ? 'Le son est coupé.' : 'Le téléphone ne peut pas parler.'}
          </p>
          <p class="dict-unavailable__line">Demande à un adulte.</p>
          <IconButton size={72} onClick={goHome} aria-label="Retour à l'accueil" data-testid="to-hub">
            <Icon name="home" size={44} />
          </IconButton>
        </div>
      </div>
    );
  }

  if (screenPhase === 'choose') {
    const currentId = defaultSeriesId(records, DICTATION_SERIES);
    return (
      <div class="screen screen--dictation" data-testid="dictation" data-phase="choose">
        <IconButton size={56} onClick={goHome} aria-label="Retour à l'accueil" data-testid="to-hub">
          <Icon name="home" size={36} />
        </IconButton>
        <SeriesPicker series={DICTATION_SERIES} currentId={currentId} onPick={startNewDictation} />
      </div>
    );
  }

  if (screenPhase === 'end') {
    const endWords = state.items.map((item) => ({
      label: DICTATION_WORDS.get(item.wordId)?.text ?? item.expected,
      firstTry: item.firstTry,
    }));
    const score = state.items.filter((i) => i.firstTry).length;
    return (
      <div class="screen screen--dictation" data-testid="dictation" data-phase="end">
        <DictationEnd
          words={endWords}
          score={score}
          total={state.words.length}
          timeUp={softEnd.timeUp}
          onAgain={() => startNewDictation(state.seriesId ?? DICTATION_SERIES[0]!.id)}
          onHome={goHome}
          onAnimationDone={() => {
            setEndAnimating(false);
            if (softEnd.checkpoint()) return;
          }}
        />
      </div>
    );
  }

  // word, copy, solved
  const expected = state.expected[state.index] ?? '';
  const typedLen = state.typed.length;
  const attempt = diffLetters(state.firstAttempt ?? '', expected);
  const modelMarks = diffLetters(expected, state.firstAttempt ?? '').typed; // lettres du modèle, alignées sur `expected`

  return (
    <div class="screen screen--dictation dict-play" data-testid="dictation" data-phase={state.phase}>
      <div class="play-topbar">
        <IconButton size={56} onClick={goHome} aria-label="Retour à l'accueil" data-testid="to-hub">
          <Icon name="home" size={36} />
        </IconButton>
        <div class="play-progress">
          {state.words.map((_, i) => (
            <span
              key={i}
              class={`play-progress__dot${i < state.items.length ? ' is-done' : ''}${i === state.index ? ' is-current' : ''}`}
            />
          ))}
        </div>
      </div>

      <div class="dict-controls">
        <button
          type="button"
          class="dict-replay dict-replay--word"
          data-testid="replay-word"
          data-speaking={speaking ? 'true' : undefined}
          onClick={onReplayWord}
          aria-label="Réécouter le mot"
        >
          <Icon name="speaker" size={40} />
        </button>
        <button
          type="button"
          class="dict-replay dict-replay--sentence"
          data-testid="replay-sentence"
          onClick={onReplaySentence}
          aria-label="Réécouter la phrase"
        >
          💬
        </button>
      </div>

      <div class="dict-input-row">
        <div class={`dict-field${typedLen === 0 ? ' dict-field--empty' : ''}${state.phase === 'solved' ? ' dict-field--solved' : ''}`}>
          <span class="dict-word" data-answer={expected} style={{ fontSize: fieldFontSize(typedLen) }}>
            {displayTyped(state.typed)}
          </span>
        </div>
        {state.phase !== 'copy' && (
          <button type="button" class="dict-ok" data-key="ok" onClick={onValidate} disabled={typedLen === 0} aria-label="Valider">
            <Icon name="check" size={40} />
          </button>
        )}
      </div>

      {state.phase === 'copy' && (
        <div class="dict-copy-panel">
          <p class="dict-copy-panel__attempt" data-testid="dictation-attempt">
            {attempt.typed.map((m, i) => (
              <span key={i} class={m.ok ? '' : 'dict-mark--wrong'}>
                {m.char}
              </span>
            ))}
          </p>
          <p class="dict-copy-panel__model" data-testid="dictation-model">
            {Array.from(normalizeAnswer(expected)).map((char, i) => (
              <span
                key={i}
                class={`${i < state.typed.length ? 'dict-mark--done' : ''}${i === state.typed.length ? ' dict-mark--next' : ''}${modelMarks[i]?.ok === false ? ' dict-mark--fix' : ''}`}
              >
                {char}
              </span>
            ))}
          </p>
        </div>
      )}

      <DictationKeyboard
        mode={state.phase === 'copy' ? 'copy' : 'free'}
        onKey={onKey}
        onErase={onErase}
        rejectedKey={rejectedKey}
        disabled={state.phase === 'solved'}
      />
    </div>
  );
}
