// Vérifie l'intégrité du contenu pédagogique du catalogue de mots (aucune faute acceptable).
import { describe, expect, it } from 'vitest';
import { WORD_IDS } from '../../engine/types';
import { WORDS } from './words';

describe('WORDS (catalogue)', () => {
  it('contient les 10 mots attendus', () => {
    expect(Object.keys(WORDS).sort()).toEqual([...WORD_IDS].sort());
  });

  for (const wordId of WORD_IDS) {
    const entry = WORDS[wordId];

    it(`${wordId} : au moins 3 variantes fautives, toutes différentes du mot et entre elles`, () => {
      for (const level of [1, 2, 3] as const) expect(entry.misspellings[level].length).toBeGreaterThanOrEqual(2);
      const all = Object.values(entry.misspellings).flat();
      for (const wrong of all) expect(wrong).not.toBe(entry.text);
      expect(new Set(all).size).toBe(all.length);
    });

    it(`${wordId} : au moins une phrase, chacune avec un unique "___"`, () => {
      expect(entry.sentences.length).toBeGreaterThanOrEqual(3);
      for (const sentence of entry.sentences) {
        const occurrences = sentence.split('___').length - 1;
        expect(occurrences).toBe(1);
      }
    });

    it(`${wordId} : au moins un découpage, chacun reconstitue exactement le mot`, () => {
      expect(entry.gaps.length).toBeGreaterThanOrEqual(1);
      expect(entry.gaps.length).toBeLessThanOrEqual(2);
      for (const gap of entry.gaps) {
        expect(gap.before + gap.missing + gap.after).toBe(entry.text);
        expect(gap.distractors.length).toBeGreaterThanOrEqual(3);
        for (const d of gap.distractors) expect(d).not.toBe(gap.missing);
        expect(new Set(gap.distractors).size).toBe(gap.distractors.length);
      }
    });
  }
});
