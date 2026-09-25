// Sons synthétisés (Web Audio) : aucun fichier audio, fonctionne hors ligne.
// Un seul AudioContext, créé au premier besoin. Ne lève jamais d'exception : si l'audio
// n'est pas disponible (navigateur, permissions), les fonctions restent silencieuses.

let audioContext: AudioContext | null = null;
let soundEnabled = true;

interface WindowWithWebkitAudio {
  webkitAudioContext?: typeof AudioContext;
}

function getContext(): AudioContext | null {
  if (audioContext) return audioContext;
  try {
    const Ctor = window.AudioContext ?? (window as unknown as WindowWithWebkitAudio).webkitAudioContext;
    if (!Ctor) return null;
    audioContext = new Ctor();
    return audioContext;
  } catch {
    return null;
  }
}

/** À appeler au premier geste de l'enfant : débloque l'audio sur mobile. */
export function unlockAudio(): void {
  try {
    const context = getContext();
    if (context && context.state === 'suspended') {
      void context.resume();
    }
  } catch {
    // silencieux par contrat
  }
}

export function setSoundEnabled(on: boolean): void {
  soundEnabled = on;
}

/** Une note avec enveloppe attack/release (sans clic). */
function tone(
  freq: number,
  startAt: number,
  duration: number,
  opts: { type?: OscillatorType; peak?: number; attack?: number; release?: number } = {},
): void {
  const context = getContext();
  if (!context || !soundEnabled) return;
  try {
    const { type = 'sine', peak = 0.18, attack = 0.01, release = 0.09 } = opts;
    const osc = context.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startAt);
    const gain = context.createGain();
    const sustainEnd = Math.max(startAt + attack, startAt + duration - release);
    gain.gain.setValueAtTime(0, startAt);
    gain.gain.linearRampToValueAtTime(peak, startAt + attack);
    gain.gain.setValueAtTime(peak, sustainEnd);
    gain.gain.linearRampToValueAtTime(0, sustainEnd + release);
    osc.connect(gain).connect(context.destination);
    osc.start(startAt);
    osc.stop(sustainEnd + release + 0.02);
  } catch {
    // silencieux par contrat
  }
}

/** Arpège majeur montant, doux, ~300 ms (onde triangle). */
export function playSuccess(): void {
  const context = getContext();
  if (!context || !soundEnabled) return;
  const now = context.currentTime;
  [523.25, 659.25, 783.99].forEach((freq, i) =>
    tone(freq, now + i * 0.09, 0.16, { type: 'triangle', peak: 0.18, attack: 0.008, release: 0.09 }),
  );
}

/** Deux notes graves descendantes, douces, jamais agressives. */
export function playError(): void {
  const context = getContext();
  if (!context || !soundEnabled) return;
  const now = context.currentTime;
  tone(220, now, 0.22, { type: 'sine', peak: 0.1, attack: 0.015, release: 0.14 });
  tone(174.61, now + 0.16, 0.26, { type: 'sine', peak: 0.09, attack: 0.015, release: 0.16 });
}

/** Tintement aigu scintillant, ~400 ms. */
export function playStar(): void {
  const context = getContext();
  if (!context || !soundEnabled) return;
  const now = context.currentTime;
  [1046.5, 1318.5, 1568.0].forEach((freq, i) =>
    tone(freq, now + i * 0.06, 0.24, { type: 'sine', peak: 0.14, attack: 0.005, release: 0.2 }),
  );
}

/** Clic très court, pour un tap générique. */
export function playTap(): void {
  const context = getContext();
  if (!context || !soundEnabled) return;
  tone(880, context.currentTime, 0.05, { type: 'square', peak: 0.05, attack: 0.002, release: 0.03 });
}
