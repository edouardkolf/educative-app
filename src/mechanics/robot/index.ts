// Mécanique « Robot à programmer » : MS en pas à pas, CE1 en programme (docs/specs/JEUX-LOGIQUE.md §3.3).
import type { MechanicDefinition } from '../../engine/types';
import { generateRounds } from './generate';
import { shortestPath } from './logic';
import { RobotView } from './RobotView';
import type { RobotRoundData } from './types';

export const robot: MechanicDefinition<'robot', RobotRoundData> = {
  id: 'robot',
  generateRounds,
  View: RobotView,
  solvedDelayMs: 1200,
  tutorialTargets(round) {
    const d = round.data;
    const path = shortestPath({ size: d.size, rocks: d.rocks }, d.start, d.goal) ?? [];
    const targets = path.map((dir) => `arrow-${dir}`);
    return d.mode === 'program' ? [...targets, 'run'] : targets;
  },
};

export type { RobotRoundData } from './types';
export { validateRobot } from './validate';
