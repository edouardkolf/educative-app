// Synthèse vocale partagée (dictée quotidienne ; la mécanique `spelling` pourra y migrer plus tard).
// Accès paresseux à `globalThis.speechSynthesis` / `SpeechSynthesisUtterance` : jamais lus à l'import,
// pour que les tests puissent les simuler. Aucune exception ne sort du module (comme sound.ts).
import { isSoundEnabled } from './sound';

export type VoiceProblem = 'no-api' | 'no-french-voice' | 'no-offline-voice';
export interface VoiceCheck {
  status: 'ready' | 'muted' | 'unavailable';
  problem: VoiceProblem | null;
  voiceName: string | null;
}
export type SpeakResult = 'ended' | 'interrupted' | 'blocked' | 'failed' | 'skipped';
export type SpeechStep = { text: string; rate?: number } | { pauseMs: number };

const DEFAULT_RATE = 0.8;
const VOICE_POLL_MS = 250;

interface ActiveSpeech {
  utterance: SpeechSynthesisUtterance;
  settled: boolean;
  watchdogId: ReturnType<typeof setTimeout>;
  settle: (result: SpeakResult) => void;
}

let active: ActiveSpeech | null = null;
let visibilityListenerAttached = false;

// ---------- Accès paresseux au moteur ----------

function getSynth(): SpeechSynthesis | null {
  try {
    return (globalThis as { speechSynthesis?: SpeechSynthesis }).speechSynthesis ?? null;
  } catch {
    return null;
  }
}

function getUtteranceCtor(): typeof SpeechSynthesisUtterance | null {
  try {
    return (globalThis as { SpeechSynthesisUtterance?: typeof SpeechSynthesisUtterance }).SpeechSynthesisUtterance ?? null;
  } catch {
    return null;
  }
}

function safeGetVoices(synth: SpeechSynthesis): SpeechSynthesisVoice[] {
  try {
    return synth.getVoices?.() ?? [];
  } catch {
    return [];
  }
}

function isOnline(): boolean {
  try {
    return typeof navigator === 'undefined' || navigator.onLine !== false;
  } catch {
    return true;
  }
}

// ---------- Choix de la voix ----------

function isFrenchVoice(v: SpeechSynthesisVoice): boolean {
  const lang = (v.lang || '').replace(/_/g, '-').toLowerCase();
  return lang.startsWith('fr');
}

/** Voix françaises disponibles compte tenu de la connexion (hors ligne : locales seulement). */
function frenchCandidates(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  const fr = voices.filter(isFrenchVoice);
  return isOnline() ? fr : fr.filter((v) => v.localService);
}

/** fr-fr d'abord, puis locale, puis default, puis ordre de la liste. */
function selectFrenchVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null;
  const rank = (v: SpeechSynthesisVoice): number => {
    const lang = (v.lang || '').replace(/_/g, '-').toLowerCase();
    return lang === 'fr-fr' ? 0 : 1;
  };
  const sorted = voices
    .map((v, i) => ({ v, i }))
    .sort((a, b) => {
      const rankDiff = rank(a.v) - rank(b.v);
      if (rankDiff !== 0) return rankDiff;
      const localDiff = Number(b.v.localService) - Number(a.v.localService);
      if (localDiff !== 0) return localDiff;
      const defaultDiff = Number(b.v.default) - Number(a.v.default);
      if (defaultDiff !== 0) return defaultDiff;
      return a.i - b.i;
    });
  return sorted[0]?.v ?? null;
}

/** Attend des voix non vides (voiceschanged, puis sondage toutes les 250 ms), jusqu'à `timeoutMs`. */
function waitForVoices(synth: SpeechSynthesis, timeoutMs: number): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const initial = safeGetVoices(synth);
    if (initial.length > 0) {
      resolve(initial);
      return;
    }

    let settled = false;
    let removeListener: () => void = () => {};

    const finish = (voices: SpeechSynthesisVoice[]) => {
      if (settled) return;
      settled = true;
      clearInterval(intervalId);
      clearTimeout(timeoutId);
      removeListener();
      resolve(voices);
    };

    const check = () => {
      const voices = safeGetVoices(synth);
      if (voices.length > 0) finish(voices);
    };

    try {
      if (typeof synth.addEventListener === 'function') {
        synth.addEventListener('voiceschanged', check);
        removeListener = () => synth.removeEventListener('voiceschanged', check);
      } else {
        synth.onvoiceschanged = check;
        removeListener = () => {
          synth.onvoiceschanged = null;
        };
      }
    } catch {
      // pas grave : le sondage suffira
    }

    const intervalId = setInterval(check, VOICE_POLL_MS);
    const timeoutId = setTimeout(() => finish(safeGetVoices(synth)), timeoutMs);
  });
}

