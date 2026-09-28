// Aides de navigation e2e communes (docs/specs/HUB.md §8.2, arbitrage A11) : remplace les copies
// locales de chaque spec. Pas de suffixe `.spec` : ce fichier n'est pas exécuté comme un test.
import { expect, type Locator, type Page } from '@playwright/test';

export function profileCard(page: Page, name: string): Locator {
  return page.getByRole('button', { name: new RegExp(name) });
}

/** Profils → hub (attend l'écran hub). */
export async function chooseProfile(page: Page, name: string): Promise<void> {
  await profileCard(page, name).click();
  await expect(page.getByTestId('hub')).toBeVisible();
}

/** Hub → carte (attend la carte). */
export async function openMap(page: Page): Promise<void> {
  await page.getByTestId('hub-tile-map').click();
  await expect(page.locator('.screen--map')).toBeVisible();
}

/** Profils → hub → carte, en un geste (le cas le plus courant des specs existantes). */
export async function enterMap(page: Page, name: string): Promise<void> {
  await chooseProfile(page, name);
  await openMap(page);
}

/** Depuis la carte ou un jeu : la maison ramène au hub. */
export async function backToHub(page: Page): Promise<void> {
  await page.getByTestId('to-hub').click();
  await expect(page.getByTestId('hub')).toBeVisible();
}

/** Depuis la carte ou un jeu : maison puis avatar, jusqu'aux profils. */
export async function backToProfiles(page: Page): Promise<void> {
  await backToHub(page);
  await page.getByTestId('hub-to-profiles').click();
}
