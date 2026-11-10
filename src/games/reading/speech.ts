// Textes envoyés à la voix du téléphone. LECTURE.md §6. Fonctions pures.
// La synthèse lit « eu » de façon stable : « leu », « meu »… ; « re » ou « fe » seuls seraient épelés.
import type { SpeechStep } from '../../ui/voice';
import { GRAPHEMES, SYLLABLES } from './curriculum';
import { PICTURES } from './pictures';
import type { GraphemeId, ReadingGameId } from './types';
import { READING_GAMES } from './types';

/** Débit des sons isolés, des syllabes et des mots. */
export const SOUND_RATE = 0.8;
/** Mot du tambour, « dit lentement ». */
export const DRUM_RATE = 0.6;
/** Pause entre deux sons d'une fusion (§6 : jamais de « et »). */
export const BLEND_PAUSE_MS = 450;

const SOUNDS: Readonly<Record<GraphemeId, string>> = {
  a: 'a', i: 'i', o: 'o', u: 'u', é: 'é', ou: 'ou', on: 'on', oi: 'oi',
  e: 'eu',
  l: 'leu', r: 'reu', f: 'feu', m: 'meu', s: 'seu', j: 'jeu', v: 'veu', n: 'neu', z: 'zeu', ch: 'cheu',
  p: 'peu', t: 'teu', b: 'beu', d: 'deu',
  c: 'queu', k: 'queu', q: 'queu', g: 'gueu',
  h: 'rien', // muette : aucun jeu ne la fait chanter
  x: 'kss', y: 'i', w: 'veu',
};

/** Texte qui fait dire à la voix le SON du graphème : 'a', 'eu', 'leu', 'queu', 'ou'… */
export function soundText(grapheme: GraphemeId): string {
  return SOUNDS[grapheme] ?? grapheme;
}

const NAMES: Readonly<Record<GraphemeId, string>> = {
  a: 'a', b: 'bé', c: 'cé', d: 'dé', e: 'eu', f: 'effe', g: 'gé', h: 'ache', i: 'i', j: 'ji', k: 'ka',
  l: 'elle', m: 'emme', n: 'enne', o: 'o', p: 'pé', q: 'ku', r: 'erre', s: 'esse', t: 'té', u: 'u',
  v: 'vé', w: 'double vé', x: 'ixe', y: 'i grec', z: 'zède', é: 'é',
};

/** Texte qui fait dire le NOM de la lettre (graphèmes d'une lettre seulement ; sinon son son). */
export function nameText(grapheme: GraphemeId): string {
  return NAMES[grapheme] ?? soundText(grapheme);
}

/**
 * Exceptions : syllabes que la synthèse lit mal. Vide de corrections prouvées : à alimenter avec le banc
 * d'écoute de l'espace parent (les textes ne sont pas testés sur un vrai téléphone).
 */
export const SYLLABLE_SPEECH: Readonly<Record<string, string>> = {
  cu: 'cu',
  gu: 'gu',
};

/** Texte qui fait dire une syllabe entière : 'la', 'mi'. Jamais deux sons enchaînés. */
export function syllableText(syllable: string): string {
  return SYLLABLE_SPEECH[syllable] ?? syllable;
}

const INSTRUCTIONS: Readonly<Record<ReadingGameId, string>> = {
  'syllable-drum': 'Tape sur le tambour, une fois pour chaque morceau du mot.',
  'same-start': 'Écoute les mots. Touche celui qui commence pareil.',
  'same-end': 'Écoute les mots. Touche celui qui finit pareil.',
  'letter-sound': 'Écoute le son. Touche la lettre qui chante.',
  'first-sound': "Regarde l'image. Touche la lettre par laquelle ça commence.",
  'syllable-machine': 'Écoute la syllabe. Touche la même.',
  'mystery-word': "Lis le mot. Touche la bonne image.",
  'letter-twins': 'Touche la même lettre, en petit.',
};

/** Phrase courte de consigne d'un jeu, dite à la démonstration : « Touche la lettre qui chante. » */
export function gameInstruction(game: ReadingGameId): string {
  return INSTRUCTIONS[game];
}

// ---------- Fabrication des `prompt` et `praise` (utilisé par session.ts) ----------

const pause = (ms: number): SpeechStep => ({ pauseMs: ms });
const word = (text: string): SpeechStep => ({ text, rate: SOUND_RATE });

export function soundStep(grapheme: GraphemeId): SpeechStep {
  return word(soundText(grapheme));
}

export function syllableStep(syllable: string): SpeechStep {
  return word(syllableText(syllable));
}

