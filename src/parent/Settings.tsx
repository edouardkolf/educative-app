// Onglet « Réglages » : son, changement du code parent, protection du stockage.
import { useEffect, useState } from 'preact/hooks';
import { getSettings, isPersisted, requestPersistence, updateSettings } from '../storage';
import type { AppSettings } from '../storage';
import { Icon } from '../ui/icons/Icon';
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
    <>
      {loadError && <p className="pa-error">{loadError}</p>}

      <section className="pa-section">
        <div className="pa-section__head">
          <span className="pa-section__icon" aria-hidden="true">
            <Icon name="speaker" size={30} />
          </span>
          <div className="pa-section__grow">
            <h2 className="pa-section__title">Son</h2>
            <p className="pa-muted">Voix, bruitages et musique du jeu. La dictée a besoin du son.</p>
          </div>
          {settings && (
            <button
              type="button"
              className="pa-toggle"
              aria-pressed={settings.soundOn}
              aria-label="Son"
              data-testid="toggle-sound"
              onClick={toggleSound}
            >
              <span className="pa-toggle__knob" aria-hidden="true" />
              <span className="pa-toggle__text">{settings.soundOn ? 'Activé' : 'Désactivé'}</span>
            </button>
          )}
        </div>
      </section>

      <section className="pa-section">
        <div className="pa-section__head">
          <span className="pa-section__icon" aria-hidden="true">
            <Icon name="key" size={30} />
          </span>
          <div>
            <h2 className="pa-section__title">Code parent</h2>
            <p className="pa-muted">Les 4 chiffres qui ouvrent cet espace.</p>
          </div>
        </div>

        {pinStep.kind === 'closed' && (
          <button type="button" className="pa-button pa-button--secondary" data-testid="change-pin" onClick={openChangePin}>
            <Icon name="key" size={24} />
            <span>Changer le code parent</span>
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
      </section>

      <section className="pa-section">
        <div className="pa-section__head">
          <span className={`pa-section__icon${persisted ? '' : ' pa-section__icon--muted'}`} aria-hidden="true">
            <Icon name="shield" size={30} />
          </span>
          <div>
            <h2 className="pa-section__title">Stockage</h2>
            <p className={persisted ? 'pa-success' : 'pa-muted'}>
              {persisted === null
                ? 'Vérification du stockage…'
                : persisted
                  ? 'Stockage protégé : le téléphone ne l’effacera pas pour faire de la place.'
                  : 'Stockage non protégé : le téléphone pourrait l’effacer s’il manque de place.'}
            </p>
          </div>
        </div>
        {persisted === false && (
          <button
            type="button"
            className="pa-button pa-button--secondary"
            data-testid="protect-storage"
            disabled={protecting}
            onClick={handleProtect}
          >
            <Icon name="shield" size={24} />
            <span>{protecting ? 'Protection…' : 'Protéger le stockage'}</span>
          </button>
        )}
      </section>
    </>
  );
}
