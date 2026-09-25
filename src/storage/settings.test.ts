import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { resetStorageForTests } from './test-helpers';
import { getSettings, isPersisted, requestPersistence, updateSettings } from './index';

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

  it('requestPersistence / isPersisted ne lèvent jamais (false hors navigateur)', async () => {
    expect(await requestPersistence()).toBe(false);
    expect(await isPersisted()).toBe(false);
  });
});
