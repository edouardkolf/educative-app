import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { getDB } from './db';
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
    sessions: { [profile.id]: { profileId: profile.id, startedAt: 1, activeSeconds: 1, lastActiveAt: 1 } },
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

    expect(result).toEqual({ ok: true, profiles: 1, runs: 1, skipped: 0 });
    expect(await listProfiles()).toEqual(before.profiles);
    expect(await listRuns(profile.id)).toEqual(before.runs);
    expect(await listOverrides(profile.id)).toEqual(before.overrides);
    expect(await getUsage(profile.id, '2026-09-25')).toEqual(before.usage);
  });

  it('conserve le code parent et remet sessions/lock à vide/null', async () => {
    const profile = await seed();
    const bundle = await exportAll();
    // Le code parent et la session/l'écran de fin ne quittent jamais l'export.
    expect('pinHash' in bundle).toBe(false);
    expect('sessions' in bundle).toBe(false);
    expect('lock' in bundle).toBe(false);
    void profile;

    await importAll(bundle);

    const settings = await getSettings();
    expect(settings.pinHash).toBe('hash');
    expect(settings.pinSalt).toBe('salt');
    expect(settings.soundOn).toBe(false);
    expect(settings.sessions).toEqual({});
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

describe('F11 : validation de l\'import', () => {
  it('refuse une limite hors 1-600 ou non entière, accepte null', async () => {
    await seed();
    const bundle = await exportAll();
    const [seedProfile] = bundle.profiles;
    if (!seedProfile) throw new Error('seed invalide');

    for (const bad of [0, 601, -1, 1.5, 'dix']) {
      const broken = { ...seedProfile, limits: { sessionMinutes: bad, dailyMinutes: null } };
      expect(await importAll({ ...bundle, profiles: [broken] })).toMatchObject({ ok: false });
    }
    const ok = { ...seedProfile, limits: { sessionMinutes: null, dailyMinutes: 600 } };
    expect(await importAll({ ...bundle, profiles: [ok] })).toMatchObject({ ok: true });
  });

  it('refuse un jour qui ne suit pas AAAA-MM-JJ', async () => {
    await seed();
    const bundle = await exportAll();
    const [seedUsage] = bundle.usage;
    if (!seedUsage) throw new Error('seed invalide');

    const broken = { ...seedUsage, day: '25/09/2026' };
    expect(await importAll({ ...bundle, usage: [broken] })).toMatchObject({ ok: false });
  });

  it('refuse deux profils (ou deux parties) partageant le même id', async () => {
    await seed();
    const bundle = await exportAll();
    const [seedProfile] = bundle.profiles;
    if (!seedProfile) throw new Error('seed invalide');

    const duplicated = [seedProfile, { ...seedProfile, name: 'Doublon' }];
    expect(await importAll({ ...bundle, profiles: duplicated })).toMatchObject({ ok: false });
  });
});

describe('F2 : lignes orphelines (enfant absent de la sauvegarde)', () => {
  it("exportAll n'exporte jamais les parties/réglages/temps d'un profil qui n'existe plus", async () => {
    const profile = await seed();
    const raw = await getDB();
    // Écrit directement une ligne orpheline (contournant deleteProfile), comme le ferait un profil
    // resté en mémoire après suppression (F2) : exportAll doit s'en protéger.
    await raw.put('runs', {
      id: 'orphan-run',
      profileId: 'profil-supprime',
      levelId: 'ms-suite-01',
      trackId: 'ms',
      startedAt: 1,
      endedAt: 2,
      status: 'completed',
      endReason: null,
      replay: false,
      rounds: [],
      stars: 1,
    });

    const bundle = await exportAll();

    expect(bundle.runs.some((run) => run.profileId === 'profil-supprime')).toBe(false);
    expect(bundle.profiles.map((p) => p.id)).toEqual([profile.id]);
  });

  it('ignore un run orphelin plutôt que de refuser tout l\'import, et le compte dans `skipped`', async () => {
    const profile = await seed();
    const beforeRuns = await listRuns(profile.id);
    const bundle = await exportAll();

    const result = await importAll({ ...bundle, profiles: [] });

    // L'import réussit : seules les lignes orphelines (ici, toutes puisque `profiles` est vide) sont ignorées.
    expect(result).toEqual({ ok: true, profiles: 0, runs: 0, skipped: bundle.runs.length + bundle.overrides.length + bundle.usage.length });
    expect(await listProfiles()).toEqual([]);
    // Les anciennes données du profil (avant cet import) ont bien été remplacées, pas conservées.
    expect(await listRuns(profile.id)).not.toEqual(beforeRuns);
    expect(await listRuns(profile.id)).toEqual([]);
  });

  it('un import mixte garde les lignes rattachées à un profil importé et ignore les autres', async () => {
    const keep = await saveProfile({
      name: 'Garde',
      avatar: '🐸',
      trackId: 'ms',
      limits: { sessionMinutes: null, dailyMinutes: null },
    });
    const keepRun = await startRun({ profileId: keep.id, levelId: 'ms-suite-01', trackId: 'ms', replay: false });
    const bundle = await exportAll();
    const orphanRun = { ...keepRun, id: 'orphan-run-2', profileId: 'profil-inconnu' };

    const result = await importAll({ ...bundle, runs: [...bundle.runs, orphanRun] });

    expect(result).toEqual({ ok: true, profiles: 1, runs: 1, skipped: 1 });
    expect((await listRuns(keep.id)).map((r) => r.id)).toEqual([keepRun.id]);
    expect(await listRuns('profil-inconnu')).toEqual([]);
  });
});
