/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  /** Variante de l'app (src/app/flavor.ts) : "lecture" pour Petits Lecteurs, absente pour Petits Malins. */
  readonly VITE_APP_FLAVOR?: string;
}
