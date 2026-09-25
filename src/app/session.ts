// Logique pure du minuteur de session et du quota quotidien (docs/ARCHITECTURE.md §8).
// Aucune dépendance au DOM ni au stockage : testable directement (session.test.ts).
import type { Profile, SessionState, UsageDay } from '../storage/types';

export interface TimeStatus {
  /** Secondes restantes avant la limite de session ; null = pas de limite. */
  sessionRemainingSec: number | null;
  /** Secondes restantes avant le quota du jour (minutes bonus incluses) ; null = pas de limite. */
  dailyRemainingSec: number | null;
  /** Limite atteinte (0 seconde restante) ; le quota du jour prime sur la session. */
  timeUp: 'session' | 'daily' | null;
}

const RESUME_WINDOW_MS = 10 * 60 * 1000;

export function computeTime(profile: Profile, usage: UsageDay, session: SessionState | null): TimeStatus {
  const { sessionMinutes, dailyMinutes } = profile.limits;

  const sessionRemainingSec =
    sessionMinutes === null ? null : Math.max(0, sessionMinutes * 60 - (session?.activeSeconds ?? 0));

  const dailyRemainingSec =
    dailyMinutes === null ? null : Math.max(0, (dailyMinutes + usage.extraMinutes) * 60 - usage.activeSeconds);

  const timeUp: TimeStatus['timeUp'] =
    dailyRemainingSec === 0 ? 'daily' : sessionRemainingSec === 0 ? 'session' : null;

  return { sessionRemainingSec, dailyRemainingSec, timeUp };
}

/** Reprendre la session en cours (même profil, dernière activité il y a moins de 10 min) plutôt qu'en ouvrir une nouvelle. */
export function shouldResumeSession(session: SessionState | null, profileId: string, now: number): boolean {
  if (!session || session.profileId !== profileId) return false;
  return now - session.lastActiveAt < RESUME_WINDOW_MS;
}

/**
 * Fraction du temps restant le plus contraignant (session ou jour), pour l'indicateur discret de la
 * carte : 0 = épuisé, 1 = plein ; null si le profil n'a aucune limite.
 */
export function remainingRatio(profile: Profile, usage: UsageDay, session: SessionState | null): number | null {
  const { sessionMinutes, dailyMinutes } = profile.limits;
  const status = computeTime(profile, usage, session);
  const ratios: number[] = [];
  if (sessionMinutes !== null && status.sessionRemainingSec !== null) {
    ratios.push(sessionMinutes <= 0 ? 0 : status.sessionRemainingSec / (sessionMinutes * 60));
  }
  if (dailyMinutes !== null && status.dailyRemainingSec !== null) {
    const totalMinutes = dailyMinutes + usage.extraMinutes;
    ratios.push(totalMinutes <= 0 ? 0 : status.dailyRemainingSec / (totalMinutes * 60));
  }
  return ratios.length === 0 ? null : Math.min(...ratios);
}
