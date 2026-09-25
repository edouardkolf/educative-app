// CONTRAT — catalogue des objets illustrés (comptage, intrus par catégorie).
// Les identifiants sont repris dans content/level.schema.json (definitions.objectId) : garder les deux synchronisés.
import type { ObjectCategory, ObjectId } from '../engine/types';

export interface ObjectDef {
  id: ObjectId;
  emoji: string;
  category: ObjectCategory;
  /** Nom lisible par le parent. */
  label: string;
}

export const OBJECTS: readonly ObjectDef[] = [
  { id: 'apple', emoji: '🍎', category: 'fruit', label: 'pomme' },
  { id: 'banana', emoji: '🍌', category: 'fruit', label: 'banane' },
  { id: 'pear', emoji: '🍐', category: 'fruit', label: 'poire' },
  { id: 'strawberry', emoji: '🍓', category: 'fruit', label: 'fraise' },
  { id: 'cherries', emoji: '🍒', category: 'fruit', label: 'cerises' },
  { id: 'grapes', emoji: '🍇', category: 'fruit', label: 'raisin' },
  { id: 'dog', emoji: '🐶', category: 'animal', label: 'chien' },
  { id: 'cat', emoji: '🐱', category: 'animal', label: 'chat' },
  { id: 'rabbit', emoji: '🐰', category: 'animal', label: 'lapin' },
  { id: 'fish', emoji: '🐟', category: 'animal', label: 'poisson' },
  { id: 'bird', emoji: '🐦', category: 'animal', label: 'oiseau' },
  { id: 'ladybug', emoji: '🐞', category: 'animal', label: 'coccinelle' },
  { id: 'car', emoji: '🚗', category: 'vehicle', label: 'voiture' },
  { id: 'bus', emoji: '🚌', category: 'vehicle', label: 'bus' },
  { id: 'bike', emoji: '🚲', category: 'vehicle', label: 'vélo' },
  { id: 'boat', emoji: '⛵', category: 'vehicle', label: 'bateau' },
  { id: 'train', emoji: '🚂', category: 'vehicle', label: 'train' },
  { id: 'tractor', emoji: '🚜', category: 'vehicle', label: 'tracteur' },
  { id: 'ball', emoji: '⚽', category: 'toy', label: 'ballon' },
  { id: 'teddy', emoji: '🧸', category: 'toy', label: 'nounours' },
  { id: 'balloon', emoji: '🎈', category: 'toy', label: 'ballon de baudruche' },
  { id: 'kite', emoji: '🪁', category: 'toy', label: 'cerf-volant' },
  { id: 'yoyo', emoji: '🪀', category: 'toy', label: 'yoyo' },
  { id: 'drum', emoji: '🥁', category: 'toy', label: 'tambour' },
];

export function getObject(id: ObjectId): ObjectDef | undefined {
  return OBJECTS.find((o) => o.id === id);
}
