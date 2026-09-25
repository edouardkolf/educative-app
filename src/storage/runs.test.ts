import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { resetStorageForTests } from './test-helpers';
import {
  abandonRun,
  closeStaleRuns,
  completeRun,
  listRuns,
  recordRound,
  saveProfile,
  startRun,
  updateSettings,
} from './index';

beforeEach(async () => {
  await resetStorageForTests();
});

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function makeProfile() {
  return saveProfile({
    name: 'Léo',
    avatar: '🦊',
    trackId: 'ms',
    limits: { sessionMinutes: null, dailyMinutes: null },
  });
}

describe('cycle de vie d\'une partie', () => {
  it('start → recordRound × n → complete', async () => {
    const profile = await makeProfile();
    const run = await startRun({ profileId: profile.id, levelId: 'ms-suite-01', trackId: 'ms', replay: false });
    expect(run.status).toBe('in_progress');
    expect(run.replay).toBe(false);
    expect(run.rounds).toEqual([]);
    expect(run.stars).toBe(0);
    expect(run.endedAt).toBeNull();

    for (let i = 0; i < 3; i += 1) {
      await recordRound(run.id, { index: i, taps: i === 1 ? 2 : 1, firstTry: i !== 1, durationMs: 500 + i * 10 });
    }

    const completed = await completeRun(run.id, 3);
    expect(completed.status).toBe('completed');
    expect(completed.endReason).toBeNull();
    expect(completed.stars).toBe(3);
    expect(completed.rounds).toHaveLength(3);
    expect(completed.rounds.map((r) => r.index)).toEqual([0, 1, 2]);
    expect(completed.endedAt).not.toBeNull();

    const [stored] = await listRuns(profile.id);
    expect(stored).toEqual(completed);
  });

  it('completeRun ne modifie plus une partie déjà terminée (sans exception)', async () => {
    const profile = await makeProfile();
    const run = await startRun({ profileId: profile.id, levelId: 'ms-suite-01', trackId: 'ms', replay: false });
    const completed = await completeRun(run.id, 2);

    const again = await completeRun(run.id, 3);

    expect(again).toEqual(completed);
  });
});

describe('abandon', () => {
  it('marque la partie abandonnée avec la raison donnée', async () => {
    const profile = await makeProfile();
    const run = await startRun({ profileId: profile.id, levelId: 'ms-suite-01', trackId: 'ms', replay: false });

    await abandonRun(run.id, 'quit');

    const [stored] = await listRuns(profile.id);
    expect(stored?.status).toBe('abandoned');
    expect(stored?.endReason).toBe('quit');
    expect(stored?.endedAt).not.toBeNull();
  });

  it('est idempotent : un second abandon ne change rien', async () => {
    const profile = await makeProfile();
    const run = await startRun({ profileId: profile.id, levelId: 'ms-suite-01', trackId: 'ms', replay: false });

    await abandonRun(run.id, 'quit');
    const [first] = await listRuns(profile.id);
    await abandonRun(run.id, 'time-up');
    const [second] = await listRuns(profile.id);

    expect(second).toEqual(first);
    expect(second?.endReason).toBe('quit');
  });

  it('n\'agit pas sur une partie déjà terminée', async () => {
    const profile = await makeProfile();
    const run = await startRun({ profileId: profile.id, levelId: 'ms-suite-01', trackId: 'ms', replay: false });
    const completed = await completeRun(run.id, 1);

    await abandonRun(run.id, 'quit');

    const [stored] = await listRuns(profile.id);
    expect(stored).toEqual(completed);
  });
});

