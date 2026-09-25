// Espace parent : verrou par code puis sous-routes (tableau de bord, ajout/modif enfant, statistiques).
// Le déverrouillage vit dans cet état ; il est donc perdu quand ce composant est démonté
// (c'est-à-dire quand on quitte l'espace parent, ex. « Retour au jeu »).
import { useEffect, useState } from 'preact/hooks';
import { getSettings } from '../storage';
import type { AppSettings } from '../storage';
import { ChildForm } from './ChildForm';
import { ChildStats } from './ChildStats';
import { Dashboard } from './Dashboard';
import './parent.css';
import { PinGate } from './PinGate';
import { describeError } from './util';

export function ParentSpace(props: { path: string[] }) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getSettings()
      .then((s) => {
        if (!cancelled) setSettings(s);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(describeError(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loadError) {
    return (
      <div className="pa-space pa-space--center">
        <p className="pa-error">{loadError}</p>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="pa-space pa-space--center">
        <p className="pa-muted">Chargement…</p>
      </div>
    );
  }

  if (!unlocked) {
    return (
      <PinGate
        settings={settings}
        onUnlocked={(next) => {
          setSettings(next);
          setUnlocked(true);
        }}
      />
    );
  }

  return <ParentRoutes path={props.path} />;
}

function ParentRoutes(props: { path: string[] }) {
  const [segment, id, action] = props.path;

  if (segment === 'new-child') {
    return <ChildForm mode="create" />;
  }
  if (segment === 'child' && id && action === 'edit') {
    return <ChildForm mode="edit" profileId={id} />;
  }
  if (segment === 'child' && id) {
    return <ChildStats profileId={id} />;
  }
  return <Dashboard />;
}
