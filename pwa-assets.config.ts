import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';
import type { AssetType, ResolvedAssetSize } from '@vite-pwa/assets-generator/config';

function assetName(type: AssetType, size: ResolvedAssetSize): string {
  switch (type) {
    case 'transparent':
      return `icons/icon-${size.width}.png`;
    case 'maskable':
      return `icons/maskable-${size.width}.png`;
    case 'apple':
      return `icons/apple-touch-icon-${size.width}.png`;
  }
}

export default defineConfig({
  images: ['public/favicon.svg'],
  preset: {
    ...minimal2023Preset,
    transparent: {
      ...minimal2023Preset.transparent,
      sizes: [192, 512],
      favicons: [],
    },
    maskable: {
      ...minimal2023Preset.maskable,
      padding: 0,
    },
    apple: {
      ...minimal2023Preset.apple,
      padding: 0,
    },
    assetName,
  },
});
