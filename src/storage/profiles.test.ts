import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { resetStorageForTests } from './test-helpers';
import {
  addActiveSeconds,
  deleteProfile,
  getProfile,
  getSettings,
  getUsage,
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

const newProfile = () => ({
  name: 'Léo',
  avatar: '🦊',
  trackId: 'ms',
  limits: { sessionMinutes: null, dailyMinutes: null },
});

describe('profils : CRUD', () => {
  it('crée un profil avec id et createdAt générés', async () => {
    const created = await saveProfile(newProfile());
    expect(created.id).toBeTruthy();
    expect(created.createdAt).toBeGreaterThan(0);
    expect(await listProfiles()).toEqual([created]);
  });

  it('met à jour un profil existant en conservant createdAt', async () => {
    const created = await saveProfile(newProfile());
    const updated = await saveProfile({ ...created, name: 'Léa' });

    expect(updated.id).toBe(created.id);
    expect(updated.createdAt).toBe(created.createdAt);
    expect(updated.name).toBe('Léa');
    expect(await listProfiles()).toEqual([updated]);
  });

  it('getProfile renvoie undefined pour un id inconnu', async () => {
    expect(await getProfile('inconnu')).toBeUndefined();
  });

  it('liste plusieurs profils', async () => {
    const a = await saveProfile(newProfile());
    const b = await saveProfile({ ...newProfile(), name: 'Mia' });
    const all = await listProfiles();
    expect(all).toHaveLength(2);
    expect(all.map((p) => p.id).sort()).toEqual([a.id, b.id].sort());
  });
});

describe('deleteProfile : suppression en cascade', () => {
  it('supprime le profil, ses parties, ses réglages de niveaux et son temps de jeu ; ' +
    'remet session/lock à null s\'ils concernaient ce profil ; laisse les autres profils intacts', async () => {
    const profile = await saveProfile(newProfile());
    const other = await saveProfile({ ...newProfile(), name: 'Mia' });

    await startRun({ profileId: profile.id, levelId: 'ms-suite-01', trackId: 'ms', replay: false });
    await setOverride(profile.id, 'ms-suite-02', 'unlocked');
    await addActiveSeconds(profile.id, '2026-09-25', 120);
    await updateSettings({
      session: { profileId: profile.id, startedAt: Date.now(), activeSeconds: 0, lastActiveAt: Date.now() },
      lock: { reason: 'session', profileId: profile.id, lockedAt: Date.now() },
    });

    const otherRun = await startRun({ profileId: other.id, levelId: 'ms-suite-01', trackId: 'ms', replay: false });

    await deleteProfile(profile.id);

    expect(await getProfile(profile.id)).toBeUndefined();
    expect(await listRuns(profile.id)).toEqual([]);
    expect(await listOverrides(profile.id)).toEqual([]);
    expect((await getUsage(profile.id, '2026-09-25')).activeSeconds).toBe(0);

    const settings = await getSettings();
    expect(settings.session).toBeNull();
    expect(settings.lock).toBeNull();

    // Le profil non concerné garde ses données.
    expect(await getProfile(other.id)).toEqual(other);
    expect(await listRuns(other.id)).toEqual([otherRun]);
  });

  it('ne remet pas session/lock à null s\'ils concernent un autre profil', async () => {
    const profile = await saveProfile(newProfile());
    const other = await saveProfile({ ...newProfile(), name: 'Mia' });
    const session = { profileId: other.id, startedAt: Date.now(), activeSeconds: 0, lastActiveAt: Date.now() };
    await updateSettings({ session });

    await deleteProfile(profile.id);

    expect((await getSettings()).session).toEqual(session);
  });
});
