# Dictée quotidienne (CE1)

Cadre commun : [README.md](README.md), qui fait foi. Hub, routes, session et stockage v2 : [HUB.md](HUB.md).
Code : `src/games/dictation/`. Voix partagée : `src/ui/voice.ts`. Store : `dictations`.

## 1. Résumé

La grande (CE1, 7-8 ans) prépare ses dictées de classe. Depuis le hub, elle choisit sa série. L'app lui dicte les mots de
cette série et 5 mots tirés au hasard dans les séries précédentes, dans le désordre. Pour chaque mot, la voix du téléphone
dit le mot, une phrase qui le contient, puis le mot ; la phrase ne s'affiche jamais. Elle écrit sur un clavier intégré et
valide. Si c'est faux, elle voit son mot à côté du bon, puis réécrit le bon, guidée lettre à lettre. À la fin : ses mots,
son score, et le choix entre « encore » et le hub.

**Décision du PM (28/09/2026), telle quelle** : « Pour le niveau CE1 on va faire des dictées quotidiennes. En début de
dictée elle choisit où elle en est et tu proposes une dictée d'une dizaine de mots, 5 de la série en cours et 5 au hasard
dans les séries précédentes. On se servira de la voix du téléphone et il fait une phrase dans laquelle est le mot (ça
servira ensuite pour ver, vers, verre, vert…). Ce jeu existe en dehors du parcours classique. » Jeu illimité, sans vies,
sans étoiles de carte, sans cadenas, lancé depuis le hub. Usage visé : 15 min par jour en semaine. C'est elle qui réclame
des jeux d'orthographe « pour préparer ses dictées ».

**Décisions structurantes.**
- Clavier intégré alphabétique, touches de 52 px, chaque accent à côté de sa lettre (§2.2).
- Correction immédiate, puis réécriture guidée (§2.4).
- Déroulé vocal mot, phrase, mot ; réécoute illimitée et comptée (§3.3).
- Séries explicites dans `series.ts` ; la dernière série choisie se déduit de la dernière dictée (§3.1).
- La dictée est enregistrée au premier mot validé, avec un item par mot (§5).

## 2. Parcours de l'enfant

Un seul écran, `DictationScreen` (route `#/dictation`), en phases : `choose`, puis pour chaque mot `word` → [`copy`] →
`solved`, puis `end` ; plus `unavailable`. Racine : `<div class="screen screen--dictation" data-testid="dictation"
data-phase>`.

### 2.1 Choix de la série (`choose`)

- Le bouton maison (56 px) ramène au hub. Dessous, une carte par série de `DICTATION_SERIES`, s1 en haut ; défilement
  vertical seulement.
- Carte `<button data-series="s3">` : largeur 100 % (max 420 px), hauteur min 88 px, rayon 20 px, fond blanc,
  `--shadow-sm`. Elle montre :
  - à gauche, une pastille de 56 px avec le numéro (Fredoka 28 px) ;
  - au centre, les mots de la série (Andika 700, 20 px, sur plusieurs lignes si besoin) ;
  - à droite, l'émoji du monde (`WORLD_META`, via `<Emoji>`, 32 px) : 🌳 s1, 🐠 s2, 🏔️ s3, ☁️ s4 ; rien pour s5-s8.
- La série proposée (`defaultSeriesId`, §3.1) a une bordure de 4 px `--accent` qui pulse et `aria-current="true"`.
  Elle est centrée à l'affichage (`scrollIntoView({ block: 'center' })`).
- **Un tap sur une carte lance la dictée, sans confirmation.** Le tirage et la première lecture partent dans le
  gestionnaire du tap, de façon synchrone : la voix exige un geste de l'enfant (§3.4).
- Montrer les mots : elle reconnaît sa liste à ses mots plus sûrement qu'à un numéro. Montrer le monde : elle a
  rencontré ces mots là, sur la carte (PROGRESSION-CE1, « une série par monde »). Les voir juste avant d'écrire : Q6.

### 2.2 Écrire un mot (`word`)

```
[⌂ 56]          ● ● ◉ ○ ○ ○ ○ ○ ○ ○            .play-topbar / .play-progress, sans cœurs
             [ 🔊 72 ]  [ 💬 56 ]               écoute (🔊 64 px si max-height ≤ 700 px)
[ a p r è s ▏                       ] [ ✓ 72 ] champ 72 px de haut (64), ✓ toujours 72 px
  a   à   â   b   c   ç   d
  e   é   è   ê   f   g   h                    7 colonnes : 52 × 52 px à 412 px de large,
  i   î   j   k   l   m   n                    environ 45 × 46 px à 360 × 640
  o   ô   p   q   r   s   t
  u   ù   v   w   x   y   z
  '   -   ·   ·   [       ⌫ (3 col.)      ]    colonnes 3-4 réservées (œ ë ï û, si un mot l'exige)
```

- **Clavier** (`DictationKeyboard`, rangées dans `keyboard-layout.ts`).
  - Grille `repeat(7, 1fr)`, écarts 6 × 4 px, placée en bas (`margin-top: auto`) : (412 − 2 × 12 − 6 × 4) / 7 = 52 px.
  - Touches de 52 px de haut (46 px si `max-height: 700px`), Andika 700 28 px, rayon 12 px, ombre de `.calc-key`.
  - Lettres simples sur fond blanc ; lettres accentuées sur fond `#fff3e6`, juste après leur lettre de base.
  - `:active` : scale(0,92), fond `#ffe7c7`. Aucun son de touche, pour que la voix reste audible.
  - Attributs : `data-key="é"`, `data-key="del"`, `data-key="ok"`.
- **Exception aux 72 px (ARCHITECTURE §9)** : 37 touches ne tiennent pas en 72 px sur 388 px utiles (il faudrait 504 px).
  En 5 colonnes de 72 px, il faudrait 8 rangées, soit 620 px de haut. Il y a des précédents : les étiquettes de `tiles`
  font 52 px (`.spl-tile`), les touches de `calc` 64 px. Garde-fous : ✓ garde 72 px, loin des lettres, donc une touche
  ratée ne valide jamais ; chaque lettre s'affiche en grand ; ⌫ est large ; aucun temps n'est limité.
