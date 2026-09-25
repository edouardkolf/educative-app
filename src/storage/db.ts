// Connexion IndexedDB : schéma typé (base "petits-malins", version 1), ouverture paresseuse,
// connexion mise en cache. `__resetForTests` ferme et oublie cette connexion (utilisé par les tests).
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { AppSettings, LevelOverride, Profile, Run, UsageDay } from './types';

export const DB_NAME = 'petits-malins';
const DB_VERSION = 1;

export interface StorageSchema extends DBSchema {
  profiles: {
    key: string; // Profile['id']
    value: Profile;
  };
  runs: {
    key: string; // Run['id']
    value: Run;
    indexes: {
      profileId: string;
      profileLevel: [string, string]; // [profileId, levelId]
    };
  };
  overrides: {
    key: [string, string]; // [profileId, levelId]
    value: LevelOverride;
    indexes: {
      profileId: string;
    };
  };
  usage: {
    key: [string, string]; // [profileId, day]
    value: UsageDay;
    indexes: {
      profileId: string;
    };
  };
  settings: {
    key: string; // toujours "app" : un seul enregistrement, clé hors-ligne (pas de keyPath)
    value: AppSettings;
  };
}

let dbPromise: Promise<IDBPDatabase<StorageSchema>> | null = null;

/** Connexion mise en cache : ouverte à la première utilisation, réutilisée ensuite. */
export function getDB(): Promise<IDBPDatabase<StorageSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<StorageSchema>(DB_NAME, DB_VERSION, {
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
  }
  return dbPromise;
}

/** Ferme et oublie la connexion en cache. Utilisé par les tests pour repartir d'une base vierge. */
export async function __resetForTests(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise;
    db.close();
    dbPromise = null;
  }
}
