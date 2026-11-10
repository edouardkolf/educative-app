// Aides communes aux tests e2e du programme de lecture (docs/specs/LECTURE.md §12) et au script de captures
// `reading-shots.manual.ts`. Pas de suffixe `.spec` : ce fichier n'est pas exécuté comme un test.
import { expect, type Locator, type Page } from '@playwright/test';

export const PARENT_PIN = '1234';

export type VoiceMode = 'fr' | 'en' | 'none' | 'absent';

/**
 * Installe une fausse `speechSynthesis` avant toute navigation (même technique que dictation.spec.ts).
 * Chaque énoncé se termine en quelques millisecondes pour garder la suite rapide. `absent` : l'API n'existe pas.
 */
export async function installFakeVoice(page: Page, mode: VoiceMode): Promise<void> {
  await page.addInitScript((voiceMode) => {
    (window as unknown as { __spoken: string[] }).__spoken = [];
    if (voiceMode === 'absent') {
      Object.defineProperty(window, 'speechSynthesis', { configurable: true, get: () => undefined });
      Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, writable: true, value: undefined });
      return;
    }

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
        }, (window as unknown as { __speakMs?: number }).__speakMs ?? 8);
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

    // `speechSynthesis` est en lecture seule sur Window : on la redéfinit sur l'objet window lui-même.
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, get: () => fakeSynth });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, writable: true, value: FakeUtterance });
  }, mode);
}

export async function spokenTexts(page: Page): Promise<string[]> {
  return page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken ?? []);
}

export async function enterPin(page: Page, pin: string): Promise<void> {
  for (const digit of pin) {
    await page.getByTestId(`pin-key-${digit}`).click();
  }
}

/**
 * Premier lancement : code parent 1234, puis une enfant de moyenne section (parcours par défaut) sans limite de
 * temps. `startStage` règle « Étape de départ » dès la création de la fiche.
 */
export async function onboardMs(page: Page, name: string, startStage?: 1 | 2 | 3 | 4 | 5): Promise<void> {
  await page.goto('/');
  await page.getByText('Commencer : espace parent').click();
  await expect(page.getByText('Créer le code parent')).toBeVisible();
  await enterPin(page, PARENT_PIN);
  await expect(page.getByText('Confirme le code')).toBeVisible();
  await enterPin(page, PARENT_PIN);
  await expect(page.getByRole('heading', { name: 'Espace parent' })).toBeVisible();
  await page.getByTestId('add-child').click();
  await page.locator('input[name=name]').fill(name);
  await page.locator('select[name=sessionMinutes]').selectOption('');
  await page.locator('select[name=dailyMinutes]').selectOption('');
  if (startStage !== undefined) {
    await page.getByTestId('reading-start-stage').selectOption(String(startStage));
  }
  await page.getByTestId('save-child').click();
  await expect(page.getByRole('heading', { name: 'Espace parent' })).toBeVisible();
  await page.getByTestId('back-to-game').click();
  await expect(page.getByText('Commencer : espace parent')).toHaveCount(0);
}

async function longPress(page: Page, locator: Locator, ms: number): Promise<void> {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  if (!box) throw new Error('Élément introuvable pour simuler un appui long.');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  await page.mouse.up();
}

/** Depuis l'écran des profils : appui long sur l'accès parent, code, tableau de bord. */
export async function openParentDashboard(page: Page): Promise<void> {
  await longPress(page, page.getByTestId('parent-access'), 2100);
  await expect(page.getByText('Code parent', { exact: true })).toBeVisible();
  await enterPin(page, PARENT_PIN);
  await expect(page.getByRole('heading', { name: 'Espace parent' })).toBeVisible();
}

/** Hub → tuile lecture → accueil du programme. */
export async function openReading(page: Page): Promise<void> {
  await page.getByTestId('hub-tile-reading').click();
  await expect(page.getByTestId('reading-home')).toBeVisible();
}

/** Accueil → étape en cours → séance (attend le premier écran de question). */
export async function startCurrentStage(page: Page): Promise<void> {
  // `force` : le médaillon de l'étape en cours pulse en permanence (Playwright ne le juge jamais « stable »).
  await page.locator('[data-testid^="reading-stage-"][data-state="current"]').click({ force: true });
  await expect(page.getByTestId('reading-session')).toBeVisible();
  await expect(page.getByTestId('reading-question')).toBeVisible();
}

export interface PlayedQuestion {
  game: string;
  item: string;
  answer: string;
  guided: boolean;
  retry: boolean;
  /** Choix faux tapé volontairement avant la bonne réponse (id), sinon null. */
  wrongChoice: string | null;
}

/** Attend que les choix de la question soient actifs (la consigne est finie ou les 6 s sont écoulées). */
async function waitReady(question: Locator): Promise<void> {
  await expect(question).toHaveAttribute('data-ready', 'true', { timeout: 10_000 });
}

