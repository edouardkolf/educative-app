import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setSoundEnabled } from './sound';
import { __resetVoiceForTests, cancelSpeech, checkVoice, speak, speakSequence } from './voice';

// ---------- Faux speechSynthesis ----------

interface FakeVoice {
  name: string;
  lang: string;
  localService: boolean;
  default: boolean;
}

function voice(name: string, lang: string, opts: Partial<FakeVoice> = {}): FakeVoice {
  return { name, lang, localService: false, default: false, ...opts };
}

class FakeUtterance {
  text: string;
  voice: FakeVoice | null = null;
  lang = '';
  rate = 1;
  pitch = 1;
  volume = 1;
  onend: (() => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  constructor(text: string) {
    this.text = text;
  }
}

function makeFakeSynth(initialVoices: FakeVoice[] = []) {
  let voices = initialVoices;
  const listeners = new Set<() => void>();
  const synth = {
    paused: false,
    spoken: [] as FakeUtterance[],
    getVoices: () => voices,
    addEventListener: (type: string, cb: () => void) => {
      if (type === 'voiceschanged') listeners.add(cb);
    },
    removeEventListener: (_type: string, cb: () => void) => {
      listeners.delete(cb);
    },
    setVoices: (v: FakeVoice[]) => {
      voices = v;
      listeners.forEach((cb) => cb());
    },
    speak: vi.fn((u: FakeUtterance) => {
      synth.spoken.push(u);
    }),
    cancel: vi.fn(),
    resume: vi.fn(),
  };
  return synth;
}

function installFakeVoiceApi(initialVoices: FakeVoice[] = []) {
  const synth = makeFakeSynth(initialVoices);
  vi.stubGlobal('speechSynthesis', synth);
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
  return synth;
}

beforeEach(() => {
  setSoundEnabled(true);
  __resetVoiceForTests();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  __resetVoiceForTests();
});

describe('checkVoice', () => {
  it("renvoie no-api sans speechSynthesis", async () => {
    vi.unstubAllGlobals();
    const result = await checkVoice(10);
    expect(result).toEqual({ status: 'unavailable', problem: 'no-api', voiceName: null });
  });

  it('attend une voix arrivée tard via voiceschanged', async () => {
    vi.useFakeTimers();
    const synth = installFakeVoiceApi([]);
    const promise = checkVoice(2000);
    await vi.advanceTimersByTimeAsync(500);
    synth.setVoices([voice('Amélie', 'fr-FR', { localService: true })]);
    const result = await promise;
    expect(result.status).toBe('ready');
    expect(result.voiceName).toBe('Amélie');
  });

  it('aucune voix française : unavailable/no-french-voice', async () => {
    vi.useFakeTimers();
    installFakeVoiceApi([voice('Alex', 'en-US')]);
    const promise = checkVoice(10);
    const result = await promise;
    expect(result).toEqual({ status: 'unavailable', problem: 'no-french-voice', voiceName: null });
  });

  it('préfère fr-FR à fr-CA', async () => {
    installFakeVoiceApi([voice('Amélie', 'fr-CA'), voice('Thomas', 'fr-FR')]);
    const result = await checkVoice(10);
    expect(result.status).toBe('ready');
    expect(result.voiceName).toBe('Thomas');
  });

  it('choisit une voix locale hors ligne', async () => {
    vi.stubGlobal('navigator', { onLine: false });
    installFakeVoiceApi([
      voice('Réseau', 'fr-FR', { localService: false }),
      voice('Locale', 'fr-FR', { localService: true }),
    ]);
    const result = await checkVoice(10);
    expect(result.voiceName).toBe('Locale');
  });

  it('hors ligne sans voix locale : no-offline-voice', async () => {
    vi.stubGlobal('navigator', { onLine: false });
    installFakeVoiceApi([voice('Réseau', 'fr-FR', { localService: false })]);
    const result = await checkVoice(10);
    expect(result).toEqual({ status: 'unavailable', problem: 'no-offline-voice', voiceName: null });
  });

  it('aucune voix au bout du délai : ready sans nom', async () => {
    vi.useFakeTimers();
    installFakeVoiceApi([]);
    const promise = checkVoice(1000);
    await vi.advanceTimersByTimeAsync(1000);
    const result = await promise;
    expect(result).toEqual({ status: 'ready', problem: null, voiceName: null });
  });

  it('son coupé : muted', async () => {
    setSoundEnabled(false);
    installFakeVoiceApi([voice('Amélie', 'fr-FR')]);
    const result = await checkVoice(10);
    expect(result).toEqual({ status: 'muted', problem: null, voiceName: null });
  });
});

describe('speak', () => {
  it("son coupé : 'skipped' sans appeler synth.speak", async () => {
    setSoundEnabled(false);
    const synth = installFakeVoiceApi([voice('Amélie', 'fr-FR')]);
    const result = await speak('bonjour');
    expect(result).toBe('skipped');
    expect(synth.speak).not.toHaveBeenCalled();
  });

  it("skipped si aucune API", async () => {
    const result = await speak('bonjour');
    expect(result).toBe('skipped');
  });

  it("résout 'ended' sur onend", async () => {
    const synth = installFakeVoiceApi([voice('Amélie', 'fr-FR', { localService: true })]);
    const promise = speak('bonjour');
    const uttered = synth.spoken[0];
    expect(uttered).toBeDefined();
    uttered?.onend?.();
    await expect(promise).resolves.toBe('ended');
  });

  it("résout 'blocked' sur not-allowed", async () => {
    const synth = installFakeVoiceApi([voice('Amélie', 'fr-FR')]);
    const promise = speak('bonjour');
    synth.spoken[0]?.onerror?.({ error: 'not-allowed' });
    await expect(promise).resolves.toBe('blocked');
  });

  it("résout 'failed' sur une autre erreur", async () => {
    const synth = installFakeVoiceApi([voice('Amélie', 'fr-FR')]);
    const promise = speak('bonjour');
    synth.spoken[0]?.onerror?.({ error: 'synthesis-failed' });
    await expect(promise).resolves.toBe('failed');
  });

  it("cancelSpeech() résout la lecture en cours par 'interrupted', et arrête une séquence", async () => {
    installFakeVoiceApi([voice('Amélie', 'fr-FR')]);
    const promise = speakSequence([{ text: 'un' }, { text: 'deux' }]);
    cancelSpeech();
    await expect(promise).resolves.toBe('interrupted');
  });

  it('une nouvelle lecture interrompt la précédente', async () => {
    installFakeVoiceApi([voice('Amélie', 'fr-FR')]);
    const first = speak('un');
    const second = speak('deux');
    const results = await Promise.all([first, second.then((r) => {
      // termine la seconde lecture pour ne pas laisser de minuteur actif
      return r;
    })]);
    expect(results[0]).toBe('interrupted');
  });

  it("n'appelle cancel() que s'il y a une lecture à couper", async () => {
    const synth = installFakeVoiceApi([voice('Amélie', 'fr-FR')]);
    const first = speak('un');
    expect(synth.cancel).not.toHaveBeenCalled(); // rien en cours : pas de cancel() juste avant speak()
    const second = speak('deux');
    expect(synth.cancel).toHaveBeenCalledTimes(1); // « un » est en cours : il faut le couper
    await expect(first).resolves.toBe('interrupted');
    synth.spoken[1]?.onend?.();
    await expect(second).resolves.toBe('ended');
  });

  it('page cachée : rien n’est dit, la lecture résout interrupted', async () => {
    const synth = installFakeVoiceApi([voice('Amélie', 'fr-FR')]);
    vi.stubGlobal('document', { hidden: true, addEventListener: vi.fn() });
    await expect(speak('bonjour')).resolves.toBe('interrupted');
    expect(synth.speak).not.toHaveBeenCalled();
  });

  it('chien de garde : résout ended sans onend', async () => {
    vi.useFakeTimers();
    installFakeVoiceApi([voice('Amélie', 'fr-FR')]);
    const promise = speak('bonjour', { rate: 1 });
    await vi.advanceTimersByTimeAsync(2000 + 150 * 'bonjour.'.length + 100);
    await expect(promise).resolves.toBe('ended');
  });
});

describe('speakSequence', () => {
  it('enchaîne les lectures et les pauses dans l’ordre', async () => {
    vi.useFakeTimers();
    const synth = installFakeVoiceApi([voice('Amélie', 'fr-FR')]);
    const order: string[] = [];
    synth.speak.mockImplementation((u: FakeUtterance) => {
      synth.spoken.push(u);
      order.push(u.text);
      queueMicrotask(() => u.onend?.());
    });

    const promise = speakSequence([{ text: 'mot' }, { pauseMs: 600 }, { text: 'phrase' }]);
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(600);
    const result = await promise;

    expect(order).toEqual(['mot', 'phrase']);
    expect(result).toBe('ended');
  });

  it('cancelSpeech() pendant une pause : la séquence ne reprend pas', async () => {
    vi.useFakeTimers();
    const synth = installFakeVoiceApi([voice('Amélie', 'fr-FR')]);
    synth.speak.mockImplementation((u: FakeUtterance) => {
      synth.spoken.push(u);
      queueMicrotask(() => u.onend?.());
    });

    const promise = speakSequence([{ text: 'mot' }, { pauseMs: 600 }, { text: 'phrase' }]);
    await vi.advanceTimersByTimeAsync(0); // « mot » est dit, la pause commence
    cancelSpeech();
    await vi.advanceTimersByTimeAsync(600);

    await expect(promise).resolves.toBe('interrupted');
    expect(synth.spoken.map((u) => u.text)).toEqual(['mot']);
  });

  it('une réécoute pendant une pause : la séquence ne la recouvre pas', async () => {
    vi.useFakeTimers();
    const synth = installFakeVoiceApi([voice('Amélie', 'fr-FR')]);
    synth.speak.mockImplementation((u: FakeUtterance) => {
      synth.spoken.push(u);
      queueMicrotask(() => u.onend?.());
    });

    const promise = speakSequence([{ text: 'mot' }, { pauseMs: 600 }, { text: 'phrase' }]);
    await vi.advanceTimersByTimeAsync(0);
    const replay = speak('mot relu');
    await vi.advanceTimersByTimeAsync(600);

    await expect(promise).resolves.toBe('interrupted');
    await expect(replay).resolves.toBe('ended');
    expect(synth.spoken.map((u) => u.text)).toEqual(['mot', 'mot relu']);
  });

  it("s'arrête au premier résultat différent de ended", async () => {
    const synth = installFakeVoiceApi([voice('Amélie', 'fr-FR')]);
    synth.speak.mockImplementation((u: FakeUtterance) => {
      synth.spoken.push(u);
      queueMicrotask(() => u.onerror?.({ error: 'not-allowed' }));
    });
    const result = await speakSequence([{ text: 'mot' }, { text: 'jamais lu' }]);
    expect(result).toBe('blocked');
    expect(synth.spoken.map((u) => u.text)).toEqual(['mot']);
  });
});
