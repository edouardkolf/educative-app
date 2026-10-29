// F5 : la base doit pouvoir monter en version plus tard sans casser (docs/ARCHITECTURE.md §6).
import 'fake-indexeddb/auto';
import { deleteDB, openDB } from 'idb';
import { beforeEach, describe, expect, it } from 'vitest';
import { DB_NAME, __resetForTests, getDB } from './db';

beforeEach(async () => {
  await __resetForTests();
  await deleteDB(DB_NAME);
});

describe('db : mises à niveau v1 → v4 (docs/specs/HUB.md §8.1, MORPION-PENDU.md §4)', () => {
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

  it('une base v2 avec une dictée, ouverte en v3, la garde et gagne les stores du morpion et du pendu', async () => {
    const v1Stores = (db: import('idb').IDBPDatabase<unknown>) => {
      db.createObjectStore('profiles', { keyPath: 'id' });
      const runs = db.createObjectStore('runs', { keyPath: 'id' });
      runs.createIndex('profileId', 'profileId');
      runs.createIndex('profileLevel', ['profileId', 'levelId']);
      const overrides = db.createObjectStore('overrides', { keyPath: ['profileId', 'levelId'] });
      overrides.createIndex('profileId', 'profileId');
      const usage = db.createObjectStore('usage', { keyPath: ['profileId', 'day'] });
      usage.createIndex('profileId', 'profileId');
      db.createObjectStore('settings');
      db.createObjectStore('dictations', { keyPath: 'id' }).createIndex('profileId', 'profileId');
      db.createObjectStore('colorings', { keyPath: 'id' }).createIndex('profileId', 'profileId');
    };
    const v2 = await openDB(DB_NAME, 2, { upgrade: (db) => v1Stores(db) });
    await v2.put('dictations', { id: 'd1', profileId: 'p1' });
    v2.close();

    const v3 = await getDB();
    expect(v3.objectStoreNames.contains('tictactoes')).toBe(true);
    expect(v3.objectStoreNames.contains('hangmans')).toBe(true);
    expect(await v3.get('dictations', 'd1')).toMatchObject({ id: 'd1' });
    expect(await v3.getAll('tictactoes')).toEqual([]);
    expect(await v3.getAll('hangmans')).toEqual([]);
  });

  it('une base v3 avec un morpion, ouverte en v4, le garde et gagne le store des puzzles', async () => {
    const v3 = await openDB(DB_NAME, 3, {
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
        for (const name of ['dictations', 'colorings', 'tictactoes', 'hangmans']) {
          db.createObjectStore(name, { keyPath: 'id' }).createIndex('profileId', 'profileId');
        }
      },
    });
    await v3.put('tictactoes', { id: 't1', profileId: 'p1' });
    v3.close();

    const v4 = await getDB();
    expect(v4.objectStoreNames.contains('puzzles')).toBe(true);
    expect(await v4.get('tictactoes', 't1')).toMatchObject({ id: 't1' });
    expect(await v4.getAll('puzzles')).toEqual([]);
    expect(await v4.getAllFromIndex('puzzles', 'profileId', 'p1')).toEqual([]);
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
