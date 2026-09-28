// Règles de contenu (docs/specs/DICTEE.md §4.3). Lancé par `npm run validate:content`
// (vitest run content.test catalog.test) : un mot ou une série invalide casse le build.
// Messages en français, lisibles par le PM.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { WORLD_ORDER } from '../../screens/map/layout';
import { KEYBOARD_CHARS, KEY_ROWS } from './keyboard-layout';
import { DICTATION_SERIES } from './series';
import type { DictationWord } from './types';
import { DICTATION_WORDS, EXTRA_WORDS } from './words';

const WORD_ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SERIES_ID_PATTERN = /^s\d+$/;

const allWords: DictationWord[] = [...DICTATION_WORDS.values()];
const extraIds = new Set(EXTRA_WORDS.map((w) => w.id));
// Les mots du catalogue qui ne viennent pas de EXTRA_WORDS viennent forcément de WORDS.
const parcoursIds = new Set(allWords.map((w) => w.id).filter((id) => !extraIds.has(id)));

/** Reconstruit l'id attendu à partir de `text` : sans accents, apostrophes ni traits d'union. */
function idFromText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’\-]/g, '')
    .toLowerCase();
}

describe('C1 — identifiants des mots', () => {
  it('sont au format attendu et uniques', () => {
    const seen = new Set<string>();
    for (const word of allWords) {
      expect(word.id, `l'id « ${word.id} » ne respecte pas le format attendu`).toMatch(WORD_ID_PATTERN);
      expect(seen.has(word.id), `l'id « ${word.id} » est utilisé deux fois`).toBe(false);
      seen.add(word.id);
    }
  });

  it("un mot n'est jamais à la fois dans WORDS et dans EXTRA_WORDS", () => {
    for (const id of extraIds) {
      expect(parcoursIds.has(id), `le mot « ${id} » est à la fois dans WORDS et EXTRA_WORDS`).toBe(false);
    }
  });

  it("l'id se construit à partir de text (accents, apostrophes et traits d'union retirés)", () => {
    const seenBase = new Map<string, number>();
    for (const word of allWords) {
      const base = idFromText(word.text);
      const count = seenBase.get(base) ?? 0;
      seenBase.set(base, count + 1);
      const expectedId = count === 0 ? base : `${base}-${count + 1}`;
      // Les ids historiques de WORDS (parcours) ne suivent pas forcément la règle -2 ; on ne
      // l'exige donc que pour les mots propres à la dictée (EXTRA_WORDS).
      if (extraIds.has(word.id)) {
        expect(word.id, `id inattendu pour « ${word.text} »`).toBe(expectedId);
      }
    }
  });
});

describe('C2 — orthographe', () => {
  it('text est en NFC, en minuscules, sans espace aux bords, et tapable au clavier', () => {
    for (const word of allWords) {
      expect(word.text.normalize('NFC'), `« ${word.text} » n'est pas en NFC`).toBe(word.text);
      expect(word.text.toLocaleLowerCase('fr'), `« ${word.text} » doit être en minuscules`).toBe(word.text);
      expect(word.text, `« ${word.text} » a un espace en trop`).toBe(word.text.trim());
      for (const char of word.text) {
        expect(KEYBOARD_CHARS.has(char), `le caractère « ${char} » de « ${word.text} » n'est pas au clavier`).toBe(
          true,
        );
      }
    }
  });
});

