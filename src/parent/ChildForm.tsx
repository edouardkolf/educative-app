// Formulaire enfant : création (limites par défaut) ou modification (limites conservées).
import { useEffect, useState } from 'preact/hooks';
import { navigate } from '../app/routes';
import { useProfile } from '../app/context';
import { getTracks } from '../engine';
import type { Track } from '../engine';
import { deleteProfile, getProfile, getSettings, saveProfile } from '../storage';
import type { AvatarId, Profile, ProfileLimits } from '../storage';
import { AVATARS } from '../ui/avatars';
import {
  DAILY_MINUTES_OPTIONS,
  SESSION_MINUTES_OPTIONS,
  limitOptionLabel,
  minutesToSelectValue,
  selectValueToMinutes,
} from './limits';
import { NumericKeypad } from './NumericKeypad';
import { verifyPin } from './pin';
import { describeError } from './util';

const DEFAULT_LIMITS: ProfileLimits = { sessionMinutes: 15, dailyMinutes: 30 };
const NAME_MAX_LENGTH = 20;

export type ChildFormProps = { mode: 'create' } | { mode: 'edit'; profileId: string };

export function ChildForm(props: ChildFormProps) {
  const { setProfile } = useProfile();
  const isEdit = props.mode === 'edit';
  const profileId = props.mode === 'edit' ? props.profileId : null;

  const [tracks, setTracks] = useState<Track[] | null>(null);
  const [tracksError, setTracksError] = useState<string | null>(null);
  const [existing, setExisting] = useState<Profile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(isEdit);

  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<AvatarId>(AVATARS[0]);
  const [trackId, setTrackId] = useState('');
  const [sessionMinutes, setSessionMinutes] = useState<number | null>(DEFAULT_LIMITS.sessionMinutes);
  const [dailyMinutes, setDailyMinutes] = useState<number | null>(DEFAULT_LIMITS.dailyMinutes);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleteConfirming, setDeleteConfirming] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  // Suppression irréversible : le code parent est redemandé, même espace parent déjà déverrouillé.
  const [deletePin, setDeletePin] = useState('');

  useEffect(() => {
    try {
      const list = getTracks();
      setTracks(list);
      setTrackId((current) => current || list[0]?.id || '');
    } catch (err) {
      setTracksError(describeError(err));
    }
  }, []);

  useEffect(() => {
    if (!profileId) return;
    let cancelled = false;
    getProfile(profileId)
      .then((profile) => {
        if (cancelled) return;
        if (!profile) {
          setLoadError('Cet enfant est introuvable.');
          return;
        }
        setExisting(profile);
        setName(profile.name);
        setAvatar(profile.avatar);
        // F11 : parcours inconnu (contenu changé depuis) → premier parcours disponible, jamais un
        // formulaire bloqué sur un id qu'aucune option ne représente.
        const known = getTracks().some((t) => t.id === profile.trackId);
        setTrackId(known ? profile.trackId : (getTracks()[0]?.id ?? profile.trackId));
        setSessionMinutes(profile.limits.sessionMinutes);
        setDailyMinutes(profile.limits.dailyMinutes);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(describeError(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  async function handleSubmit(ev: Event) {
    ev.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setFormError('Le prénom est obligatoire.');
      return;
    }
    if (trimmed.length > NAME_MAX_LENGTH) {
      setFormError(`Le prénom doit faire au plus ${NAME_MAX_LENGTH} caractères.`);
      return;
    }
    if (!trackId) {
      setFormError('Choisis un parcours.');
      return;
    }

    setFormError(null);
    setSaving(true);
    const limits: ProfileLimits = { sessionMinutes, dailyMinutes };
    try {
      if (isEdit) {
        if (!existing) {
          setFormError("Impossible d'enregistrer : profil non chargé.");
          return;
        }
        await saveProfile({
          id: existing.id,
          createdAt: existing.createdAt,
          name: trimmed,
          avatar,
          trackId,
          limits,
          ...(existing.seenWorld !== undefined ? { seenWorld: existing.seenWorld } : {}),
        });
      } else {
        await saveProfile({ name: trimmed, avatar, trackId, limits });
      }
      navigate({ name: 'parent', path: [] });
    } catch (err) {
      setFormError(describeError(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeletePinDigit(digit: string) {
    if (!existing || deleteBusy) return;
    const next = (deletePin + digit).slice(0, 4);
    setDeletePin(next);
    setDeleteError(null);
    if (next.length < 4) return;
    setDeleteBusy(true);
    try {
      const settings = await getSettings();
      const ok =
        settings.pinHash && settings.pinSalt ? await verifyPin(next, settings.pinSalt, settings.pinHash) : false;
      if (!ok) {
        setDeleteError('Code incorrect.');
        setDeletePin('');
        setDeleteBusy(false);
        return;
      }
      await deleteProfile(existing.id);
      // F2 : un profil actif resté en mémoire ne doit plus jamais écrire d'orphelins après une suppression.
      setProfile(null);
      navigate({ name: 'parent', path: [] });
    } catch (err) {
      setDeleteError(describeError(err));
      setDeletePin('');
      setDeleteBusy(false);
    }
  }

  function cancelDelete() {
    setDeleteConfirming(false);
    setDeletePin('');
    setDeleteError(null);
  }

  if (isEdit && loading) {
    return (
      <div className="pa-space">
        <p className="pa-muted">Chargement…</p>
      </div>
    );
  }

  if (isEdit && loadError) {
    return (
      <div className="pa-space">
        <p className="pa-error">{loadError}</p>
        <button
          type="button"
          className="pa-button pa-button--ghost"
          onClick={() => navigate({ name: 'parent', path: [] })}
        >
          ← Tableau de bord
        </button>
      </div>
    );
  }

  return (
    <div className="pa-space">
      <header className="pa-header">
        <h1>{isEdit ? `Modifier ${existing?.name ?? 'un enfant'}` : 'Ajouter un enfant'}</h1>
      </header>

      <form className="pa-form" onSubmit={handleSubmit}>
        <label className="pa-field">
          <span className="pa-field__label">Prénom</span>
          <input
            className="pa-input"
            type="text"
            name="name"
            maxLength={NAME_MAX_LENGTH}
            required
            value={name}
            onInput={(ev) => setName((ev.target as HTMLInputElement).value)}
          />
        </label>

        <fieldset className="pa-field">
          <legend className="pa-field__label">Avatar</legend>
          <div className="pa-avatar-grid">
            {AVATARS.map((a) => (
              <button
                key={a}
                type="button"
                className={`pa-avatar-option${a === avatar ? ' pa-avatar-option--selected' : ''}`}
                aria-pressed={a === avatar}
                onClick={() => setAvatar(a)}
              >
                {a}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="pa-field">
          <legend className="pa-field__label">Parcours</legend>
          {tracksError && <p className="pa-error">{tracksError}</p>}
          {!tracksError && tracks === null && <p className="pa-muted">Chargement des parcours…</p>}
          {!tracksError && tracks !== null && tracks.length === 0 && (
            <p className="pa-muted">Aucun parcours disponible.</p>
          )}
          {tracks && tracks.length > 0 && (
            <div className="pa-track-list">
              {tracks.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`pa-track-option${t.id === trackId ? ' pa-track-option--selected' : ''}`}
                  aria-pressed={t.id === trackId}
                  onClick={() => setTrackId(t.id)}
                >
                  {t.title}
                </button>
              ))}
            </div>
          )}
        </fieldset>

        <label className="pa-field">
          <span className="pa-field__label">Durée d'une session</span>
          <select
            className="pa-input"
            name="sessionMinutes"
            value={minutesToSelectValue(sessionMinutes)}
            onChange={(ev) => setSessionMinutes(selectValueToMinutes((ev.target as HTMLSelectElement).value))}
          >
            {SESSION_MINUTES_OPTIONS.map((m) => (
              <option key={m ?? 'none'} value={minutesToSelectValue(m)}>
                {limitOptionLabel(m)}
              </option>
            ))}
          </select>
        </label>

        <label className="pa-field">
          <span className="pa-field__label">Temps de jeu par jour</span>
          <select
            className="pa-input"
            name="dailyMinutes"
            value={minutesToSelectValue(dailyMinutes)}
            onChange={(ev) => setDailyMinutes(selectValueToMinutes((ev.target as HTMLSelectElement).value))}
          >
            {DAILY_MINUTES_OPTIONS.map((m) => (
              <option key={m ?? 'none'} value={minutesToSelectValue(m)}>
                {limitOptionLabel(m)}
              </option>
            ))}
          </select>
        </label>
        <p className="pa-muted">
          À la fin, un écran de nuit s'affiche. Votre code permet d'accorder quelques minutes de plus.
        </p>

        {formError && (
          <p className="pa-error" role="alert">
            {formError}
          </p>
        )}

        <div className="pa-form__actions">
          <button type="submit" className="pa-button pa-button--primary" data-testid="save-child" disabled={saving}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          <button
            type="button"
            className="pa-button pa-button--ghost"
            onClick={() => navigate({ name: 'parent', path: [] })}
          >
            Annuler
          </button>
        </div>
      </form>

      {isEdit && existing && (
        <section className="pa-danger-zone">
          {!deleteConfirming ? (
            <button
              type="button"
              className="pa-button pa-button--danger"
              data-testid="delete-child"
              onClick={() => setDeleteConfirming(true)}
            >
              Supprimer cet enfant
            </button>
          ) : (
            <div className="pa-danger-zone__confirm">
              <p>Supprimer définitivement {existing.name} et toutes ses statistiques ?</p>
              {deleteError && (
                <p className="pa-error" role="alert">
                  {deleteError}
                </p>
              )}
              <p className="pa-muted">Tape ton code parent pour confirmer.</p>
              <div
                className="pa-pin-dots"
                role="status"
                aria-label={`${deletePin.length} chiffre${deletePin.length > 1 ? 's' : ''} sur 4 saisis`}
                data-testid="delete-child-pin"
              >
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className={`pa-pin-dot${i < deletePin.length ? ' pa-pin-dot--filled' : ''}`}
                    aria-hidden="true"
                  />
                ))}
              </div>
              <NumericKeypad
                onDigit={handleDeletePinDigit}
                onDelete={() => setDeletePin((p) => p.slice(0, -1))}
                disabled={deleteBusy}
              />
              <div className="pa-form__actions">
                <button type="button" className="pa-button pa-button--ghost" disabled={deleteBusy} onClick={cancelDelete}>
                  Annuler
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
