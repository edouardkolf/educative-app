// Réglage « Étape de départ » de la fiche enfant (LECTURE.md §8.4). Défaut : 1 (valeur absente).
import type { GameSettingsProps } from '..';
import type { ReadingSettingsValue } from '../../storage/readings';
import { STAGE_TITLES } from './stats';
import { READING_STAGES } from './types';
import type { ReadingStage } from './types';
import './reading-parent.css';

export function ReadingSettings({ value, onChange }: GameSettingsProps<ReadingSettingsValue>) {
  const current: ReadingStage = value?.startStage ?? 1;

  function handleChange(e: Event) {
    const n = Number((e.currentTarget as HTMLSelectElement).value) as ReadingStage;
    if (!READING_STAGES.includes(n) || n === 1) onChange(undefined);
    else onChange({ ...value, startStage: n });
  }

  return (
    <div class="pa-field">
      <label class="pa-field__label" for="reading-start-stage">
        Étape de départ
      </label>
      <select
        id="reading-start-stage"
        class="pa-input rp-select"
        data-testid="reading-start-stage"
        value={String(current)}
        onChange={handleChange}
      >
        {READING_STAGES.map((s) => (
          <option key={s} value={String(s)} selected={s === current}>
            {s} · {STAGE_TITLES[s]}
          </option>
        ))}
      </select>
      <p class="pa-muted">Si elle connaît déjà ses lettres, commencez plus loin.</p>
    </div>
  );
}
