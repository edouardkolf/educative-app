import { describe, expect, it } from 'vitest';
import { GRAPHEMES, SYLLABLES } from './curriculum';
import { PICTURES } from './pictures';
import { BLEND_PAUSE_MS, SOUND_RATE, benchEntries, gameInstruction, machinePrompt, nameText, soundText, syllableText } from './speech';
import { READING_GAMES } from './types';

describe('soundText', () => {
  it('voyelles telles quelles, e = eu, consonnes + eu', () => {
    for (const v of ['a', 'i', 'o', 'u', 'é', 'ou', 'on', 'oi']) expect(soundText(v)).toBe(v);
    expect(soundText('e')).toBe('eu');
    expect(soundText('m')).toBe('meu');
    expect(soundText('l')).toBe('leu');
    expect(soundText('p')).toBe('peu');
    expect(soundText('ch')).toBe('cheu');
    expect(soundText('g')).toBe('gueu');
    expect(soundText('x')).toBe('kss');
    expect(soundText('h')).toBe('rien');
  });
  it('c, k, q chantent « queu » ; chaque graphème a un texte non vide', () => {
    for (const c of ['c', 'k', 'q']) expect(soundText(c)).toBe('queu');
    for (const g of GRAPHEMES) expect(soundText(g.id).length, g.id).toBeGreaterThan(0);
  });
  it('un consonne simple de l\'étape 3 ou 4 finit par « eu »', () => {
    for (const g of GRAPHEMES.filter((x) => x.kind === 'long' || x.kind === 'short' || x.id === 'ch')) {
      expect(soundText(g.id).endsWith('eu'), g.id).toBe(true);
    }
  });
});

describe('nameText', () => {
  it('noms des lettres', () => {
    expect(nameText('a')).toBe('a');
    expect(nameText('m')).toBe('emme');
    expect(nameText('l')).toBe('elle');
    expect(nameText('b')).toBe('bé');
    for (const c of 'abcdefghijklmnopqrstuvwxyz') expect(nameText(c).length, c).toBeGreaterThan(0);
  });
});

describe('syllableText', () => {
  it('toujours la syllabe entière, jamais deux sons collés', () => {
    expect(syllableText('la')).toBe('la');
    expect(syllableText('chou')).toBe('chou');
    for (const s of SYLLABLES) {
      const t = syllableText(s.id);
      expect(t.length).toBeGreaterThan(0);
      expect(t).not.toContain(' ');
      expect(t).not.toContain('eu');
    }
  });
});

describe('gameInstruction', () => {
  it('une phrase courte pour chacun des huit jeux, tutoiement', () => {
    for (const g of READING_GAMES) {
      const t = gameInstruction(g);
      expect(t.length, g).toBeGreaterThan(10);
      expect(t.length, g).toBeLessThan(80);
      expect(/\b(vous|votre)\b/i.test(t)).toBe(false);
    }
    expect(gameInstruction('letter-sound')).toContain('lettre qui chante');
  });
});

describe('fusion', () => {
  it('son, pause, son, pause, syllabe ; jamais de « et »', () => {
    const steps = machinePrompt('l', 'a', 'la');
    expect(steps[0]).toEqual({ text: 'leu', rate: SOUND_RATE });
    expect(steps[1]).toEqual({ pauseMs: BLEND_PAUSE_MS });
    expect(steps[2]).toEqual({ text: 'a', rate: SOUND_RATE });
    expect(steps[3]).toEqual({ pauseMs: BLEND_PAUSE_MS });
    expect(steps[4]).toEqual({ text: 'la', rate: SOUND_RATE });
    expect(steps.some((s) => 'text' in s && /\bet\b/.test(s.text))).toBe(false);
  });
});

describe('benchEntries', () => {
  const entries = benchEntries();
  it('couvre sons, noms, syllabes, consignes et mots', () => {
    const groups = new Set(entries.map((e) => e.group));
    for (const g of ['sons', 'noms', 'syllabes', 'consignes', 'mots']) expect(groups.has(g as never), g).toBe(true);
    expect(entries.filter((e) => e.group === 'sons')).toHaveLength(GRAPHEMES.length);
    expect(entries.filter((e) => e.group === 'syllabes')).toHaveLength(SYLLABLES.length);
    expect(entries.filter((e) => e.group === 'mots')).toHaveLength(PICTURES.length);
    expect(entries.filter((e) => e.group === 'consignes').length).toBeGreaterThanOrEqual(READING_GAMES.length);
  });
  it('chaque entrée a un libellé et au moins un texte à dire', () => {
    for (const e of entries) {
      expect(e.label.length).toBeGreaterThan(0);
      expect(e.steps.some((s) => 'text' in s && s.text.length > 0), e.label).toBe(true);
    }
    expect(entries.find((e) => e.label === 'M — son')?.steps).toEqual([{ text: 'meu', rate: SOUND_RATE }]);
  });
});
