// Séries de dictée (docs/specs/DICTEE.md §4.2) : rend explicite ce que seuls les niveaux
// `ce1-mots-sN-*` disaient jusqu'ici. Les 4 premières séries partagent leurs mots et leur monde
// avec le parcours ; les séries 5 à 8 (période 2) n'ont pas de monde (D9, docs/specs/DICTEE.md §4.4).
import type { DictationSeries } from './types';

export const DICTATION_SERIES: readonly DictationSeries[] = [
  { id: 's1', number: 1, world: 'forest', words: ['afin', 'alors', 'apres', 'assez', 'aujourdhui'] },
  { id: 's2', number: 2, world: 'sea', words: ['aupres', 'aussi', 'aussitot', 'autant', 'autour'] },
  { id: 's3', number: 3, world: 'mountain', words: ['autrefois', 'autrement', 'avant', 'avec', 'beaucoup'] },
  { id: 's4', number: 4, world: 'clouds', words: ['bien', 'bientot', 'car', 'ceci', 'cela'] },
];
