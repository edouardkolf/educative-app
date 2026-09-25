import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

const chromiumExecutablePath = '/opt/pw-browsers/chromium';
// E2E_PORT permet à deux sessions de tests de tourner en parallèle (port et dossier de build distincts).
const port = Number(process.env.E2E_PORT ?? 4173);
const outDir = port === 4173 ? 'dist' : `dist-e2e-${port}`;
const launchOptions = existsSync(chromiumExecutablePath)
  ? { executablePath: chromiumExecutablePath }
  : {};

export default defineConfig({
  testDir: 'tests/e2e',
  outputDir: port === 4173 ? 'test-results' : `test-results-${port}`,
  fullyParallel: false,
  webServer: {
    command: `npx vite build --outDir ${outDir} && npx vite preview --outDir ${outDir} --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 7'],
        launchOptions,
      },
    },
  ],
});
