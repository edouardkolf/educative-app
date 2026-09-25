// Validation du contenu (content/) : `npm run validate:content`, lancé avant chaque build.
// Un niveau cassé ne doit jamais arriver sur le téléphone. Messages en français, avec le nom du
// fichier concerné : un PM non développeur doit pouvoir comprendre et corriger seul.
import { describe, expect, it } from 'vitest';
import Ajv from 'ajv';
import levelSchema from '../../content/level.schema.json';
import trackSchema from '../../content/track.schema.json';
import { OBJECTS } from '../ui/objects';
import { getMechanic } from '../mechanics';
import { createRng } from './rng';
import type { CountParams, Level, OddOneOutParams, SequenceParams, Track } from './types';

const levelModules = import.meta.glob('/content/levels/**/*.json', { eager: true }) as Record<
  string,
  { default: Level }
>;
const trackModules = import.meta.glob('/content/tracks/*.json', { eager: true }) as Record<
  string,
  { default: Track }
>;

const fileName = (path: string): string => path.split('/').pop() ?? path;
const idFromFileName = (path: string): string => fileName(path).replace(/\.json$/, '');

const levelEntries = Object.entries(levelModules).map(([path, mod]) => ({ path, level: mod.default }));
const trackEntries = Object.entries(trackModules).map(([path, mod]) => ({ path, track: mod.default }));

const ajv = new Ajv({ allErrors: true, strict: false });
const validateLevelSchema = ajv.compile(levelSchema);
const validateTrackSchema = ajv.compile(trackSchema);

/** Contrôles sémantiques au-delà du schéma JSON : ARCHITECTURE.md §4. */
function semanticErrors(level: Level): string[] {
  const errors: string[] = [];

  switch (level.mechanic) {
    case 'count': {
      const { min, max, choices, layout } = level.params;
      if (min > max) errors.push(`count : min (${min}) doit être ≤ max (${max})`);
      if (layout === 'dice' && max > 6) errors.push(`count : layout "dice" impose max ≤ 6 (ici max = ${max})`);
      const span = max - min + 1;
      if (choices > span) {
        errors.push(`count : choices (${choices}) doit être ≤ max − min + 1 (${span} valeur(s) possible(s))`);
      }
      break;
    }
    case 'sequence': {
      const { pattern, vary, colors, shapes, objects, choices } = level.params;
      const distinctLetters = new Set(pattern.split('')).size;

      if (vary === 'object') {
        const poolSize = objects?.length ?? 0;
        if (distinctLetters > poolSize) {
          errors.push(
            `sequence : le motif "${pattern}" a ${distinctLetters} lettre(s) distincte(s), objects n'en propose que ${poolSize}`,
          );
        }
        if (choices > poolSize) {
          errors.push(`sequence : choices (${choices}) dépasse le nombre d'objets distincts possibles (${poolSize})`);
        }
        break;
      }

      const colorCount = colors?.length ?? 0;
      const shapeCount = shapes?.length ?? 0;
      if ((vary === 'color' || vary === 'both') && distinctLetters > colorCount) {
        errors.push(
          `sequence : le motif "${pattern}" a ${distinctLetters} lettre(s) distincte(s), colors n'en propose que ${colorCount}`,
        );
      }
      if ((vary === 'shape' || vary === 'both') && distinctLetters > shapeCount) {
        errors.push(
          `sequence : le motif "${pattern}" a ${distinctLetters} lettre(s) distincte(s), shapes n'en propose que ${shapeCount}`,
        );
      }
      const maxTokens = vary === 'both' ? colorCount * shapeCount : vary === 'color' ? colorCount : shapeCount;
      if (choices > maxTokens) {
        errors.push(`sequence : choices (${choices}) dépasse le nombre de jetons distincts possibles (${maxTokens})`);
      }
      break;
    }
    case 'odd-one-out': {
      const { differBy, distract, colors, shapes, categories } = level.params;
      const reservoirSize = (dim: 'color' | 'shape' | 'category'): number => {
        if (dim === 'color') return colors?.length ?? 0;
        if (dim === 'shape') return shapes?.length ?? 0;
        return categories?.length ?? 0;
      };

      if (differBy === 'category' && !categories) {
        errors.push('odd-one-out : categories est requis quand differBy = "category"');
      }
      if (reservoirSize(differBy) < 2) {
        errors.push(`odd-one-out : le réservoir de la dimension "${differBy}" doit avoir au moins 2 éléments`);
      }
      if (distract) {
        const otherDimension: 'color' | 'shape' | null =
          differBy === 'color' ? 'shape' : differBy === 'shape' ? 'color' : null;
        if (otherDimension && reservoirSize(otherDimension) < 2) {
          errors.push(`odd-one-out : distract impose au moins 2 éléments dans "${otherDimension}"`);
        }
      }
      break;
    }
    default:
      break;
  }

  return errors;
}

