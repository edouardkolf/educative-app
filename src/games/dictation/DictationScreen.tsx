// Souche de l'écran de la dictée quotidienne (docs/specs/HUB.md §6.5). Repris par la tâche « dictée »
// (docs/specs/DICTEE.md).
import { returnTo } from '../../app/routes';
import { IconButton } from '../../ui/IconButton';
import { Icon } from '../../ui/icons/Icon';

export function DictationScreen() {
  return (
    <div class="screen">
      <IconButton size={56} onClick={() => returnTo('hub')} aria-label="Retour à l'accueil" data-testid="to-hub">
        <Icon name="home" size={36} />
      </IconButton>
      <div style={{ fontSize: '4rem', textAlign: 'center', marginTop: '40%' }}>🚧</div>
    </div>
  );
}
