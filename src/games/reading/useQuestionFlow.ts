// Effets d'une séance de lecture : voix, sons, relance, enregistrement, fin douce. La logique d'enchaînement
// est dans `flow.ts` (pure, testée) ; ce hook l'exécute. Règles : LECTURE.md §2, §9, §10, §11.
//  - les choix restent inactifs pendant la consigne, mais jamais plus de 6 s (`ACTIVATE_MAX_MS`) ;
//  - une seule écriture à la fois (file), jamais de double enregistrement d'une première tentative ;
//  - au démontage : minuteurs et voix coupés, séance close en `abandoned` si elle ne l'est pas déjà.
import { useEffect, useRef, useState } from 'preact/hooks';
import { playError, playSuccess, playTap } from '../../ui/sound';
import { cancelSpeech, speakSequence, type SpeakResult, type SpeechStep } from '../../ui/voice';
import {
  abandonReading,
  completeReading,
  saveReadingAnswers,
  startReading,
} from '../../storage/readings';
import type { GameEndReason } from '../../storage/types';
import { useActiveClock } from '../useActiveClock';
import { useSoftEnd } from '../useSoftEnd';
import {
  buildAnswer,
  completeDemo,
  currentQuestion,
  dotsProgress,
  guidedTargets,
  initFlow,
  isDemoTurn,
  isFlowOver,
  isRetryTurn,
  nextQuestion,
  recordFirstAttempt,
  soundOfChoice,
  type FlowState,
} from './flow';
import { gameInstruction, SOUND_RATE, soundText, syllableText } from './speech';
import type { ReadingAnswer, ReadingQuestion, ReadingSessionPlan, ReadingViewProps } from './types';

/** Attente maximale de la voix avant d'activer les choix (LECTURE.md §11). */
export const ACTIVATE_MAX_MS = 6000;
/** Relance : délai sans tentative après la fin de la consigne. */
export const HINT_AFTER_MS = 9000;
/** Pause minimale après une bonne réponse avant la question suivante. */
export const SOLVED_PAUSE_MS = 900;
/** Attente maximale de la félicitation parlée. */
const PRAISE_MAX_MS = 4000;
/** Pause entre deux choix énumérés. */
const ENUM_GAP_MS = 250;

interface RecordSlot {
  id: string | null;
  closed: boolean;
}

interface TurnState {
  attempted: boolean;
  solved: boolean;
  hinted: boolean;
  guided: boolean;
  retry: boolean;
  activated: boolean;
  replays: number;
  readyAt: number;
  wrong: string[];
}

const NEW_TURN: TurnState = {
  attempted: false,
  solved: false,
  hinted: false,
  guided: false,
  retry: false,
  activated: false,
  replays: 0,
  readyAt: 0,
  wrong: [],
};

export interface UseQuestionFlowOptions {
  plan: ReadingSessionPlan;
  review: boolean;
  profileId: string;
  /** Appelé une fois, quand la séance est terminée et enregistrée. */
  onFinish: (answers: readonly ReadingAnswer[]) => void;
}

export interface QuestionFlow {
  question: ReadingQuestion | null;
  /** Change à chaque question présentée (clé de la vue : remonte même une question reposée). */
  turn: number;
  viewProps: Omit<ReadingViewProps, 'question'> | null;
  dots: { total: number; done: number };
  /** Cibles de la main animée (exemple guidé, choix actifs), sinon null. */
  handTargets: string[] | null;
  retry: boolean;
  replay: () => void;
  goHome: () => void;
  /** La séance est terminée et s'enregistre : plus rien n'est tapable. */
  finishing: boolean;
}

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

