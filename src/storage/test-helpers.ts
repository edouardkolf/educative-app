// Utilitaire de test — nom sans ".test.ts" : Vitest ne l'exécute pas comme une suite.
// Remet la base à zéro entre deux tests : ferme la connexion en cache puis supprime la base
// sous-jacente, pour repartir d'une base vierge (onupgradeneeded rejoué au prochain accès).
import { deleteDB } from 'idb';
import { __resetForTests, DB_NAME } from './db';

export async function resetStorageForTests(): Promise<void> {
  await __resetForTests();
  await deleteDB(DB_NAME);
}
