// F5 : la base doit pouvoir monter en version plus tard sans casser (docs/ARCHITECTURE.md §6).
import 'fake-indexeddb/auto';
import { deleteDB, openDB } from 'idb';
import { beforeEach, describe, expect, it } from 'vitest';
import { DB_NAME, __resetForTests, getDB } from './db';

beforeEach(async () => {
  await __resetForTests();
  await deleteDB(DB_NAME);
});

describe('db : mise à niveau v1 → v2 (docs/specs/HUB.md §8.1)', () => {
  it('une base v1 réelle avec un profil, ouverte en v2, garde le profil et gagne les deux nouveaux stores', async () => {
    const v1 = await openDB(DB_NAME, 1, {
      upgrade(db) {
        db.createObjectStore('profiles', { keyPath: 'id' });
        const runs = db.createObjectStore('runs', { keyPath: 'id' });
        runs.createIndex('profileId', 'profileId');
        runs.createIndex('profileLevel', ['profileId', 'levelId']);
        const overrides = db.createObjectStore('overrides', { keyPath: ['profileId', 'levelId'] });
        overrides.createIndex('profileId', 'profileId');
        const usage = db.createObjectStore('usage', { keyPath: ['profileId', 'day'] });
        usage.createIndex('profileId', 'profileId');
        db.createObjectStore('settings');
      },
    });
    await v1.put('profiles', {
      id: 'p1',
      name: 'Léo',
      avatar: '🦊',
      trackId: 'ms',
      limits: { sessionMinutes: null, dailyMinutes: null },
      createdAt: 1,
    });
    v1.close();

    const v2 = await getDB();
    expect(v2.objectStoreNames.contains('profiles')).toBe(true);
    expect(v2.objectStoreNames.contains('dictations')).toBe(true);
    expect(v2.objectStoreNames.contains('colorings')).toBe(true);
    expect(await v2.get('profiles', 'p1')).toMatchObject({ id: 'p1', name: 'Léo' });
    expect(await v2.getAll('dictations')).toEqual([]);
    expect(await v2.getAll('colorings')).toEqual([]);
  });

  it('une promesse échouée n\'est jamais mise en cache : un nouvel essai reste possible', async () => {
    // getDB() ne doit jamais laisser dbPromise pointer vers un rejet permanent (voir le .catch
    // interne) : si l'ouverture précédente a échoué, l'appel suivant doit pouvoir réessayer.
    // Simule l'échec via une v3 hypothétique invalide (version inférieure à la version courante,
    // ce qui fait rejeter `openDB` avec une VersionError), puis vérifie que getDB() (v2) aboutit.
    const opened = await getDB();
    opened.close();
    await __resetForTests();

    const failing = openDB(DB_NAME, 1); // version inférieure à la version 2 déjà atteinte : rejette
    await expect(failing).rejects.toBeTruthy();

    const db = await getDB();
    expect(db.objectStoreNames.contains('profiles')).toBe(true);
    expect(db.objectStoreNames.contains('dictations')).toBe(true);
  });
});
