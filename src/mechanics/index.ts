// Registre des mécaniques. Ajouter une mécanique = une ligne ici + son dossier.
import type { MechanicDefinition, MechanicId } from '../engine/types';
import { count } from './count';
import { oddOneOut } from './odd-one-out';
import { sequence } from './sequence';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyMechanic = MechanicDefinition<any, any>;

const registry: Partial<Record<MechanicId, AnyMechanic>> = {
  sequence,
  count,
  'odd-one-out': oddOneOut,
};

export function getMechanic(id: MechanicId): AnyMechanic | undefined {
  return registry[id];
}
