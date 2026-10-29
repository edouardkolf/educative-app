// Morpion et pendu (docs/specs/MORPION-PENDU.md §8.2) : accès depuis le hub CE1, une grille gagnée à
// deux, une grille contre le téléphone, un mot trouvé, un mot perdu, puis les statistiques parent.
import { test, expect, type Page } from '@playwright/test';
import { backToHub, chooseProfile } from './nav';

const PARENT_PIN = '1234';

let jsErrors: string[] = [];
let consoleErrors: string[] = [];

test.beforeEach(async ({ page }) => {
  jsErrors = [];
  consoleErrors = [];
  page.on('pageerror', (err) => jsErrors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
});

test.afterEach(() => {
  expect(jsErrors, `Erreur(s) JS non interceptée(s) sur la page :\n${jsErrors.join('\n')}`).toEqual([]);
  expect(consoleErrors, `console.error émis par la page :\n${consoleErrors.join('\n')}`).toEqual([]);
});

async function enterPin(page: Page, pin: string): Promise<void> {
  for (const digit of pin) {
    await page.getByTestId(`pin-key-${digit}`).click();
  }
}

async function onboardCe1Child(page: Page, name: string): Promise<void> {
  await page.goto('/');
  await page.getByText('Commencer : espace parent').click();
  await enterPin(page, PARENT_PIN);
  await expect(page.getByText('Confirme le code')).toBeVisible();
  await enterPin(page, PARENT_PIN);
  await expect(page.getByRole('heading', { name: 'Espace parent' })).toBeVisible();
  await page.getByTestId('add-child').click();
  await page.locator('input[name=name]').fill(name);
  await page.locator('.pa-track-option', { hasText: 'CE1' }).click();
  await page.getByTestId('save-child').click();
  await expect(page.getByRole('heading', { name: 'Espace parent' })).toBeVisible();
  await page.getByTestId('back-to-game').click();
}

async function longPress(page: Page, locator: ReturnType<Page['getByTestId']>, ms: number): Promise<void> {
  const box = await locator.boundingBox();
  if (!box) throw new Error('Élément introuvable pour simuler un appui long.');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  await page.mouse.up();
}

test('morpion : à deux, les croix gagnent ; contre le téléphone, la grille va au bout', async ({ page }) => {
  await onboardCe1Child(page, 'Timéo');
  await chooseProfile(page, 'Timéo');
  await page.getByTestId('hub-tile-tictactoe').click();
  await expect(page).toHaveURL(/#\/tictactoe$/);

  // À deux : X 0, O 3, X 1, O 4, X 2 → les croix gagnent.
  await page.getByTestId('ttt-mode-duo').click();
  for (const cell of [0, 3, 1, 4, 2]) await page.getByTestId(`ttt-cell-${cell}`).click();
  await expect(page.getByTestId('tictactoe')).toHaveAttribute('data-outcome', 'x');
  await expect(page.getByTestId('ttt-result')).toHaveText('Les croix gagnent !');
  await expect(page.getByTestId('ttt-score-value')).toHaveText('1 – 0');
  await expect(page.getByTestId('ttt-cell-0')).toHaveClass(/ttt-cell--win/);

  // Grille suivante : les ronds commencent.
  await page.getByTestId('ttt-again').click();
  await page.getByTestId('ttt-cell-4').click();
  await expect(page.getByTestId('ttt-cell-4')).toHaveAttribute('data-mark', 'o');

  // Contre le téléphone : retour au hub, nouveau morpion, on joue jusqu'à une issue.
  await backToHub(page);
  await page.getByTestId('hub-tile-tictactoe').click();
  await page.getByTestId('ttt-mode-solo').click();
  const screen = page.getByTestId('tictactoe');
  for (let turn = 0; turn < 5; turn += 1) {
    if ((await screen.getAttribute('data-outcome')) !== null) break;
    await expect(page.getByTestId('ttt-player-x')).toHaveClass(/ttt-player--active/);
    const free = page.locator('.ttt-cell:not([data-mark])').first();
    await free.click();
    // Le téléphone répond (ou la grille est finie).
    await expect
      .poll(async () => {
        if ((await screen.getAttribute('data-outcome')) !== null) return true;
        const marks = await page.locator('.ttt-cell[data-mark]').count();
        return marks % 2 === 0;
      })
      .toBe(true);
  }
  await expect(screen).toHaveAttribute('data-outcome', /^(x|o|draw)$/);
  await expect(page.getByTestId('ttt-again')).toBeVisible();

  // Le téléphone commence la grille suivante.
  await page.getByTestId('ttt-again').click();
  await expect(page.locator('.ttt-cell[data-mark="o"]')).toHaveCount(1);
});

test('pendu : nombre de lettres et indice ; un mot trouvé, un mot perdu ; statistiques parent', async ({ page }) => {
  test.slow();
  await onboardCe1Child(page, 'Timéo');
  await chooseProfile(page, 'Timéo');
  await page.getByTestId('hub-tile-hangman').click();
  await expect(page).toHaveURL(/#\/hangman$/);

  const screen = page.getByTestId('hangman');
  await expect(screen).toHaveAttribute('data-phase', 'play');
  const first = (await screen.getAttribute('data-word')) ?? '';
  expect(first.length).toBeGreaterThan(2);
  await expect(page.getByTestId('hm-letter-count')).toHaveText(`${first.length} lettres`);
  await expect(page.locator('.hm-slot')).toHaveCount(first.length);
  await expect(page.getByTestId('hm-hint')).not.toHaveText('');
  await expect(page.locator('[data-testid="hm-petal"]:not([data-fallen])')).toHaveCount(8);

  // Une lettre absente fait tomber un pétale.
  const absent = 'abcdefghijklmnopqrstuvwxyz'.split('').filter((l) => !first.includes(l));
  await page.locator(`.hm-key[data-key="${absent[0]}"]`).click();
  await expect(page.getByTestId('hm-flower')).toHaveAttribute('data-petals-left', '7');
  await expect(page.locator(`.hm-key[data-key="${absent[0]}"]`)).toHaveAttribute('data-state', 'miss');

  // Les bonnes lettres (sans accent : « e » révèle aussi é, è, ê) → trouvé.
  for (const letter of new Set(first.split(''))) {
    await page.locator(`.hm-key[data-key="${letter}"]`).click();
  }
  await expect(screen).toHaveAttribute('data-outcome', 'found');
  await expect(page.getByTestId('hm-end')).toContainText('Bravo');

  // Mot suivant, perdu en 8 erreurs : le mot est montré.
  await page.getByTestId('hm-next').click();
  await expect(screen).toHaveAttribute('data-phase', 'play');
  const second = (await screen.getAttribute('data-word')) ?? '';
  expect(second).not.toBe(first);
  const wrong = 'abcdefghijklmnopqrstuvwxyz'.split('').filter((l) => !second.includes(l)).slice(0, 8);
  for (const letter of wrong) await page.locator(`.hm-key[data-key="${letter}"]`).click();
  await expect(screen).toHaveAttribute('data-outcome', 'lost');
  await expect(page.getByTestId('hm-flower')).toHaveAttribute('data-petals-left', '0');
  await expect(page.getByTestId('hm-end')).toContainText('Le mot était');

  // Statistiques parent : un bloc par nouveau jeu.
  await backToHub(page);
  await page.getByTestId('hub-to-profiles').click();
  await longPress(page, page.getByTestId('parent-access'), 2100);
  await enterPin(page, PARENT_PIN);
  await page.getByRole('button', { name: 'Statistiques' }).click();
  await expect(page.getByTestId('game-stats-hangman')).toBeVisible();
  await expect(page.getByTestId('hangman-stats-found')).toHaveText('1 / 2');
  await expect(page.getByTestId('game-stats-tictactoe')).toBeVisible();
});
