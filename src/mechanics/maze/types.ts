// Types de la mécanique « maze » (labyrinthe). Tout est sérialisable (tableaux simples).
export interface Cell {
  r: number;
  c: number;
}

/** Labyrinthe parfait : `right[i]` / `down[i]` valent vrai quand le passage vers la case de droite / du bas est ouvert. */
export interface Maze {
  size: number;
  right: boolean[];
  down: boolean[];
}

export interface MazeRoundData {
  maze: Maze;
  start: Cell;
  goal: Cell;
  mode: 'tap' | 'trace';
  /** Émojis de l'animal (départ) et de sa nourriture (arrivée). */
  animal: string;
  food: string;
}