/** Présentation d'une lettre nouvelle : « meu… comme moto ». `keyword` absent : le son seul. */
export function presentationSteps(grapheme: GraphemeId, keyword: string | null): SpeechStep[] {
  const steps: SpeechStep[] = [soundStep(grapheme)];
  if (keyword) steps.push(pause(300), { text: 'comme' }, word(keyword));
  steps.push(pause(700));
  return steps;
}

export function drumPrompt(w: string): SpeechStep[] {
  return [{ text: w, rate: DRUM_RATE }];
}

export function sameStartPrompt(w: string): SpeechStep[] {
  return [word(w), pause(300), { text: `Qui commence comme ${w} ?` }];
}

export function sameEndPrompt(w: string): SpeechStep[] {
  return [word(w), pause(300), { text: `Qui finit comme ${w} ?` }];
}

export function letterSoundPrompt(grapheme: GraphemeId): SpeechStep[] {
  return [{ text: 'Touche la lettre qui chante.' }, pause(500), soundStep(grapheme)];
}

export function firstSoundPrompt(w: string): SpeechStep[] {
  return [word(w), pause(300), { text: 'Par quoi ça commence ?' }];
}

/** Fusion : son 1, pause, son 2, pause, syllabe entière ; puis « Touche », syllabe. */
export function machinePrompt(first: GraphemeId, second: GraphemeId, syllable: string): SpeechStep[] {
  return [
    soundStep(first),
    pause(BLEND_PAUSE_MS),
    soundStep(second),
    pause(BLEND_PAUSE_MS),
    syllableStep(syllable),
    pause(500),
    { text: 'Touche' },
    pause(300),
    syllableStep(syllable),
  ];
}

export function twinsPrompt(): SpeechStep[] {
  return [{ text: 'Touche la même lettre, en petit.' }];
}

export function letterSoundPraise(grapheme: GraphemeId, keyword: string | null): SpeechStep[] {
  const steps: SpeechStep[] = [soundStep(grapheme)];
  if (keyword) steps.push(pause(250), { text: 'comme' }, word(keyword));
  return steps;
}

export function firstSoundPraise(w: string, grapheme: GraphemeId): SpeechStep[] {
  return [word(w), pause(250), soundStep(grapheme)];
}

/** « la, comme lama » ; sans image : la syllabe seule. */
export function machinePraise(syllable: string, keyword: string | null): SpeechStep[] {
  const steps: SpeechStep[] = [syllableStep(syllable)];
  if (keyword) steps.push(pause(250), { text: 'comme' }, word(keyword));
  return steps;
}

export function pairPraise(a: string, b: string, kind: 'start' | 'end'): SpeechStep[] {
  return [word(a), pause(250), word(b), pause(250), { text: kind === 'start' ? 'ça commence pareil' : 'ça finit pareil' }];
}

export function readPraise(w: string): SpeechStep[] {
  return [word(w.toLowerCase())];
}

/** « Elle s'appelle elle » : uniquement pour une lettre seule. */
export function twinsPraise(grapheme: GraphemeId): SpeechStep[] {
  return [{ text: `Elle s'appelle ${nameText(grapheme)}.` }];
}

// ---------- Banc d'écoute (espace parent) ----------

/** Tout ce que le banc d'écoute fait entendre : chaque son, chaque nom, chaque syllabe, chaque consigne. */
export interface BenchEntry {
  group: 'sons' | 'noms' | 'syllabes' | 'consignes' | 'mots';
  /** Ce que le parent lit : « M — son ». */
  label: string;
  steps: readonly SpeechStep[];
}

export function benchEntries(): BenchEntry[] {
  const out: BenchEntry[] = [];
  for (const gr of GRAPHEMES) {
    out.push({ group: 'sons', label: `${gr.upper} — son`, steps: [soundStep(gr.id)] });
  }
  for (const gr of GRAPHEMES) {
    if (gr.id.length === 1) out.push({ group: 'noms', label: `${gr.upper} — nom`, steps: [{ text: nameText(gr.id) }] });
  }
  for (const s of SYLLABLES) {
    out.push({ group: 'syllabes', label: s.id.toUpperCase(), steps: [syllableStep(s.id)] });
  }
  for (const game of READING_GAMES) {
    out.push({ group: 'consignes', label: game, steps: [{ text: gameInstruction(game) }] });
  }
  out.push({ group: 'consignes', label: 'lettre qui chante', steps: letterSoundPrompt('m') });
  out.push({ group: 'consignes', label: 'lettre nouvelle', steps: presentationSteps('m', 'moto') });
  out.push({ group: 'consignes', label: 'fusion', steps: machinePrompt('l', 'a', 'la') });
  for (const p of PICTURES) {
    out.push({ group: 'mots', label: p.word, steps: [word(p.word)] });
  }
  return out;
}
