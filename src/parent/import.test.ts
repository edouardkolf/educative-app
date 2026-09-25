import { describe, expect, it } from 'vitest';
import { describeImportCounts, formatImportConfirmation, formatImportSuccess, parseImportFile } from './import';

describe('parseImportFile', () => {
  it('renvoie les données pour un JSON valide', () => {
    const result = parseImportFile('{"a": 1}');
    expect(result).toEqual({ data: { a: 1 } });
  });

  it('renvoie un message clair pour un JSON invalide', () => {
    const result = parseImportFile('{not valid json');
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error.length).toBeGreaterThan(0);
    }
  });
});

describe('describeImportCounts', () => {
  it('compte les enfants et les parties quand ce sont des tableaux', () => {
    const data = { profiles: [{}, {}], runs: [{}, {}, {}] };
    expect(describeImportCounts(data)).toEqual({ profiles: 2, runs: 3 });
  });

  it('renvoie zéro pour une forme inattendue', () => {
    expect(describeImportCounts(null)).toEqual({ profiles: 0, runs: 0 });
    expect(describeImportCounts('texte')).toEqual({ profiles: 0, runs: 0 });
    expect(describeImportCounts({})).toEqual({ profiles: 0, runs: 0 });
    expect(describeImportCounts({ profiles: 'pas un tableau' })).toEqual({ profiles: 0, runs: 0 });
  });
});

describe('formatImportConfirmation', () => {
  it('accorde enfant/enfants et partie/parties au pluriel', () => {
    expect(formatImportConfirmation({ profiles: 2, runs: 5 })).toBe(
      'Remplacer toutes les données actuelles par cette sauvegarde (2 enfants, 5 parties) ?',
    );
  });

  it('accorde au singulier', () => {
    expect(formatImportConfirmation({ profiles: 1, runs: 1 })).toBe(
      'Remplacer toutes les données actuelles par cette sauvegarde (1 enfant, 1 partie) ?',
    );
  });

  it('accepte zéro enfant et zéro partie', () => {
    expect(formatImportConfirmation({ profiles: 0, runs: 0 })).toBe(
      'Remplacer toutes les données actuelles par cette sauvegarde (0 enfants, 0 parties) ?',
    );
  });
});

describe('formatImportSuccess (F2 : lignes orphelines ignorées)', () => {
  it('ne mentionne rien de plus quand skipped est 0', () => {
    expect(formatImportSuccess({ profiles: 1, runs: 3, skipped: 0 })).toBe(
      'Sauvegarde importée : 1 enfant(s), 3 partie(s).',
    );
  });

  it('ajoute le nombre de lignes ignorées quand skipped > 0', () => {
    expect(formatImportSuccess({ profiles: 2, runs: 5, skipped: 4 })).toBe(
      'Sauvegarde importée : 2 enfant(s), 5 partie(s). 4 enregistrement(s) sans enfant correspondant ont été ignorés.',
    );
  });
});
