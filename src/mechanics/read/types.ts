// CONTRAT — données d'une manche « Lis et montre », entre le générateur (generate.ts) et la vue (ReadView.tsx).
import type { AnchorId, ChoiceId, Relation } from '../../engine/types';

/** Un sujet posé sur un support : « le lapin est sur la chaise » → { emoji: '🐰', count: 1, relation: 'on', anchor: 'chair' }. */
export interface Placement {
  /** Émoji du sujet (la vue n'a pas besoin du catalogue de noms). */
  emoji: string;
  /** 1 (singulier) ou 3 (pluriel : « les lapins »). */
  count: 1 | 3;
  relation: Relation;
  anchor: AnchorId;
}

/** Une image : une case par phrase (1 ou 2), chacune avec son propre support, côte à côte ou l'une sous l'autre. */
export interface Scene {
  placements: Placement[];
}

export interface ReadRoundData {
  /** Le texte à lire : une ou deux phrases, ponctuées. */
  text: string;
  /** Images proposées, déjà mélangées ; data-choice = id. La bonne a l'id de round.answer. */
  choices: { id: ChoiceId; scene: Scene }[];
}
