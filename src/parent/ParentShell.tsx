// Coque de l'espace parent : en-tête (titre + retour au jeu) et barre d'onglets en bas de l'écran,
// à portée de pouce. Trois onglets séparent ce qui était tout empilé : les enfants au quotidien,
// les données (sauvegarde / restauration) et les réglages (son, code parent, stockage).
// Les sous-pages (statistiques, fiche d'un enfant) n'ont pas d'onglets mais un retour vers « Enfants ».
import type { ComponentChildren } from 'preact';
import { navigate } from '../app/routes';
import { Icon } from '../ui/icons/Icon';
import type { IconName } from '../ui/icons/Icon';

export type ParentTab = 'children' | 'data' | 'settings';

const TABS: Array<{ id: ParentTab; label: string; icon: IconName; path: string[] }> = [
  { id: 'children', label: 'Enfants', icon: 'children', path: [] },
  { id: 'data', label: 'Données', icon: 'folder', path: ['data'] },
  { id: 'settings', label: 'Réglages', icon: 'gear', path: ['settings'] },
];

export function ParentShell(props: { tab: ParentTab; children: ComponentChildren }) {
  const label = TABS.find((t) => t.id === props.tab)?.label ?? 'Enfants';
  return (
    <div className="pa-space pa-space--tabs">
      <header className="pa-topbar">
        <h1 className="pa-topbar__title">Espace parent</h1>
        <button
          type="button"
          className="pa-home"
          data-testid="back-to-game"
          onClick={() => navigate({ name: 'profiles' })}
        >
          <Icon name="home" size={26} />
          <span>Retour au jeu</span>
        </button>
      </header>

      <main className="pa-panel" aria-label={label}>
        {props.children}
      </main>

      <nav className="pa-tabbar" aria-label="Sections de l'espace parent">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className="pa-tab"
            data-testid={`tab-${t.id}`}
            aria-current={t.id === props.tab ? 'page' : undefined}
            // Changer d'onglet ne s'empile pas dans l'historique : « retour » Android quitte l'espace parent.
            onClick={() => navigate({ name: 'parent', path: t.path }, { replace: true })}
          >
            <span className="pa-tab__icon">
              <Icon name={t.icon} size={30} />
            </span>
            <span className="pa-tab__label">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

/** Retour d'une sous-page (statistiques, fiche enfant) vers l'onglet « Enfants ». */
export function BackToChildren() {
  return (
    <button
      type="button"
      className="pa-back"
      aria-label="Retour aux enfants"
      onClick={() => navigate({ name: 'parent', path: [] })}
    >
      <Icon name="back" size={22} />
      <span>Enfants</span>
    </button>
  );
}
