// Types propres à la mécanique « robot ».

export type Dir = 'up' | 'down' | 'left' | 'right';

export interface Pos {
  x: number;
  y: number;
}

/** Grille carrée avec des rochers (infranchissables). */
export interface Grid {
  size: number;
  rocks: readonly Pos[];
}

export interface RobotRoundData {
  size: number;
  start: Pos;
  goal: Pos;
  rocks: Pos[];
  mode: 'step' | 'program';
  /** Longueur du plus court chemin. */
  minMoves: number;
  /** mode "program" : nombre maximal de flèches. */
  maxArrows: number;
}
