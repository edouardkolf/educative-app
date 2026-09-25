// Parties : cycle de vie (démarrage, manches, fin, abandon) et clôture des parties orphelines.
import { getDB } from './db';
import type { EndReason, RoundRecord, Run } from './types';

/** Démarre une partie (status "in_progress"). `replay` est calculé par l'appelant. */
export async function startRun(input: {
  profileId: string;
  levelId: string;
  trackId: string;
  replay: boolean;
}): Promise<Run> {
  const db = await getDB();
  const run: Run = {
    id: crypto.randomUUID(),
    profileId: input.profileId,
    levelId: input.levelId,
    trackId: input.trackId,
    startedAt: Date.now(),
    endedAt: null,
    status: 'in_progress',
    endReason: null,
    replay: input.replay,
    rounds: [],
    stars: 0,
  };
  await db.put('runs', run);
  return run;
}

/** Ajoute le résultat d'une manche à une partie en cours (écrit immédiatement). */
export async function recordRound(runId: string, round: RoundRecord): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('runs', 'readwrite');
  const run = await tx.store.get(runId);
  if (run) {
    await tx.store.put({ ...run, rounds: [...run.rounds, round] });
  }
  await tx.done;
}

/** N'agit que sur une partie "in_progress" ; sinon renvoie la partie telle quelle, sans exception. */
export async function completeRun(runId: string, stars: 1 | 2 | 3): Promise<Run> {
  const db = await getDB();
  const tx = db.transaction('runs', 'readwrite');
  const run = await tx.store.get(runId);
  if (!run) {
    await tx.done;
    throw new Error(`completeRun: partie introuvable (${runId})`);
  }
  if (run.status !== 'in_progress') {
    await tx.done;
    return run;
  }
  const updated: Run = { ...run, status: 'completed', endedAt: Date.now(), stars };
  await tx.store.put(updated);
  await tx.done;
  return updated;
}

/** N'agit que sur une partie "in_progress" ; sinon laisse l'état tel quel, sans exception. */
export async function abandonRun(runId: string, reason: EndReason): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('runs', 'readwrite');
  const run = await tx.store.get(runId);
  if (run && run.status === 'in_progress') {
    await tx.store.put({ ...run, status: 'abandoned', endedAt: Date.now(), endReason: reason });
  }
  await tx.done;
}

/**
 * À appeler au démarrage de l'app : toute partie restée "in_progress" devient
 * "abandoned" avec endReason "closed" (endedAt = startedAt + somme des durées de manches).
 * Renvoie le nombre de parties clôturées.
 */
export async function closeStaleRuns(): Promise<number> {
  const db = await getDB();
  const tx = db.transaction('runs', 'readwrite');
  let count = 0;
  let cursor = await tx.store.openCursor();
  while (cursor) {
    const run = cursor.value;
    if (run.status === 'in_progress') {
      const durationMs = run.rounds.reduce((sum, round) => sum + round.durationMs, 0);
      await cursor.update({
        ...run,
        status: 'abandoned',
        endReason: 'closed',
        endedAt: run.startedAt + durationMs,
      });
      count += 1;
    }
    cursor = await cursor.continue();
  }
  await tx.done;
  return count;
}

/** Parties d'un profil, triées par date de début croissante. */
export async function listRuns(profileId: string): Promise<Run[]> {
  const db = await getDB();
  const runs = await db.getAllFromIndex('runs', 'profileId', profileId);
  return runs.sort((a, b) => a.startedAt - b.startedAt);
}
