import { describe, expect, it } from 'vitest';
import { formatDateTime, formatDuration, formatPercentage } from './format';

describe('formatPercentage', () => {
  it('arrondit un taux en pourcentage', () => {
    expect(formatPercentage(0)).toBe('0 %');
    expect(formatPercentage(1)).toBe('100 %');
    expect(formatPercentage(0.5)).toBe('50 %');
    expect(formatPercentage(2 / 3)).toBe('67 %');
  });

  it('affiche un tiret quand aucune manche n\'a été jouée', () => {
    expect(formatPercentage(null)).toBe('—');
  });
});

describe('formatDuration', () => {
  it('affiche les secondes seules sous la minute', () => {
    expect(formatDuration(0)).toBe('0 s');
    expect(formatDuration(45_000)).toBe('45 s');
  });

  it('affiche minutes et secondes sur deux chiffres au-delà', () => {
    expect(formatDuration(65_000)).toBe('1 min 05 s');
    expect(formatDuration(125_300)).toBe('2 min 05 s');
    expect(formatDuration(600_000)).toBe('10 min 00 s');
  });
});

describe('formatDateTime', () => {
  it('formate une date locale courte avec heure', () => {
    const ms = new Date(2026, 0, 15, 9, 5).getTime();
    expect(formatDateTime(ms)).toBe('15/01/2026 09:05');
  });

  it('affiche un tiret quand la partie n\'a jamais été jouée', () => {
    expect(formatDateTime(null)).toBe('—');
  });
});