- **Choix du clavier.** Retenu : (a), alphabétique.
  - (a) Un AZERTY de 10 colonnes aurait des touches de 36 px, dans un ordre qu'elle ignore. L'ordre alphabétique, qu'elle
    connaît, tient en 7 colonnes de 52 px, et place é è ê juste après e, là où se joue la faute (aprés / après).
  - (b) Les étiquettes du mode `tiles` donnent les lettres : on revient à reconnaître, ce n'est plus écrire.
  - (c) Le clavier natif d'Android triche : suggestions, correction, dictée au micro ; `autocomplete="off"` n'y suffit pas
    avec Gboard. Il masque la moitié de l'écran, se ferme au bouton retour et cache les accents derrière un appui long.
- **Champ.** Flex 1, fond blanc, rayon 16 px, ombre intérieure comme `.spl-box`, curseur orange de 3 × 44 px qui clignote.
  - Texte : Andika 700 40 px (34 px ; 30 px au-delà de 10 caractères). Vide, sa bordure `--accent` pulse.
  - Au plus `MAX_ANSWER_LENGTH` = 20 caractères ; au-delà de 16, on affiche « … » puis les 16 derniers.
  - ⌫ efface le dernier caractère. ✓ (72 px, `--success`, `Icon check`) est désactivé tant que le champ est vide ; actif et
    sans frappe depuis 3 s, il pulse.
- **Voix.** Lecture automatique à l'arrivée du mot (§3.3). Le bouton qui parle montre des ondes (`data-speaking`). La voix
  ne bloque jamais le clavier, et une touche n'interrompt pas la voix. Champ encore vide 5 s après la lecture : 🔊 pulse.
- **Jamais affichés** en phase `word` : la phrase, et le mot attendu. Seul l'attribut `data-answer` de `.dict-word` contient
  le mot, pour les tests e2e (comme `.play-round` dans `LevelPlayer`).

### 2.3 Juste du premier coup (`solved`)

`playSuccess()`, le champ passe au vert et rebondit (500 ms, comme `.spl-choice--bounce`). 1 200 ms plus tard : mot suivant,
ou fin.

### 2.4 Faux : correction puis réécriture (`copy`)

- `playError()`, le champ tremble 320 ms (`calc-shake`). Un panneau glisse alors au-dessus du champ :
  - `data-testid="dictation-attempt"` : sa saisie en 24 px, grise et barrée, les lettres fautives en `--accent` soulignées
    (`diffLetters`, §3.5) ;
  - `data-testid="dictation-model"` : le mot juste en 40 px, lettres à corriger en `--success` sur fond `#e3f5e1`.
- 500 ms après l'erreur, la voix redit le mot seul (lecture automatique, non comptée). Le champ se vide ; ✓ est masqué et ⌫
  désactivé.
- Elle **réécrit, guidée lettre à lettre**. Si la touche est la lettre attendue, elle s'ajoute en vert. Sinon, la touche
  tremble, rien ne s'ajoute, et `copyMistakes` augmente de 1 (sans son). La lettre attendue suivante pulse dans le modèle.
- Dès la première lettre réécrite, sa saisie fausse s'efface en fondu (300 ms), pour limiter l'exposition aux formes
  fautives (PROGRESSION-CE1). Mot complet : `playSuccess()`, puis mot suivant 900 ms après.
- Guidée ainsi, la réécriture ne peut pas échouer, et elle oblige à choisir chaque lettre et chaque accent.

### 2.5 Fin de dictée (`end` ; `data-testid="dictation-end"`, `data-score`, `data-total`)

- En grand, « 8 / 10 » (Fredoka 64 px) : les mots justes du premier coup, sur le nombre de mots de la dictée.
- En dessous, tous les mots, écrits juste, dans l'ordre (deux colonnes, 24 px). ✓ vert : juste du premier coup ; pastille
  orange : corrigé. Ils apparaissent un à un, toutes les 120 ms. Jamais ses saisies fausses.
- À la fin de l'animation, `playFanfare()`. Si la dictée est parfaite, une étoile dorée (`Icon star`, 72 px) et
  `playStar()` viennent juste avant.
- Ni hasard ni pression : la récompense ne dépend que de sa dictée, et elle ne voit aucune comparaison avec ses dictées
  passées. Le suivi dans le temps est pour le parent.
- Deux boutons de 72 px :
  - « encore » (`Icon replay`, `data-testid="dictation-again"`) lance une nouvelle dictée de la même série, avec la lecture
    du premier mot dans le tap ;
  - maison (`data-testid="to-hub"`) ramène au hub.

### 2.6 Voix indisponible (`unavailable` ; `data-testid="dictation-unavailable"`, `data-reason`) et tutoriel

- Écran : un haut-parleur barré de 120 px (`Icon name="speaker-off"`, ajouté par T3, cadre A5), puis deux lignes. La
  première dit « Le son est coupé. »
  (`muted`), ou sinon « Le téléphone ne peut pas parler. » ; la seconde, « Demande à un adulte. ». Bouton maison de 72 px.
  Le parent voit la raison et le remède (§5.3).
- **Pas de tutoriel à main animée** : pour mimer le geste, la main devrait taper les lettres, donc donner la réponse. Les
  repères du §2.2 suffisent (champ, 🔊 et ✓ qui pulsent) : l'enfant lit, et un parent est là au premier lancement.

## 3. Règles

### 3.1 Série proposée et tirage (`draw.ts`, pur)

- `defaultSeriesId(records, all)` : la série de la dictée la plus récente du profil (max `startedAt`, tous statuts) si
  elle existe encore, sinon `all[0].id`. Pas de champ de profil : une seule source de vérité, comme la progression, qui
  est recalculée à partir des parties (ARCHITECTURE §6). Le CONTRAT `Profile` ne change pas.
