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

/** Une note dont la fréquence glisse (montée ou descente), pour les bruits de liquide. */
function glide(
  startFreq: number,
  endFreq: number,
  startAt: number,
  duration: number,
  opts: { type?: OscillatorType; peak?: number } = {},
): void {
  const context = getContext();
  if (!context || !soundEnabled) return;
  try {
    const { type = 'sine', peak = 0.16 } = opts;
    const osc = context.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, startAt);
    osc.frequency.exponentialRampToValueAtTime(Math.max(endFreq, 1), startAt + duration);
    const gain = context.createGain();
    gain.gain.setValueAtTime(0, startAt);
    gain.gain.linearRampToValueAtTime(peak, startAt + Math.min(0.02, duration / 4));
    gain.gain.linearRampToValueAtTime(0, startAt + duration);
    osc.connect(gain).connect(context.destination);
    osc.start(startAt);
    osc.stop(startAt + duration + 0.02);
  } catch {
    // silencieux par contrat
  }
}

/** Laboratoire des couleurs : une goutte qui tombe dans le chaudron (glissé descendant bref). */
export function playPour(): void {
  const context = getContext();
  if (!context || !soundEnabled) return;
  glide(700, 260, context.currentTime, 0.22, { type: 'sine', peak: 0.16 });
}

/** Laboratoire des couleurs : le chaudron qui mélange (petites bulles qui remontent, ~1 s). */
export function playBubble(): void {
  const context = getContext();
  if (!context || !soundEnabled) return;
  const now = context.currentTime;
  const bubbles = 7;
  for (let i = 0; i < bubbles; i += 1) {
    const startAt = now + i * 0.13;
    const base = 260 + ((i * 53) % 180);
    glide(base, base + 140, startAt, 0.11, { type: 'triangle', peak: 0.09 });
  }
}

/** Laboratoire des couleurs : le chaudron se vide (glissé grave descendant, « glouglou »). */
export function playDrain(): void {
  const context = getContext();
  if (!context || !soundEnabled) return;
  const now = context.currentTime;
  glide(320, 90, now, 0.35, { type: 'sine', peak: 0.14 });
  glide(220, 70, now + 0.16, 0.3, { type: 'sine', peak: 0.1 });
}

/** Le trieur magique : petit « ding » magique et aigu quand l'objet tombe dans le bon panier. */
export function playDing(): void {
  const context = getContext();
  if (!context || !soundEnabled) return;
  const now = context.currentTime;
  tone(1568.0, now, 0.18, { type: 'sine', peak: 0.16, attack: 0.004, release: 0.14 });
  tone(2093.0, now + 0.05, 0.22, { type: 'sine', peak: 0.12, attack: 0.004, release: 0.18 });
}

/** Le trieur magique : petit ressort qui « boing », doux et amusant, quand l'objet rebondit au mauvais panier. */
export function playBoing(): void {
  const context = getContext();
  if (!context || !soundEnabled) return;
  glide(220, 440, context.currentTime, 0.18, { type: 'triangle', peak: 0.13 });
}

/** Écran de fin de niveau : courte fanfare joyeuse pour la pluie d'étoiles. */
export function playFanfare(): void {
  const context = getContext();
  if (!context || !soundEnabled) return;
  const now = context.currentTime;
  [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) =>
    tone(freq, now + i * 0.1, 0.22, { type: 'triangle', peak: 0.16, attack: 0.006, release: 0.12 }),
  );
}
