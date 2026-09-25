// Écran de fin (minuteur ou quota atteint) : visuel de nuit calme, sans texte pour l'enfant.
// Bloquant même après rechargement (settings.lock persisté). Coin haut droit : appui long 2 s sur
// le cadenas → code parent (PinGate) → panneau parent (+5 min / +15 min / Terminer).
import { useEffect, useState } from 'preact/hooks';
import { navigate } from '../app/routes';
import { useProfile } from '../app/context';
import { computeTime } from '../app/session';
import { getProfile, getSettings, getUsage, grantExtraMinutes, updateSettings, dayKey } from '../storage';
import type { AppSettings, Profile, SessionState } from '../storage';
import { LongPressButton } from '../ui/LongPressButton';
import { PinGate } from '../parent/PinGate';
import '../parent/parent.css';

const STARS = [
  { left: '12%', top: '18%', delay: '0s' },
  { left: '24%', top: '62%', delay: '0.9s' },
  { left: '38%', top: '30%', delay: '1.8s' },
  { left: '50%', top: '72%', delay: '0.4s' },
  { left: '62%', top: '22%', delay: '1.3s' },
  { left: '16%', top: '84%', delay: '2.4s' },
  { left: '82%', top: '68%', delay: '1.1s' },
  { left: '90%', top: '38%', delay: '0.2s' },
];

type Panel = 'closed' | 'pin' | 'parent';

export function LockScreen() {
  const { setProfile } = useProfile();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [lockedProfile, setLockedProfile] = useState<Profile | null>(null);
  const [panel, setPanel] = useState<Panel>('closed');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getSettings()
      .then(async (s) => {
        if (cancelled) return;
        if (!s.lock) {
          // Rien à verrouiller (accès direct à #/locked) : retour aux profils.
          navigate({ name: 'profiles' }, { replace: true });
          return;
        }
        setSettings(s);
        const p = await getProfile(s.lock.profileId);
        if (!cancelled) setLockedProfile(p ?? null);
      })
      .catch((err) => console.error('LockScreen load failed', err));
    return () => {
      cancelled = true;
    };
  }, []);

  async function grant(minutes: 5 | 15) {
    const lock = settings?.lock;
    if (!lock || busy) return;
    setBusy(true);
    try {
      const profile = lockedProfile ?? (await getProfile(lock.profileId));
      if (!profile) {
        navigate({ name: 'profiles' }, { replace: true });
        return;
      }
      const day = dayKey();
      const usage = await getUsage(profile.id, day);
      const currentSession = settings?.session ?? null;

      let nextSession: SessionState | null = currentSession;
      if (profile.limits.sessionMinutes !== null && currentSession) {
        const capped = Math.max(0, Math.min(currentSession.activeSeconds, profile.limits.sessionMinutes * 60 - minutes * 60));
        nextSession = { ...currentSession, activeSeconds: capped, lastActiveAt: Date.now() };
      }

      const status = computeTime(profile, usage, currentSession);
      if (status.dailyRemainingSec !== null && status.dailyRemainingSec < minutes * 60) {
        const complement = Math.ceil((minutes * 60 - status.dailyRemainingSec) / 60);
        if (complement > 0) await grantExtraMinutes(profile.id, day, complement);
      }

      await updateSettings({ lock: null, session: nextSession });
      const fresh = await getProfile(profile.id);
      if (fresh) setProfile(fresh);
      navigate({ name: 'map' });
    } catch (err) {
      console.error('grant (écran de fin) failed', err);
    } finally {
      setBusy(false);
    }
  }

  async function endSession() {
    if (busy) return;
    setBusy(true);
    try {
      await updateSettings({ lock: null, session: null });
      setProfile(null);
      navigate({ name: 'profiles' });
    } catch (err) {
      console.error('endSession failed', err);
    } finally {
      setBusy(false);
    }
  }

  if (panel === 'pin' && settings) {
    return <PinGate settings={settings} onUnlocked={(next) => { setSettings(next); setPanel('parent'); }} />;
  }

  if (panel === 'parent' && settings) {
    return (
      <div className="pa-space pa-space--center">
        <div className="pa-section" style={{ width: '100%', maxWidth: 340, textAlign: 'center' }}>
          <h1 className="pa-section__title">Pause terminée</h1>
          <p className="pa-muted">
            {lockedProfile ? `${lockedProfile.name} a atteint son temps de jeu.` : 'Temps de jeu atteint.'} Vous pouvez
            accorder un peu plus de temps ou terminer la session.
          </p>
          <button
            type="button"
            className="pa-button pa-button--primary"
            data-testid="grant-5"
            disabled={busy}
            onClick={() => grant(5)}
          >
            + 5 minutes
          </button>
          <button
            type="button"
            className="pa-button pa-button--secondary"
            data-testid="grant-15"
            disabled={busy}
            onClick={() => grant(15)}
          >
            + 15 minutes
          </button>
          <button
            type="button"
            className="pa-button pa-button--ghost"
            data-testid="end-session"
            disabled={busy}
            onClick={endSession}
          >
            Terminer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div class="screen screen--locked">
      <LongPressButton
        class="lock-screen__unlock"
        durationMs={2000}
        size={56}
        onLongPress={() => setPanel('pin')}
        aria-label="Espace parent"
        data-testid="lock-parent"
      >
        🔒
      </LongPressButton>
      <div class="lock-screen__sky" aria-hidden="true">
        {STARS.map((star, i) => (
          <span key={i} class="lock-screen__star" style={{ left: star.left, top: star.top, animationDelay: star.delay }} />
        ))}
        <span class="lock-screen__moon">🌙</span>
      </div>
      <div class="lock-screen__avatar" aria-hidden="true">
        <span class="lock-screen__avatar-emoji">{lockedProfile?.avatar ?? '🦊'}</span>
        <span class="lock-screen__zzz">💤</span>
      </div>
    </div>
  );
}
