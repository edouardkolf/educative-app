// Registre des mécaniques. Ajouter une mécanique = une ligne ici + son dossier.
import type { MechanicDefinition, MechanicId } from '../engine/types';
import { builder } from './builder';
import { calc } from './calc';
import { compare } from './compare';
import { colorMix } from './color-mix';
import { count } from './count';
import { oddOneOut } from './odd-one-out';
import { sequence } from './sequence';
import { sort } from './sort';
import { spelling } from './spelling';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyMechanic = MechanicDefinition<any, any>;

const registry: Partial<Record<MechanicId, AnyMechanic>> = {
  sequence,
  count,
  'odd-one-out': oddOneOut,
  'color-mix': colorMix,
  sort,
  builder,
  compare,
  calc,
  spelling,
};

export function getMechanic(id: MechanicId): AnyMechanic | undefined {
  return registry[id];
}
