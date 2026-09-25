// Formulaire enfant : création (limites par défaut) ou modification (limites conservées).
import { useEffect, useState } from 'preact/hooks';
import { navigate } from '../app/routes';
import { getTracks } from '../engine';
import type { Track } from '../engine';
import { deleteProfile, getProfile, saveProfile } from '../storage';
import type { AvatarId, Profile, ProfileLimits } from '../storage';
import { AVATARS } from '../ui/avatars';
import {
  DAILY_MINUTES_OPTIONS,
  SESSION_MINUTES_OPTIONS,
  limitOptionLabel,
  minutesToSelectValue,
  selectValueToMinutes,
} from './limits';
import { describeError } from './util';

const DEFAULT_LIMITS: ProfileLimits = { sessionMinutes: 15, dailyMinutes: 30 };
const NAME_MAX_LENGTH = 20;

export type ChildFormProps = { mode: 'create' } | { mode: 'edit'; profileId: string };

export function ChildForm(props: ChildFormProps) {
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
        setTrackId(profile.trackId);
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

  async function handleDeleteConfirmed() {
    if (!existing) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await deleteProfile(existing.id);
      navigate({ name: 'parent', path: [] });
    } catch (err) {
      setDeleteError(describeError(err));
      setDeleteBusy(false);
    }
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
              <div className="pa-form__actions">
                <button
                  type="button"
                  className="pa-button pa-button--danger"
                  data-testid="delete-child-confirm"
                  disabled={deleteBusy}
                  onClick={handleDeleteConfirmed}
                >
                  {deleteBusy ? 'Suppression…' : 'Supprimer'}
                </button>
                <button
                  type="button"
                  className="pa-button pa-button--ghost"
                  disabled={deleteBusy}
                  onClick={() => setDeleteConfirming(false)}
                >
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
