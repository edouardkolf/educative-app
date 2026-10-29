// Types propres à la mécanique « memory ».
import type { ObjectId } from '../../engine/types';

export interface MemoryRoundData {
  /** Objet de chaque carte, dans l'ordre de la table (chaque objet apparaît exactement deux fois). */
  cards: ObjectId[];
  maxMisses: number;
  /** Aperçu initial en ms (0 = pas d'aperçu). */
  peekMs: number;
}
