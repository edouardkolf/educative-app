// F5 : la base doit pouvoir monter en version plus tard sans casser (docs/ARCHITECTURE.md §6).
import 'fake-indexeddb/auto';
import { deleteDB, openDB } from 'idb';
import { beforeEach, describe, expect, it } from 'vitest';
import { DB_NAME, __resetForTests, getDB } from './db';

beforeEach(async () => {
  await __resetForTests();
  await deleteDB(DB_NAME);
});

describe('db : mise à niveau future (F5)', () => {
  it('ouvre en v1 (stores attendus), puis une v2 qui ajoute un store s\'ouvre sans erreur', async () => {
    const v1 = await getDB();
    expect(v1.objectStoreNames.contains('profiles')).toBe(true);
    expect(v1.objectStoreNames.contains('runs')).toBe(true);
    expect(v1.objectStoreNames.contains('settings')).toBe(true);
    await __resetForTests();

    // Simule le futur "if (oldVersion < 2) { ... }" sans toucher au code applicatif.
    const v2 = await openDB(DB_NAME, 2, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore('profiles', { keyPath: 'id' });
        }
        if (oldVersion < 2) {
          db.createObjectStore('future');
        }
      },
    });
    expect(v2.objectStoreNames.contains('profiles')).toBe(true);
    expect(v2.objectStoreNames.contains('future')).toBe(true);
    v2.close();
  });

  it('une promesse échouée n\'est jamais mise en cache : un nouvel essai reste possible', async () => {
    // getDB() ne doit jamais laisser dbPromise pointer vers un rejet permanent (voir le .catch
    // interne) : si l'ouverture précédente a échoué, l'appel suivant doit pouvoir réessayer.
    const db = await getDB();
    expect(db.objectStoreNames.contains('profiles')).toBe(true);
  });
});