- `drawDictation(series, all, rng): DictationPlannedWord[]`. Les appels au rng se font **dans cet ordre**, pour qu'une même
  graine redonne la même dictée :
  1. `current` = `series.words` ;
  2. `pool` = les mots des séries de numéro inférieur (par série, puis dans l'ordre des mots), moins ceux de `current` ;
  3. `review = rng.shuffle(pool).slice(0, Math.min(REVIEW_COUNT, pool.length))`, avec `REVIEW_COUNT = 5` : un sous-ensemble
     uniforme, sans doublon ;
  4. `order = rng.shuffle([...current, ...review])` : tout mélangé, car entrelacer les séries aide à retenir ;
  5. pour chaque mot de `order` : `sentenceIndex = rng.int(0, sentences.length − 1)`.
- Série 1 : aucune série précédente, donc **5 mots** (Q5). Série 2 : `pool` vaut exactement s1, donc la dictée est toujours
  s1 ∪ s2, seul l'ordre change. Série n ≥ 3 : 5 mots parmi les 5 × (n − 1) mots précédents.
- Graine `seed = Date.now() >>> 0`, puis `createRng(seed)` (`src/engine/rng.ts`) ; la graine est enregistrée.
- Hasard uniforme en V1. Pour la pondération par les erreurs, voir Q3.

### 3.2 Réponse juste (`answer.ts`, pur)

- `normalizeAnswer(s)` : NFC ; `’ ‘ ʼ ´` → `'` ; `‐ ‑ –` → `-` ; `toLocaleLowerCase('fr')` ; espaces retirés aux bords,
  réduits à un seul à l'intérieur.
- `isCorrectAnswer(typed, expected)` compare les deux chaînes normalisées. Un accent compte : `aprés` ≠ `après`, mais
  `aujourd’hui` = `aujourd'hui`.
- **Réussi = juste à la première validation** (`firstTry`) ; réécouter ne compte pas.
- En réécriture, la touche `c` est acceptée si `normalizeAnswer(c)` égale le point de code de rang `copy.length` dans
  `normalizeAnswer(expected)`.

### 3.3 Déroulé vocal

- **Lecture automatique** : `speakSequence([mot, 600 ms, phrase, 600 ms, mot])`, lancée 300 ms après l'arrivée du mot (0 ms
  pour le premier, lancé dans le tap).
  - Le mot est lu comme `(say ?? text) + '.'` (le point donne une intonation finale), à `RATE_WORD = 0.8`, la valeur de
    `speak()` dans `SpellingView.tsx`.
  - La phrase est `sentences[sentenceIndex]`, où `___` est remplacé par `text` (comme `speechTextFor`), lue à
    `RATE_SENTENCE = 0.9`.
- **Réécoute** : 🔊 (72 px, `data-testid="replay-word"`) redit le mot seul ; 💬 (56 px, `data-testid="replay-sentence"`)
  redit la phrase seule. Illimitée en `word` et en `copy` ; chaque tap coupe la lecture en cours et repart (pas de file), et
  il est compté (`wordReplays`, `sentenceReplays`).
- **Pourquoi mot, phrase, mot** : c'est le déroulé d'une dictée de mots en classe. La phrase donne le sens et départage
  les homophones ; le mot final remet la forme à écrire en tête. La réécoute est illimitée : on s'entraîne, ce n'est pas un
  contrôle.
- **La phrase n'entre jamais dans le DOM** : ni en texte, ni en attribut, ni en `aria-label`.

### 3.4 `src/ui/voice.ts`

```ts
export type VoiceProblem = 'no-api' | 'no-french-voice' | 'no-offline-voice';
export interface VoiceCheck { status: 'ready' | 'muted' | 'unavailable'; problem: VoiceProblem | null; voiceName: string | null }
export function checkVoice(timeoutMs = 2000): Promise<VoiceCheck>;                  // ne rejette jamais
export type SpeakResult = 'ended' | 'interrupted' | 'blocked' | 'failed' | 'skipped';
export function speak(text: string, opts?: { rate?: number }): Promise<SpeakResult>; // rate 0.8 par défaut
export type SpeechStep = { text: string; rate?: number } | { pauseMs: number };
export function speakSequence(steps: readonly SpeechStep[]): Promise<SpeakResult>;   // s'arrête au 1er résultat ≠ 'ended'
export function cancelSpeech(): void;                                                // tout résout 'interrupted'
export function __resetVoiceForTests(): void;
```

- **Accès paresseux.** `globalThis.speechSynthesis` et `SpeechSynthesisUtterance` sont lus à chaque appel, jamais à
  l'import : les tests peuvent ainsi les simuler. Aucune exception ne sort du module, comme pour `sound.ts`.
- **Voix chargées plus tard.** `getVoices()` est souvent vide au lancement. `checkVoice` écoute `voiceschanged`
  (`addEventListener`, sinon `onvoiceschanged`) et relit la liste toutes les 250 ms jusqu'à `timeoutMs`.
- **Choix de la voix.** Une voix est française si sa `lang` commence par `fr` (après `_` → `-` et passage en minuscules).
  Ordre de préférence :
  1. `fr-fr` avant les autres `fr-*` ;
  2. `localService`, qui marche hors ligne ;
  3. la voix `default` ;
  4. l'ordre de la liste.
  Hors ligne (`navigator.onLine === false`), les voix non locales sont écartées.
- **Statut.**
  - `muted` : son de l'app coupé (`isSoundEnabled()`, §6.3).
  - `no-api` : pas de synthèse vocale.
  - `no-french-voice` : des voix, mais aucune française.
  - `no-offline-voice` : hors ligne, avec seulement des voix françaises réseau.
  - Aucune voix au bout du délai : `ready` avec `voiceName: null`. On tente `lang = 'fr-FR'`, et l'usage tranche (§7).
- **`speak`.**
  - Son coupé ou pas d'API : `'skipped'`, sans rien dire.
  - Sinon, `cancel()` de la lecture en cours (sa promesse résout `'interrupted'`), puis `resume()` si la synthèse est en pause.
  - Nouvel utterance : `voice`, `lang`, `rate`, `pitch` 1, `volume` 1. **On en garde une référence forte** : sur Chrome, un
    utterance ramassé par le GC n'émet jamais `onend`.
  - `synth.speak(u)` est appelé **de façon synchrone**, pour rester dans le geste de l'enfant.
  - Fin : `onend` → `'ended'`. Erreur : `interrupted` ou `canceled` → `'interrupted'` ; `not-allowed` → `'blocked'` ; toute
    autre → `'failed'`.
  - Chien de garde : sans `onend` après `2000 + 150 × longueur / rate` ms, résout `'ended'`.
- **Geste de l'enfant (Android).** Chrome refuse `speak()` (`not-allowed`) tant que la page n'a reçu aucun geste ; après un
  premier tap, c'est acquis. D'où la première lecture dans le tap (§2.1). Sur `'blocked'`, 🔊 pulse, et le prochain tap relit.
- **Page cachée** (`visibilitychange` → `hidden`) : `cancelSpeech()`. L'écouteur est posé une fois, si `document` existe ;
  au retour, rien n'est relu.

### 3.5 Différence mise en valeur (`diffLetters`, dans `answer.ts`)

