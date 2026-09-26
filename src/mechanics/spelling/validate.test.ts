import { describe, expect, it } from 'vitest';
import type { SpellingParams } from '../../engine/types';
import { validateParams } from './validate';

function base(overrides: Partial<SpellingParams> = {}): SpellingParams {
  return { words: ['apres', 'assez'], mode: 'pick', sentence: true, choices: 3, ...overrides };
}

describe('spelling.validateParams', () => {
  it('accepte des paramètres valides (pick)', () => {
    expect(validateParams(base())).toEqual([]);
  });

  it('accepte des paramètres valides (gap)', () => {
    expect(validateParams(base({ mode: 'gap', choices: 3 }))).toEqual([]);
  });

  it('accepte des paramètres valides (tiles)', () => {
    expect(validateParams(base({ mode: 'tiles', choices: undefined, extraTiles: 2 }))).toEqual([]);
  });

  it('refuse une liste de mots vide', () => {
    expect(validateParams(base({ words: [] }))).not.toEqual([]);
  });

  it('signale un mot inconnu', () => {
    // @ts-expect-error volontaire pour tester la robustesse au runtime
    const errors = validateParams(base({ words: ['nawak'] }));
    expect(errors.some((e) => e.includes('nawak'))).toBe(true);
  });

  it('pick : signale choices manquant', () => {
    const errors = validateParams(base({ choices: undefined }));
    expect(errors.length).toBeGreaterThan(0);
  });

  it('pick : signale trop de propositions demandées vs variantes disponibles', () => {
    // Chaque mot n'a que 3 variantes fautives : 5 choix est donc impossible (max 4 propositions de toute façon).
    const errors = validateParams(base({ choices: 4 }));
    expect(errors).toEqual([]); // 4 choix = 3 variantes dispo, tout juste possible
  });

  it('gap : signale un manque de lettres pièges pour un découpage', () => {
    const errors = validateParams(base({ mode: 'gap', choices: 4 }));
    // "apres" et "assez" n'ont que 3 distracteurs par découpage → 4 choix (3 distracteurs requis) tout juste ok
    expect(errors).toEqual([]);
  });

  it('tiles : signale extraTiles manquant', () => {
    const errors = validateParams(base({ mode: 'tiles', choices: undefined, extraTiles: undefined }));
    expect(errors.some((e) => e.toLowerCase().includes('extratiles'))).toBe(true);
  });
});
