// Dictée quotidienne (docs/specs/DICTEE.md §2, §3.3, §6, §8 « E2E »). Chromium headless n'a pas de
// voix : `installFakeVoice` simule `speechSynthesis` avant toute navigation. Navigation par
// `tests/e2e/nav.ts` (arbitrage A11).
import { test, expect, type Page } from '@playwright/test';
import { chooseProfile, profileCard } from './nav';

const PARENT_PIN = '1234';

// ---------- Garde-fou qualité : aucune erreur JS, aucun console.error pendant un test ----------

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

// ---------- Voix simulée (Chromium headless n'a pas de synthèse vocale) ----------

type VoiceMode = 'fr' | 'en' | 'none';

/** Installe une fausse `speechSynthesis` avant toute navigation (docs/specs/DICTEE.md §8). */
async function installFakeVoice(page: Page, mode: VoiceMode): Promise<void> {
  await page.addInitScript((voiceMode) => {
    (window as unknown as { __spoken: string[] }).__spoken = [];

    class FakeUtterance {
      text: string;
      lang = '';
      rate = 1;
      pitch = 1;
      volume = 1;
      voice: unknown = null;
      onend: (() => void) | null = null;
      onerror: ((ev: { error: string }) => void) | null = null;
      constructor(text: string) {
        this.text = text;
      }
    }

    const voices =
      voiceMode === 'fr'
        ? [{ name: 'Fake FR', lang: 'fr-FR', localService: true, default: true }]
        : voiceMode === 'en'
          ? [{ name: 'Fake EN', lang: 'en-US', localService: true, default: true }]
          : [];

    let current: FakeUtterance | null = null;

    const fakeSynth = {
      pending: false,
      speaking: false,
      paused: false,
      onvoiceschanged: null as (() => void) | null,
      getVoices: () => voices,
      speak: (u: FakeUtterance) => {
        current = u;
        fakeSynth.speaking = true;
        (window as unknown as { __spoken: string[] }).__spoken.push(u.text);
        setTimeout(() => {
          fakeSynth.speaking = false;
          if (current === u && u.onend) u.onend();
        }, 30);
      },
      cancel: () => {
        fakeSynth.speaking = false;
        if (current && current.onerror) current.onerror({ error: 'interrupted' });
        current = null;
      },
      resume: () => {
        fakeSynth.paused = false;
      },
      addEventListener: (type: string, cb: () => void) => {
        if (type === 'voiceschanged') setTimeout(cb, 0);
      },
      removeEventListener: () => {},
    };

    // `speechSynthesis` est une propriété en lecture seule de Window dans Chromium : une simple
    // affectation échoue sans bruit. On la redéfinit sur l'objet window lui-même.
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, get: () => fakeSynth });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, writable: true, value: FakeUtterance });
  }, mode);
}

async function spokenCount(page: Page): Promise<number> {
  return page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken?.length ?? 0);
}

async function spokenTexts(page: Page): Promise<string[]> {
  return page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken ?? []);
}

// ---------- Aides de navigation reprises de hub.spec.ts / parent.spec.ts ----------

async function enterPin(page: Page, pin: string): Promise<void> {
  for (const digit of pin) {
    await page.getByTestId(`pin-key-${digit}`).click();
  }
}

