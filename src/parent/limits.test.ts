import { describe, expect, it } from 'vitest';
import {
  DAILY_MINUTES_OPTIONS,
  SESSION_MINUTES_OPTIONS,
  limitOptionLabel,
  minutesToSelectValue,
  selectValueToMinutes,
} from './limits';

describe('limitOptionLabel', () => {
  it('affiche « Sans limite » pour null', () => {
    expect(limitOptionLabel(null)).toBe('Sans limite');
  });

  it('affiche la durée en minutes sinon', () => {
    expect(limitOptionLabel(15)).toBe('15 min');
    expect(limitOptionLabel(90)).toBe('90 min');
  });
});

describe('minutesToSelectValue / selectValueToMinutes', () => {
  it('fait l\'aller-retour pour toutes les options proposées', () => {
    for (const minutes of [...SESSION_MINUTES_OPTIONS, ...DAILY_MINUTES_OPTIONS]) {
      expect(selectValueToMinutes(minutesToSelectValue(minutes))).toBe(minutes);
    }
  });

  it('encode « sans limite » en chaîne vide', () => {
    expect(minutesToSelectValue(null)).toBe('');
    expect(selectValueToMinutes('')).toBeNull();
  });

  it('encode une durée en sa représentation numérique', () => {
    expect(minutesToSelectValue(30)).toBe('30');
    expect(selectValueToMinutes('30')).toBe(30);
  });
});
