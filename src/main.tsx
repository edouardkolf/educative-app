import { render } from 'preact';
import { registerSW } from 'virtual:pwa-register';
import { App } from './app/App';
import { setPendingUpdate } from './app/updates';
import './styles/global.css';

const rootElement = document.getElementById('app');
if (rootElement) {
  render(<App />, rootElement);
}

// F12 : registerType "prompt" côté vite-plugin-pwa (jamais skipWaiting immédiat) — une nouvelle
// version est téléchargée dès qu'elle est disponible (`immediate: true`), mais son activation
// (`updateSW(true)`, qui recharge la page) est reportée : `onNeedRefresh` la mémorise seulement, et
// c'est l'écran profils (aucune partie en cours) qui l'applique à son montage (voir ProfilePicker.tsx).
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    setPendingUpdate(() => updateSW(true));
  },
  onRegisteredSW(_url, registration) {
    if (!registration) return;
    // Vérifie une nouvelle version toutes les heures : sans ça, `autoUpdate`/`prompt` ne revérifie
    // qu'au prochain chargement complet de la page, rare avec l'épinglage d'écran Android.
    window.setInterval(
      () => {
        registration.update().catch((err) => console.error('registration.update failed', err));
      },
      60 * 60 * 1000,
    );
  },
});
