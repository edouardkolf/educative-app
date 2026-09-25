import { expect, test } from '@playwright/test';

test('la page s\'ouvre et affiche le bon titre', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Petits Malins');
});