export function useQuestionFlow(opts: UseQuestionFlowOptions): QuestionFlow {
  const { plan, review, profileId } = opts;
  const onFinishRef = useRef(opts.onFinish);
  onFinishRef.current = opts.onFinish;

  const [flow, setFlowState] = useState<FlowState>(() => initFlow(plan));
  const flowRef = useRef(flow);
  const [turn, setTurn] = useState(0);
  const [wrong, setWrong] = useState<string[]>([]);
  const [solved, setSolved] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [spoken, setSpoken] = useState<string | null>(null);
  const [disabled, setDisabled] = useState(true);
  const [guided, setGuided] = useState(() => isDemoTurn(flow));
  const [retry, setRetry] = useState(false);
  const [active, setActive] = useState(true);
  const [finishing, setFinishing] = useState(false);

  const turnRef = useRef<TurnState>({ ...NEW_TURN, guided: guided });
  const turnIdRef = useRef(0);
  const speechIdRef = useRef(0);
  const hintTimerRef = useRef<number | null>(null);
  const timersRef = useRef(new Set<number>());
  const unmountedRef = useRef(false);
  const recordRef = useRef<RecordSlot>({ id: null, closed: false });
  const writeQueueRef = useRef<Promise<void>>(Promise.resolve());
  const clock = useActiveClock();

  const softEnd = useSoftEnd({
    busy: active,
    onTimeUp: async () => {
      cancelSpeech();
      await closeRecord('time-up');
    },
  });

  // ---------- Utilitaires ----------

  function setFlow(next: FlowState) {
    flowRef.current = next;
    setFlowState(next);
  }

  function later(fn: () => void, ms: number): number {
    const id = window.setTimeout(() => {
      timersRef.current.delete(id);
      fn();
    }, ms);
    timersRef.current.add(id);
    return id;
  }

  function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      later(resolve, ms);
    });
  }

  function clearHintTimer() {
    if (hintTimerRef.current !== null) {
      window.clearTimeout(hintTimerRef.current);
      timersRef.current.delete(hintTimerRef.current);
      hintTimerRef.current = null;
    }
  }

  const turnAlive = (id: number) => !unmountedRef.current && turnIdRef.current === id;
  const speechAlive = (turnId: number, speechId: number) => turnAlive(turnId) && speechIdRef.current === speechId;

  // ---------- Écriture ----------

  function enqueue(task: () => Promise<void>): Promise<void> {
    writeQueueRef.current = writeQueueRef.current.then(task, task).catch((err) => {
      console.error('reading write failed', err);
    });
    return writeQueueRef.current;
  }

  function closeRecord(reason: GameEndReason): Promise<void> {
    const slot = recordRef.current;
    const activeMs = clock.elapsed();
    return enqueue(async () => {
      if (slot.closed) return;
      slot.closed = true;
      if (slot.id) await abandonReading(slot.id, reason, activeMs);
    });
  }

  /** Crée la séance à la première réponse, la sauvegarde ensuite, la clôt à la fin. */
  function persist(state: FlowState, kind: 'save' | 'complete') {
    const slot = recordRef.current;
    const activeMs = clock.elapsed();
    const answers = [...state.answers];
    const demos = [...state.demosDone];
    enqueue(async () => {
      if (slot.closed) return;
      if (!slot.id) {
        if (answers.length === 0) {
          if (kind === 'complete') slot.closed = true;
          return;
        }
        const created = await startReading(profileId, {
          stage: plan.stage,
          planned: plan.questions.length,
          newItemId: plan.newItemId,
          demos,
          answers,
          review,
        });
        if (unmountedRef.current && kind !== 'complete') {
          slot.closed = true;
          await abandonReading(created.id, softEnd.exitReason(), activeMs);
          return;
        }
        slot.id = created.id;
        if (kind === 'complete') {
          slot.closed = true;
          await completeReading(created.id, answers, demos, activeMs);
        }
        return;
      }
      if (kind === 'complete') {
        slot.closed = true;
        await completeReading(slot.id, answers, demos, activeMs);
      } else {
        await saveReadingAnswers(slot.id, answers, demos, activeMs);
      }
    });
  }

  // ---------- Voix ----------

  /** Dit les étapes ; `true` seulement si la voix est allée au bout (sinon inutile d'attendre ou d'enchaîner). */
  async function say(steps: readonly SpeechStep[]): Promise<boolean> {
    if (steps.length === 0) return true;
    const result: SpeakResult = await speakSequence(steps);
    return result === 'ended';
  }

  /** Consigne (précédée de la consigne du jeu en démonstration), puis énumération des choix. */
  async function speakQuestion(
    q: ReadingQuestion,
    turnId: number,
    speechId: number,
    withInstruction: boolean,
  ): Promise<void> {
    try {
      if (withInstruction) {
        const ok = await say([{ text: gameInstruction(q.game) }]);
        if (!ok || !speechAlive(turnId, speechId)) return;
        await sleep(300);
        if (!speechAlive(turnId, speechId)) return;
      }
      if (!(await say(q.prompt)) || !speechAlive(turnId, speechId)) return;
      if (!q.speakChoices) return;
      for (const choice of q.choices) {
        if (!choice.speech) continue;
        await sleep(ENUM_GAP_MS);
        if (!speechAlive(turnId, speechId)) return;
        setSpoken(choice.id);
        const ok = await say([{ text: choice.speech, rate: SOUND_RATE }]);
        if (!speechAlive(turnId, speechId)) return;
        setSpoken(null);
        if (!ok) return;
      }
    } catch (err) {
      console.error('reading speech failed', err);
    } finally {
      if (speechAlive(turnId, speechId)) setSpoken(null);
    }
  }

  // ---------- Déroulé d'une question ----------

  function activate(turnId: number) {
    const t = turnRef.current;
    if (!turnAlive(turnId) || t.activated) return;
    t.activated = true;
    t.readyAt = Date.now();
    setDisabled(false);
    armHint(turnId);
  }

  function armHint(turnId: number) {
    clearHintTimer();
    const t = turnRef.current;
    if (!turnAlive(turnId) || !t.activated || t.attempted || t.solved) return;
    if (t.hinted && !t.guided) return;
    hintTimerRef.current = later(() => onHintTime(turnId), HINT_AFTER_MS);
  }

  function onHintTime(turnId: number) {
    hintTimerRef.current = null;
    const t = turnRef.current;
    const q = currentQuestion(flowRef.current);
    if (!turnAlive(turnId) || !q || t.attempted || t.solved) return;
    const speechId = ++speechIdRef.current;
    cancelSpeech();
    if (!t.guided) {
      t.hinted = true;
      setHint(q.answer);
    }
    void say(q.prompt).then(() => {
      if (speechAlive(turnId, speechId)) armHint(turnId);
    });
  }

  /** Présente la question courante : remise à zéro de l'état d'affichage, consigne, activation des choix. */
  function beginTurn(state: FlowState) {
    const q = currentQuestion(state);
    if (!q || softEnd.checkpoint()) return;
    clearHintTimer();
    const turnId = ++turnIdRef.current;
    const speechId = ++speechIdRef.current;
    const demo = isDemoTurn(state);
    turnRef.current = { ...NEW_TURN, wrong: [], guided: demo, retry: isRetryTurn(state) };
    cancelSpeech();
    setWrong([]);
    setSolved(false);
    setHint(null);
    setSpoken(null);
    setDisabled(true);
    setGuided(demo);
    setRetry(turnRef.current.retry);
    setActive(true);
    setTurn(turnId);
    later(() => activate(turnId), ACTIVATE_MAX_MS);
    void speakQuestion(q, turnId, speechId, demo).then(() => activate(turnId));
  }

  async function finish(state: FlowState) {
    clearHintTimer();
    setActive(false);
    setFinishing(true);
    persist(state, 'complete');
    await writeQueueRef.current;
    if (!unmountedRef.current) onFinishRef.current(state.answers);
  }

  function advance(turnId: number) {
    if (!turnAlive(turnId)) return;
    const t = turnRef.current;
    const next = t.guided ? completeDemo(flowRef.current) : nextQuestion(flowRef.current);
    setFlow(next);
    if (t.guided) persist(next, 'save'); // démo faite : sera enregistrée avec la première réponse
    if (isFlowOver(next)) void finish(next);
    else beginTurn(next);
  }

  async function onSolved(q: ReadingQuestion, turnId: number) {
    const t = turnRef.current;
    t.solved = true;
    setSolved(true);
    setHint(null);
    clearHintTimer();
    playSuccess();
    const praise = say(q.praise);
    await Promise.all([sleep(SOLVED_PAUSE_MS), Promise.race([praise, sleep(PRAISE_MAX_MS)])]);
    advance(turnId);
  }

  function onChoose(id: string) {
    const t = turnRef.current;
    const q = currentQuestion(flowRef.current);
    if (!q || unmountedRef.current || !t.activated || t.solved || finishing) return;
    const turnId = turnIdRef.current;
    const isDrum = q.game === 'syllable-drum';
    const correct = id === q.answer;

    if (t.guided) {
      if (!correct) return;
      speechIdRef.current += 1;
      cancelSpeech();
      setSpoken(null);
      void onSolved(q, turnId);
      return;
    }
    if (!correct && !isDrum && t.wrong.includes(id)) return;

    speechIdRef.current += 1;
    cancelSpeech();
    setSpoken(null);
    clearHintTimer();

    if (!t.attempted) {
      t.attempted = true;
      const answer = buildAnswer({
        question: q,
        chosen: id,
        replays: t.replays,
        hinted: t.hinted,
        retry: t.retry,
        readyAt: t.readyAt,
        now: Date.now(),
      });
      const next = recordFirstAttempt(flowRef.current, answer);
      setFlow(next);
      persist(next, 'save');
    }

    if (correct) {
      void onSolved(q, turnId);
      return;
    }
    if (!t.wrong.includes(id)) {
      t.wrong = [...t.wrong, id];
      setWrong(t.wrong);
    }
    playError();
    // La lettre ou la syllabe touchée chante son propre son.
    const sound = soundOfChoice(q.choices.find((c) => c.id === id));
    if (sound) {
      const text = safe(() => (sound.type === 'grapheme' ? soundText(sound.id) : syllableText(sound.id)), '');
      if (text) void say([{ text, rate: SOUND_RATE }]);
    }
  }

  function replay() {
    const t = turnRef.current;
    const q = currentQuestion(flowRef.current);
    if (!q || t.solved || finishing || unmountedRef.current) return;
    playTap();
    if (!t.attempted) t.replays += 1;
    clearHintTimer();
    const turnId = turnIdRef.current;
    const speechId = ++speechIdRef.current;
    cancelSpeech();
    setSpoken(null);
    void speakQuestion(q, turnId, speechId, false).then(() => {
      if (!speechAlive(turnId, speechId)) return;
      activate(turnId);
      armHint(turnId);
    });
  }

  function goHome() {
    // La navigation est faite par l'écran (returnTo) ; le démontage ferme la séance.
    cancelSpeech();
  }

  // ---------- Cycle de vie ----------

  useEffect(() => {
    unmountedRef.current = false;
    const timers = timersRef.current;
    clock.reset();
    beginTurn(flowRef.current);
    return () => {
      unmountedRef.current = true;
      timers.forEach((id) => window.clearTimeout(id));
      timers.clear();
      speechIdRef.current += 1;
      cancelSpeech();
      if (softEnd.endedRef.current) return;
      void closeRecord(softEnd.exitReason());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const question = currentQuestion(flow);
  const viewProps =
    question === null
      ? null
      : {
          wrongChoices: wrong,
          solved,
          hintChoice: hint,
          spokenChoice: spoken,
          guided,
          disabled,
          onChoose,
        };

  return {
    question,
    turn,
    viewProps,
    dots: dotsProgress(flow),
    handTargets: question && guided && !disabled && !solved ? guidedTargets(question) : null,
    retry,
    replay,
    goHome,
    finishing,
  };
}
