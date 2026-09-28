// Souche de l'écran du coloriage magique (docs/specs/HUB.md §6.5). Repris par la tâche « coloriage »
// (docs/specs/COLORIAGE.md).
import { returnTo } from '../../app/routes';
import { IconButton } from '../../ui/IconButton';
import { Icon } from '../../ui/icons/Icon';

export function ColoringScreen() {
  return (
    <div class="screen">
      <IconButton size={56} onClick={() => returnTo('hub')} aria-label="Retour à l'accueil" data-testid="to-hub">
        <Icon name="home" size={36} />
      </IconButton>
      <div style={{ fontSize: '4rem', textAlign: 'center', marginTop: '40%' }}>🚧</div>
    </div>
  );
}
