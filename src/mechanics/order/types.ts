// Données d'une manche « ranger du plus petit au plus grand ».
export interface OrderItem {
  /** Identifiant du choix : `data-choice="item-<id>"`. Mode size : rang (1 = plus petit) ; mode quantity : la valeur. */
  id: string;
  /** Mode size : taille en % de la plus grande taille possible (40 à 100). */
  scale?: number;
  /** Mode quantity : nombre de points. */
  count?: number;
}

export interface OrderRoundData {
  mode: 'size' | 'quantity';
  /** Mode size : émoji de l'objet de la manche. */
  emoji?: string;
  /** Éléments dans l'ordre où ils sont présentés (mélangés, jamais déjà rangés). */
  items: OrderItem[];
}
