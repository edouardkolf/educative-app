// Disposition du clavier intégré (docs/specs/DICTEE.md §2.2 et §4.4) : ordre alphabétique, chaque
// accent juste après sa lettre de base. 7 colonnes, 5 rangées de lettres puis une rangée courte.
export const KEY_ROWS: readonly (readonly string[])[] = [
  ['a', 'à', 'â', 'b', 'c', 'ç', 'd'],
  ['e', 'é', 'è', 'ê', 'f', 'g', 'h'],
  ['i', 'î', 'j', 'k', 'l', 'm', 'n'],
  ['o', 'ô', 'p', 'q', 'r', 's', 't'],
  ['u', 'ù', 'v', 'w', 'x', 'y', 'z'],
  ["'", '-'],
];

/** Union des caractères tapables ; un mot dont un caractère en est absent fait échouer le build. */
export const KEYBOARD_CHARS: ReadonlySet<string> = new Set(KEY_ROWS.flat());

/** Longueur maximale d'une saisie (au-delà, la touche est ignorée). */
export const MAX_ANSWER_LENGTH = 20;