`diffLetters(typed, expected): { typed: Mark[]; expected: Mark[] }`, avec `Mark = { char: string; ok: boolean }`. Le calcul
porte sur les chaînes normalisées, point de code par point de code : distance de Levenshtein (chaque opération coûte 1), puis
remontée depuis la fin, en préférant la diagonale (égalité, ou substitution : les deux lettres passent à `ok: false`), puis
une lettre en trop dans `typed`, puis une lettre manquante dans `expected`. Cas : `aprés`/`après` → é, è ; `asser`/`assez` →
r, z ; `ossi`/`aussi` → o / a, u ; `aujourdui`/`aujourd'hui` → ', h ; `bientot`/`bientôt` → o, ô.

### 3.6 Machine d'état (`machine.ts`, pure : ni DOM, ni stockage, ni horloge)

```ts
export type DictationPhase = 'choose' | 'word' | 'copy' | 'solved' | 'end';
export interface DictationState {
  phase: DictationPhase; seriesId: string | null; seed: number; startedAt: number;
  words: DictationPlannedWord[]; expected: string[]; index: number;
  typed: string; firstAttempt: string | null; items: DictationItem[];   // items triés par index
  unit: { shownAt: number; answerMs: number | null; pausedMs: number; hiddenSince: number | null;
          wordReplays: number; sentenceReplays: number; copyMistakes: number };
}
export type DictationAction =
  | { type: 'start'; seriesId: string; seed: number; words: DictationPlannedWord[]; expected: string[]; now: number }
  | { type: 'key'; char: string; now: number } | { type: 'erase' } | { type: 'validate'; now: number }
  | { type: 'replay'; what: 'word' | 'sentence' } | { type: 'next'; now: number }
  | { type: 'visibility'; hidden: boolean; now: number };
export type DictationEffect =
  | { kind: 'speak'; what: 'intro' | 'word' | 'sentence' } | { kind: 'sound'; what: 'success' | 'error' }
  | { kind: 'save'; item: DictationItem } | { kind: 'next-after'; ms: number } | { kind: 'finished' };
export function step(s: DictationState, a: DictationAction): { state: DictationState; effects: DictationEffect[] };
export const isComplete = (s: DictationState) => s.words.length > 0 && s.items.length === s.words.length;
export const unitInProgress = (s: DictationState) => s.phase === 'word' || s.phase === 'copy';
```

| Phase | Action | Condition | Résultat ; effets |
|---|---|---|---|
| `choose`, `end` | `start` | — | `word`, index 0, `startedAt = now` ; `speak intro` |
| `word` | `key c` | c tapable, longueur < 20 | `typed += c` |
| `word` | `erase` | `typed` non vide | dernier caractère retiré |
| `word` | `validate` | non vide, juste | `solved` ; `sound success`, `save` (copyDone), `next-after 1200` |
| `word` | `validate` | non vide, faux | `copy`, `firstAttempt = typed`, `typed = ''` ; `sound error`, `speak word`, `save` |
| `copy` | `key c` | lettre attendue | `typed += c` ; mot complet → `solved`, `sound success`, `save` (copyDone), `next-after 900` |
| `copy` | `key c` | autre lettre | `copyMistakes + 1` (la vue fait trembler la touche) |
| `word`, `copy` | `replay` | — | compteur + 1 ; `speak word` ou `speak sentence` |
| `solved` | `next` | il reste des mots | `word` au mot suivant, unité remise à zéro ; `speak intro` |
| `solved` | `next` | dernier mot | `end` ; `finished` |
| toutes | `visibility` | — | masquée : `hiddenSince = now` ; visible : `pausedMs += now − hiddenSince` |

- Toute autre combinaison est ignorée, sans effet : ✓ sur un champ vide, double ✓, touche pendant `solved`…
- `answerMs` court de l'arrivée du mot à la première validation ; `durationMs`, de l'arrivée du mot à la fin de l'unité
  (validation juste, ou réécriture finie). Les deux retranchent `pausedMs` : écran éteint, rien ne compte (F10 de
  `LevelPlayer`).
- L'écran exécute les effets ; il gère aussi l'attente de 500 ms avant `speak word` en `copy`.

## 4. Données et contenu

### 4.1 Types (`src/games/dictation/types.ts`)

```ts
export type DictationWordId = string;  // /^[a-z0-9]+(-[a-z0-9]+)*$/ ; stable, car enregistré dans les dictées
export interface DictationWord {
  id: DictationWordId;
  text: string;         // orthographe exacte, en minuscules, apostrophe droite
  sentences: string[];  // au moins 3, avec « ___ » une seule fois à la place du mot ; jamais affichées
  say?: string;         // prononciation forcée du mot seul
  homophones?: string;  // clé du groupe, ex. "ver" pour ver, vers, verre, vert
}
export interface DictationSeries {
  id: string;           // "s1"… ; stable
  number: number;       // rang dans la liste de la classe ; « précédentes » = numéro inférieur
  world?: WorldId;      // monde de la carte (src/screens/map/layout.ts)
  words: DictationWordId[];
}
```

### 4.2 Catalogue et séries

- **Catalogue.** `words.ts` exporte `DICTATION_WORDS: ReadonlyMap<DictationWordId, DictationWord>`, assemblé à partir de :
  - `WORDS` (`src/mechanics/spelling/words.ts`), pour les 20 `WORD_IDS` : `id`, `text` et `sentences` sont repris sans copie ;
  - `EXTRA_WORDS`, les mots propres à la dictée (séries 5-8, homophones) ;
  - `OVERRIDES`, qui ajoute `say` ou `homophones` aux 20 premiers.
- Un mot vit à un seul endroit : dans `WORDS` s'il sert au parcours, sinon dans `EXTRA_WORDS`. Quand un cinquième monde
  utilisera la série 5, ses mots passeront dans `WORDS` et `WORD_IDS`, avec variantes et trous.
- **Séries.** `series.ts` exporte `DICTATION_SERIES`. Il rend explicite ce que seuls les niveaux `ce1-mots-sN-*` disaient :
  s1 = afin, alors, apres, assez, aujourdhui (forêt) ; s2 = aupres, aussi, aussitot, autant, autour (mer) ;
  s3 = autrefois, autrement, avant, avec, beaucoup (montagne) ; s4 = bien, bientot, car, ceci, cela (nuages).
- **Pourquoi TS et pas JSON sous `content/`** : le catalogue des mots est déjà en TS (`words.ts`). La validation au build
  passe par `content.test.ts`, que `validate:content` lance (cadre A12).