/**
 * Répond juste à la question affichée : tambour (on tape `data-answer` fois, la réponse part 2 s après la
 * dernière frappe) ou choix `data-choice=<data-answer>`. Rend ce qui a été joué.
 */
export async function answerCurrent(
  page: Page,
  wrongFirst = false,
  before?: (info: PlayedQuestion, page: Page) => Promise<void>,
  afterWrong?: (info: PlayedQuestion, page: Page) => Promise<void>,
): Promise<PlayedQuestion> {
  const question = page.getByTestId('reading-question');
  await waitReady(question);
  const info: PlayedQuestion = {
    game: (await question.getAttribute('data-game')) ?? '',
    item: (await question.getAttribute('data-item')) ?? '',
    answer: (await question.getAttribute('data-answer')) ?? '',
    guided: (await question.getAttribute('data-guided')) === 'true',
    retry: (await question.getAttribute('data-retry')) === 'true',
    wrongChoice: null,
  };
  if (before) await before(info, page);
  if (info.game === 'syllable-drum') {
    const drum = question.locator('[data-choice="drum"]');
    for (let i = 0; i < Number(info.answer); i += 1) await drum.click();
  } else {
    if (wrongFirst && !info.guided) {
      const wrong = question.locator(`[data-choice]:not([data-choice="${info.answer}"])`).first();
      info.wrongChoice = await wrong.getAttribute('data-choice');
      await wrong.click();
      // Le choix faux se grise (inerte) et reste visible ; la bonne réponse, elle, reste tapable.
      await expect(wrong).toHaveClass(/rv-choice--wrong/);
      await expect(wrong).toHaveAttribute('aria-disabled', 'true');
      if (afterWrong) await afterWrong(info, page);
    }
    await question.locator(`[data-choice="${info.answer}"]`).click();
  }
  return info;
}

/**
 * Joue une séance COMPLÈTE en répondant juste partout (démonstrations comprises), jusqu'à la fête.
 * `onQuestion` est appelé avant chaque réponse. Rend les questions jouées dans l'ordre.
 */
export async function playFullSession(
  page: Page,
  options: {
    onQuestion?: (info: PlayedQuestion, page: Page) => Promise<void>;
    /** Appelé quand les choix sont actifs, juste avant la réponse (captures d'écran). */
    beforeAnswer?: (info: PlayedQuestion, page: Page) => Promise<void>;
    errOnce?: boolean;
    /** Appelé juste après l'erreur volontaire (le choix faux est grisé). */
    afterWrong?: (info: PlayedQuestion, page: Page) => Promise<void>;
  } = {},
): Promise<PlayedQuestion[]> {
  const { onQuestion, beforeAnswer, errOnce = false, afterWrong } = options;
  let erred = false;
  const played: PlayedQuestion[] = [];
  const question = page.getByTestId('reading-question');
  const end = page.getByTestId('reading-end');
  for (let guard = 0; guard < 40; guard += 1) {
    await expect(question.or(end)).toBeVisible({ timeout: 15_000 });
    if (await end.isVisible()) break;
    const handle = await question.elementHandle();
    if (!handle) continue;
    if ((await question.getAttribute('data-solved')) === 'true') {
      await expect.poll(() => handle.evaluate((el) => el.isConnected), { timeout: 15_000 }).toBe(false);
      continue;
    }
    await waitReady(question);
    const game = await question.getAttribute('data-game');
    const eligible = errOnce && !erred && game !== 'syllable-drum' && (await question.getAttribute('data-guided')) !== 'true';
    const info = await answerCurrent(page, eligible, beforeAnswer, afterWrong);
    if (info.wrongChoice) erred = true;
    if (onQuestion) await onQuestion(info, page);
    played.push(info);
    // Le conteneur est remonté à chaque tour (clé) : on attend le suivant ou la fête.
    await expect.poll(() => handle.evaluate((el) => el.isConnected).catch(() => false), { timeout: 20_000 }).toBe(false);
  }
  await expect(end).toBeVisible({ timeout: 15_000 });
  return played;
}

/** Fête → bouton coche → accueil. */
export async function finishEnd(page: Page): Promise<void> {
  await page.getByTestId('reading-end-continue').click();
  await expect(page.getByTestId('reading-home')).toBeVisible();
}

interface StoredReading {
  stage: number;
  planned: number;
  status: string;
  endReason: string | null;
  review: boolean;
  demos: string[];
  newItemId: string | null;
  answers: { game: string; itemId: string; correct: boolean; chosen: string | null; retry: boolean }[];
}

/** Lit le store `readings` d'IndexedDB (base de l'app, déjà créée). */
export async function readReadings(page: Page): Promise<StoredReading[]> {
  return page.evaluate(
    () =>
      new Promise<StoredReading[]>((resolve, reject) => {
        const open = indexedDB.open('petits-malins');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const request = db.transaction('readings', 'readonly').objectStore('readings').getAll();
          request.onsuccess = () => {
            resolve(request.result as StoredReading[]);
            db.close();
          };
          request.onerror = () => reject(request.error);
        };
      }),
  );
}
