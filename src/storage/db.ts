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
      // F5 : `oldVersion < N` en cascade (jamais `=== N`), pour qu'un téléphone qui saute plusieurs
      // versions d'un coup rejoue bien toutes les étapes intermédiaires. Prêt pour un futur `if
      // (oldVersion < 2) { ... }` : les nouveaux stores/index se rajoutent sans toucher au bloc v1.
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore('profiles', { keyPath: 'id' });

          const runs = db.createObjectStore('runs', { keyPath: 'id' });
          runs.createIndex('profileId', 'profileId');
          runs.createIndex('profileLevel', ['profileId', 'levelId']);

          const overrides = db.createObjectStore('overrides', { keyPath: ['profileId', 'levelId'] });
          overrides.createIndex('profileId', 'profileId');

          const usage = db.createObjectStore('usage', { keyPath: ['profileId', 'day'] });
          usage.createIndex('profileId', 'profileId');

          db.createObjectStore('settings');
        }
      },
      // F5 : cette connexion (plus ancienne) bloque la mise à niveau demandée par une autre fenêtre
      // — on la ferme pour la laisser passer, puis on recharge pour repartir avec le nouveau schéma
      // plutôt que de continuer à tourner contre une connexion fermée.
      blocking() {
        void dbPromise?.then((db) => db.close());
        dbPromise = null;
        if (typeof location !== 'undefined') location.reload();
      },
    }).catch((err) => {
      // F5 : ne jamais laisser une promesse rejetée en cache — sinon aucun nouvel essai n'est
      // jamais possible (tout appel suivant échouerait immédiatement sur la même erreur figée).
      dbPromise = null;
      throw err;
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
