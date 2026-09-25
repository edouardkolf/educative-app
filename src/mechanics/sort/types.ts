// Données d'affichage propres à la mécanique « sort » (le trieur magique).
import type { ObjectId } from '../../engine/types';

/** Un panier tel qu'affiché : id de la famille + émoji géant, dans l'ordre fixe des paramètres. */
export interface SortBasket {
  id: string;
  symbol: string;
}

export interface SortRoundData {
  /** Objet géant à ranger. */
  objectId: ObjectId;
  /** Les 2-3 paniers à afficher, position stable niveau après niveau (voir SortParams.groups). */
  baskets: SortBasket[];
}