/** Premier lancement : code parent 1234, puis un enfant CE1. */
async function onboardWithChild(page: Page, name: string): Promise<void> {
  await page.goto('/');
  await expect(page.getByText('Commencer : espace parent')).toBeVisible();
  await page.getByText('Commencer : espace parent').click();

  await expect(page.getByText('Créer le code parent')).toBeVisible();
  await enterPin(page, PARENT_PIN);
  await expect(page.getByText('Confirme le code')).toBeVisible();
  await enterPin(page, PARENT_PIN);

  await expect(page.getByRole('heading', { name: 'Espace parent' })).toBeVisible();
  await page.getByTestId('add-child').click();
  await page.locator('input[name=name]').fill(name);
  await page.locator('.pa-track-option', { hasText: 'CE1' }).click();
  await expect(page.locator('.pa-track-option', { hasText: 'CE1' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('save-child').click();

  await expect(page.getByRole('heading', { name: 'Espace parent' })).toBeVisible();
  await page.getByTestId('back-to-game').click();
  await expect(page.getByText('Commencer : espace parent')).toHaveCount(0);
}

/** Appui long « réel » (pas d'horloge simulée dans ce fichier, sauf le test de fin douce). */
async function longPress(page: Page, locator: ReturnType<Page['getByTestId']>, ms: number): Promise<void> {
  const box = await locator.boundingBox();
  if (!box) throw new Error('Élément introuvable pour simuler un appui long.');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  await page.mouse.up();
}

/** Appui long piloté par l'horloge simulée (`page.clock` doit déjà être installée). */
async function longPressClock(page: Page, locator: ReturnType<Page['getByTestId']>, ms: number): Promise<void> {
  const box = await locator.boundingBox();
  if (!box) throw new Error('Élément introuvable pour simuler un appui long.');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.clock.runFor(ms);
  await page.mouse.up();
}

async function openParentDashboard(page: Page): Promise<void> {
  await longPress(page, page.getByTestId('parent-access'), 2100);
  await expect(page.getByText('Code parent', { exact: true })).toBeVisible();
  await enterPin(page, PARENT_PIN);
  await expect(page.getByRole('heading', { name: 'Espace parent' })).toBeVisible();
}

function statValue(card: ReturnType<Page['getByTestId']>, label: string): ReturnType<Page['getByTestId']> {
  return card.locator(`xpath=.//dt[normalize-space(text())="${label}"]/following-sibling::dd[1]`) as unknown as ReturnType<
    Page['getByTestId']
  >;
}

// ---------- Aides propres à la dictée ----------

function currentWord(page: Page) {
  return page.locator('.dict-word[data-answer]');
}

/** Tape chaque caractère d'un mot via le clavier intégré (`[data-key]`). */
async function typeChars(page: Page, text: string): Promise<void> {
  for (const char of Array.from(text)) {
    await page.locator(`[data-key="${char}"]`).click();
  }
}

/** Répond juste au mot affiché ; attend le mot suivant (nouveau `data-answer`) ou l'écran de fin. */
async function answerWordCorrectlyAndWait(page: Page): Promise<void> {
  const word = currentWord(page);
  const before = await word.getAttribute('data-answer');
  if (!before) throw new Error('Aucun mot affiché (data-answer introuvable).');
  await typeChars(page, before);
  await page.locator('[data-key="ok"]').click();
  await expect
    .poll(
      async () => {
        if (await page.getByTestId('dictation-end').isVisible()) return 'end';
        return currentWord(page).getAttribute('data-answer');
      },
      { timeout: 5000 },
    )
    .not.toBe(before);
}

/** Répond faux au mot affiché, puis le réécrit lettre à lettre ; rend le mot fauté. */
async function answerWordWithMistakeThenCorrect(page: Page): Promise<string> {
  const word = currentWord(page);
  const before = await word.getAttribute('data-answer');
  if (!before) throw new Error('Aucun mot affiché (data-answer introuvable).');

  await typeChars(page, 'zz'); // réponse volontairement fausse
  await page.locator('[data-key="ok"]').click();
  await expect(page.getByTestId('dictation')).toHaveAttribute('data-phase', 'copy');

  await typeChars(page, before); // réécriture guidée, lettre à lettre
  await expect
    .poll(
      async () => {
        if (await page.getByTestId('dictation-end').isVisible()) return 'end';
        return currentWord(page).getAttribute('data-answer');
      },
      { timeout: 5000 },
    )
    .not.toBe(before);

  return before;
}

async function assertNoHorizontalScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(overflow, 'Défilement horizontal détecté').toBe(false);
}

async function assertKeySizes(page: Page): Promise<void> {
  const keys = page.locator('.dict-keyboard [data-key]');
  const count = await keys.count();
  for (let i = 0; i < count; i += 1) {
    const box = await keys.nth(i).boundingBox();
    expect(box, `touche ${i} introuvable`).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
  const ok = page.locator('[data-key="ok"]');
  if ((await ok.count()) > 0) {
    const okBox = await ok.boundingBox();
    expect(okBox).not.toBeNull();
    expect(okBox!.width).toBeGreaterThanOrEqual(72);
    expect(okBox!.height).toBeGreaterThanOrEqual(72);
  }
}

// ==================== 1. Choix de série : 4 cartes, s2 → 10 mots, voix mot/phrase/mot ====================

test('choix de série : 4 cartes ; s2 tire 10 mots ; la voix dit mot, phrase, mot, jamais affichés', async ({
  page,
}) => {
  await installFakeVoice(page, 'fr');
  await onboardWithChild(page, 'Alice');
  await chooseProfile(page, 'Alice');
  await page.getByTestId('hub-tile-dictation').click();

  const cards = page.locator('.dict-series-card');
  await expect(cards).toHaveCount(4);
  for (let i = 0; i < 4; i += 1) {
    await expect(cards.nth(i).locator('.dict-series-card__words')).not.toHaveText('');
  }

  await page.locator('[data-series="s2"]').click();
  await expect(page.getByTestId('dictation')).toHaveAttribute('data-phase', 'word');
  await expect(page.locator('.play-progress__dot')).toHaveCount(10);

  await expect.poll(() => spokenCount(page), { timeout: 5000 }).toBeGreaterThanOrEqual(3);
  const spoken = await spokenTexts(page);
  const [wordFirst, sentence, wordAgain] = spoken;
  expect(wordAgain).toBe(wordFirst);

  const answer = await currentWord(page).getAttribute('data-answer');
  expect(answer).toBeTruthy();

  const bodyText = await page.locator('body').innerText();
  expect(bodyText).not.toContain(sentence);
  expect(bodyText).not.toContain(answer);
});

// ==================== 2. Mot juste avance ; mot faux → modèle, touche fausse ignorée, réécriture ====================

test('mot juste : le suivant est lu ; mot faux : modèle affiché, touche fausse ignorée, réécriture avance', async ({
  page,
}) => {
  await installFakeVoice(page, 'fr');
  await onboardWithChild(page, 'Alice');
  await chooseProfile(page, 'Alice');
  await page.getByTestId('hub-tile-dictation').click();
  await page.locator('[data-series="s1"]').click();

  const word = currentWord(page);
  const first = await word.getAttribute('data-answer');
  if (!first) throw new Error('Premier mot introuvable.');
  await expect.poll(() => spokenCount(page), { timeout: 5000 }).toBeGreaterThanOrEqual(3);
  const spokenBefore = await spokenCount(page);

  await typeChars(page, first);
  await page.locator('[data-key="ok"]').click();
  await expect(page.getByTestId('dictation')).toHaveAttribute('data-phase', 'solved');
  await expect.poll(() => word.getAttribute('data-answer'), { timeout: 5000 }).not.toBe(first);
  await expect.poll(() => spokenCount(page), { timeout: 5000 }).toBeGreaterThan(spokenBefore);

  const second = await word.getAttribute('data-answer');
  if (!second) throw new Error('Deuxième mot introuvable.');

  await typeChars(page, 'zz'); // réponse volontairement fausse
  await page.locator('[data-key="ok"]').click();
  await expect(page.getByTestId('dictation')).toHaveAttribute('data-phase', 'copy');
  await expect(page.getByTestId('dictation-model')).toBeVisible();
  await expect(page.getByTestId('dictation-attempt')).toBeVisible();

  // Une touche fausse (différente de la première lettre attendue) ne s'ajoute pas.
  const wrongChar = second.startsWith('a') ? 'b' : 'a';
  await page.locator(`[data-key="${wrongChar}"]`).click();
  await expect(word).toHaveText('');

  // La réécriture guidée mène au mot suivant ; la saisie fausse s'efface dès la première lettre réécrite.
  await typeChars(page, second.slice(0, 1));
  await expect(page.getByTestId('dictation-attempt')).toHaveAttribute('data-faded', 'true');
  await typeChars(page, second.slice(1));
  await expect
    .poll(
      async () => {
        if (await page.getByTestId('dictation-end').isVisible()) return 'end';
        return word.getAttribute('data-answer');
      },
      { timeout: 5000 },
    )
    .not.toBe(second);
});

// ==================== 3. Dictée s1 complète : total 5, « encore », maison, s1 reste proposée ====================

test('dictée s1 jusqu’au bout : data-total="5" ; « encore », maison, puis s1 reste proposée', async ({ page }) => {
  await installFakeVoice(page, 'fr');
  await onboardWithChild(page, 'Alice');
  await chooseProfile(page, 'Alice');
  await page.getByTestId('hub-tile-dictation').click();
  await page.locator('[data-series="s1"]').click();

  for (let i = 0; i < 5; i += 1) {
    await answerWordCorrectlyAndWait(page);
  }
  await expect(page.getByTestId('dictation-end')).toHaveAttribute('data-total', '5');
  await expect(page.getByTestId('dictation-again')).toBeVisible();

  await page.getByTestId('dictation-again').click();
  await expect(page.getByTestId('dictation')).toHaveAttribute('data-phase', 'word');

  await page.getByTestId('to-hub').click();
  await expect(page.getByTestId('hub')).toBeVisible();

  await page.getByTestId('hub-tile-dictation').click();
  await expect(page.locator('[data-series="s1"]')).toHaveAttribute('aria-current', 'true');
});

// ==================== 4. Statistiques parent : terminée + abandon, mot fragile listé ====================

test('statistiques parent : une dictée terminée, une abandonnée, un mot fragile listé', async ({ page }) => {
  await installFakeVoice(page, 'fr');
  await onboardWithChild(page, 'Alice');
  await chooseProfile(page, 'Alice');
  await page.getByTestId('hub-tile-dictation').click();
  await page.locator('[data-series="s1"]').click();

  const wrongWord = await answerWordWithMistakeThenCorrect(page);
  for (let i = 0; i < 4; i += 1) {
    await answerWordCorrectlyAndWait(page);
  }
  await expect(page.getByTestId('dictation-end')).toBeVisible();
  await expect(page.getByTestId('to-hub')).toBeVisible();
  await page.getByTestId('to-hub').click();
  await expect(page.getByTestId('hub')).toBeVisible();

  // Deuxième dictée : un mot validé, puis abandon par la maison. Le tirage est aléatoire : si le premier
  // mot est justement le mot fauté, on le rate à nouveau (sinon il ne serait plus « fragile », à raison).
  await page.getByTestId('hub-tile-dictation').click();
  await page.locator('.dict-series-card--current').click();
  const firstOfSecond = await currentWord(page).getAttribute('data-answer');
  if (firstOfSecond === wrongWord) {
    await typeChars(page, 'zz');
    await page.locator('[data-key="ok"]').click();
    await expect(page.getByTestId('dictation')).toHaveAttribute('data-phase', 'copy');
  } else {
    await answerWordCorrectlyAndWait(page);
  }
  await page.getByTestId('to-hub').click();
  await expect(page.getByTestId('hub')).toBeVisible();

  await page.getByTestId('hub-to-profiles').click();
  await openParentDashboard(page);
  await page.getByRole('button', { name: 'Statistiques' }).click();

  const card = page.getByTestId('game-stats-dictation');
  await expect(statValue(card, 'Terminées')).toHaveText('1');
  await expect(statValue(card, 'Abandons')).toHaveText('1');

  const fragilePill = page.getByTestId('dictation-stats').locator('.dict-stats__pill', { hasText: wrongWord });
  await expect(fragilePill).toHaveCount(1);
});

// ==================== 5. Voix indisponible et son coupé ====================

test('voix indisponible (anglais uniquement) : tuile avec badge, écran d’explication', async ({ page }) => {
  await installFakeVoice(page, 'en');
  await onboardWithChild(page, 'Alice');
  await chooseProfile(page, 'Alice');

  const tile = page.getByTestId('hub-tile-dictation');
  await expect(tile.locator('.hub-tile__badge')).toBeVisible();

  await tile.click();
  await expect(page.getByTestId('dictation-unavailable')).toHaveAttribute('data-reason', 'no-french-voice');
  await page.getByTestId('to-hub').click();
  await expect(page.getByTestId('hub')).toBeVisible();
});

test('son coupé : l’écran d’indisponibilité de la dictée donne la raison « muted »', async ({ page }) => {
  await installFakeVoice(page, 'fr');
  await onboardWithChild(page, 'Alice');

  await openParentDashboard(page);
  await page.getByTestId('tab-settings').click();
  await page.getByTestId('toggle-sound').click();
  await page.getByTestId('back-to-game').click();

  await chooseProfile(page, 'Alice');
  const tile = page.getByTestId('hub-tile-dictation');
  await expect(tile.locator('.hub-tile__badge')).toBeVisible();

  await tile.click();
  await expect(page.getByTestId('dictation-unavailable')).toHaveAttribute('data-reason', 'muted');
});

// ==================== 6. Fin douce : le mot en cours se termine, écran de fin, interruption ====================

test('fin douce (dictée) : le mot en cours se termine, écran de fin, comptée en interruption', async ({ page }) => {
  test.slow();
  await installFakeVoice(page, 'fr');
  await page.clock.install();
  await onboardWithChild(page, 'Alice');
  await chooseProfile(page, 'Alice');
  await page.getByTestId('hub-tile-dictation').click();
  await page.locator('[data-series="s1"]').click();

  const word = currentWord(page);
  const answer = await word.getAttribute('data-answer');
  if (!answer) throw new Error('Aucun mot affiché.');

  await page.clock.runFor('15:05'); // dépasse les 15 min de session par défaut, pendant le mot en cours

  await typeChars(page, answer); // le mot en cours se termine malgré le temps écoulé
  await page.locator('[data-key="ok"]').click();
  await page.clock.runFor(120_000); // laisse s'écouler l'animation « solved » (900/1200 ms)

  await expect(page.getByTestId('lock-parent')).toBeVisible();

  // Déverrouille et termine la session pour lire les statistiques (horloge toujours simulée).
  await longPressClock(page, page.getByTestId('lock-parent'), 2100);
  await expect(page.getByText('Code parent', { exact: true })).toBeVisible();
  await enterPin(page, PARENT_PIN);
  await expect(page.getByTestId('end-session')).toBeVisible();
  await page.getByTestId('end-session').click();

  await expect(profileCard(page, 'Alice')).toBeVisible();
  await longPressClock(page, page.getByTestId('parent-access'), 2100);
  await expect(page.getByText('Code parent', { exact: true })).toBeVisible();
  await enterPin(page, PARENT_PIN);
  await page.getByRole('button', { name: 'Statistiques' }).click();

  const card = page.getByTestId('game-stats-dictation');
  await expect(statValue(card, 'Interruptions')).toHaveText('1');
});

// ==================== 7. Petits écrans : pas de défilement, clavier et ✓ visibles, cibles suffisantes ====================

test('dictée : 412×839 et 360×640 sans défilement horizontal, clavier et ✓ visibles, cibles suffisantes', async ({
  page,
}) => {
  await installFakeVoice(page, 'fr');
  await onboardWithChild(page, 'Alice');
  await chooseProfile(page, 'Alice');
  await page.getByTestId('hub-tile-dictation').click();
  await page.locator('[data-series="s1"]').click();
  await expect(page.getByTestId('dictation')).toHaveAttribute('data-phase', 'word');

  const viewports = [
    { width: 412, height: 839 },
    { width: 360, height: 640 },
  ];

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await assertNoHorizontalScroll(page);
    await expect(page.locator('.dict-keyboard')).toBeInViewport();
    await expect(page.locator('[data-key="ok"]')).toBeInViewport();
    await assertKeySizes(page);
  }

  // Phase `copy` : même vérification, le ✓ est masqué pendant la réécriture.
  await typeChars(page, 'zz');
  await page.locator('[data-key="ok"]').click();
  await expect(page.getByTestId('dictation')).toHaveAttribute('data-phase', 'copy');

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await assertNoHorizontalScroll(page);
    await expect(page.locator('.dict-keyboard')).toBeInViewport();
    await assertKeySizes(page);
  }
});
