// Réglages du tableau de bord : son, changement du code parent, protection du stockage.
import { useEffect, useState } from 'preact/hooks';
import { getSettings, isPersisted, requestPersistence, updateSettings } from '../storage';
import type { AppSettings } from '../storage';
import { setSoundEnabled } from '../ui/sound';
import { NumericKeypad } from './NumericKeypad';
import { generateSalt, hashPin } from './pin';
import { describeError } from './util';

type PinStep = { kind: 'closed' } | { kind: 'enter' } | { kind: 'confirm'; pin: string } | { kind: 'done' };

export function ParentSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [protecting, setProtecting] = useState(false);

  const [pinStep, setPinStep] = useState<PinStep>({ kind: 'closed' });
  const [digits, setDigits] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinBusy, setPinBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getSettings()
      .then((s) => {
        if (!cancelled) setSettings(s);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(describeError(err));
      });
    isPersisted()
      .then((value) => {
        if (!cancelled) setPersisted(value);
      })
      .catch(() => {
        if (!cancelled) setPersisted(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function toggleSound() {
    if (!settings) return;
    const next = !settings.soundOn;
    setSettings({ ...settings, soundOn: next });
    setSoundEnabled(next);
    try {
      const updated = await updateSettings({ soundOn: next });
      setSettings(updated);
    } catch (err) {
      setLoadError(describeError(err));
    }
  }

  async function handleProtect() {
    setProtecting(true);
    await requestPersistence();
    const value = await isPersisted();
    setPersisted(value);
    setProtecting(false);
  }

  function openChangePin() {
    setPinStep({ kind: 'enter' });
    setDigits('');
    setPinError(null);
  }

  function cancelChangePin() {
    setPinStep({ kind: 'closed' });
    setDigits('');
    setPinError(null);
  }

  async function handlePinDigit(digit: string) {
    if (pinBusy || pinStep.kind === 'closed' || pinStep.kind === 'done') return;
    const next = (digits + digit).slice(0, 4);
    setDigits(next);
    setPinError(null);
    if (next.length < 4) return;

    if (pinStep.kind === 'enter') {
      setPinStep({ kind: 'confirm', pin: next });
      setDigits('');
      return;
    }

    // pinStep.kind === 'confirm'
    if (next !== pinStep.pin) {
      setPinError('Les deux codes ne correspondent pas, recommence.');
      setPinStep({ kind: 'enter' });
      setDigits('');
      return;
    }
    setPinBusy(true);
    try {
      const salt = generateSalt();
      const pinHash = await hashPin(next, salt);
      const updated = await updateSettings({ pinHash, pinSalt: salt });
      setSettings(updated);
      setPinStep({ kind: 'done' });
      setDigits('');
    } catch (err) {
      setPinError(describeError(err));
    } finally {
      setPinBusy(false);
    }
  }

  function handlePinDelete() {
    if (pinBusy) return;
    setDigits((d) => d.slice(0, -1));
  }

  return (
    <section className="pa-section">
      <h2 className="pa-section__title">Réglages</h2>

      {loadError && <p className="pa-error">{loadError}</p>}

      {settings && (
        <div className="pa-setting-row">
          <span>Son</span>
          <button
            type="button"
            className="pa-toggle"
            aria-pressed={settings.soundOn}
            data-testid="toggle-sound"
            onClick={toggleSound}
          >
            {settings.soundOn ? 'Activé' : 'Désactivé'}
          </button>
        </div>
      )}

      {pinStep.kind === 'closed' && (
        <button type="button" className="pa-button pa-button--secondary" data-testid="change-pin" onClick={openChangePin}>
          Changer le code parent
        </button>
      )}

      {(pinStep.kind === 'enter' || pinStep.kind === 'confirm') && (
        <div className="pa-pin-change">
          <p className="pa-field__label">{pinStep.kind === 'enter' ? 'Nouveau code' : 'Confirme le nouveau code'}</p>
          {pinError && (
            <p className="pa-error" role="alert">
              {pinError}
            </p>
          )}
          <div
            className="pa-pin-dots"
            role="status"
            aria-label={`${digits.length} chiffre${digits.length > 1 ? 's' : ''} sur 4 saisis`}
          >
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={`pa-pin-dot${i < digits.length ? ' pa-pin-dot--filled' : ''}`} aria-hidden="true" />
            ))}
          </div>
          <NumericKeypad onDigit={handlePinDigit} onDelete={handlePinDelete} disabled={pinBusy} />
          <button type="button" className="pa-button pa-button--ghost" onClick={cancelChangePin}>
            Annuler
          </button>
        </div>
      )}

      {pinStep.kind === 'done' && (
        <div className="pa-setting-row">
          <p className="pa-success" role="status">
            Code parent changé.
          </p>
          <button type="button" className="pa-link" onClick={cancelChangePin}>
            OK
          </button>
        </div>
      )}

      <div className="pa-setting-row">
        <span className={persisted ? 'pa-success' : 'pa-muted'}>
          {persisted === null
            ? 'Vérification du stockage…'
            : persisted
              ? 'Stockage protégé ✓'
              : 'Stockage non protégé'}
        </span>
      </div>
      {persisted === false && (
        <button
          type="button"
          className="pa-button pa-button--secondary"
          data-testid="protect-storage"
          disabled={protecting}
          onClick={handleProtect}
        >
          {protecting ? 'Protection…' : 'Protéger le stockage'}
        </button>
      )}
    </section>
  );
}
