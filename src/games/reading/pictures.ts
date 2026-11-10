// CONTRAT (signatures) — catalogue d'images du programme de lecture (émojis Noto embarqués). LECTURE.md §3.5.
// SOUCHE posée par l'orchestrateur : la tâche L2 remplit le catalogue.
import type { Picture, PictureId } from './types';

export const PICTURES: readonly Picture[] = [];

export function getPicture(_id: PictureId): Picture | undefined {
  throw new Error('L2 : à implémenter');
}