describe('C3 — phrases', () => {
  for (const word of allWords) {
    describe(`mot « ${word.text} »`, () => {
      it('a au moins 3 phrases toutes différentes', () => {
        expect(word.sentences.length, `« ${word.text} » a moins de 3 phrases`).toBeGreaterThanOrEqual(3);
        expect(new Set(word.sentences).size, `« ${word.text} » a des phrases en double`).toBe(word.sentences.length);
      });

      it('chaque phrase contient un seul « ___ », se termine par . ! ou ?, et reste simple', () => {
        for (const sentence of word.sentences) {
          const blanks = sentence.match(/___/g) ?? [];
          expect(blanks.length, `« ${sentence} » doit contenir un seul ___`).toBe(1);
          expect(sentence, `« ${sentence} » doit finir par . ! ou ?`).toMatch(/[.!?]$/);
          expect(sentence, `« ${sentence} » ne doit pas contenir de chiffre`).not.toMatch(/\d/);
          expect(sentence, `« ${sentence} » ne doit pas contenir de parenthèse`).not.toMatch(/[()]/);
          expect(sentence, `« ${sentence} » ne doit pas contenir de guillemet`).not.toMatch(/["«»]/);
          const wordCount = sentence.trim().split(/\s+/).length;
          expect(wordCount, `« ${sentence} » a plus de 14 mots`).toBeLessThanOrEqual(14);

          const filled = sentence.replace('___', word.text);
          const escaped = word.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const occurrences = filled.match(new RegExp(`(?<!\\p{L})${escaped}(?!\\p{L})`, 'gu')) ?? [];
          expect(
            occurrences.length,
            `« ${word.text} » doit apparaître exactement une fois, en mot entier, dans « ${filled} »`,
          ).toBe(1);
        }
      });
    });
  }
});

describe('C4 — prononciation forcée (say)', () => {
  const withSay = allWords.filter((w) => w.say !== undefined);

  it('la règle est appliquée (aucun mot avec say en V1 : rien à vérifier)', () => {
    expect(withSay.length).toBeGreaterThanOrEqual(0);
  });

  for (const word of withSay) {
    it(`« ${word.text} » : say est non vide et sans ___`, () => {
      expect((word.say ?? '').trim().length, `say de « ${word.text} » est vide`).toBeGreaterThan(0);
      expect(word.say, `say de « ${word.text} » contient ___`).not.toContain('___');
    });
  }
});

describe('C5 — homophones', () => {
  const groups = new Map<string, DictationWord[]>();
  for (const word of allWords) {
    if (!word.homophones) continue;
    const list = groups.get(word.homophones) ?? [];
    list.push(word);
    groups.set(word.homophones, list);
  }

  it('la règle est appliquée (aucun homophone déclaré en V1 : rien à vérifier)', () => {
    expect(groups.size).toBeGreaterThanOrEqual(0);
  });

  for (const [key, members] of groups) {
    describe(`groupe « ${key} »`, () => {
      it('compte au moins 2 mots, tous de text différent', () => {
        expect(members.length, `le groupe « ${key} » a moins de 2 mots`).toBeGreaterThanOrEqual(2);
        const texts = new Set(members.map((m) => m.text));
        expect(texts.size, `le groupe « ${key} » a des mots avec le même text`).toBe(members.length);
      });

      it("chaque phrase d'un membre ne contient que son propre mot du groupe", () => {
        for (const member of members) {
          const others = members.filter((m) => m.id !== member.id);
          for (const sentence of member.sentences) {
            const filled = sentence.replace('___', member.text);
            for (const other of others) {
              const escaped = other.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const found = new RegExp(`(?<!\\p{L})${escaped}(?!\\p{L})`, 'iu').test(filled);
              expect(found, `« ${filled} » (mot « ${member.text} ») cite aussi « ${other.text} »`).toBe(false);
            }
          }
        }
      });
    });
  }
});

describe('S1 — numérotation des séries', () => {
  it('a des ids uniques au format sN, numérotés 1, 2, 3… sans trou, dans l’ordre du tableau', () => {
    const seen = new Set<string>();
    DICTATION_SERIES.forEach((series, index) => {
      expect(series.id, `l'id de série « ${series.id} » ne respecte pas le format sN`).toMatch(SERIES_ID_PATTERN);
      expect(seen.has(series.id), `l'id de série « ${series.id} » est utilisé deux fois`).toBe(false);
      seen.add(series.id);
      expect(series.number, `la série « ${series.id} » devrait porter le numéro ${index + 1}`).toBe(index + 1);
    });
  });
});

describe('S2 — contenu d’une série', () => {
  const seenWords = new Map<string, string>();

  for (const series of DICTATION_SERIES) {
    describe(`série « ${series.id} »`, () => {
      it('compte 4 à 6 mots, tous au catalogue, sans doublon', () => {
        expect(series.words.length, `« ${series.id} » n'a pas entre 4 et 6 mots`).toBeGreaterThanOrEqual(4);
        expect(series.words.length, `« ${series.id} » n'a pas entre 4 et 6 mots`).toBeLessThanOrEqual(6);
        expect(new Set(series.words).size, `« ${series.id} » a un mot en double`).toBe(series.words.length);
        for (const wordId of series.words) {
          expect(DICTATION_WORDS.has(wordId), `le mot « ${wordId} » de « ${series.id} » n'est pas au catalogue`).toBe(
            true,
          );
        }
      });

      it("n'a que des mots qui n'appartiennent pas déjà à une autre série", () => {
        for (const wordId of series.words) {
          const owner = seenWords.get(wordId);
          expect(owner === undefined, `le mot « ${wordId} » est dans « ${owner} » et « ${series.id} »`).toBe(true);
          seenWords.set(wordId, series.id);
        }
      });
    });
  }
});

describe('S3 — accord avec le parcours', () => {
  for (let n = 1; n <= 4; n += 1) {
    it(`s${n} a les mêmes mots que ce1-mots-s${n}-1`, () => {
      const path = join(process.cwd(), 'content', 'levels', 'ce1', `ce1-mots-s${n}-1.json`);
      const level = JSON.parse(readFileSync(path, 'utf-8')) as { params?: { words?: string[] } };
      const expectedWords = level.params?.words ?? [];
      const series = DICTATION_SERIES.find((s) => s.id === `s${n}`);
      expect(series, `la série « s${n} » n'existe pas`).toBeDefined();
      expect(series?.words, `« s${n} » ne correspond pas aux mots de ce1-mots-s${n}-1`).toEqual(expectedWords);
    });
  }
});

describe('S4 — mondes', () => {
  it('sont dans WORLD_ORDER et servent chacun à une série au plus', () => {
    const seenWorlds = new Map<string, string>();
    for (const series of DICTATION_SERIES) {
      if (!series.world) continue;
      expect(WORLD_ORDER.includes(series.world), `le monde « ${series.world} » n'existe pas`).toBe(true);
      const owner = seenWorlds.get(series.world);
      expect(owner === undefined, `le monde « ${series.world} » sert à « ${owner} » et « ${series.id} »`).toBe(true);
      seenWorlds.set(series.world, series.id);
    }
  });
});

describe('K1 — clavier', () => {
  it("chaque caractère n'apparaît qu'une fois dans KEY_ROWS", () => {
    const chars = KEY_ROWS.flat();
    const seen = new Set<string>();
    for (const char of chars) {
      expect(seen.has(char), `le caractère « ${char} » apparaît plusieurs fois dans le clavier`).toBe(false);
      seen.add(char);
    }
  });
});