- **Homophones** : des mots distincts (id et `text` différents) qui se prononcent pareil ; seule la phrase les départage.
  Une dictée peut en tirer plusieurs, et la correction reste exacte : `verre` pour `vert`, c'est une faute.
- **Prononciation forcée (`say`)** : optionnelle, et seulement pour le mot dit seul. Une phrase qui sonne mal, on la réécrit.
  On ne remplit `say` qu'après avoir écouté le téléphone (à surveiller : donc, dont, dès).
- **Trois phrases par mot suffisent en V1** : la phrase donne le sens, ce n'est pas l'exercice, et la réentendre trois jours
  plus tard ne gêne pas. On passera à 5 si elle se lasse (V2).

### 4.3 Règles de contenu (`content.test.ts`, messages en français lisibles par le PM)

- **C1 — Identifiants.** Uniques, au format `DictationWordId`, et jamais à la fois dans `WORDS` et `EXTRA_WORDS`. On
  construit l'id à partir de `text`, sans accents, apostrophes ni traits d'union (`d'abord` donne `dabord`), avec `-2` en cas
  de collision.
- **C2 — Orthographe.** `text` est en NFC, en minuscules, sans espace aux bords, et chacun de ses caractères est dans
  `KEYBOARD_CHARS` : un mot impossible à taper fait échouer le build.
- **C3 — Phrases.** Au moins 3, toutes différentes. Chacune contient un seul `___`. Une fois `___` remplacé par le mot, le mot
  y figure exactement une fois, en mot entier (aucune lettre `\p{L}` collée). 14 mots au plus, point final (`.`, `!` ou `?`),
  ni chiffre, ni parenthèse, ni guillemet.
- **C4 — `say`.** S'il est présent, il n'est pas vide et ne contient pas `___`.
- **C5 — Homophones.** Un groupe compte au moins 2 mots, tous de `text` différent. Chaque phrase d'un membre ne contient
  qu'un mot du groupe : le sien. « Le ver est vert » est donc refusé.
- **S1 — Numérotation des séries.** Ids uniques (`/^s\d+$/`), numéros 1, 2, 3… sans trou, dans l'ordre du tableau.
- **S2 — Contenu d'une série.** 4 à 6 mots (5 pour une liste de classe), tous présents au catalogue, sans doublon. Un mot
  n'appartient qu'à une série.
- **S3 — Accord avec le parcours.** Pour N = 1 à 4, sN a les mêmes mots que les `params.words` de `ce1-mots-sN-1`.
- **S4 — Mondes.** `world` fait partie de `WORLD_ORDER`, et chaque monde sert à une série au plus.
- **K1 — Clavier.** Chaque caractère n'apparaît qu'une fois dans `KEY_ROWS`.

Reste à vérifier à la relecture humaine : chaque phrase rend le mot non ambigu à l'oral, son vocabulaire est à la portée d'un
enfant de 7 ans, et aucun homophone non déclaré ne crée d'ambiguïté (car / quart).

### 4.4 Ajouter une série ; séries 5 à 8 ; clavier

**Ajouter une série.**
1. Écrire ses mots dans `EXTRA_WORDS`.
2. Ajouter `{ id: 'sN', number: N, words }` à `DICTATION_SERIES`.
3. Lancer `npm run validate:content`.
4. Faire une dictée de cette série sur le téléphone, puis ajouter `say` là où la voix se trompe.

**Séries 5 à 8** (période 2, de « cependant » à « envers »). Il faut la liste exacte de la classe (Q2) : 20 mots, leur
orthographe et leur découpage. Viennent ensuite 60 phrases à écrire et à écouter. Ces séries n'ont pas de monde.

**Clavier** (`keyboard-layout.ts`) :
- `KEY_ROWS` : les 5 rangées de lettres du §2.2, puis `["'", "-"]` ;
- `KEYBOARD_CHARS: ReadonlySet<string>` : leur union ;
- `MAX_ANSWER_LENGTH = 20`.

## 5. Stockage et statistiques

### 5.1 Enregistrements (`src/storage/dictations.ts`, cadre A1)

```ts
import type { GameRecordBase } from './types'; // id, profileId, startedAt, endedAt, status, endReason, activeMs (HUB.md §5.2)
export interface DictationPlannedWord { wordId: string; seriesId: string; sentenceIndex: number } // série d'origine
export interface DictationItem {
  index: number;          // position dans la dictée
  wordId: string;
  expected: string;       // copié : les stats restent lisibles si le catalogue change
  typed: string;          // première saisie validée, normalisée, jamais vide
  firstTry: boolean;      // juste du premier coup = réussite
  copyDone: boolean;      // réécriture terminée (vrai si firstTry)
  copyMistakes: number;   // touches refusées pendant la réécriture
  wordReplays: number;    // réécoutes demandées (hors lectures automatiques)
  sentenceReplays: number;
  answerMs: number;       // temps actif jusqu'à la première validation
  durationMs: number;     // temps actif jusqu'à la fin de l'unité
}
export interface DictationRecord extends GameRecordBase {
  // startedAt : création, au premier mot validé (cadre A9). activeMs = Σ items.durationMs, recalculé à chaque item.
  seriesId: string;       // série choisie par l'enfant
  seed: number;           // graine du tirage : rejoue exactement la dictée
  words: DictationPlannedWord[];
  items: DictationItem[]; // un par mot validé au moins une fois, trié par index
}
```

- **Création** : au premier effet `save`, avec `startedAt` = l'instant de la création. Si elle quitte avant tout mot
  validé (mauvaise série), rien n'est enregistré. Une dictée « lancée » a donc au moins un mot validé.
