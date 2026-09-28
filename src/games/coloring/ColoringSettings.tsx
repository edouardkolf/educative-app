// Réglage « Palier du code » de la fiche enfant (docs/specs/COLORIAGE.md §6.3, cadre A6). Sélecteur
// segmenté comme « Déblocage » dans ChildStats : Automatique · Goutte · Objet · Formes · Dé.
import type { GameSettingsProps } from '../index';
import type { ColoringSettings as ColoringSettingsValue, ColoringTier } from '../../storage/colorings';

const OPTIONS: { key: ColoringTier | 'auto'; label: string }[] = [
  { key: 'auto', label: 'Automatique' },
  { key: 1, label: 'Goutte' },
  { key: 2, label: 'Objet' },
  { key: 3, label: 'Formes' },
  { key: 4, label: 'Dé' },
];

export function ColoringSettings({ value, onChange }: GameSettingsProps<ColoringSettingsValue>) {
  const current: ColoringTier | 'auto' = value?.tier ?? 'auto';

  function handlePick(key: ColoringTier | 'auto') {
    if (key === 'auto') onChange(undefined);
    else onChange({ tier: key });
  }

  return (
    <div class="pa-field">
      <p class="pa-field__label">Palier du code</p>
      <div class="pa-segmented" role="group" aria-label="Palier du code magique">
        {OPTIONS.map((opt) => (
          <button
            key={opt.key}
            type="button"
            class="pa-segmented__option"
            data-testid={`coloring-tier-${opt.key}`}
            aria-pressed={current === opt.key}
            onClick={() => handlePick(opt.key)}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <p class="pa-muted">« Automatique » suit la réussite de l'enfant (docs/specs/COLORIAGE.md §3.4).</p>
    </div>
  );
}
