// Les mondes de la carte, chacun dans son module (voir types.ts et docs/specs/CARTE-MONDES.md).
import type { WorldId } from '../layout';
import { clouds } from './clouds';
import { forest } from './forest';
import { mountain } from './mountain';
import { sea } from './sea';
import type { WorldScene } from './types';

export const SCENES: Record<WorldId, WorldScene<unknown>> = { forest, sea, mountain, clouds };
