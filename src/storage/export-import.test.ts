import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { getDB } from './db';
import { resetStorageForTests } from './test-helpers';
import {
  EXPORT_FORMAT,
  EXPORT_VERSION,
  addActiveSeconds,
  completeColoring,
  completeDictation,
  completeRun,
  exportAll,
  getSettings,
  getUsage,
  importAll,
  listColorings,
  listDictations,
  listOverrides,
  listProfiles,
  listRuns,
  recordPaint,
  saveDictationItem,
  saveProfile,
  setOverride,
  startColoring,
  startDictation,
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
  await addActiveSeconds(profile.id, '2026-09-25', 90, 'map');
  await updateSettings({
    pinHash: 'hash',
    pinSalt: 'salt',
    soundOn: false,
    sessions: { [profile.id]: { profileId: profile.id, startedAt: 1, activeSeconds: 1, lastActiveAt: 1 } },
    lock: { reason: 'daily', profileId: profile.id, lockedAt: 1 },
  });

  const dictation = await startDictation(profile.id, {
    seriesId: 's1',
    seed: 1,
    words: [{ wordId: 'chat', seriesId: 's1', sentenceIndex: 0 }],
  });
  await saveDictationItem(dictation.id, {
    index: 0,
    wordId: 'chat',
    expected: 'chat',
    typed: 'chat',
    firstTry: true,
    copyDone: true,
    copyMistakes: 0,
    wordReplays: 0,
    sentenceReplays: 0,
    answerMs: 1000,
    durationMs: 1200,
  });
  await completeDictation(dictation.id);

  const coloring = await startColoring(profile.id, {
    drawingId: 'house',
    tier: 1,
    detail: 1,
    variantSeed: 1,
    zones: [{ id: 'z1', target: 'red' }],
    legend: null,
    paintedAtStart: [],
    missesAtStart: {},
  });
  await recordPaint(
    coloring.id,
    { zoneId: 'z1', paint: 'red', drops: ['red'], fresh: true, help: 0, at: 100 },
    100,
  );
  await completeColoring(coloring.id, 100);

  return profile;
}

