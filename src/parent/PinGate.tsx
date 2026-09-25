// Verrou de l'espace parent : code à 4 chiffres (création la première fois, sinon saisie).
// Le déverrouillage est tenu par ParentSpace (état en mémoire, perdu en quittant l'espace).
import { useState } from 'preact/hooks';
import { updateSettings } from '../storage';
import type { AppSettings } from '../storage';
import { NumericKeypad } from './NumericKeypad';
import {
  checkRecoveryAnswer,
  createRecoveryChallenge,
  generateSalt,
  hashPin,
  verifyPin,
} from './pin';
import type { RecoveryChallenge } from './pin';
import { describeError } from './util';

type Step =
  | { kind: 'create-first' }
  | { kind: 'create-confirm'; pin: string }
  | { kind: 'enter' }
  | { kind: 'recovery'; challenge: RecoveryChallenge };

export function PinGate(props: { settings: AppSettings; onUnlocked: (settings: AppSettings) => void }) {
  const { settings, onUnlocked } = props;
  const hasPin = Boolean(settings.pinHash && settings.pinSalt);

  const [step, setStep] = useState<Step>(hasPin ? { kind: 'enter' } : { kind: 'create-first' });
  const [digits, setDigits] = useState('');
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [busy, setBusy] = useState(false);

  function fail(message: string) {
    setError(message);
    setDigits('');
    setShake(true);
    setTimeout(() => setShake(false), 400);
  }

  async function handleComplete(pin: string, current: Step) {
    setBusy(true);
    try {
      if (current.kind === 'create-first') {
        setStep({ kind: 'create-confirm', pin });
        setDigits('');
      } else if (current.kind === 'create-confirm') {
        if (pin !== current.pin) {
          fail('Les deux codes ne correspondent pas, recommence.');
          setStep({ kind: 'create-first' });
        } else {
          const salt = generateSalt();
          const pinHash = await hashPin(pin, salt);
          const updated = await updateSettings({ pinHash, pinSalt: salt });
          setDigits('');
          onUnlocked(updated);
        }
      } else if (current.kind === 'enter') {
        const ok =
          settings.pinHash && settings.pinSalt ? await verifyPin(pin, settings.pinSalt, settings.pinHash) : false;
        if (ok) {
          onUnlocked(settings);
        } else {
          fail('Code incorrect.');
        }
      }
    } catch (err) {
      setError(describeError(err));
      setDigits('');
    } finally {
      setBusy(false);
    }
  }

  function handleDigit(digit: string) {
    if (busy || step.kind === 'recovery') return;
    const next = (digits + digit).slice(0, 4);
    setDigits(next);
    setError(null);
    if (next.length === 4) {
      void handleComplete(next, step);
    }
  }

  function handleDelete() {
    if (busy) return;
    setDigits((d) => d.slice(0, -1));
  }

  function openRecovery() {
    setError(null);
    setDigits('');
    setAnswer('');
    setStep({ kind: 'recovery', challenge: createRecoveryChallenge() });
  }

  function cancelRecovery() {
    setError(null);
    setAnswer('');
    setStep({ kind: 'enter' });
  }

  function submitRecovery(ev: Event) {
    ev.preventDefault();
    if (step.kind !== 'recovery') return;
    if (checkRecoveryAnswer(step.challenge, Number(answer))) {
      setError(null);
      setAnswer('');
      setDigits('');
      setStep({ kind: 'create-first' });
    } else {
      setAnswer('');
      setError("Ce n'est pas le bon résultat, réessaie.");
      setStep({ kind: 'recovery', challenge: createRecoveryChallenge() });
    }
  }

  const title =
    step.kind === 'create-first'
      ? 'Créer le code parent'
      : step.kind === 'create-confirm'
        ? 'Confirme le code'
        : step.kind === 'recovery'
          ? 'Code oublié'
          : 'Code parent';

  return (
    <div className="pa-space pa-space--center">
      <div className={`pa-pin-card${shake ? ' pa-shake' : ''}`}>
        <h1 className="pa-pin-title">{title}</h1>

        {step.kind === 'create-first' && (
          <p className="pa-pin-hint">Ce code protège l'espace parent et l'écran de fin de jeu.</p>
        )}

        {error && (
          <p className="pa-error" role="alert">
            {error}
          </p>
        )}

        {step.kind === 'recovery' ? (
          <form className="pa-recovery" onSubmit={submitRecovery}>
            <p className="pa-pin-hint">Pour créer un nouveau code, résous ce calcul de tête :</p>
            <p className="pa-recovery__sum">
              {step.challenge.a} × {step.challenge.b} = ?
            </p>
            <label className="pa-field">
              <span className="pa-field__label">Résultat</span>
              <input
                className="pa-input"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoFocus
                value={answer}
                onInput={(ev) => setAnswer((ev.target as HTMLInputElement).value.replace(/\D/g, ''))}
              />
            </label>
            <div className="pa-recovery__actions">
              <button type="submit" className="pa-button pa-button--primary" disabled={answer === ''}>
                Valider
              </button>
              <button type="button" className="pa-button pa-button--ghost" onClick={cancelRecovery}>
                Annuler
              </button>
            </div>
          </form>
        ) : (
          <>
            <div
              className="pa-pin-dots"
              role="status"
              aria-label={`${digits.length} chiffre${digits.length > 1 ? 's' : ''} sur 4 saisis`}
            >
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className={`pa-pin-dot${i < digits.length ? ' pa-pin-dot--filled' : ''}`} aria-hidden="true" />
              ))}
            </div>
            <NumericKeypad onDigit={handleDigit} onDelete={handleDelete} disabled={busy} />
            {step.kind === 'enter' && (
              <button type="button" className="pa-link" onClick={openRecovery}>
                Code oublié ?
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
