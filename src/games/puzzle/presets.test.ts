import { describe, expect, it } from 'vitest';
import { createRng } from '../../engine/rng';
import { getMechanic } from '../../mechanics';
import { validateCodeBreaker } from '../../mechanics/code-breaker/validate';
import { validateMemory } from '../../mechanics/memory/validate';
import { validateGuessNumber } from '../../mechanics/guess-number/validate';
import { validateRobot } from '../../mechanics/robot/validate';
import { PUZZLE_GAMES, PUZZLE_PRESETS } from '../../storage/puzzles';
import { PUZZLE_PRESET_PARAMS } from './presets';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const validators: Record<string, (params: any) => string[]> = {
  'guess-number': validateGuessNumber,
  'code-breaker': validateCodeBreaker,
  robot: validateRobot,
  memory: validateMemory,
};

describe('PUZZLE_PRESET_PARAMS', () => {
  for (const game of PUZZLE_GAMES) {
    for (const preset of PUZZLE_PRESETS) {
      describe(`${game} / ${preset}`, () => {
        const params = PUZZLE_PRESET_PARAMS[game][preset];

        it('passe le validateur de la mécanique', () => {
          expect(validators[game]!(params)).toEqual([]);
        });

        it('génère une manche pour 20 graines', () => {
          const mechanic = getMechanic(game)!;
          for (let seed = 1; seed <= 20; seed++) {
            const rounds = mechanic.generateRounds(params as never, 1, createRng(seed));
            expect(rounds).toHaveLength(1);
            expect(rounds[0]!.answer).toBeTruthy();
          }
        });
      });
    }
  }
});
