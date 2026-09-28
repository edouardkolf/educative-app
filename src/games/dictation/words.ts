// Catalogue de la dictée (docs/specs/DICTEE.md §4.2). Un mot vit à un seul endroit : dans `WORDS`
// (src/mechanics/spelling/words.ts) s'il sert au parcours, sinon dans `EXTRA_WORDS` ci-dessous.
import { WORD_IDS } from '../../engine/types';
import { WORDS } from '../../mechanics/spelling/words';
import type { DictationWord, DictationWordId } from './types';

/** Mots propres à la dictée (séries 5-8, homophones) : vide en V1, complété par D9 (période 2). */
export const EXTRA_WORDS: readonly DictationWord[] = [];

/** Ajoute `say` ou `homophones` à des mots déjà dans `WORDS`, sans dupliquer `text`/`sentences`. */
export const OVERRIDES: Readonly<Partial<Record<DictationWordId, Pick<DictationWord, 'say' | 'homophones'>>>> = {};

function buildCatalogue(): ReadonlyMap<DictationWordId, DictationWord> {
  const map = new Map<DictationWordId, DictationWord>();

  for (const id of WORD_IDS) {
    const entry = WORDS[id];
    const override = OVERRIDES[id];
    const word: DictationWord = { id, text: entry.text, sentences: entry.sentences };
    if (override?.say !== undefined) word.say = override.say;
    if (override?.homophones !== undefined) word.homophones = override.homophones;
    map.set(id, word);
  }

  for (const word of EXTRA_WORDS) {
    map.set(word.id, word);
  }

  return map;
}

/** Catalogue complet : les 20 mots du parcours (WORDS), plus EXTRA_WORDS. */
export const DICTATION_WORDS: ReadonlyMap<DictationWordId, DictationWord> = buildCatalogue();
