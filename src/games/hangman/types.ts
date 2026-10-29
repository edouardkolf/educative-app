/** Un mot du pendu, avec son indice (docs/specs/MORPION-PENDU.md §4.2). */
export interface HangmanWord {
  /** Identifiant stable (le mot sans accent) : les statistiques et le tirage s'y réfèrent. */
  id: string;
  /** Orthographe affichée, en minuscules, accents compris. */
  word: string;
  /** Indice court, lisible par un enfant de CE1 ; ne contient jamais le mot. */
  hint: string;
}
