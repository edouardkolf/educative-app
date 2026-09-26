// Données d'affichage propres à la mécanique « calcul » (additions, soustractions, tables).
import type { ChoiceId, CalcParams } from '../../engine/types';

export interface CalcRoundData {
  operation: CalcParams['operation'];
  /** Premier terme / nombre de départ / premier facteur : toujours affiché. */
  a: number;
  /** Second terme / nombre retiré / second facteur : affiché sauf quand unknown = "operand". */
  b: number;
  /** Résultat de a operation b : toujours affiché sauf quand unknown = "result". */
  result: number;
  unknown: CalcParams['unknown'];
  answerMode: CalcParams['answer'];
  /** Propositions (déjà mélangées), uniquement quand answerMode = "choices". */
  choices?: { id: ChoiceId; value: number }[];
  /** Quadrillage a × b sous l'opération : uniquement en mul, unknown = "result", showArray demandé. */
  showArray: boolean;
  /** Le quadrillage n'apparaît qu'après une mauvaise réponse (showArray = "after-error"). */
  arrayAfterError: boolean;
}
