// Tests de la logique pure de la fin douce (docs/specs/HUB.md §4.4, arbitrage A4). `useSoftEnd`
// lui-même dépend de Preact et du DOM ; `decideSoftEnd` et `exitReasonFor` en sont le cœur testable.
import { describe, expect, it } from 'vitest';
import { decideSoftEnd, exitReasonFor, SOFT_END_MAX_MS } from './useSoftEnd';

describe('decideSoftEnd', () => {
  it("temps non écoulé : rien ne se passe, seenAt reste inchangé", () => {
    const decision = decideSoftEnd({ timeUp: false, busy: false, ended: false, seenAt: null, now: 1000 });
    expect(decision).toEqual({ end: false, retryInMs: null, seenAt: null });
  });

  it('déjà terminé : rien ne se passe même si le temps est écoulé', () => {
    const decision = decideSoftEnd({ timeUp: true, busy: false, ended: true, seenAt: 500, now: 1000 });
    expect(decision).toEqual({ end: false, retryInMs: null, seenAt: 500 });
  });

  it('temps écoulé et pas occupé : fin immédiate', () => {
    const decision = decideSoftEnd({ timeUp: true, busy: false, ended: false, seenAt: null, now: 1000 });
    expect(decision.end).toBe(true);
    expect(decision.retryInMs).toBeNull();
    expect(decision.seenAt).toBe(1000); // mémorisé pour la première fois
  });

  it('temps écoulé et occupé : attend, avec le délai maximal depuis le premier instant vu', () => {
    const decision = decideSoftEnd({ timeUp: true, busy: true, ended: false, seenAt: null, now: 1000 });
    expect(decision.end).toBe(false);
    expect(decision.retryInMs).toBe(SOFT_END_MAX_MS);
    expect(decision.seenAt).toBe(1000);
  });

  it("le délai n'est jamais remis à zéro : il se compte depuis le premier instant mémorisé", () => {
    const decision = decideSoftEnd({ timeUp: true, busy: true, ended: false, seenAt: 1000, now: 1000 + 40_000 });
    expect(decision.retryInMs).toBe(SOFT_END_MAX_MS - 40_000);
    expect(decision.seenAt).toBe(1000);
  });

  it('le délai est borné à 0, jamais négatif, une fois dépassé', () => {
    const decision = decideSoftEnd({ timeUp: true, busy: true, ended: false, seenAt: 1000, now: 1000 + 90_000 });
    expect(decision.retryInMs).toBe(0);
  });

  it('busy repasse à faux après avoir attendu : fin immédiate, seenAt conservé', () => {
    const decision = decideSoftEnd({ timeUp: true, busy: false, ended: false, seenAt: 1000, now: 1000 + 10_000 });
    expect(decision.end).toBe(true);
    expect(decision.retryInMs).toBeNull();
    expect(decision.seenAt).toBe(1000);
  });
});

describe('exitReasonFor', () => {
  it("temps écoulé : 'time-up' (une interruption, pas un abandon)", () => {
    expect(exitReasonFor(true)).toBe('time-up');
  });

  it("sinon : 'quit'", () => {
    expect(exitReasonFor(false)).toBe('quit');
  });
});