- **Fin.**
  - `completed` quand les N mots ont un item, même si elle quitte pendant la dernière réécriture (comme F7).
  - Sinon `abandoned`, avec une raison : `quit` (maison, retour Android, démontage) ; `closed` (app fermée, constaté au
    lancement suivant) ; `time-up` (fin douce : c'est une interruption, pas un abandon, cadre §3.5).
- **API** (`src/storage/dictations.ts`, bâtie sur `game-records.ts` de HUB.md §5.2). Chaque fonction n'agit que sur une
  dictée `in_progress`.
  - `startDictation(profileId, init: Pick<DictationRecord, 'seriesId' | 'seed' | 'words'>)` :
    `startGameRecord('dictations', profileId, { ...init, items: [] })`.
  - `saveDictationItem(id, item)` : remplace l'item de même `index`, ou l'ajoute, trie, puis recalcule `activeMs`.
  - `completeDictation(id)` et `abandonDictation(id, reason: GameEndReason)` : `finishGameRecord`.
  - `listDictations(profileId)` : triées par `startedAt` croissant.
  - `isDictationFinished(r)` : `r.items.length === r.words.length`. La clôture générique au lancement s'en sert pour
    passer une dictée finie à `completed` (cadre A3) ; il n'y a pas de `closeStaleDictations`.
- **File d'écriture** : l'écran enchaîne les écritures d'une dictée (création, items, fin) sur une seule promesse, jamais en
  parallèle. S'il est démonté pendant `startDictation`, la dictée est close dès sa création (F8).

### 5.2 Validation à l'import (`isDictationRecord(value: unknown)`, dans `dictations.ts`)

Même rigueur que `isRun` (`export-import.ts`). Un enregistrement est valide si :
- il passe `isGameRecordBase` (HUB.md §5.2 : ids, horodatages, `status`, `endReason`, `activeMs`) ;
- `seriesId` est non vide et `seed` est un entier ≥ 0 ;
- `words` compte 1 à 30 éléments `{ wordId, seriesId }` non vides, avec `sentenceIndex` entier ≥ 0 ;
- chaque item a :
  - un `index` entier, unique, dans [0, words.length[ ;
  - `wordId`, `expected` et `typed` non vides ;
  - `firstTry` et `copyDone` booléens ;
  - trois compteurs entiers ≥ 0 ;
  - `answerMs` et `durationMs` finis, ≥ 0.

Les mots et séries inconnus du catalogue sont acceptés. Les ids de dictée doivent être uniques. Les lignes orphelines sont
ignorées et comptées dans `skipped` (F2). Un export v1 donne `dictations = []`.

### 5.3 Statistiques parent (`stats.ts`, pur ; composant `DictationStats`)

`computeDictationStats(records, now): DictationStats` porte sur les dictées d'un profil. Une **tentative** sur un mot est un
item ; les tentatives sont classées par `startedAt` de la dictée, puis par `index`.

Les indicateurs communs (parties, terminées, abandons, interruptions, temps de jeu, jours joués sur 7 jours, dernière
partie) sont affichés par ChildStats pour chaque jeu (HUB.md §5.5, cadre A8). Le bloc de la dictée n'ajoute que les siens :

| Indicateur | Définition exacte |
|---|---|
| **Mots dictés** | Nombre d'items, toutes dictées confondues. |
| **Réussite au 1er coup** | Items `firstTry` / items ; null sans items. Pas de part du hasard : au clavier, on ne devine pas. |
| **Réécoutes par mot** | Σ (`wordReplays` + `sentenceReplays`) / items. |
| **Temps médian par mot** | Médiane des `answerMs`. |
| **Dernière dictée** | Série et score (`firstTry` / `words.length`) de la dictée la plus récente. |
| **Par série** | Dictées lancées ; score de la dernière dictée terminée. |
| **Par mot** | Tentatives, justes du 1er coup, taux ; saisies fausses distinctes des 3 dernières tentatives. |
| **Mot fragile** | Dernière tentative fausse, **ou** au moins 2 fausses parmi les 3 dernières. |
| **Mot su** | Au moins 3 tentatives, et les 3 dernières justes du 1er coup. Sinon : **en cours**. |

Le bloc (`src/games/dictation/DictationStats.tsx`, props `GameStatsProps<DictationRecord>` de HUB.md §4.2,
`data-testid="dictation-stats"`, classes `pa-*`) affiche dans l'ordre :
1. l'état de la voix (`checkVoice()`) : le nom de la voix, ou la raison du problème et son remède (tableau ci-dessous) ;
2. les indicateurs ;
3. les mots fragiles, en pastilles (« après — aprés, apres ») ;
4. les tableaux par série et par mot (`data-testid="dictation-word-<id>"`, `data-status`). Les mots sont triés : fragiles,
   en cours, sus, puis par taux croissant, puis par ordre alphabétique. Un mot sorti du catalogue est montré par `expected` ;
5. l'aide « Comment lire ces chiffres », qui reprend ces définitions.

| Raison | Texte pour le parent |
|---|---|
| `muted` | « Le son de l'application est coupé (onglet Réglages) : la dictée a besoin de la voix. » |
| `no-api` | « Ce navigateur ne sait pas faire parler le téléphone : ouvrez l'application avec Chrome. » |
| `no-french-voice` | « Aucune voix française : Paramètres Android › Accessibilité › Synthèse vocale, Français (France). » |
| `no-offline-voice` | « Voix française absente hors connexion : installez les données vocales Français (France). » |

## 6. Intégration

### 6.1 Route, hub, registre

- Route `{ name: 'dictation' }`, hash `#/dictation` (cadre §3.1). `AppShell` affiche `<DictationScreen />` (exporté par
  `src/games/dictation/index.ts`) si un profil est actif. Maison et retour Android ramènent au hub.
- Entrée du registre (`src/games/index.ts`, écrit par HUB) :
  - `id` : `'dictation'` ; libellé « Dictée quotidienne » ; visible par défaut pour le parcours `ce1` ;
  - picto : dessiné par le hub (`GameIcon`, HUB.md §2.1 : page de cahier à lignes, crayon, arcs de son) ;
  - `checkAvailability: checkDictationAvailability` (`availability.ts`) : enveloppe `checkVoice()` et rend une
    `Availability` (HUB.md §4.2). En cas de problème, `parentHint` est le texte du tableau du §5.3.
- **Tuile quand la voix manque** (cadre A5) : elle reste tapable, avec le badge `speaker-off`, et ouvre l'écran
  `unavailable`. L'enfant y lit pourquoi, ce qu'une tuile morte qui tremble ne lui dirait pas.

### 6.2 Temps de jeu et fin douce (cadre §3.3, ARCHITECTURE §8)

L'écran utilise `useSoftEnd` (HUB.md §4.4, cadre A4). **L'unité en cours est le mot qu'elle écrit**, réécriture
comprise.
- `busy` = phase `word`, `copy` ou `solved`, ou animation de l'écran `end` en cours.
- `onTimeUp` : `cancelSpeech()`, puis `abandonDictation(id, 'time-up')` si l'enregistrement existe et que la dictée
  n'est pas finie.
- `checkpoint()` est appelé au tap sur une série, au tap sur « encore » et avant chaque `next`, jamais avant
  d'enregistrer : le mot commencé se termine et s'enregistre, quitte à créer la dictée.

| Phase quand le temps est écoulé | Comportement |
|---|---|
| `choose`, `unavailable` | Pas d'unité en cours (`busy` faux) : écran de fin tout de suite. |
| `word`, `copy` | L'unité continue ; au plus 60 s après, la fin douce s'enclenche d'elle-même. |
| `solved` (effet `next-after`) | Si `isComplete`, fin normale (`end`), puis écran de fin après l'animation. Sinon, `checkpoint()` bloque le mot suivant et lance la fin. |
| `end` | Boutons masqués ; écran de fin après l'animation (comme `scheduleLockAfterStars`). |

Un mot jamais validé n'est pas enregistré ; une réécriture coupée garde `copyDone: false`. Au démontage, la dictée est
close avec `exitReason()` sauf si `endedRef` est vrai, avec les garde-fous F4, F7 et F8 de `LevelPlayer`.

### 6.3 Son, voix et espace parent

- **Son.** Le réglage parent s'intitule déjà « Voix, bruitages et musique du jeu » (`Settings.tsx`). Son coupé veut donc
  dire voix coupée : la dictée passe en `muted` (Q4).
- **`sound.ts`** gagne `export function isSoundEnabled(): boolean`, lue par `voice.ts`. `soundOn` se charge de façon
  asynchrone : `DictationScreen` relance donc `checkVoice()` à chaque montage.
- **Statistiques.** `<DictationStats profile records />` (cadre A7) : ChildStats lui passe les dictées de l'enfant, et
  il appelle lui-même `checkVoice()` pour l'état de la voix. Il apparaît sur la page de statistiques de l'enfant
  (HUB.md §6.4) si la dictée est visible pour l'enfant ou s'il existe des dictées.
- **Réglages.** Aucun réglage propre à la dictée en V1. Seul changement : l'aide du son devient « Voix, bruitages et
  musique du jeu. La dictée a besoin du son. ».

### 6.4 Points tranchés avec HUB.md et COLORIAGE.md

Tous sont arbitrés dans le cadre commun ([README.md](README.md) §5) :
- types dans `src/storage/dictations.ts`, sur `GameRecordBase` (A1) ;
- clôture au lancement générique, avec `isDictationFinished` (A3) ;
- `useSoftEnd` (A4) ; la garde de route renvoie au hub si la dictée n'est pas visible (HUB.md §6.2) ;
- tuile tapable avec badge `speaker-off` (A5) ;
- `DictationStats` et picto de tuile dans `GameIcon` (A7) ; « Temps de jeu total » compte la dictée (A8) ;
- documentation tenue par T5 (A10) ; e2e par `nav.ts` (A11) ; `validate:content` lance `content.test` (A12).

## 7. Cas limites

- **Voix.**
  - Aucune voix française : `unavailable`.
  - Voix chargées tard : on tente quand même. Deux `'failed'` de suite en cours de dictée : `unavailable`, et la maison clôt
    en `quit`.
  - `onend` jamais reçu : le chien de garde prend le relais. `'blocked'` après un rechargement : 🔊 pulse.
  - Volume média à zéro : indétectable. Les ondes montrent que le téléphone parle ; le parent monte le son.
- **Taps.**
  - Taps rapides sur 🔊 ou 💬 : on coupe, on relit, et chaque tap compte.
  - Double ✓ : ignoré.
  - Une touche pendant la lecture : acceptée, la voix continue.
  - Au-delà de 20 caractères : ignoré.
- **Écran éteint** : la voix se coupe, les durées se mettent en pause, et rien n'est relu au retour.
- **Sortie.**
  - Maison ou retour Android en `word` ou `copy` : `quit` (ou `completed` si `isComplete`).
  - En `choose` : rien n'est enregistré.
  - App tuée : clôture générique au lancement suivant (`completed` si tous les mots sont validés, sinon `closed`).
- **Tirage.** Série 1 : 5 mots. Série de 4 ou 6 mots : 9 ou 11 mots. Plusieurs homophones d'un groupe dans la même dictée :
  permis.
- **Catalogue modifié.** L'historique garde `expected` ; une série disparue n'est plus proposée (s1 à la place).
- **Deux enfants.** Historique et série proposée sont propres à chaque profil ; un profil supprimé part en cascade.
- **`prefers-reduced-motion`.** Ni tremblement, ni rebond, ni pulsation : seules les couleurs changent.

## 8. Tests

**Unitaires** (Vitest, environnement `node`) :
- `draw.test.ts` :
  - s1 donne ses 5 mots ; s2 donne s1 ∪ s2 (graines 1 à 200) ; s4 donne ses 5 mots et 5 autres de s1-s3, sans doublon ;
  - même graine, même tirage ; tirage figé pour la graine 42 ; `sentenceIndex` dans les bornes ;
  - uniformité : sur les graines 1 à 3 000 en s4, chaque mot révisé sort entre 850 et 1 150 fois (1 000 attendus) ;
  - `defaultSeriesId`.
- `answer.test.ts` : la normalisation, les accents, et les cas de `diffLetters` du §3.5.
- `machine.test.ts` : chaque ligne du tableau du §3.6, les combinaisons ignorées, les réécoutes, `answerMs` et `durationMs`
  avec une période masquée, `isComplete` pendant la dernière réécriture.
- `content.test.ts` : C1 à C5, S1 à S4, K1.
- `voice.test.ts`, avec un faux `speechSynthesis` (`vi.stubGlobal`) et des minuteurs simulés (`vi.useFakeTimers()`) :
  - pas d'API ; `voiceschanged` qui arrive tard ; voix en-US seulement ;
  - fr-FR préférée à fr-CA ; voix locale choisie hors ligne ;
  - `muted` : `speak` renvoie `'skipped'` sans appeler `synth.speak` ;
  - `speak` : `ended`, `interrupted` (par `cancelSpeech`, qui arrête aussi une séquence), `blocked`, `failed`, et le chien de
    garde ;
  - `speakSequence` : ordre et pauses.
- `stats.test.ts` : chaque définition du §5.3, le classement fragile / su / en cours, le tri, un mot inconnu du catalogue.
- `src/storage/dictations.test.ts` (fake-indexeddb) : cycle de vie, remplacement d'un item par index, `activeMs`
  recalculé, rien sur une dictée qui n'est plus `in_progress`, `isDictationFinished`, et `isDictationRecord` sur une table
  de cas. La clôture générique au lancement est testée par T1.

**E2E** (`tests/e2e/dictation.spec.ts`, navigation par `tests/e2e/nav.ts`, cadre A11). Chromium headless n'a pas de voix.
`page.addInitScript` installe donc une fausse voix :
- `window.speechSynthesis` et `window.SpeechSynthesisUtterance` ;
- `getVoices` selon le mode choisi (`fr`, `en` ou `none`) ;
- `speak` ajoute `u.text` à `window.__spoken`, puis appelle `u.onend` 30 ms plus tard ;
- `cancel` appelle `u.onerror({ error: 'interrupted' })`.

Scénarios :
1. Enfant CE1, hub, tuile Dictée : 4 cartes avec leurs mots. Tap sur s2 : 10 pastilles, `__spoken` = [mot, phrase, mot], et
   `document.body.innerText` ne contient ni la phrase, ni le mot (lu dans `data-answer`).
2. Un mot juste (`[data-key]` puis ✓) : le mot suivant est lu. Un mot faux : le modèle montre le bon mot, une touche fausse
   ne s'ajoute pas, puis la réécriture mène au mot suivant.
3. Dictée de s1 jusqu'au bout : `data-total="5"`. Puis « encore », maison, retour : s1 porte `aria-current`.
4. Statistiques parent : 2 dictées, 1 terminée, 1 abandon ; un mot raté est listé parmi les fragiles.
5. Mode `en` : tuile avec badge, et `#/dictation` affiche `dictation-unavailable`. Son coupé : `data-reason="muted"`.
6. Fin douce (`page.clock`) : 15:05 pendant un mot, puis le mot juste, et l'écran de fin s'affiche. Stats : 1 interruption.
7. En 412 × 839 et en 360 × 640 :
   - aucun défilement horizontal ;
   - clavier et ✓ visibles sans défiler, y compris en `copy` ;
   - touches ≥ 44 px, ✓ ≥ 72 px.

## 9. Découpage en tâches

| Tâche | Fichiers (créés, sauf « modifie ») | Dépend de |
|---|---|---|
| **D1 Voix** | `src/ui/voice.ts` et son test ; modifie `src/ui/sound.ts` (`isSoundEnabled`) | — |
| **D2 Contenu** | `types.ts`, `words.ts`, `series.ts`, `keyboard-layout.ts`, `content.test.ts` | — |
| **D3 Logique** | `draw.ts`, `answer.ts`, `machine.ts` et leurs tests | D2 (types et clavier, écrits en premier) |
| **D4 Clavier** | `DictationKeyboard.tsx`, `keyboard.css` | D2 |
| **D5 Stockage** | `src/storage/dictations.ts` (reprend la souche de T1) et son test | T1 |
| **D6 Écran** | `DictationScreen.tsx` (reprend la souche), `SeriesPicker.tsx`, `DictationEnd.tsx`, `availability.ts`, `dictation.css`, `index.ts` ; la ligne `checkAvailability` de `src/games/index.ts` | D1, D3, D4, D5, T2 |
| **D7 Stats** | `stats.ts` et son test, `DictationStats.tsx` (reprend la souche) ; modifie `src/parent/Settings.tsx` (aide du son) | D2, T2 |
| **D8 E2E** | `tests/e2e/dictation.spec.ts` | toutes, T3 |
| **D9 Période 2** (lot suivant) | `words.ts` (`EXTRA_WORDS`), `series.ts` (s5-s8), `docs/PROGRESSION-CE1.md` | D2, T5, Q2 |

- Les fichiers sans chemin sont dans `src/games/dictation/`.
- Props de D4 : `mode: 'free' | 'copy'`, `onKey(char)`, `onErase()`, `rejectedKey: string | null`, `disabled`.
- D1, D2, D5 et D7 démarrent ensemble ; D3 et D4 suivent D2 de peu (les types sont figés ici).
- `AppShell`, le registre, `ChildStats` et la documentation (y compris l'exception du clavier en ARCHITECTURE §9 et la
  section « séries » de CONTENU.md) restent à HUB (T2 à T5, cadre A10). Aucun fichier n'est attribué à deux tâches.

## 10. Questions ouvertes pour le PM

1. **Corriger après chaque mot, ou à la fin ?** Une vraie dictée se corrige à la fin ; pour apprendre, il faut un retour
   immédiat et réécrire le mot juste. *Reco* : correction immédiate en V1, et un mode « examen » en V2 pour la veille de la
   dictée de classe.
2. **Liste de la classe pour la période 2** (séries 5 à 8, de « cependant » à « envers »). *Reco* : le PM envoie une photo
   de la liste (20 mots, orthographe, découpage) ; D9 écrit les phrases.
3. **Pondérer le tirage par les erreurs** (répétition espacée) ? *Reco* : en V2, avec un poids de 3 pour un mot fragile, 2
   pour un mot en cours, 1 pour un mot su, plus 1 si le mot n'a pas été dicté depuis 7 jours. Les items V1 contiennent déjà
   `wordId`, `firstTry` et la date : aucune migration.
4. **Son coupé, donc pas de dictée ?** *Reco* : oui, puisque le réglage dit « Voix ». Sinon, un réglage séparé.
5. **Série 1 : 5 mots seulement ?** *Reco* : oui, « encore » en relance une autre. L'alternative serait de dicter chaque mot
   deux fois.
6. **Montrer les mots sur l'écran de choix ?** Cela l'aide à reconnaître sa liste, mais elle les voit juste avant d'écrire.
   *Reco* : oui, comme la liste aimantée sur le frigo.
7. **Clavier alphabétique ou AZERTY ?** *Reco* : alphabétique. Les touches sont plus grandes, elle connaît l'ordre, et
   chaque accent est à côté de sa lettre.

## 11. Hors périmètre / V2

- Tirage pondéré (Q3), mode examen (Q1), reprise d'une dictée interrompue.
- Pastille « dictée faite aujourd'hui » sur la tuile.
- Série choisie, ou liste saisie, par le parent ; listes de CE2 ; dictée de phrases.
- Page d'écoute du catalogue dans l'espace parent.
- `SpellingView` qui passe par `voice.ts` ; `wordId` ajouté à `RoundRecord`, pour croiser les statistiques du parcours et de
  la dictée.
- APK Capacitor : la WebView d'Android n'a pas `speechSynthesis`. Il faudra un greffon de synthèse vocale natif derrière la
  même API `voice.ts`, ou des fichiers audio (champ `audio`, ARCHITECTURE §1).
