import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetStorageForTests } from './test-helpers';
import { getSettings, isPersisted, requestPersistence, updateSettings } from './index';
import { isLockStale } from './settings';
import type { LockState } from './types';

beforeEach(async () => {
  await resetStorageForTests();
});

describe('réglages', () => {
  it('valeurs par défaut quand rien n\'est encore enregistré', async () => {
    expect(await getSettings()).toEqual({
      pinHash: null,
      pinSalt: null,
      soundOn: true,
      sessions: {},
      lock: null,
    });
  });

  it('updateSettings fusionne superficiellement dans les réglages existants', async () => {
    await updateSettings({ pinHash: 'abc', pinSalt: 'salt' });
    const afterPin = await updateSettings({ soundOn: false });
    expect(afterPin).toEqual({ pinHash: 'abc', pinSalt: 'salt', soundOn: false, sessions: {}, lock: null });

    const session = { profileId: 'p1', startedAt: 1, activeSeconds: 0, lastActiveAt: 1 };
    const afterSession = await updateSettings({ sessions: { p1: session } });
    // Un patch partiel ne doit pas effacer les autres champs (fusion superficielle, pas de reset).
    expect(afterSession).toEqual({
      pinHash: 'abc',
      pinSalt: 'salt',
      soundOn: false,
      sessions: { p1: session },
      lock: null,
    });
  });

  describe('verrou de l\'écran de fin et changement de jour', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    const lockAt = (date: Date): LockState => ({ reason: 'session', profileId: 'p1', lockedAt: date.getTime() });

    it('isLockStale : périmé seulement si posé un autre jour local', () => {
      const evening = new Date(2026, 9, 28, 23, 50);
      expect(isLockStale(null, evening.getTime())).toBe(false);
      expect(isLockStale(lockAt(evening), new Date(2026, 9, 28, 23, 59).getTime())).toBe(false);
      expect(isLockStale(lockAt(evening), new Date(2026, 9, 29, 0, 1).getTime())).toBe(true);
      expect(isLockStale(lockAt(evening), new Date(2026, 9, 29, 8, 0).getTime())).toBe(true);
    });

    it('un verrou du jour est conservé', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date(2026, 9, 29, 18, 0));
      const lock = lockAt(new Date(2026, 9, 29, 17, 30));
      await updateSettings({ lock });
      expect((await getSettings()).lock).toEqual(lock);
    });

    it('un verrou de la veille est levé à la lecture, et ce de façon persistée', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date(2026, 9, 28, 19, 0));
      await updateSettings({ pinHash: 'abc', soundOn: false, lock: lockAt(new Date(2026, 9, 28, 18, 55)) });

      vi.setSystemTime(new Date(2026, 9, 29, 8, 0));
      const settings = await getSettings();
      expect(settings.lock).toBeNull();
      // Les autres réglages ne bougent pas.
      expect(settings.pinHash).toBe('abc');
      expect(settings.soundOn).toBe(false);

      // Persisté : une relecture directe ne retrouve pas le verrou.
      vi.setSystemTime(new Date(2026, 9, 29, 8, 5));
      expect((await getSettings()).lock).toBeNull();
    });
  });

  it('requestPersistence / isPersisted ne lèvent jamais (false hors navigateur)', async () => {
    expect(await requestPersistence()).toBe(false);
    expect(await isPersisted()).toBe(false);
  });
});
