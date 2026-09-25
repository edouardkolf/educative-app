import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

const chromiumExecutablePath = '/opt/pw-browsers/chromium';
const launchOptions = existsSync(chromiumExecutablePath)
  ? { executablePath: chromiumExecutablePath }
  : {};

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  webServer: {
    command: 'npx vite build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  use: {
    baseURL: 'http://localhost:4173',
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
