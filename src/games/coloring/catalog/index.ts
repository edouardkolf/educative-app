// Catalogue V1 des 12 dessins (docs/specs/COLORIAGE.md §4.3). Ajouter un dessin : voir §4.5.
import type { Drawing } from '../model';
import { boat } from './boat';
import { car } from './car';
import { castle } from './castle';
import { fish } from './fish';
import { garden } from './garden';
import { house } from './house';
import { robot } from './robot';
import { rocket } from './rocket';
import { sea } from './sea';
import { snowman } from './snowman';
import { space } from './space';
import { tree } from './tree';

export const DRAWINGS: Drawing[] = [house, tree, boat, car, rocket, fish, robot, snowman, castle, garden, sea, space];

export function findDrawing(id: string): Drawing | undefined {
  return DRAWINGS.find((d) => d.id === id);
}
