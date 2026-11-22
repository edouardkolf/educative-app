// Réglages lecture de la fiche enfant (LECTURE.md §8.4 et §16) : étape de départ (défaut 1, valeur absente) et
// « tous les niveaux ouverts » pour une séance parent (défaut : non).
import type { GameSettingsProps } from '..';
import type { ReadingSettingsValue } from '../../storage/readings';
import { STAGE_TITLES } from './stats';
import { READING_STAGES } from './types';
import type { ReadingStage } from './types';
import './reading-parent.css';

/** Valeur rangée : seuls les écarts au défaut sont gardés ; rien d'autre que le défaut → undefined. */
function tidy(next: ReadingSettingsValue): ReadingSettingsValue | undefined {
  const out: ReadingSettingsValue = {};
  if (next.startStage !== undefined && next.startStage !== 1) out.startStage = next.startStage;
  if (next.allLevelsOpen) out.allLevelsOpen = true;
  return Object.keys(out).length > 0 ? out : undefined;
}

export function ReadingSettings({ value, onChange }: GameSettingsProps<ReadingSettingsValue>) {
  const current: ReadingStage = value?.startStage ?? 1;
  const open = value?.allLevelsOpen === true;

  function handleStage(e: Event) {
    const n = Number((e.currentTarget as HTMLSelectElement).value) as ReadingStage;
    onChange(tidy({ ...value, startStage: READING_STAGES.includes(n) ? n : 1 }));
  }

  function handleOpen(e: Event) {
    onChange(tidy({ ...value, allLevelsOpen: (e.currentTarget as HTMLInputElement).checked }));
  }

  return (
    <>
      <div class="pa-field">
        <label class="pa-field__label" for="reading-start-stage">
          Étape de départ
        </label>
        <select
          id="reading-start-stage"
          class="pa-input rp-select"
          data-testid="reading-start-stage"
          value={String(current)}
          onChange={handleStage}
        >
          {READING_STAGES.map((s) => (
            <option key={s} value={String(s)} selected={s === current}>
              {s} · {STAGE_TITLES[s]}
            </option>
          ))}
        </select>
        <p class="pa-muted">Si elle connaît déjà ses lettres, commencez plus loin.</p>
      </div>
      <div class="pa-field">
        <label class="rp-check">
          <input type="checkbox" data-testid="reading-all-levels" checked={open} onChange={handleOpen} />
          Tous les niveaux ouverts
        </label>
        <p class="pa-muted">
          Pour essayer n'importe quel niveau. Un niveau encore fermé se joue à l'essai : rien n'est enregistré, sa
          progression ne bouge pas.
        </p>
      </div>
    </>
  );
}