describe('contenu pédagogique (content/)', () => {
  describe.each(levelEntries.map(({ path, level }): [string, Level] => [path, level]))('%s', (path, level) => {
    it('respecte content/level.schema.json', () => {
      const valid = validateLevelSchema(level);
      const details = ajv.errorsText(validateLevelSchema.errors, { separator: ' ; ' });
      expect(valid, `${fileName(path)} : ne respecte pas level.schema.json — ${details}`).toBe(true);
    });

    it('a un id identique au nom du fichier', () => {
      const expected = idFromFileName(path);
      expect(level.id, `${fileName(path)} : id "${level.id}" attendu "${expected}"`).toBe(expected);
    });

    it('respecte les contrôles sémantiques de sa mécanique', () => {
      const errors = semanticErrors(level);
      expect(errors, `${fileName(path)} : ${errors.join(' ; ')}`).toEqual([]);
    });

    it('génère exactement `rounds` manches sur 20 graines, sans erreur', () => {
      const mechanic = getMechanic(level.mechanic);
      if (!mechanic) return; // mécanique pas encore enregistrée : rien à générer ici

      for (let seed = 0; seed < 20; seed += 1) {
        let rounds: unknown[];
        try {
          rounds = mechanic.generateRounds(level.params, level.rounds, createRng(seed));
        } catch (err) {
          throw new Error(
            `${fileName(path)} : generateRounds échoue avec la graine ${seed} — ${(err as Error).message}`,
          );
        }
        expect(
          rounds.length,
          `${fileName(path)} : generateRounds (graine ${seed}) renvoie ${rounds.length} manche(s), attendu ${level.rounds}`,
        ).toBe(level.rounds);
      }
    });
  });

  describe.each(trackEntries.map(({ path, track }): [string, Track] => [path, track]))('%s', (path, track) => {
    it('respecte content/track.schema.json', () => {
      const valid = validateTrackSchema(track);
      const details = ajv.errorsText(validateTrackSchema.errors, { separator: ' ; ' });
      expect(valid, `${fileName(path)} : ne respecte pas track.schema.json — ${details}`).toBe(true);
    });

    it('a un id identique au nom du fichier', () => {
      const expected = idFromFileName(path);
      expect(track.id, `${fileName(path)} : id "${track.id}" attendu "${expected}"`).toBe(expected);
    });

    it('ne référence que des niveaux qui existent', () => {
      const knownIds = new Set(levelEntries.map((e) => e.level.id));
      const missing = track.levels.filter((id) => !knownIds.has(id));
      expect(
        missing,
        `${fileName(path)} : niveau(x) référencé(s) introuvable(s) dans content/levels — ${missing.join(', ')}`,
      ).toEqual([]);
    });
  });

  it('chaque niveau appartient à exactement un parcours', () => {
    const counts = new Map<string, number>();
    for (const { level } of levelEntries) counts.set(level.id, 0);
    for (const { track } of trackEntries) {
      for (const id of track.levels) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    const problems = [...counts.entries()]
      .filter(([, n]) => n !== 1)
      .map(([id, n]) => (n === 0 ? `${id} (référencé par aucun parcours)` : `${id} (référencé par ${n} parcours)`));
    expect(problems, `Niveaux mal référencés : ${problems.join(' ; ')}`).toEqual([]);
  });

  it('les ids de src/ui/objects.ts (OBJECTS) correspondent à l’énumération objectId du schéma', () => {
    const fromObjects = new Set(OBJECTS.map((o) => o.id));
    const fromSchema = new Set<string>(levelSchema.definitions.objectId.enum);
    const missingInSchema = [...fromObjects].filter((id) => !fromSchema.has(id));
    const missingInObjects = [...fromSchema].filter((id) => !fromObjects.has(id));
    expect(
      { missingInSchema, missingInObjects },
      'src/ui/objects.ts et content/level.schema.json (definitions.objectId) doivent lister exactement les mêmes ids',
    ).toEqual({ missingInSchema: [], missingInObjects: [] });
  });
});

// Aucun niveau "count" ou "odd-one-out" n'existe encore dans content/ (Étape 3) : ces cas synthétiques
// vérifient dès maintenant que semanticErrors() les jugerait correctement le moment venu.
describe('contrôles sémantiques par mécanique (cas synthétiques)', () => {
  const baseLevel = <M extends Level['mechanic']>(mechanic: M, params: unknown): Level =>
    ({
      id: 'synthetic',
      title: 'Synthétique',
      skill: 'patterns',
      objective: 'Cas de test.',
      mechanic,
      rounds: 3,
      params,
    }) as Level;

  const count = (p: Partial<CountParams>): Level =>
    baseLevel('count', { min: 1, max: 5, objects: ['apple'], layout: 'line', choices: 3, answers: 'digits', ...p });

  it('count : accepte des paramètres cohérents', () => {
    expect(semanticErrors(count({}))).toEqual([]);
  });

  it('count : refuse min > max', () => {
    expect(semanticErrors(count({ min: 6, max: 3 }))).not.toEqual([]);
  });

  it('count : refuse layout "dice" avec max > 6', () => {
    expect(semanticErrors(count({ layout: 'dice', min: 1, max: 8, choices: 2 }))).not.toEqual([]);
  });

  it('count : refuse choices > max − min + 1', () => {
    expect(semanticErrors(count({ min: 1, max: 2, choices: 3 }))).not.toEqual([]);
  });

  const oddOneOut = (p: Partial<OddOneOutParams>): Level =>
    baseLevel('odd-one-out', { items: 4, differBy: 'color', colors: ['red', 'blue'], distract: false, ...p });

  it('odd-one-out : accepte un réservoir suffisant', () => {
    expect(semanticErrors(oddOneOut({}))).toEqual([]);
  });

  it('odd-one-out : refuse un réservoir < 2 sur la dimension differBy', () => {
    expect(semanticErrors(oddOneOut({ colors: ['red'] }))).not.toEqual([]);
  });

  it('odd-one-out : distract exige un réservoir ≥ 2 sur l’autre dimension', () => {
    expect(
      semanticErrors(oddOneOut({ distract: true, colors: ['red', 'blue'], shapes: ['circle'] })),
    ).not.toEqual([]);
    expect(
      semanticErrors(oddOneOut({ distract: true, colors: ['red', 'blue'], shapes: ['circle', 'square'] })),
    ).toEqual([]);
  });

  it('odd-one-out : categories requis si differBy = "category"', () => {
    expect(semanticErrors(oddOneOut({ differBy: 'category', colors: undefined }))).not.toEqual([]);
    expect(semanticErrors(oddOneOut({ differBy: 'category', categories: ['fruit', 'animal'] }))).toEqual([]);
  });

  const sequenceLevel = (p: Partial<SequenceParams>): Level =>
    baseLevel('sequence', {
      pattern: 'AB',
      vary: 'color',
      colors: ['red', 'blue'],
      shapes: ['circle'],
      length: 5,
      blank: 'end',
      choices: 2,
      ...p,
    });

  it('sequence : refuse un réservoir trop petit pour les lettres distinctes du motif', () => {
    expect(semanticErrors(sequenceLevel({ pattern: 'ABC', colors: ['red', 'blue'] }))).not.toEqual([]);
  });

  it('sequence : refuse choices au-delà du nombre de jetons distincts possibles', () => {
    expect(semanticErrors(sequenceLevel({ colors: ['red', 'blue'], choices: 3 }))).not.toEqual([]);
  });
});