describe('export → import', () => {
  it('aller-retour v2 : les données (dont les parties de jeu) reviennent identiques', async () => {
    const profile = await seed();
    const bundle = await exportAll();

    expect(bundle.format).toBe(EXPORT_FORMAT);
    expect(bundle.version).toBe(EXPORT_VERSION);
    expect(bundle.settings).toEqual({ soundOn: false });
    expect(bundle.dictations).toHaveLength(1);
    expect(bundle.colorings).toHaveLength(1);

    const before = {
      profiles: await listProfiles(),
      runs: await listRuns(profile.id),
      overrides: await listOverrides(profile.id),
      usage: await getUsage(profile.id, '2026-09-25'),
      dictations: await listDictations(profile.id),
      colorings: await listColorings(profile.id),
    };

    const result = await importAll(bundle);

    expect(result).toEqual({ ok: true, profiles: 1, runs: 1, gameRecords: 2, skipped: 0 });
    expect(await listProfiles()).toEqual(before.profiles);
    expect(await listRuns(profile.id)).toEqual(before.runs);
    expect(await listOverrides(profile.id)).toEqual(before.overrides);
    expect(await getUsage(profile.id, '2026-09-25')).toEqual(before.usage);
    expect(await listDictations(profile.id)).toEqual(before.dictations);
    expect(await listColorings(profile.id)).toEqual(before.colorings);
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

  it('un fichier v1 (sans dictations/colorings) est accepté, avec 0 partie de jeu', async () => {
    await seed();
    const bundle = await exportAll();
    const { dictations: _d, colorings: _c, ...v1Bundle } = bundle;
    void _d;
    void _c;

    const result = await importAll({ ...v1Bundle, version: 1 });

    expect(result).toEqual({ ok: true, profiles: 1, runs: 1, gameRecords: 0, skipped: 0 });
    const [profile] = await listProfiles();
    if (!profile) throw new Error('import invalide');
    expect(await listDictations(profile.id)).toEqual([]);
    expect(await listColorings(profile.id)).toEqual([]);
  });

  it('un fichier v2 sans les tableaux de jeu est refusé', async () => {
    await seed();
    const bundle = await exportAll();
    const { dictations: _d, colorings: _c, ...v2WithoutGames } = bundle;
    void _d;
    void _c;

    expect(await importAll(v2WithoutGames)).toMatchObject({ ok: false });
  });

  it('refuse la version 3 (inconnue)', async () => {
    await seed();
    const bundle = await exportAll();

    expect(await importAll({ ...bundle, version: 3 })).toMatchObject({ ok: false });
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

  it('refuse un `games` invalide (id trop long, doublon)', async () => {
    await seed();
    const bundle = await exportAll();
    const [seedProfile] = bundle.profiles;
    if (!seedProfile) throw new Error('seed invalide');

    const tooLong = { ...seedProfile, games: ['x'.repeat(33)] };
    expect(await importAll({ ...bundle, profiles: [tooLong] })).toMatchObject({ ok: false });

    const duplicated = { ...seedProfile, games: ['dictation', 'dictation'] };
    expect(await importAll({ ...bundle, profiles: [duplicated] })).toMatchObject({ ok: false });

    const ok = { ...seedProfile, games: ['dictation', 'coloring'] };
    expect(await importAll({ ...bundle, profiles: [ok] })).toMatchObject({ ok: true });
  });

  it('refuse un `gameSettings.coloring` invalide', async () => {
    await seed();
    const bundle = await exportAll();
    const [seedProfile] = bundle.profiles;
    if (!seedProfile) throw new Error('seed invalide');

    const broken = { ...seedProfile, gameSettings: { coloring: { tier: 5 } } };
    expect(await importAll({ ...bundle, profiles: [broken] })).toMatchObject({ ok: false });

    const ok = { ...seedProfile, gameSettings: { coloring: { tier: 2 } } };
    expect(await importAll({ ...bundle, profiles: [ok] })).toMatchObject({ ok: true });
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

  it('accepte `activitySeconds` absent ou un objet de nombres finis ≥ 0, refuse sinon', async () => {
    await seed();
    const bundle = await exportAll();
    const [seedUsage] = bundle.usage;
    if (!seedUsage) throw new Error('seed invalide');

    const ok = { ...seedUsage, activitySeconds: { map: 30, hub: 10 } };
    expect(await importAll({ ...bundle, usage: [ok] })).toMatchObject({ ok: true });

    const broken = { ...seedUsage, activitySeconds: { map: -1 } };
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

  it('refuse deux dictées (ou deux coloriages) partageant le même id', async () => {
    await seed();
    const bundle = await exportAll();
    const [seedDictation] = bundle.dictations;
    if (!seedDictation) throw new Error('seed invalide');

    const duplicated = [seedDictation, { ...seedDictation }];
    expect(await importAll({ ...bundle, dictations: duplicated })).toMatchObject({ ok: false });
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
    expect(result).toEqual({
      ok: true,
      profiles: 0,
      runs: 0,
      gameRecords: 0,
      skipped: bundle.runs.length + bundle.overrides.length + bundle.usage.length + bundle.dictations.length +
        bundle.colorings.length,
    });
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

    expect(result).toEqual({ ok: true, profiles: 1, runs: 1, gameRecords: 0, skipped: 1 });
    expect((await listRuns(keep.id)).map((r) => r.id)).toEqual([keepRun.id]);
    expect(await listRuns('profil-inconnu')).toEqual([]);
  });

  it('ignore une dictée ou un coloriage orphelin, et les compte dans `skipped`', async () => {
    const profile = await seed();
    const bundle = await exportAll();
    const [seedDictation] = bundle.dictations;
    if (!seedDictation) throw new Error('seed invalide');
    const orphanDictation = { ...seedDictation, id: 'orphan-dictation', profileId: 'profil-inconnu' };

    const result = await importAll({ ...bundle, dictations: [...bundle.dictations, orphanDictation] });

    expect(result).toMatchObject({ ok: true, skipped: 1 });
    expect(await listDictations(profile.id)).toHaveLength(1);
    expect(await listDictations('profil-inconnu')).toEqual([]);
  });
});