// ---------- API ----------

export async function checkVoice(timeoutMs = 2000): Promise<VoiceCheck> {
  try {
    if (!isSoundEnabled()) {
      return { status: 'muted', problem: null, voiceName: null };
    }
    const synth = getSynth();
    if (!synth) {
      return { status: 'unavailable', problem: 'no-api', voiceName: null };
    }
    const voices = await waitForVoices(synth, timeoutMs);
    if (voices.length === 0) {
      // Aucune voix au bout du délai : on tente quand même (lang = 'fr-FR'), l'usage tranche.
      return { status: 'ready', problem: null, voiceName: null };
    }
    const fr = voices.filter(isFrenchVoice);
    if (fr.length === 0) {
      return { status: 'unavailable', problem: 'no-french-voice', voiceName: null };
    }
    const candidates = frenchCandidates(voices);
    if (candidates.length === 0) {
      return { status: 'unavailable', problem: 'no-offline-voice', voiceName: null };
    }
    const voice = selectFrenchVoice(candidates);
    return { status: 'ready', problem: null, voiceName: voice?.name ?? null };
  } catch {
    return { status: 'unavailable', problem: 'no-api', voiceName: null };
  }
}

function finishActive(result: SpeakResult): void {
  if (!active) return;
  active.settle(result);
}

/** Coupe toute lecture en cours ; sa promesse résout 'interrupted'. */
export function cancelSpeech(): void {
  finishActive('interrupted');
  try {
    getSynth()?.cancel();
  } catch {
    // silencieux par contrat
  }
}

function ensureVisibilityListener(): void {
  if (visibilityListenerAttached) return;
  if (typeof document === 'undefined') return;
  try {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) cancelSpeech();
    });
    visibilityListenerAttached = true;
  } catch {
    // silencieux par contrat
  }
}

export function speak(text: string, opts: { rate?: number } = {}): Promise<SpeakResult> {
  try {
    ensureVisibilityListener();

    if (!isSoundEnabled()) return Promise.resolve('skipped');

    const synth = getSynth();
    const UtteranceCtor = getUtteranceCtor();
    if (!synth || !UtteranceCtor) return Promise.resolve('skipped');

    // Coupe la lecture en cours : sa promesse résout 'interrupted'.
    finishActive('interrupted');
    try {
      synth.cancel();
    } catch {
      // silencieux
    }
    try {
      if (synth.paused) synth.resume();
    } catch {
      // silencieux
    }

    const rate = opts.rate ?? DEFAULT_RATE;

    let utterance: SpeechSynthesisUtterance;
    try {
      utterance = new UtteranceCtor(text);
    } catch {
      return Promise.resolve('failed');
    }

    const voices = safeGetVoices(synth);
    const voice = selectFrenchVoice(frenchCandidates(voices));
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang ?? 'fr-FR';
    utterance.rate = rate;
    utterance.pitch = 1;
    utterance.volume = 1;

    return new Promise<SpeakResult>((resolve) => {
      const entry: ActiveSpeech = {
        utterance,
        settled: false,
        watchdogId: setTimeout(() => entry.settle('ended'), 2000 + (150 * text.length) / rate),
        settle: (result: SpeakResult) => {
          if (entry.settled) return;
          entry.settled = true;
          clearTimeout(entry.watchdogId);
          if (active === entry) active = null;
          resolve(result);
        },
      };
      active = entry;

      utterance.onend = () => entry.settle('ended');
      utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
        const error = event?.error;
        if (error === 'interrupted' || error === 'canceled') entry.settle('interrupted');
        else if (error === 'not-allowed') entry.settle('blocked');
        else entry.settle('failed');
      };

      try {
        synth.speak(utterance); // synchrone, pour rester dans le geste de l'enfant
      } catch {
        entry.settle('failed');
      }
    });
  } catch {
    return Promise.resolve('failed');
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Enchaîne des lectures et des pauses ; s'arrête au premier résultat ≠ 'ended'. */
export async function speakSequence(steps: readonly SpeechStep[]): Promise<SpeakResult> {
  for (const step of steps) {
    if ('pauseMs' in step) {
      await delay(step.pauseMs);
      continue;
    }
    const result = await speak(step.text, { rate: step.rate });
    if (result !== 'ended') return result;
  }
  return 'ended';
}

/** Réinitialise l'état interne du module entre deux tests. */
export function __resetVoiceForTests(): void {
  if (active) {
    clearTimeout(active.watchdogId);
    active = null;
  }
  visibilityListenerAttached = false;
}
