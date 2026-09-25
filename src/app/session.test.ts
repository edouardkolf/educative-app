import { describe, expect, it } from 'vitest';
import { computeTime, remainingRatio, shouldResumeSession } from './session';
import type { Profile, SessionState, UsageDay } from '../storage/types';

function profile(sessionMinutes: number | null, dailyMinutes: number | null): Profile {
  return {
    id: 'p1',
    name: 'Lina',
    avatar: '🦊',
    trackId: 'ms',
    limits: { sessionMinutes, dailyMinutes },
    createdAt: 0,
  };
}

function usage(activeSeconds: number, extraMinutes = 0): UsageDay {
  return { profileId: 'p1', day: '2026-09-25', activeSeconds, extraMinutes };
}

function session(activeSeconds: number, lastActiveAt = 0): SessionState {
  return { profileId: 'p1', startedAt: 0, activeSeconds, lastActiveAt };
}

describe('computeTime', () => {
  it('aucune limite : tout est null', () => {
    expect(computeTime(profile(null, null), usage(999), session(999))).toEqual({
      sessionRemainingSec: null,
      dailyRemainingSec: null,
      timeUp: null,
    });
  });

  it('limite de session seule, en cours', () => {
    const status = computeTime(profile(15, null), usage(0), session(300));
    expect(status).toEqual({ sessionRemainingSec: 600, dailyRemainingSec: null, timeUp: null });
  });

  it('limite de session atteinte pile', () => {
    const status = computeTime(profile(15, null), usage(0), session(900));
    expect(status).toEqual({ sessionRemainingSec: 0, dailyRemainingSec: null, timeUp: 'session' });
  });

  it('limite de session dépassée : reste bornée à 0, jamais négative', () => {
    const status = computeTime(profile(15, null), usage(0), session(1000));
    expect(status.sessionRemainingSec).toBe(0);
    expect(status.timeUp).toBe('session');
  });

  it('pas de session en cours (null) : activeSeconds traité comme 0', () => {
    const status = computeTime(profile(15, null), usage(0), null);
    expect(status.sessionRemainingSec).toBe(900);
    expect(status.timeUp).toBeNull();
  });

  it('quota du jour : minutes bonus incluses dans le total', () => {
    const status = computeTime(profile(null, 30), usage(1700, 5), null);
    // (30 + 5) * 60 - 1700 = 400
    expect(status).toEqual({ sessionRemainingSec: null, dailyRemainingSec: 400, timeUp: null });
  });

  it('quota du jour atteint', () => {
    const status = computeTime(profile(null, 30), usage(1800), null);
    expect(status.dailyRemainingSec).toBe(0);
    expect(status.timeUp).toBe('daily');
  });

  it('session ET jour définis, seule la session est épuisée', () => {
    const status = computeTime(profile(15, 30), usage(200), session(900));
    expect(status.sessionRemainingSec).toBe(0);
    expect(status.dailyRemainingSec).toBe(1600);
    expect(status.timeUp).toBe('session');
  });

  it('les deux atteints en même temps : le quota du jour prime', () => {
    const status = computeTime(profile(15, 30), usage(1800), session(900));
    expect(status.sessionRemainingSec).toBe(0);
    expect(status.dailyRemainingSec).toBe(0);
    expect(status.timeUp).toBe('daily');
  });

  it('jour épuisé mais session encore valide : le quota du jour prime quand même', () => {
    const status = computeTime(profile(15, 30), usage(1800), session(100));
    expect(status.sessionRemainingSec).toBe(800);
    expect(status.dailyRemainingSec).toBe(0);
    expect(status.timeUp).toBe('daily');
  });
});

describe('shouldResumeSession', () => {
  it('aucune session en cours : ne reprend pas', () => {
    expect(shouldResumeSession(null, 'p1', 1_000_000)).toBe(false);
  });

  it('profil différent : ne reprend pas', () => {
    expect(shouldResumeSession(session(10, 1_000_000), 'p2', 1_000_500)).toBe(false);
  });

  it('même profil, activité récente : reprend', () => {
    expect(shouldResumeSession(session(10, 1_000_000), 'p1', 1_000_000 + 5 * 60 * 1000)).toBe(true);
  });

  it('même profil, exactement 10 min : ne reprend plus (strictement moins de 10 min)', () => {
    expect(shouldResumeSession(session(10, 1_000_000), 'p1', 1_000_000 + 10 * 60 * 1000)).toBe(false);
  });

  it('même profil, plus de 10 min : ne reprend pas', () => {
    expect(shouldResumeSession(session(10, 1_000_000), 'p1', 1_000_000 + 11 * 60 * 1000)).toBe(false);
  });
});

describe('remainingRatio', () => {
  it('aucune limite : null', () => {
    expect(remainingRatio(profile(null, null), usage(0), null)).toBeNull();
  });

  it('seule la session est limitée, moitié consommée', () => {
    expect(remainingRatio(profile(10, null), usage(0), session(300))).toBeCloseTo(0.5);
  });

  it('seul le jour est limité, minutes bonus incluses dans le total', () => {
    // total = (10 + 10) * 60 = 1200 ; restant = 1200 - 600 = 600 → 0.5
    expect(remainingRatio(profile(null, 10), usage(600, 10), null)).toBeCloseTo(0.5);
  });

  it('les deux limites définies : garde la plus contraignante (le plus petit ratio)', () => {
    // session : 900 restant / 900 total = 1.0 ; jour : 300 restant / 1800 total ≈ 0.167
    const ratio = remainingRatio(profile(15, 30), usage(1500), session(0));
    expect(ratio).toBeCloseTo(300 / 1800);
  });

  it('limite épuisée : 0', () => {
    expect(remainingRatio(profile(15, null), usage(0), session(900))).toBe(0);
  });
});
