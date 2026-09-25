// CONTRAT — API du moteur (logique pure, sans interface ni stockage).
// Les signatures font foi ; les corps sont répartis dans content.ts, rng.ts, scoring.ts, progress.ts, stats.ts.

export * from './types';

export { getTracks, getTrack, getLevel, getNextLevelId } from './content';
export { createRng } from './rng';
export { countMisses, computeStars } from './scoring';
export { computeLevelStates, hasCompleted } from './progress';
export { computeLevelStats } from './stats';
