// CONTRAT — données persistées localement (IndexedDB). Aucune donnée ne quitte le téléphone,
// sauf via l'export JSON déclenché par le parent.

export type AvatarId = string; // un emoji d'animal, ex. "🦊" (liste dans src/ui/avatars.ts)

export interface ProfileLimits {
  /** Durée d'une session de jeu en minutes ; null = pas de limite. */
  sessionMinutes: number | null;
  /** Temps de jeu maximum par jour en minutes ; null = pas de limite. */
  dailyMinutes: number | null;
}

export interface Profile {
  id: string;
  name: string;
  avatar: AvatarId;
  /** Parcours joué (ex. "ms"). */
  trackId: string;
  limits: ProfileLimits;
  createdAt: number;
  /**
   * Dernier monde de la carte (0 = forêt…) dont l'enfant a vu l'animation d'arrivée.
   * Absent : jamais mesuré (profil créé avant les mondes) ; fixé sans animation à la première visite.
   */
  seenWorld?: number;
}

/** Résultat d'une manche dans une partie. */
export interface RoundRecord {
  index: number;
  /** Nombre total de taps sur des choix pendant la manche (≥ 1). */
  taps: number;
  /** Vrai si la manche est réussie du premier coup. */
  firstTry: boolean;
  /** Temps entre l'affichage de la manche et la bonne réponse. */
  durationMs: number;
}

export type RunStatus = 'in_progress' | 'completed' | 'abandoned';

/**
 * Pourquoi une partie s'est arrêtée avant la fin :
 * - "quit" : l'enfant a tapé sur « retour à la carte » (abandon volontaire) ;
 * - "closed" : l'app a été fermée ou rechargée pendant la partie (détecté au lancement suivant) ;
 * - "time-up" : le minuteur ou le quota parent a interrompu la partie (ce n'est PAS un abandon).
 */
export type EndReason = 'quit' | 'closed' | 'time-up';

/** Une partie = un lancement de niveau. C'est l'« essai » des statistiques. */
export interface Run {
  id: string;
  profileId: string;
  levelId: string;
  trackId: string;
  startedAt: number;
  endedAt: number | null;
  status: RunStatus;
  endReason: EndReason | null;
  /** Vrai si le niveau était déjà terminé (≥ 1 étoile) au lancement : c'est un rejeu volontaire. */
  replay: boolean;
  rounds: RoundRecord[];
  /** Étoiles obtenues (0 tant que la partie n'est pas terminée). */
  stars: 0 | 1 | 2 | 3;
}

/** Réglage manuel du parent : force un niveau débloqué ou verrouillé pour un enfant. */
export interface LevelOverride {
  profileId: string;
  levelId: string;
  state: 'unlocked' | 'locked';
}

/** Temps de jeu d'un enfant pour un jour donné. */
export interface UsageDay {
  profileId: string;
  /** Jour local au format "YYYY-MM-DD". */
  day: string;
  activeSeconds: number;
  /** Minutes supplémentaires accordées ce jour-là par le parent. */
  extraMinutes: number;
}

/** Session en cours (persistée pour qu'un rechargement ne remette pas le minuteur à zéro). */
export interface SessionState {
  profileId: string;
  startedAt: number;
  activeSeconds: number;
  lastActiveAt: number;
}

/** Écran de fin affiché : l'app reste bloquée jusqu'au code parent, même après rechargement. */
export interface LockState {
  reason: 'session' | 'daily';
  profileId: string;
  lockedAt: number;
}

export interface AppSettings {
  /** Empreinte SHA-256 (hex) de sel + code parent ; null tant que le code n'est pas créé. */
  pinHash: string | null;
  pinSalt: string | null;
  soundOn: boolean;
  /** Une session par enfant (clé = profileId) : passer par l'autre enfant ne remet pas ce minuteur à zéro. */
  sessions: Record<string, SessionState>;
  lock: LockState | null;
}

export const EXPORT_FORMAT = 'petits-malins-export';
export const EXPORT_VERSION = 1;

/** Fichier d'export. Ne contient ni le code parent ni l'état de session. */
export interface ExportBundle {
  format: typeof EXPORT_FORMAT;
  version: typeof EXPORT_VERSION;
  exportedAt: string; // ISO 8601
  profiles: Profile[];
  runs: Run[];
  overrides: LevelOverride[];
  usage: UsageDay[];
  settings: { soundOn: boolean };
}

export type ImportResult =
  | { ok: true; profiles: number; runs: number; skipped: number }
  | { ok: false; error: string };
