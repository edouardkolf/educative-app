import { describe, expect, it } from 'vitest';
import { diffLetters, isCorrectAnswer, normalizeAnswer } from './answer';

describe('normalizeAnswer', () => {
  it('normalise en NFC', () => {
    const decomposed = 'après'; // "après" en NFD
    expect(normalizeAnswer(decomposed)).toBe('après');
  });

  it('ramène les apostrophes courbes à une apostrophe droite', () => {
    expect(normalizeAnswer('aujourd’hui')).toBe("aujourd'hui");
    expect(normalizeAnswer('aujourd‘hui')).toBe("aujourd'hui");
    expect(normalizeAnswer('aujourdʼhui')).toBe("aujourd'hui");
    expect(normalizeAnswer('aujourd´hui')).toBe("aujourd'hui");
  });

  it('ramène les tirets à un trait d’union droit', () => {
    expect(normalizeAnswer('auto‐stop')).toBe('auto-stop');
    expect(normalizeAnswer('auto‑stop')).toBe('auto-stop');
    expect(normalizeAnswer('auto–stop')).toBe('auto-stop');
  });

  it('met en minuscules à la française', () => {
    expect(normalizeAnswer('APRÈS')).toBe('après');
  });

  it('retire les espaces aux bords et réduit ceux du milieu', () => {
    expect(normalizeAnswer('  bien   sûr  ')).toBe('bien sûr');
  });
});

describe('isCorrectAnswer', () => {
  it('un accent compte', () => {
    expect(isCorrectAnswer('aprés', 'après')).toBe(false);
  });

  it("l'apostrophe courbe et l'apostrophe droite sont équivalentes", () => {
    expect(isCorrectAnswer('aujourd’hui', "aujourd'hui")).toBe(true);
  });

  it('accepte une réponse identique après normalisation', () => {
    expect(isCorrectAnswer('  Après ', 'après')).toBe(true);
  });
});

describe('diffLetters', () => {
  it('aprés / après → é, è', () => {
    const { typed, expected } = diffLetters('aprés', 'après');
    expect(typed.filter((m) => !m.ok).map((m) => m.char)).toEqual(['é']);
    expect(expected.filter((m) => !m.ok).map((m) => m.char)).toEqual(['è']);
  });

  it('asser / assez → r, z', () => {
    const { typed, expected } = diffLetters('asser', 'assez');
    expect(typed.filter((m) => !m.ok).map((m) => m.char)).toEqual(['r']);
    expect(expected.filter((m) => !m.ok).map((m) => m.char)).toEqual(['z']);
  });

  it('ossi / aussi → o / a, u', () => {
    const { typed, expected } = diffLetters('ossi', 'aussi');
    expect(typed.filter((m) => !m.ok).map((m) => m.char)).toEqual(['o']);
    expect(expected.filter((m) => !m.ok).map((m) => m.char)).toEqual(['a', 'u']);
  });

  it("aujourdui / aujourd'hui → ', h", () => {
    const { typed, expected } = diffLetters('aujourdui', "aujourd'hui");
    expect(typed.filter((m) => !m.ok).map((m) => m.char)).toEqual([]);
    expect(expected.filter((m) => !m.ok).map((m) => m.char)).toEqual(["'", 'h']);
  });

  it('bientot / bientôt → o, ô', () => {
    const { typed, expected } = diffLetters('bientot', 'bientôt');
    expect(typed.filter((m) => !m.ok).map((m) => m.char)).toEqual(['o']);
    expect(expected.filter((m) => !m.ok).map((m) => m.char)).toEqual(['ô']);
  });

  it('un mot identique ne montre aucune lettre fausse', () => {
    const { typed, expected } = diffLetters('après', 'après');
    expect(typed.every((m) => m.ok)).toBe(true);
    expect(expected.every((m) => m.ok)).toBe(true);
  });
});
