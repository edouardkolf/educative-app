/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';

// Deux apps, une base de code (src/app/flavor.ts, docs/specs/LECTURE-APP.md) :
// - `vite build` → Petits Malins (dist/) ;
// - `vite build --mode lecture` → Petits Lecteurs (dist-lecture/), variante fixée par `.env.lecture`.
const APPS = {
  malins: {
    name: 'Petits Malins',
    description: 'Jeux éducatifs pour la maternelle',
    outDir: 'dist',
  },
  lecture: {
    name: 'Petits Lecteurs',
    description: 'Apprendre à lire en maternelle, en jouant',
    outDir: 'dist-lecture',
  },
} as const;

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const flavor = env.VITE_APP_FLAVOR === 'lecture' ? 'lecture' : 'malins';
  const app = APPS[flavor];
  return {
    base: process.env.BASE_PATH ?? '/',
    build: { outDir: app.outDir },
    plugins: [
      preact(),
      {
        // Titre de l'onglet et de l'écran d'accueil iOS : celui de l'app construite.
        name: 'app-title',
        transformIndexHtml: (html: string) => html.replace(/<title>[^<]*<\/title>/, `<title>${app.name}</title>`),
      },
      VitePWA({
        // F12 : "prompt" (pas "autoUpdate") — la mise à jour n'est appliquée qu'au moment sûr choisi
        // par src/main.tsx (montage de l'écran profils), jamais en pleine partie.
        registerType: 'prompt',
        injectRegister: false,
        includeAssets: ['favicon.svg', 'icons/*.png'],
        manifest: {
          name: app.name,
          short_name: app.name,
          description: app.description,
          lang: 'fr',
          display: 'fullscreen',
          display_override: ['fullscreen', 'standalone'],
          orientation: 'portrait',
          background_color: '#FFF7E8',
          theme_color: '#FFB347',
          start_url: '.',
          scope: '.',
          icons: [
            {
              src: 'icons/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: 'icons/maskable-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest,woff2}'],
          // Fredoka embarque un sous-ensemble hébreu inutile ici : jamais précaché.
          globIgnores: ['**/*hebrew*'],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          cleanupOutdatedCaches: true,
          navigateFallback: 'index.html',
          // Petits Lecteurs est publié dans le sous-dossier lecture/ du même site : Petits Malins ne sert jamais
          // sa propre page à sa place (chaque app a son service worker et sa portée).
          navigateFallbackDenylist: flavor === 'malins' ? [/\/lecture\//] : [],
        },
      }),
    ],
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts'],
    },
  };
});