describe('closeStaleRuns', () => {
  it('clôture les parties en cours : endedAt = startedAt + somme des durées de manches', async () => {
    const profile = await makeProfile();
    const run = await startRun({ profileId: profile.id, levelId: 'ms-suite-01', trackId: 'ms', replay: false });
    await recordRound(run.id, { index: 0, taps: 1, firstTry: true, durationMs: 1000 });
    await recordRound(run.id, { index: 1, taps: 2, firstTry: false, durationMs: 2500 });

    const closedCount = await closeStaleRuns();

    expect(closedCount).toBe(1);
    const [stored] = await listRuns(profile.id);
    expect(stored?.status).toBe('abandoned');
    expect(stored?.endReason).toBe('closed');
    expect(stored?.endedAt).toBe(run.startedAt + 3500);
  });

  it('ne touche pas les parties terminées et renvoie 0 si rien à clôturer', async () => {
    const profile = await makeProfile();
    const run = await startRun({ profileId: profile.id, levelId: 'ms-suite-01', trackId: 'ms', replay: false });
    const completed = await completeRun(run.id, 2);

    expect(await closeStaleRuns()).toBe(0);
    const [stored] = await listRuns(profile.id);
    expect(stored).toEqual(completed);
  });

  it("F6 : endReason \"time-up\" si une fin douce de CE profil était en cours (lockedAt ≥ startedAt)", async () => {
    const profile = await makeProfile();
    const run = await startRun({ profileId: profile.id, levelId: 'ms-suite-01', trackId: 'ms', replay: false });
    await updateSettings({ lock: { reason: 'session', profileId: profile.id, lockedAt: run.startedAt + 10 } });

    await closeStaleRuns();

    const [stored] = await listRuns(profile.id);
    expect(stored?.endReason).toBe('time-up');
  });

  it('F6 : endReason "closed" si le verrou concerne un autre profil ou date d\'avant le début de la partie', async () => {
    const profile = await makeProfile();
    const other = await saveProfile({
      name: 'Mia',
      avatar: '🐼',
      trackId: 'ms',
      limits: { sessionMinutes: null, dailyMinutes: null },
    });
    const run = await startRun({ profileId: profile.id, levelId: 'ms-suite-01', trackId: 'ms', replay: false });
    // Verrou d'un AUTRE profil : ne doit pas influencer cette partie.
    await updateSettings({ lock: { reason: 'session', profileId: other.id, lockedAt: run.startedAt + 10 } });
    await closeStaleRuns();
    expect((await listRuns(profile.id))[0]?.endReason).toBe('closed');

    // Verrou du même profil mais déclenché AVANT le début de cette partie (fin douce déjà terminée).
    const run2 = await startRun({ profileId: profile.id, levelId: 'ms-suite-02', trackId: 'ms', replay: false });
    await updateSettings({ lock: { reason: 'session', profileId: profile.id, lockedAt: run2.startedAt - 10 } });
    await closeStaleRuns();
    const [, stored2] = await listRuns(profile.id);
    expect(stored2?.endReason).toBe('closed');
  });
});

describe('recordRound (F6)', () => {
  it("n'ajoute une manche qu'à une partie in_progress", async () => {
    const profile = await makeProfile();
    const run = await startRun({ profileId: profile.id, levelId: 'ms-suite-01', trackId: 'ms', replay: false });
    await completeRun(run.id, 1);

    await recordRound(run.id, { index: 0, taps: 1, firstTry: true, durationMs: 500 });

    const [stored] = await listRuns(profile.id);
    expect(stored?.rounds).toEqual([]);
  });
});

describe('listRuns', () => {
  it('trie les parties par startedAt croissant', async () => {
    const profile = await makeProfile();
    const first = await startRun({ profileId: profile.id, levelId: 'a', trackId: 'ms', replay: false });
    await wait(5);
    const second = await startRun({ profileId: profile.id, levelId: 'b', trackId: 'ms', replay: false });
    await wait(5);
    const third = await startRun({ profileId: profile.id, levelId: 'c', trackId: 'ms', replay: false });

    const runs = await listRuns(profile.id);

    expect(runs.map((r) => r.id)).toEqual([first.id, second.id, third.id]);
  });
});
