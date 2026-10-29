import { describe, expect, it } from 'vitest';
import { createActiveClock } from './useActiveClock';

describe('createActiveClock', () => {
  it('compte le temps visible et met en pause quand la page est cachée', () => {
    let t = 1000;
    let hidden = false;
    const clock = createActiveClock(() => t, () => hidden);
    t = 4000;
    expect(clock.elapsed()).toBe(3000);
    hidden = true;
    clock.visibility(true);
    t = 60_000;
    expect(clock.elapsed()).toBe(3000);
    hidden = false;
    clock.visibility(false);
    t = 61_000;
    expect(clock.elapsed()).toBe(4000);
  });

  it('reset repart de zéro', () => {
    let t = 0;
    const clock = createActiveClock(() => t, () => false);
    t = 5000;
    clock.reset();
    t = 5500;
    expect(clock.elapsed()).toBe(500);
  });
});
