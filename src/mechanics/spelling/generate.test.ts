// Génération pure des manches « orthographe ». 200 graines par mode, sur les 10 mots.
import { describe, expect, it } from 'vitest';
import { createRng } from '../../engine/rng';
import { WORD_IDS, type SpellingParams } from '../../engine/types';
import { generateRounds } from './generate';
import { WORDS } from './words';

const SEEDS = Array.from({ length: 200 }, (_, i) => i + 1);

function params(overrides: Partial<SpellingParams>): SpellingParams {
  return { words: [...WORD_IDS], mode: 'pick', sentence: true, ...overrides };
}

function multiset(items: readonly string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const it of items) m.set(it, (m.get(it) ?? 0) + 1);
  return m;
}

describe('spelling.generateRounds — mode pick', () => {
  const p = params({ mode: 'pick', choices: 3 });

  it('la bonne réponse est présente une fois parmi des choix distincts', () => {
    for (const seed of SEEDS) {
      for (const round of generateRounds(p, 10, createRng(seed))) {
        if (round.data.mode !== 'pick') throw new Error('mode inattendu');
        const ids = round.data.choices.map((c) => c.id);
        expect(new Set(ids).size).toBe(ids.length);
        expect(ids.filter((id) => id === round.answer)).toHaveLength(1);
        expect(round.answer).toBe(WORDS[round.data.wordId].text);
        expect(round.data.word).toBe(WORDS[round.data.wordId].text);
        expect(ids.length).toBeGreaterThanOrEqual(2);
        expect(ids.length).toBeLessThanOrEqual(3); // borné par les variantes disponibles (3 par mot ici)
      }
    }
  });

  it('la phrase, quand présente, contient le mot remplacé par "___" une seule fois', () => {
    for (const seed of SEEDS.slice(0, 20)) {
      for (const round of generateRounds(p, 10, createRng(seed))) {
        if (round.data.mode !== 'pick') continue;
        if (!round.data.sentence) continue;
        expect(round.data.sentence.split('___').length - 1).toBe(1);
      }
    }
  });

  it('déterminisme : même graine → mêmes manches', () => {
    for (const seed of [1, 7, 42]) {
      const a = generateRounds(p, 10, createRng(seed));
      const b = generateRounds(p, 10, createRng(seed));
      expect(a).toEqual(b);
    }
  });

  it('jamais deux fois le même mot de suite (réservoir > 1)', () => {
    for (const seed of SEEDS.slice(0, 30)) {
      const rounds = generateRounds(p, 12, createRng(seed));
      for (let i = 1; i < rounds.length; i += 1) {
        expect(rounds[i]!.data.wordId).not.toBe(rounds[i - 1]!.data.wordId);
      }
    }
  });
});

describe('spelling.generateRounds — mode gap', () => {
  const p = params({ mode: 'gap', choices: 3 });

  it('la bonne réponse (lettres manquantes) est présente une fois parmi des choix distincts', () => {
    for (const seed of SEEDS) {
      for (const round of generateRounds(p, 10, createRng(seed))) {
        if (round.data.mode !== 'gap') throw new Error('mode inattendu');
        const entry = WORDS[round.data.wordId];
        const ids = round.data.choices.map((c) => c.id);
        expect(new Set(ids).size).toBe(ids.length);
        expect(ids.filter((id) => id === round.answer)).toHaveLength(1);
        expect(round.answer).toBe(round.data.missing);
        expect(round.data.before + round.data.missing + round.data.after).toBe(entry.text);
      }
    }
  });

  it('déterminisme : même graine → mêmes manches', () => {
    for (const seed of [2, 13, 99]) {
      const a = generateRounds(p, 10, createRng(seed));
      const b = generateRounds(p, 10, createRng(seed));
      expect(a).toEqual(b);
    }
  });
});

describe('spelling.generateRounds — mode tiles', () => {
  const p = params({ mode: 'tiles', sentence: false, extraTiles: 2 });

  it('les étiquettes du plateau = lettres du mot + pièges ; answer = orthographe correcte', () => {
    for (const seed of SEEDS) {
      for (const round of generateRounds(p, 10, createRng(seed))) {
        if (round.data.mode !== 'tiles') throw new Error('mode inattendu');
        const entry = WORDS[round.data.wordId];
        expect(round.answer).toBe(entry.text);
        expect(round.data.word).toBe(entry.text);

        // Les lettres attendues reconstituent le mot (apostrophe réinsérée si besoin).
        const withoutApostrophe = entry.text.replace("'", '');
        expect(round.data.letters.join('')).toBe(withoutApostrophe);

        // Le plateau contient au moins les lettres du mot (en tant que sous-multiset), + 0 à 4 pièges.
        const boardCounts = multiset(round.data.tiles);
        const wordCounts = multiset(round.data.letters);
        for (const [letter, needed] of wordCounts) {
          expect(boardCounts.get(letter) ?? 0).toBeGreaterThanOrEqual(needed);
        }
        const extra = round.data.tiles.length - round.data.letters.length;
        expect(extra).toBeGreaterThanOrEqual(0);
        expect(extra).toBeLessThanOrEqual(4);
      }
    }
  });

  it("l'apostrophe d'aujourd'hui est bien positionnée, absente pour les autres mots", () => {
    for (const seed of SEEDS.slice(0, 40)) {
      for (const round of generateRounds(p, 10, createRng(seed))) {
        if (round.data.mode !== 'tiles') continue;
        if (round.data.wordId === 'aujourdhui') {
          expect(round.data.apostropheAfterIndex).toBe(6);
        } else {
          expect(round.data.apostropheAfterIndex).toBeUndefined();
        }
      }
    }
  });

  it('déterminisme : même graine → mêmes manches', () => {
    for (const seed of [3, 21, 150]) {
      const a = generateRounds(p, 10, createRng(seed));
      const b = generateRounds(p, 10, createRng(seed));
      expect(a).toEqual(b);
    }
  });
});

describe("tiles : aujourd'hui", () => {
  it("les lettres dans l'ordre, apostrophe réinsérée à sa place, redonnent exactement la réponse", () => {
    for (let seed = 0; seed < 50; seed += 1) {
      const rounds = generateRounds({ words: ['aujourdhui'], mode: 'tiles', sentence: false, extraTiles: 2 }, 3, createRng(seed));
      for (const round of rounds) {
        const data = round.data as Extract<typeof round.data, { mode: 'tiles' }>;
        const composed = data.letters.map((l, k) => l + (k === data.apostropheAfterIndex ? "'" : '')).join('');
        expect(composed).toBe(round.answer);
      }
    }
  });
});
