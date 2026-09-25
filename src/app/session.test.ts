import { describe, expect, it } from 'vitest';
import { computeTime, remainingRatio, resumeOrCreateSession, shouldResumeSession } from './session';
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

describe('resumeOrCreateSession (F3 : une session par enfant)', () => {
  it("passer par le profil de la fratrie n'écrase pas la session de l'autre enfant : " +
    'A joue 14 min, passe par B 1 min, revient sur A → il reste 1 min à A (limite de 15 min)', () => {
    const t0 = 1_000_000;
    let sessions: Record<string, SessionState> = {};

    // A joue 14 minutes d'affilée.
    const sessionA = resumeOrCreateSession(sessions, 'A', t0);
    const afterA: SessionState = { ...sessionA, activeSeconds: 14 * 60, lastActiveAt: t0 + 14 * 60 * 1000 };
    sessions = { ...sessions, A: afterA };

    // B joue 1 minute (nouvelle session : rien enregistré pour B jusque-là).
    const tB = t0 + 14 * 60 * 1000 + 5000;
    const sessionB = resumeOrCreateSession(sessions, 'B', tB);
    expect(sessionB).toEqual({ profileId: 'B', startedAt: tB, activeSeconds: 0, lastActiveAt: tB });
    const afterB: SessionState = { ...sessionB, activeSeconds: 60, lastActiveAt: tB + 60 * 1000 };
    sessions = { ...sessions, B: afterB };

    // Retour sur A, peu après (bien avant les 10 min de la fenêtre de reprise) : sa session reprend telle quelle.
    const tBackToA = tB + 60 * 1000 + 2000;
    const resumedA = resumeOrCreateSession(sessions, 'A', tBackToA);
    expect(resumedA.activeSeconds).toBe(14 * 60);

    const remaining = computeTime(profile(15, null), usage(0), resumedA).sessionRemainingSec;
    expect(remaining).toBe(60); // il reste 1 min à A, indépendant de ce que B a joué entre-temps
  });

  it('aucune session existante pour ce profil : en ouvre une neuve à 0', () => {
    const now = 500_000;
    expect(resumeOrCreateSession({}, 'A', now)).toEqual({
      profileId: 'A',
      startedAt: now,
      activeSeconds: 0,
      lastActiveAt: now,
    });
  });

  it('activité trop ancienne (≥ 10 min) : en ouvre une neuve à 0 plutôt que de reprendre', () => {
    const sessions: Record<string, SessionState> = { A: session(600, 1_000_000) };
    const now = 1_000_000 + 11 * 60 * 1000;
    expect(resumeOrCreateSession(sessions, 'A', now)).toEqual({
      profileId: 'A',
      startedAt: now,
      activeSeconds: 0,
      lastActiveAt: now,
    });
  });
});
