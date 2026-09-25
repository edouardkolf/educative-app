import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { resetStorageForTests } from './test-helpers';
import {
  EXPORT_FORMAT,
  EXPORT_VERSION,
  addActiveSeconds,
  completeRun,
  exportAll,
  getSettings,
  getUsage,
  importAll,
  listOverrides,
  listProfiles,
  listRuns,
  saveProfile,
  setOverride,
  startRun,
  updateSettings,
} from './index';

beforeEach(async () => {
  await resetStorageForTests();
});

async function seed() {
  const profile = await saveProfile({
    name: 'Léo',
    avatar: '🦊',
    trackId: 'ms',
    limits: { sessionMinutes: 20, dailyMinutes: 45 },
  });
  const run = await startRun({ profileId: profile.id, levelId: 'ms-suite-01', trackId: 'ms', replay: false });
  await completeRun(run.id, 3);
  await setOverride(profile.id, 'ms-suite-02', 'unlocked');
  await addActiveSeconds(profile.id, '2026-09-25', 90);
  await updateSettings({
    pinHash: 'hash',
    pinSalt: 'salt',
    soundOn: false,
    session: { profileId: profile.id, startedAt: 1, activeSeconds: 1, lastActiveAt: 1 },
    lock: { reason: 'daily', profileId: profile.id, lockedAt: 1 },
  });
  return profile;
}

describe('export → import', () => {
  it('aller-retour : les données reviennent identiques', async () => {
    const profile = await seed();
    const bundle = await exportAll();

    expect(bundle.format).toBe(EXPORT_FORMAT);
    expect(bundle.version).toBe(EXPORT_VERSION);
    expect(bundle.settings).toEqual({ soundOn: false });

    const before = {
      profiles: await listProfiles(),
      runs: await listRuns(profile.id),
      overrides: await listOverrides(profile.id),
      usage: await getUsage(profile.id, '2026-09-25'),
    };

    const result = await importAll(bundle);

    expect(result).toEqual({ ok: true, profiles: 1, runs: 1 });
    expect(await listProfiles()).toEqual(before.profiles);
    expect(await listRuns(profile.id)).toEqual(before.runs);
    expect(await listOverrides(profile.id)).toEqual(before.overrides);
    expect(await getUsage(profile.id, '2026-09-25')).toEqual(before.usage);
  });

  it('conserve le code parent et remet session/lock à null', async () => {
    const profile = await seed();
    const bundle = await exportAll();
    // Le code parent et la session/l'écran de fin ne quittent jamais l'export.
    expect('pinHash' in bundle).toBe(false);
    expect('session' in bundle).toBe(false);
    expect('lock' in bundle).toBe(false);
    void profile;

    await importAll(bundle);

    const settings = await getSettings();
    expect(settings.pinHash).toBe('hash');
    expect(settings.pinSalt).toBe('salt');
    expect(settings.soundOn).toBe(false);
    expect(settings.session).toBeNull();
    expect(settings.lock).toBeNull();
  });
});

describe('import invalide : rien n\'est modifié', () => {
  it('refuse un mauvais format', async () => {
    const before = await seed();
    const beforeProfiles = await listProfiles();

    expect(await importAll(null)).toEqual({ ok: false, error: expect.any(String) });
    expect(await importAll('un texte')).toEqual({ ok: false, error: expect.any(String) });
    expect(await importAll({ format: 'autre-chose', version: EXPORT_VERSION })).toMatchObject({ ok: false });

    expect(await listProfiles()).toEqual(beforeProfiles);
    void before;
  });

  it('refuse une version inconnue', async () => {
    await seed();
    const beforeProfiles = await listProfiles();
    const bundle = await exportAll();

    const result = await importAll({ ...bundle, version: 999 });

    expect(result).toMatchObject({ ok: false });
    expect(await listProfiles()).toEqual(beforeProfiles);
  });

  it('refuse un run orphelin (profil absent des profils importés)', async () => {
    const profile = await seed();
    const beforeRuns = await listRuns(profile.id);
    const bundle = await exportAll();

    const result = await importAll({ ...bundle, profiles: [] });

    expect(result).toMatchObject({ ok: false });
    expect(await listRuns(profile.id)).toEqual(beforeRuns);
  });

  it('refuse un champ obligatoire manquant', async () => {
    await seed();
    const beforeProfiles = await listProfiles();
    const bundle = await exportAll();
    const [seedProfile] = bundle.profiles;
    if (!seedProfile) throw new Error('seed invalide');

    const brokenProfile: Record<string, unknown> = { ...seedProfile };
    delete brokenProfile.trackId;

    const result = await importAll({ ...bundle, profiles: [brokenProfile] });

    expect(result).toMatchObject({ ok: false });
    expect(await listProfiles()).toEqual(beforeProfiles);
  });
});
