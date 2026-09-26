import { describe, expect, it } from 'vitest';
import { requestHop, takeHop } from './hop';

describe('hop', () => {
  it('ne rend le trajet demandé qu’une seule fois', () => {
    expect(takeHop()).toBeNull();
    requestHop({ fromLevelId: 'a', toLevelId: 'b' });
    expect(takeHop()).toEqual({ fromLevelId: 'a', toLevelId: 'b' });
    expect(takeHop()).toBeNull();
  });

  it('garde la dernière demande', () => {
    requestHop({ fromLevelId: 'a', toLevelId: 'b' });
    requestHop({ fromLevelId: 'b', toLevelId: 'c' });
    expect(takeHop()).toEqual({ fromLevelId: 'b', toLevelId: 'c' });
  });
});
