# Spec — Hub et socle commun des jeux illimités

Cadre : [README.md](README.md), qui fait foi. Specs sœurs : [DICTEE.md](DICTEE.md), [COLORIAGE.md](COLORIAGE.md).

## 1. Résumé

- Un **hub** (`#/hub`) s'intercale entre les profils et la carte. Il montre l'avatar, une tuile « carte » et une tuile par
  jeu libre visible pour l'enfant. Il n'a ni texte, ni cadenas parent.
- Le **registre** `src/games/index.ts` décrit les jeux hors parcours. `Profile.games` (optionnel) choisit ceux qui sont
  visibles ; sans ce champ, le défaut dépend du parcours. Le parent les règle dans la fiche enfant.
- Le **temps de jeu** compte sur le hub, la carte, les niveaux et les jeux, et il est ventilé par activité. La **fin
  douce** s'étend aux jeux grâce au hook `useSoftEnd`. Le bouton maison remonte l'historique, sans l'empiler.
- **IndexedDB v2 et export v2** : stores `dictations` et `colorings` sur un socle commun (`GameRecordBase`, API
  générique, clôture au lancement). L'import accepte v1 et v2.
- Le socle (T1 stockage, T2 app) est livré avant les jeux, avec des écrans de jeu provisoires.

Décisions du PM reprises telles quelles : « Ces deux jeux sont dispo en illimité et sont accessibles depuis un hub qu'il va
falloir ajouter (c'est aussi de là qu'on accédera à la map pour progresser). » — « On verra ensuite comment adapter le
rythme sur la map » (hors périmètre, mais le hub doit pouvoir l'accueillir). Dictée : « Ce jeu existe en dehors du
parcours classique. » Contexte : les enfants enchaînent les niveaux trop vite, et l'usage visé est de 15 min par jour en
semaine.

## 2. Parcours de l'enfant

### 2.1 L'écran hub (`src/screens/Hub.tsx`, `data-testid="hub"`)

```
┌────────────────────────────┐  Avatar (haut gauche, 56 px) → profils. Anneau de temps (haut droite) si limite.
│ (🦊)                   ☀◯ │
│ ┌────────────────────────┐ │  Tuile carte : décor du monde déjà fêté + picto carte.
│ │  forêt / mer…    🗺️    │ │
│ └────────────────────────┘ │  Tuiles de jeu : picto seul, fond pastel propre au jeu.
│ ┌────────────────────────┐ │
│ │          🎨            │ │
│ └────────────────────────┘ │
└────────────────────────────┘
```

- **Avatar** (`data-testid="hub-to-profiles"`, `aria-label="Retour aux profils"`) : c'est l'actuel bouton avatar de la
  carte (`.map-back-avatar` de SagaMap.tsx), déplacé sur le hub. Toucher sa tête ramène aux profils, comme aujourd'hui.
- **Anneau de temps** : le `TimeRing` de SagaMap.tsx est extrait dans `src/ui/TimeRing.tsx` (`data-testid="time-ring"`).
  Il s'affiche si `remainingRatio !== null`, en haut à droite, sur le **hub et la carte seulement**. Il ne s'affiche ni en
  partie ni dans un jeu, comme aujourd'hui dans LevelPlayer : l'enfant se concentre, et le cadre interdit tout compte à
  rebours visible. C'est sur le hub que l'enfant choisit quoi faire, donc c'est là que le soleil qui baisse sert le plus.
- **Tuiles** : des `button.hub-tile` (coins de 28 px, ombre des cartes profils). Leur `aria-label` est le nom court du
  jeu, pour les lecteurs d'écran et les tests ; il n'est jamais affiché.
  - **Carte**, toujours la première (`data-testid="hub-tile-map"`, `data-world`) : le décor du monde **déjà fêté**
    (`worldIdAt(profile.seenWorld ?? 0)`, rendu par `<WorldBackdrop veil="soft">` recadré dans la tuile) et le picto
    `Icon name="map"` en 112 px. Rien d'autre : ni étoiles, ni nombre, ni niveau en cours. La carte ne doit pas être mise
    en avant, puisque les enfants enchaînent déjà trop vite. Un monde atteint mais pas encore fêté (`pendingWorldEntry`)
    reste une surprise de la carte. La tuile se contente du profil en mémoire : aucune lecture de la base, et le hub
    n'écrit jamais `seenWorld`.
  - **Jeu** (`data-testid="hub-tile-<id>"`, dans l'ordre du registre) : fond pastel propre au jeu et picto `GameIcon` en
    112 px. `src/ui/icons/GameIcon.tsx` est nouveau et suit le style de MechanicIcon : aplats, un reflet, pas de contour
    noir, viewBox 48. Dictée : page de cahier à lignes, crayon, deux arcs de son. Coloriage : dessin à zones à moitié
    colorié, pinceau, gouttes rouge, jaune et bleue. Ce picto doit se distinguer de la fiole de `color-mix`.
- **Disposition**, selon le nombre de tuiles (`data-count` sur `.hub-tiles`, largeur max 440 px) :
  - 1 tuile : la carte seule, carrée, centrée, 360 px au plus.
  - 2 tuiles (le **cas par défaut des deux enfants** : carte et un seul jeu) : deux tuiles pleine largeur, empilées,
    **de même taille**. La carte n'est pas plus grande qu'un jeu : le hub ne pousse pas vers elle.
  - 3 tuiles : la carte en pleine largeur, puis les deux jeux côte à côte.
  - Une tuile fait au moins 140 px de haut, y compris en 360×640, et l'écran ne défile jamais.
- **Enfant sans jeu** (`games: []`) : le hub s'affiche quand même, avec la seule tuile carte. On garde ainsi un seul modèle
  (profil → accueil), la maison de la carte mène toujours au hub, et le rythme de la carte y trouvera sa place.
- **États d'une tuile de jeu** (`data-state`) :

| État | Quand | Rendu | Tap |
|---|---|---|---|
| `ready` | pas de `checkAvailability`, disponible, rejet ou plus de 2 s | normal | `playTap()`, puis `navigate(route)` |
| `checking` | vérification en cours (2 s au plus) | normal (pas de clignotement) | idem : le jeu vérifie à nouveau de son côté |
| `unavailable` | `checkAvailability` a rendu `{ available: false }` | normal, badge `Icon name="speaker-off"` (40 px) dans `.hub-tile__badge` | idem : l'écran du jeu explique pourquoi (DICTEE.md §2.6, cadre A5) |

- **Animations et sons** :
  - À chaque montage, l'avatar fait `pop` (360 ms) et les tuiles arrivent l'une après l'autre (`profile-card-in`,
    480 ms, décalage de 90 ms). Elles sont tapables dès l'affichage. En mouvement réduit, rien ne bouge (règle globale).
  - Aucun son à l'arrivée, puisque l'écran revient plusieurs fois par séance.
  - Au tap, la tuile s'enfonce de 4 px, puis `playTap()` et la navigation.
  - Un second tap est ignoré dès la première navigation (`leavingRef`).

### 2.2 Place réservée au futur « rythme de la carte »

`HubTile` accepte `badge?: ComponentChildren`, affiché dans `.hub-tile__badge` (coin haut droit, 40 px). En V1, il ne
sert qu'au badge d'indisponibilité (§2.1). Pour la suite, deux contraintes seulement : ni texte ni chiffre, et la tuile
carte n'est jamais masquée.

### 2.3 Transitions (cadre §3.1)

| Écran | Action | Destination | Historique |
|---|---|---|---|
| Profils | tap sur un avatar au quota non épuisé | hub | push |
| Profils | tap sur un avatar épuisé, appui long sur le cadenas | inchangé (secousse, espace parent) | — |
| Hub | tuile carte, tuile de jeu `ready` | carte, jeu | push |
| Hub | avatar | profils | `returnTo('profiles')` |
| Carte | maison (haut gauche, `data-testid="to-hub"`, `aria-label="Retour à l'accueil"`) | hub | `returnTo('hub')` |
| Carte ↔ partie | niveau, fin de niveau, échec, quitter | inchangé | inchangé |
| Jeu | maison (`to-hub`) | hub ; partie `quit`, ou `time-up` si le temps est écoulé | `returnTo('hub')` |
| Écran de fin | +5 min, +15 min | **hub** (et non plus la carte) | `returnTo('hub')` |
| Écran de fin | Terminer | profils (inchangé) | push |
| Hub, carte | minuteur ou quota atteint | écran de fin, tout de suite | replace |
| Partie, jeu | minuteur ou quota atteint | fin douce (§4.4), puis écran de fin | replace |

L'accès parent se fait **uniquement depuis l'écran profils** (appui long), en plus du déverrouillage de l'écran de fin,
qui ne change pas. Le hub n'a pas de cadenas. Celui de la carte (commit 1055c83) est retiré (voir §10.1, Q1).

### 2.4 Bouton retour Android et historique

Aujourd'hui, les boutons de retour font un push. Or le hub garde le profil en mémoire, contrairement à l'écran profils, qui
le vide. Après « maison », un retour Android rouvrirait donc la partie ou le jeu restés dessous (historique
`[profils, hub, carte, partie, carte, hub]`).

Règle : **maison = remonter** jusqu'à l'entrée d'historique de l'écran-ancre (hub ou profils) avec `history.go(-k)`, puis
réafficher la page. Si l'on ne connaît pas cette entrée, on remplace l'entrée courante. Le retour Android garde le
comportement natif de `history.back()`. Il donne jeu → hub, carte → hub, hub → profils, et partie → carte (inchangé).
Le mécanisme est décrit en §4.1.

## 3. Règles (testables)

1. Un tap sur un profil non épuisé mène à `#/hub`, et jamais plus directement à `#/map`.
2. Le hub ne contient aucun texte visible (`innerText` vide) : seulement l'avatar, l'anneau (si une limite existe) et les
   tuiles.
3. Tuiles = la carte, puis `visibleGameIds(profile)` dans l'ordre du registre, sans doublon.
4. `hub-tile-map` porte `data-world = worldIdAt(profile.seenWorld ?? 0)`. Le hub n'écrit jamais dans la base.
5. Une tuile `unavailable` porte le badge `speaker-off` et navigue comme les autres : c'est l'écran du jeu qui explique
   pourquoi il ne peut pas se jouer (cadre A5).
6. Aucun `parent-access` sur le hub ni sur la carte.
7. La maison de la carte et des jeux mène au hub ; l'avatar du hub mène aux profils, et ProfilePicker vide le profil (F2).
8. Après un tap sur la maison, le retour Android ne rentre jamais dans une partie ni dans un jeu. Exemple : carte →
   maison → retour mène aux profils.
9. Le temps actif compte sur `hub`, `map`, `play`, `dictation` et `coloring`, et nulle part ailleurs.
10. Verrou sur le hub ou la carte : écran de fin immédiat. En partie ou en jeu : fin douce, au plus 60 s après le verrou.
11. +5 min et +15 min ramènent au hub du même enfant.
12. Une route de jeu non visible pour le profil actif redirige vers le hub (replace).
13. `Profile.games` absent : défaut du parcours (`ms` → coloring, `ce1` → dictation). `[]` : aucun jeu. Les ids inconnus
    sont ignorés à l'affichage.
14. L'import accepte les versions 1 et 2. Toute autre version est refusée, sans rien modifier.

## 4. Données et contenu

### 4.1 Routes et historique (`src/app/routes.ts`, CONTRAT)

```ts
export type Route =
  | { name: 'profiles' } | { name: 'hub' } | { name: 'map' } | { name: 'play'; levelId: string }
  | { name: 'dictation' } | { name: 'coloring' } | { name: 'locked' } | { name: 'parent'; path: string[] };
export const GAME_ROUTES = ['dictation', 'coloring'] as const;
export type GameRouteName = (typeof GAME_ROUTES)[number];
export function isChildRoute(name: Route['name']): boolean;   // hub, map, play, dictation, coloring : profil exigé, temps compté
export function isSoftEndRoute(name: Route['name']): boolean; // play, dictation, coloring : verrou = fin douce
export function isGameRoute(name: string): name is GameRouteName;
export type HistoryAnchor = 'profiles' | 'hub';
export function ensureHistoryDepth(): void;                   // 1er rendu d'AppShell : history.state.depth = 0 si absent
export function navigate(route: Route, opts?: { replace?: boolean }): void; // signature inchangée
export function markHistoryAnchor(anchor: HistoryAnchor): void; // montage de ProfilePicker et du Hub
export function returnTo(anchor: HistoryAnchor): void;        // maison, avatar du hub, +X min
```

- `parseHash` et `toHash` gagnent `#/hub`, `#/dictation` et `#/coloring`. Un hash inconnu mène toujours aux profils.
- Chaque entrée d'historique porte `history.state = { depth }`, avec `depth` égal à `null` quand il est inconnu (hash
  modifié à la main, tests). Le push devient `pushState({ depth: d + 1 })` (ou `null`), suivi de
  `dispatchEvent(new HashChangeEvent('hashchange'))`, comme le replace d'aujourd'hui ; un push vers le hash courant ne
  fait rien. Le replace garde la profondeur : `replaceState({ depth: d })`.
- `markHistoryAnchor(a)` mémorise en mémoire de module la profondeur de l'entrée courante. `'profiles'` efface en plus
  l'ancre `'hub'`, puisqu'une nouvelle séance d'enfant commence.
- `returnTo(a)` : si la profondeur `k` de l'ancre et la profondeur courante `d` sont connues et que `k < d`, alors
  `history.go(k - d)`. Sinon, `navigate({ name: a }, { replace: true })`.

### 4.2 Registre des jeux (`src/games/index.ts`, CONTRAT)

```ts
/** Un jeu = une route du même nom = une activité du temps de jeu. */
export type GameId = GameRouteName;
export type Availability = { available: true } | { available: false; parentHint: string };
export interface GameDefinition {
  id: GameId;
  route: Extract<Route, { name: GameId }>;
  parentLabel: string;              // fiche enfant, statistiques ; jamais montré à l'enfant
  tileLabel: string;                // aria-label de la tuile (lecteurs d'écran, tests)
  defaultTracks: readonly string[]; // Track.id où le jeu est visible si Profile.games est absent
  store: GameStoreName;             // store IndexedDB de ses parties
  /** Jouable sur CE téléphone ? Absent = toujours. Ne rejette jamais. `parentHint` : cause et remède (fiche enfant). */
  checkAvailability?: () => Promise<Availability>;
}
export const GAMES: readonly GameDefinition[] = [
  { id: 'dictation', route: { name: 'dictation' }, parentLabel: 'Dictée quotidienne', tileLabel: 'Dictée',
    defaultTracks: ['ce1'], store: 'dictations' }, // checkAvailability : ajouté par DICTEE.md (D6), bâti sur checkVoice()
  { id: 'coloring', route: { name: 'coloring' }, parentLabel: 'Coloriage magique', tileLabel: 'Coloriage',
    defaultTracks: ['ms'], store: 'colorings' },
];
export function getGame(id: string): GameDefinition | undefined;
export function defaultGameIds(trackId: string): GameId[];  // parcours résolu par getTrackOrDefault (F11 : inconnu → ms)
export function visibleGameIds(profile: Pick<Profile, 'trackId' | 'games'>): GameId[];
export function resolveAvailability(game: GameDefinition, timeoutMs?: number): Promise<Availability>; // 2000 ms par défaut
export interface GameStatsProps<R extends GameRecordBase> { profile: Profile; records: readonly R[] }
export interface GameSettingsProps<S> { value: S | undefined; onChange: (next: S | undefined) => void }
```

- `visibleGameIds` prend `profile.games ?? defaultGameIds(profile.trackId)`, retire les ids inconnus et les doublons,
  et respecte l'ordre de `GAMES`.
- `resolveAvailability` ne rend `{ available: false }` que si `game.checkAvailability()` le rend **explicitement**. Un
  rejet ou un délai dépassé donne `{ available: true }` : l'écran du jeu vérifie alors lui-même (DICTEE.md §2.6).
- Le picto est `GameIcon`, indexé par `GameId` (`Record<GameId, () => JSX.Element>`). Un jeu sans picto ne compile donc
  pas.
- Contrainte : `games/index.ts` et ses imports ne touchent pas au DOM au chargement du module, pour rester testables sous
  Vitest (environnement node).
- **Ajouter un jeu** demande de toucher : `GAME_ROUTES` et la `Route` (parse et toHash), `GAMES`, `GameIcon`, la couleur
  de tuile dans `hub.css`, un nouveau store (version de base suivante) avec son module de stockage, `renderRoute`, la
  table des blocs de ChildStats, et ARCHITECTURE.md.

### 4.3 Profil : jeux visibles et réglages de jeu (`src/storage/types.ts`, CONTRAT)

```ts
export interface Profile { /* …existant… */
  /** Jeux libres visibles sur le hub (GameId). Absent : défaut du parcours. [] : aucun. Id inconnu : ignoré. */
  games?: string[];
  /** Réglages propres à chaque jeu (types définis par DICTEE.md et COLORIAGE.md). Absent : réglages par défaut. */
  gameSettings?: GameSettingsMap;
}
export interface GameSettingsMap { coloring?: ColoringSettings } // V1 : seul le coloriage a un réglage (cadre A6)
```

Pourquoi ce modèle :
- Les deux champs sont optionnels, donc les profils et les exports v1 restent valides.
- `string[]` plutôt que `GameId[]` : un id inconnu est toléré puis ignoré à l'affichage, comme `trackId` (F11). Le stockage
  ne dépend pas de l'interface.
- Absent n'a pas le même sens que `[]` : tant que le parent n'a rien changé, passer de MS à CE1 bascule aussi le jeu par
  défaut.

### 4.4 Fin douce partagée (`src/games/useSoftEnd.ts`)

```ts
export const SOFT_END_MAX_MS = 60_000; // = NO_ANSWER_TIMEOUT_MS de LevelPlayer
export interface SoftEndOptions {
  busy: boolean;                 // une unité est commencée et pas finie (retour de réussite compris)
  onTimeUp: () => Promise<void>; // enregistre l'interruption ; sans effet si aucune partie en cours ; appelée au plus 1 fois
}
export interface SoftEnd {
  timeUp: boolean;                          // minuteur ou quota atteint : ne plus commencer d'unité
  checkpoint: () => boolean;                // au DÉBUT de chaque unité : true = fin lancée, ne rien commencer (cadre A4)
  exitReason: () => 'quit' | 'time-up';     // raison d'une sortie (maison, retour Android, démontage)
  endedRef: { readonly current: boolean };  // fin douce lancée : ne plus rien écrire au démontage
}
export function useSoftEnd(opts: SoftEndOptions): SoftEnd;
```

1. `timeUp` vient de `useSession()`. Les rappels le relisent par `timeUpRef`. Le hook mémorise l'instant où le temps est
   vu écoulé pour la première fois.
2. Si le temps est écoulé et que `busy` est faux, la fin est immédiate. Si `busy` est vrai, la fin arrive quand `busy`
   repasse à faux, et au plus tard 60 s après l'instant mémorisé. Ce délai n'est pas remis à zéro, puisqu'aucune unité ne
   doit plus commencer.
3. La fin n'a lieu qu'une fois : `endedRef = true`, puis `await onTimeUp()` (une erreur est journalisée, sans bloquer),
   puis `clearSoftEnd()`, puis `navigate({ name: 'locked' }, { replace: true })`. C'est ce que fait `timeUpEnd` de
   LevelPlayer.
4. `checkpoint()` renvoie `true` si la fin est déjà lancée. Si le temps est écoulé, il lance la fin et renvoie `true`.
   Sinon, il renvoie `false`. On l'appelle au début d'une unité (choix d'une série ou d'un dessin, mot suivant), jamais
   avant d'enregistrer : une unité commencée se termine et s'enregistre, quitte à créer la partie (cadre A4).
5. `exitReason()` renvoie `'time-up'` si le temps est écoulé, sinon `'quit'`. Une sortie pendant la fin douce est donc une
   interruption et non un abandon, comme dans la règle F6 de `closeStaleRuns`.
6. Si le jeu est démonté pendant la fin douce, le hook appelle `clearSoftEnd()`, et la garde renvoie à l'écran de fin. Le
   jeu clôt sa partie dans son propre nettoyage avec `exitReason()`, sauf si `endedRef` est vrai. Le hook n'écrit jamais
   en base.
7. Sur l'écran de fin de partie d'un jeu (partie `completed`), `busy` reste vrai pendant l'animation, puis la fin douce
   s'enchaîne ; `onTimeUp` n'écrit alors rien. C'est l'équivalent de `scheduleLockAfterStars`.

LevelPlayer n'est pas migré vers ce hook (V2).

## 5. Stockage et statistiques

### 5.1 IndexedDB v2 (`src/storage/db.ts`)

```ts
const DB_VERSION = 2;
upgrade(db, oldVersion) {
  if (oldVersion < 1) { /* inchangé */ }
  if (oldVersion < 2) { // un seul bloc, en cascade (F5)
    db.createObjectStore('dictations', { keyPath: 'id' }).createIndex('profileId', 'profileId');
    db.createObjectStore('colorings', { keyPath: 'id' }).createIndex('profileId', 'profileId');
  }
}
// StorageSchema : dictations: { key: string; value: DictationRecord; indexes: { profileId: string } }, idem colorings
```

Les données existantes ne sont pas migrées : les nouveaux stores naissent vides, les profils sont inchangés, et
`blocking()` reste tel quel.

### 5.2 Socle des enregistrements de jeu

```ts
// src/storage/types.ts (CONTRAT)
export type GameStoreName = 'dictations' | 'colorings';
export type GameEndReason = 'quit' | 'closed' | 'time-up';   // pas de vies : jamais 'out-of-lives' (cadre §3.5)
export interface GameRecordBase {
  id: string; profileId: string; startedAt: number; endedAt: number | null;
  status: RunStatus;                // 'in_progress' | 'completed' | 'abandoned'
  endReason: GameEndReason | null;
  activeMs: number;                 // temps actif dans l'écran de jeu, page visible, hors choix et fin (F10)
}
// src/storage/game-records.ts (nouveau)
export type GameRecordByStore = { dictations: DictationRecord; colorings: ColoringRecord };
export const GAME_STORES: readonly GameStoreName[];
/** Règles propres à chaque store, fournies par storage/dictations.ts et storage/colorings.ts. */
export const GAME_STORE_RULES: { [S in GameStoreName]: {
  isRecord: (value: unknown) => value is GameRecordByStore[S]; // validation à l'import
  isFinished: (record: GameRecordByStore[S]) => boolean;       // tous les mots validés, toutes les cases peintes
} };
export function startGameRecord<S extends GameStoreName>(store: S, profileId: string,
  init: Omit<GameRecordByStore[S], keyof GameRecordBase>): Promise<GameRecordByStore[S]>;
export function updateGameRecord<S extends GameStoreName>(store: S, id: string,
  update: (r: GameRecordByStore[S]) => GameRecordByStore[S]): Promise<GameRecordByStore[S] | undefined>;
export function finishGameRecord<S extends GameStoreName>(store: S, id: string,
  outcome: { status: 'completed' } | { status: 'abandoned'; endReason: GameEndReason },
  update?: (r: GameRecordByStore[S]) => GameRecordByStore[S]): Promise<void>;
export function listGameRecords<S extends GameStoreName>(store: S, profileId: string): Promise<GameRecordByStore[S][]>;
export function closeStaleGameRecords(): Promise<number>;
export function isGameRecordBase(value: unknown): value is GameRecordBase;
```

- **Cycle de vie** :
  - `startGameRecord` crée la partie avec `id` (UUID), `startedAt`, `in_progress`, `endReason` et `endedAt` à `null`, et
    `activeMs` à 0.
  - `updateGameRecord` et `finishGameRecord` travaillent en une transaction et n'agissent que sur une partie
    `in_progress` (F6) ; sinon, rien ne change et rien n'est levé. `updateGameRecord` rétablit les champs de base qu'il
    ne possède pas.
  - `listGameRecords` trie par `startedAt` croissant.
- **Clôture au lancement** : `closeStaleGameRecords()` est appelée par AppShell à côté de `closeStaleRuns()` et suit le même
  modèle, en une transaction sur les deux stores et `settings`. Une partie restée `in_progress` passe à `completed` si
  `GAME_STORE_RULES[store].isFinished(record)` (comme F7 de LevelPlayer : tout était joué, seule l'écriture finale a
  manqué). Sinon, elle passe à `abandoned`, avec la raison `time-up` si `lock.profileId === profileId` et
  `lock.lockedAt >= startedAt`, et `closed` sinon. Enfin, `endedAt = startedAt + activeMs`.
- **Une partie close ne se rouvre jamais** (cadre A2) : reprendre un coloriage crée une nouvelle partie liée
  (`resumedFrom`, COLORIAGE.md §3.6).
- **Points d'extension** : chaque jeu possède un module de stockage, `src/storage/dictations.ts` ou
  `src/storage/colorings.ts`, créé par T1 comme souche. Il y déclare `XRecord extends GameRecordBase` (et
  `ColoringSettings` pour le coloriage). Il écrit `isXRecord`, `isXFinished` (et `isColoringSettings`) pour l'import et
  la clôture, et ajoute ses fonctions propres, bâties sur `game-records.ts`. Dans la souche, `isXRecord` vaut
  `isGameRecordBase` et `isXFinished` rend `false`, en attendant D5 et C5. `storage/index.ts` réexporte
  `* from './dictations'` et `* from './colorings'`. `types.ts` et `db.ts` n'en importent que des types.
- **Aides de validation** : `isPlainObject`, `isFiniteNumber` et `isNonEmptyString` quittent export-import.ts pour
  `src/storage/validate.ts`, afin d'être partagées.
- **Suppression d'un profil** : `deleteProfile` ajoute les `GAME_STORES` à sa transaction et y supprime les clés de
  l'index `profileId`.

### 5.3 Export et import v2 (`src/storage/export-import.ts`)

- `EXPORT_VERSION = 2`. `ExportBundle` ajoute `dictations: DictationRecord[]` et `colorings: ColoringRecord[]`.
  `exportAll` en exclut les orphelins (profil absent), comme pour `runs`.
- L'import accepte `version` 1 ou 2 ; toute autre valeur donne `BAD_VERSION`.
  - En v1, `dictations` et `colorings` ne sont pas lus et valent `[]`.
  - En v2, ce sont des tableaux obligatoires (sinon `BAD_SHAPE`), où chaque ligne passe `isDictationRecord` ou
    `isColoringRecord`. `hasUniqueIds` s'applique à chaque store.
- `isProfile` ajoute deux vérifications :
  - `games` est absent, ou un tableau d'au plus 16 chaînes non vides d'au plus 32 caractères, toutes distinctes ;
  - `gameSettings` est absent, ou un objet simple dont la clé `coloring`, si elle existe, passe `isColoringSettings` ;
    les autres clés sont conservées.
- `isUsageDay` accepte `activitySeconds` absent, ou un objet simple de nombres finis ≥ 0.
- Les lignes orphelines des nouveaux stores sont ignorées et comptées dans `skipped`. `importAll` vide puis réécrit
  `dictations` et `colorings` dans sa transaction unique.
- `ImportResult` (succès) ajoute `gameRecords: number`, le total des dictées et des coloriages importés.

### 5.4 Temps par activité (`src/storage/usage.ts`)

- `UsageDay.activitySeconds?: Record<string, number>` : les secondes actives du jour par `ActivityId`. Il est absent
  pour les jours d'avant la v2.
- `addActiveSeconds(profileId, day, seconds, activity?: string)` incrémente `activeSeconds` et
  `activitySeconds[activity]` dans la même transaction.
- Nouvelle fonction `listUsage(profileId): Promise<UsageDay[]>`, triée par jour.
- Dans `src/app/session.ts` :
  - `type ActivityId = 'hub' | 'map' | GameId` ;
  - `activityForRoute(name)` rend `hub` pour hub, `map` pour map et play, le nom lui-même pour une route de jeu, et
    `null` pour les autres routes.

### 5.5 Indicateurs de l'espace parent (définitions exactes, complètent ARCHITECTURE §7)

| Indicateur | Définition exacte |
|---|---|
| **Temps par activité** | Temps actif compté par l'horloge de session, c'est-à-dire celui des limites, par jour local et selon l'écran : Accueil = hub, Carte = carte et parties de niveaux, Dictée, Coloriage. Le reste non ventilé (`activeSeconds` − somme ventilée, jamais négatif) va à la Carte, puisqu'avant la v2 seuls la carte et les parties étaient comptés. Deux périodes : aujourd'hui (`dayKey()`) et 7 jours (aujourd'hui et les 6 jours précédents). Total = somme des `activeSeconds`, donc le même chiffre que le tableau de bord pour aujourd'hui. |
| **Parties** (par jeu) | Enregistrements du jeu, tous statuts, y compris en cours. |
| **Terminées** | `status = 'completed'`. |
| **Abandons** | `endReason` vaut `quit` ou `closed`. |
| **Interruptions** | `endReason = 'time-up'`. Ce ne sont pas des abandons. |
| **Temps de jeu** (par jeu) | Somme des `activeMs`. Il est inférieur au temps par activité, car il ne compte ni les écrans de choix ni les transitions (comme le « Temps de jeu » des niveaux). |
| **Jours joués (7 j)** | Jours locaux distincts, parmi aujourd'hui et les 6 précédents, où au moins une partie du jeu a commencé. Mesure la régularité (« quotidienne »). |
| **Dernière partie** | Le `startedAt` le plus récent. |

Ces indicateurs sont calculés par `summarizeActivityTime(days, today)` et `summarizeGameRecords(records, now)`, deux
fonctions pures dans `src/parent/stats.ts`. Chaque spec de jeu n'ajoute que ses indicateurs propres dans son bloc.

## 6. Intégration

### 6.1 `SessionProvider` (modifications exactes)

1. Deux imports : `isChildRoute` et `isSoftEndRoute` depuis `./routes`, `activityForRoute` et `ActivityId` depuis
   `./session`. Nouvelle ref : `activityRef = useRef<ActivityId | null>(null)`.
2. Dans `flushElapsed`, la première ligne capture `const activity = activityRef.current`, de façon synchrone. L'appel
   devient `addActiveSeconds(id, dayKey(), elapsed, activity ?? undefined)`.
3. Dans `triggerLock`, on calcule `const soft = isSoftEndRoute(routeNameRef.current)`, puis `if (soft)
   setSoftEndActive(true)` **avant** `await updateSettings({ lock })`, puis `if (!soft) navigate({ name: 'locked' },
   { replace: true })`. La garde n'a ainsi jamais de fenêtre où elle couperait l'unité en cours.
4. Effet de synchronisation (dépendances `[profile?.id, route.name]`) :
   - il commence par `setSoftEndActive(false)`, car une fin douce ne survit jamais à un changement d'écran ;
   - la condition devient `!profile || !isChildRoute(route.name)`, qui remet aussi `activityRef.current` à `null` ;
   - sinon, `const flushing = flushElapsed(Date.now(), { requireVisible: false })` impute l'écart à l'activité quittée,
     puis `activityRef.current = activityForRoute(route.name)`, puis `await flushing` ;
   - la suite est inchangée. La session s'ouvre ou reprend donc dès le hub.
5. Commentaires F1 et F9 : remplacer « carte/partie » par « écrans de l'enfant ». L'API `useSession()` ne change pas.

### 6.2 Garde de route (`RouteGuard`, AppShell.tsx)

```ts
const softEndInProgress = isSoftEndRoute(route.name) && softEndActive;
if (settings.lock && route.name !== 'locked' && route.name !== 'parent' && !softEndInProgress)
  return navigate({ name: 'locked' }, { replace: true });
if (!isChildRoute(route.name)) return;
if (!profile) return navigate({ name: 'profiles' }, { replace: true });         // pas de profil → profils
const fresh = await getProfile(profile.id); if (cancelled) return;
if (!fresh) { setProfile(null); return navigate({ name: 'profiles' }, { replace: true }); } // supprimé → profils
if (isGameRoute(route.name) && !visibleGameIds(fresh).includes(route.name))
  navigate({ name: 'hub' }, { replace: true });                                // jeu non visible → hub
```

AppShell :
- `renderRoute` ajoute `hub → <Hub/>`, `dictation → <DictationScreen/>` et `coloring → <ColoringScreen/>`, chacun `null`
  sans profil ;
- au montage, `closeStaleGameRecords()` est appelée à côté de `closeStaleRuns()` ;
- `ensureHistoryDepth()` est appelée dans l'initialiseur du `useState` de la route.

### 6.3 Écrans existants

- **ProfilePicker** : `choose` navigue vers `{ name: 'hub' }`, et le montage appelle `markHistoryAnchor('profiles')`.
  Le cadenas, l'estompage « quota épuisé » et la mise à jour de la PWA ne changent pas : la PWA se met à jour sur cet
  écran seulement.
- **SagaMap** :
  - le bouton avatar devient la maison : `<div class="map-home"><IconButton size={56} onClick={() =>
    returnTo('hub')} aria-label="Retour à l'accueil" data-testid="to-hub"><Icon name="home" size={36}/></IconButton></div>`.
    Il ne vide plus le profil ;
  - le `LongPressButton` parent et `openParent` sont supprimés ;
  - `TimeRing` est importé depuis `src/ui/TimeRing.tsx`.
  - Rien d'autre ne change : mondes, trajets, `seenWorld`.
- **LockScreen** : dans `grant`, `navigate({ name: 'map' })` devient `returnTo('hub')`. Le profil est déjà remis par
  `setProfile(fresh)`.
- **global.css** :
  - `.map-time-ring*` devient `.time-ring*`, placé en haut à droite (`top` et `right` = zone sûre + 20 px, soit le centre
    de l'ancien cadenas) ;
  - `.map-back-avatar` devient `.hub-avatar` ;
  - nouvelle classe `.map-home` (absolue, en haut à gauche, 12 px) ;
  - le reste du hub va dans `src/screens/hub/hub.css`, avec les tuiles, `data-count`, les couleurs par jeu et le badge.
- **LevelPlayer, LevelEnd et LevelFailed** : inchangés.

### 6.4 Espace parent

- **ChildForm**, nouvelle section « Jeux libres » après « Parcours » :
  - texte d'aide : « Sur l'accueil de l'enfant, à côté de la carte. Sans limite de parties : seul le temps de jeu
    compte. » ;
  - un bouton à bascule par jeu de `GAMES`, sur le modèle de `pa-track-option` (`aria-pressed`,
    `data-testid="game-toggle-<id>"`, libellé `parentLabel`). L'état affiché est `games ?? defaultGameIds(trackId)`, et
    il suit en direct le parcours choisi ;
  - l'état du formulaire est `games: GameId[] | null`, où `null` veut dire « par défaut ». Basculer un jeu fixe une liste
    explicite ;
  - avec `null`, une mention discrète : « Choix par défaut du parcours ». Sinon, un bouton fantôme « Revenir au choix par
    défaut » (`data-testid="games-default"`) remet `null` ;
  - si `resolveAvailability` rend `{ available: false }`, un avertissement : « <parentLabel> : <parentHint> » ;
  - sous chaque jeu coché qui a des réglages (V1 : le coloriage), son composant `<Game>Settings`
    (`GameSettingsProps`) ;
  - à l'enregistrement, `games` n'est ajouté que s'il est non nul. `gameSettings` est conservé et fusionné, comme
    `seenWorld` aujourd'hui.
- **ChildStats**, dans l'ordre :
  1. en-tête : « Temps de jeu total » devient niveaux + Σ `activeMs` des parties de jeu ; « Parties lancées » et
     « Réussite au 1er coup » restent des indicateurs de la carte (cadre A8) ;
  2. **Temps par activité** (`data-testid="activity-time"`) : un tableau dont les lignes sont Carte, les jeux visibles
     ou joués sur 7 jours, Accueil et Total, et dont les colonnes sont « Aujourd'hui » et « 7 derniers jours ». Les
     cellules portent `activity-<id>-today` et `activity-<id>-week`, au format `formatDuration` ;
  3. une section par jeu visible ou ayant au moins une partie (`data-testid="game-stats-<id>"`, titre `parentLabel`) :
     une grille `pa-stat-grid` des indicateurs communs (§5.5), puis `<XStats profile records/>` ;
  4. les sections existantes, précédées d'un titre « Carte du parcours » ;
  5. l'aide, complétée par les définitions de §5.5.
- **Dashboard** : sous le parcours, une ligne `pa-child-card__games` : « Jeux libres : Dictée quotidienne », ou
  « Jeux libres : aucun ».
- **import.ts** : `describeImportCounts` compte `runs + dictations + colorings`, et `formatImportSuccess` utilise
  `runs + gameRecords`. La formulation ne change pas (« partie » = une partie de niveau ou de jeu, cadre §3.5).

### 6.5 Contrat d'un écran de jeu (pour DICTEE.md et COLORIAGE.md)

- **Fichiers** : `src/games/<id>/<Game>Screen.tsx`, sans props ; `<Game>Stats.tsx`, avec
  `GameStatsProps<XRecord>` ; `<Game>Settings.tsx`, avec `GameSettingsProps<XSettings>`, seulement si le jeu a des
  réglages (V1 : `ColoringSettings.tsx`). T2 crée ces fichiers comme souches.
- **Maison** : en haut à gauche, `IconButton` de 56 px, `data-testid="to-hub"`, `returnTo('hub')`.
- **Temps** : pas d'anneau de temps. Dans un jeu, on utilise `useSoftEnd`, avec `checkpoint()` au début de chaque
  unité (cadre A4).
- **Enregistrement** : `activeMs` est à jour à chaque unité terminée. Au démontage sans fin, la partie est close avec
  `exitReason()`.
- **Sans texte** pour le coloriage. La dictée peut afficher des lettres et des mots (cadre §3.7).

### 6.6 Impact sur l'existant

- **Fichiers existants modifiés** :
  - app : `app/routes.ts`, `app/AppShell.tsx`, `app/SessionProvider.tsx`, `app/session.ts` ;
  - stockage : `storage/types.ts`, `storage/db.ts`, `storage/export-import.ts`, `storage/profiles.ts`,
    `storage/usage.ts`, `storage/index.ts` ;
  - écrans : `screens/ProfilePicker.tsx`, `screens/SagaMap.tsx`, `screens/LockScreen.tsx`, `styles/global.css`,
    `ui/icons/Icon.tsx` (picto `speaker-off`) ;
  - build : `package.json`, script `validate:content` (cadre A12) ;
  - parent : `parent/ChildForm.tsx`, `parent/ChildStats.tsx`, `parent/Dashboard.tsx`, `parent/stats.ts`,
    `parent/import.ts`, `parent/parent.css` ;
  - tests : les `*.test.ts` voisins et 7 specs e2e (§8.2).
- **Fichiers CONTRAT touchés** : `routes.ts`, `storage/types.ts`, `storage/index.ts` et `games/index.ts` (nouveau).
  `engine/types.ts` n'est pas touché.
- **ARCHITECTURE.md** :
  - §2 : `src/games/` et le hub ;
  - §3 : nouveau schéma profils → hub → carte ou jeux, avec les maisons et l'écran de fin → hub ;
  - §6 : stores `dictations` et `colorings`, `Profile.games` et `gameSettings`, `usage.activitySeconds`, export v2
    (import v1 et v2) ;
  - §7 : tableau de §5.5 ;
  - §8 : temps compté sur le hub, la carte, les parties et les jeux ; fin douce par unité (manche, mot, case) ; accès
    parent depuis les profils seulement ; +X min → hub ;
  - §9 : hub sans texte.

## 7. Cas limites

- **Rechargement sur `#/hub` ou un jeu** : le profil est perdu, la garde renvoie aux profils, et la partie ouverte est
  close au lancement suivant.
- **Profil supprimé ou changé par le parent** : l'accès parent vide toujours le profil. Si une route d'enfant subsiste
  malgré tout (retour Android), `getProfile` échoue et la garde renvoie aux profils. Un jeu retiré depuis renvoie au hub.
- **Verrou actif puis retour Android vers le hub, la carte ou un jeu** : la garde renvoie à l'écran de fin, car
  `softEndActive` est remis à `false` à chaque changement de route (F1 généralisé). Si un jeu voit `timeUp` dès son
  montage, `checkpoint()` empêche de créer une partie.
- **Verrou pendant un tap sur une tuile** : la navigation a lieu, puis la garde renvoie à l'écran de fin. Aucune partie
  n'est créée (`checkpoint`).
- **Détection de disponibilité lente (plus de 2 s) ou en échec** : la tuile est `ready`, et l'écran du jeu se débrouille.
- **Parcours changé** avec `games` absent : les jeux par défaut suivent. Une liste explicite ne change pas. Un parcours
  inconnu prend les défauts du parcours résolu (`ms`).
- **`seenWorld` absent** (profil neuf) : la tuile montre la forêt. La carte calibre ensuite sans fête, comme aujourd'hui.
- **Double tap sur une tuile** : une seule navigation. Tap pendant l'animation d'arrivée : accepté.
- **Historique inconnu** (hash modifié à la main, tests e2e `openLevelHash`) : `returnTo` retombe sur un replace. On ne
  saute jamais vers une entrée incertaine.
- **Import d'un fichier v1** : `games` est absent, donc les défauts s'appliquent, et il n'y a aucune partie de jeu. Un
  fichier v2 dans une ancienne app est refusé (« autre version »), ce qui est connu et voulu.
- **Deux enfants** : sessions, jeux visibles et parties restent séparés par profil. Le hub n'affiche que ceux de l'enfant
  actif.
- **360×640 avec 3 tuiles** : 80 px de barre + 3 × 140 px + espacements, ça tient.

## 8. Tests

### 8.1 Vitest

- **`app/routes.test.ts`** (nouveau) : aller-retour `parseHash` / `toHash` pour les trois nouvelles routes ; prédicats
  `isChildRoute`, `isSoftEndRoute` et `isGameRoute`.
- **`app/session.test.ts`** : `activityForRoute`.
- **`games/index.test.ts`** :
  - `defaultGameIds('ms')` vaut `['coloring']`, `('ce1')` vaut `['dictation']`, et un parcours inconnu vaut `['coloring']` ;
  - `visibleGameIds` : absent donne le défaut, `[]` donne `[]`, l'ordre suit le registre, et les ids inconnus comme les
    doublons disparaissent ;
  - `checkAvailability` : `false` explicite, rejet, délai dépassé.
- **Stockage** :
  - `db.test.ts` : une base v1 réelle avec un profil, ouverte en v2, garde le profil et gagne les deux stores ;
  - `game-records.test.ts` : start, update et finish n'agissent que sur `in_progress` ; tri ; clôture `time-up` ou
    `closed` avec `endedAt` ;
  - `profiles.test.ts` : la suppression en cascade atteint aussi les parties de jeu ;
  - `usage.test.ts` : `activitySeconds` et `listUsage` ;
  - `export-import.test.ts` : aller-retour v2 ; v1 sans tableaux acceptée ; v2 sans tableaux refusée ; version 3 refusée ;
    orphelins comptés ; ids en double refusés ; `games` invalide refusé ; `gameRecords` dans le résultat.
- **Parent** :
  - `stats.test.ts` : `summarizeActivityTime` (jour v1, jour de mise à jour, fenêtre de 7 jours) et
    `summarizeGameRecords` ;
  - `import.test.ts` : les comptes incluent les parties de jeu.

### 8.2 E2E

**Helper commun** : `tests/e2e/nav.ts`, sans suffixe `.spec`, donc pas exécuté. Il remplace les copies locales de chaque
fichier :

```ts
export function profileCard(page: Page, name: string): Locator;             // inchangé
export async function chooseProfile(page: Page, name: string): Promise<void>; // profils → hub (attend getByTestId('hub'))
export async function openMap(page: Page): Promise<void>;                    // hub → carte (attend .screen--map)
export async function enterMap(page: Page, name: string): Promise<void>;     // chooseProfile + openMap
export async function backToHub(page: Page): Promise<void>;                  // to-hub (carte ou jeu)
export async function backToProfiles(page: Page): Promise<void>;             // depuis carte/jeu : to-hub puis hub-to-profiles
```

**Specs existantes à adapter** (tout ce qui suppose « profil → carte ») :

| Fichier | Adaptation |
|---|---|
| vertical-slice | `chooseProfile` devient `enterMap` (5 tests) ; `backToProfiles` vient de nav.ts ; les `goBack()` restent valables |
| session | `enterMap` (4 tests) ; après `grant-5`, on attend le hub puis `openMap` ; quota : `not.toHaveURL(/#\/(map\|hub)$/)` |
| parent | tests 2 et 4 : `enterMap` et `backToProfiles` ; test 7 réécrit (ni le hub ni la carte n'ont de `parent-access`) ; test 8 : écran profils seulement |
| mechanics | `enterMap` là où la carte est attendue (tests 5 et 6) ; `backToProfiles` de nav.ts (tests 2, 3 et 5) ; `chooseProfile` + `openLevelHash` inchangés, car le hub garde le profil |
| ce1 | son `chooseProfile`, qui attend `[data-level]`, devient `enterMap` |
| lives | `enterMap` (2 tests) |
| worlds | les 3 clics sur `/Lou/` deviennent `enterMap` ; ajout : après la fête, `hub-tile-map` porte `data-world="sea"` |
| smoke | inchangé |

**Nouveaux tests** :
- `hub.spec.ts` (T3) :
  - MS : 2 tuiles (carte et coloriage), `innerText` vide, pas de cadenas ; carte → maison → hub ; avatar → profils ;
  - CE1 : carte et dictée ;
  - historique : carte → maison → `goBack()` donne les profils ; jeu provisoire → `goBack()` donne le hub ;
  - `#/dictation` saisi à la main pour une enfant MS : retour au hub ;
  - horloge simulée : verrou sur le hub, puis écran de fin, puis `grant-5`, puis hub.
- `parent-games.spec.ts` (T4) :
  - bascules de jeux → 3 tuiles, puis 1, puis retour au défaut ;
  - `activity-map-today` après 60 s simulées sur la carte ;
  - export puis import dans un contexte vierge : les tuiles sont conservées.
- Tuile dictée indisponible (voix simulée absente) : badge `speaker-off`, et le tap ouvre l'écran d'explication de la
  dictée. Ce test est écrit par la tâche « dictée », puisqu'il dépend de sa détection.

## 9. Découpage en tâches

| Tâche | Fichiers attribués (exclusifs) | Dépend de |
|---|---|---|
| **T1 Stockage v2** (§4.3, §5.1–5.4) | `storage/types.ts`, `db.ts`, `validate.ts`*, `game-records.ts`*, `export-import.ts`, `profiles.ts`, `usage.ts`, `index.ts`, leurs `.test.ts` ; souches `storage/dictations.ts`* et `storage/colorings.ts`* | — |
| **T2 Socle app** (§4.1, §4.2, §4.4, §6.1, §6.2) | `app/routes.ts`, `routes.test.ts`*, `AppShell.tsx`, `SessionProvider.tsx`, `session.ts` (+ test), `games/index.ts`* (+ test), `games/useSoftEnd.ts`* ; souches `screens/Hub.tsx`* (boutons simples aux bons `data-testid`), `games/dictation/Dictation{Screen,Stats}.tsx`* et `games/coloring/Coloring{Screen,Stats,Settings}.tsx`* (écran : maison et 🚧) ; `package.json` (A12) | T1 |
| **T3 Hub et navigation** (§2, §6.3) | `screens/Hub.tsx` (reprend la souche), `screens/hub/*`*, `ui/TimeRing.tsx`*, `ui/icons/GameIcon.tsx`*, `ui/icons/Icon.tsx` (`speaker-off`), `SagaMap.tsx`, `ProfilePicker.tsx`, `LockScreen.tsx`, `styles/global.css`, `tests/e2e/nav.ts`*, `hub.spec.ts`*, les 7 specs e2e existantes | T2 |
| **T4 Espace parent** (§5.5, §6.4) | `parent/ChildForm.tsx`, `ChildStats.tsx`, `Dashboard.tsx`, `stats.ts` (+ test), `import.ts` (+ test), `parent.css`, `tests/e2e/parent-games.spec.ts`* | T2 (e2e : T3) |
| **T5 Documentation** (§6.6, cadre A10) | `docs/ARCHITECTURE.md`, `docs/CONTENU.md`, `docs/PROGRESSION-MS.md`, `docs/PROGRESSION-CE1.md` | après T3, T4 et les jeux |
| **Jeux** (DICTEE.md, COLORIAGE.md) | `games/<id>/**` (reprennent les souches), `storage/dictations.ts` ou `colorings.ts` (reprennent les souches), `ui/voice.ts` et `ui/sound.ts` (dictée), `mechanics/color-mix/` (coloriage), et une ligne de `GAMES` (`checkAvailability` de la dictée) | T2 (e2e : T3) |

\* = fichier nouveau.

- T2 garde vertes les e2e existantes : `ProfilePicker` va encore à la carte, et le changement de `navigate` ne casse rien.
- T3 bascule la navigation et adapte les e2e **dans le même lot**, pour que `main` reste vert.
- Une fois T2 livré, T3, T4 et les jeux avancent en parallèle.

## 10. Questions ouvertes

### 10.1 Pour le PM

1. **Cadenas parent de la carte** (ajouté le 25/09) : faut-il le retirer pour que l'accès parent passe *uniquement* par
   les profils ? **Reco : oui.** Le parent fait deux taps de plus (maison, avatar), et l'écran de l'enfant reste simple.
   Si on le garde, l'anneau reste à sa gauche et le test e2e 7 ne change pas.
2. **Enfant sans aucun jeu** : faut-il garder le hub avec la seule tuile carte, ou aller directement à la carte ?
   **Reco : garder le hub**, pour un modèle unique et une place prête pour le rythme de la carte.
3. **Anneau de temps** : sur le hub et la carte seulement, ou aussi dans les jeux ? **Reco : hub et carte seulement**,
   comme en partie aujourd'hui.
4. **Temps par activité** : dans la fiche statistiques seulement, ou aussi sur la carte de l'enfant du tableau de bord ?
   **Reco : fiche statistiques seulement** en V1.

### 10.2 Entre specs

Tranché dans le cadre commun ([README.md](README.md) §5, A1 à A12) : types des jeux, reprise d'un coloriage, clôture au
lancement, fin douce, jeu indisponible (tuile tapable avec badge), réglages, composants, statistiques, documentation.
Reste un écart assumé : une sortie pendant la fin douce vaut `time-up` dans les jeux, alors que LevelPlayer compte
aujourd'hui `quit`. L'alignement est prévu en V2 (§11).

## 11. Hors périmètre / V2

- Rythme de la carte : étape du jour, maîtrise espacée, état de la tuile carte. L'emplacement est déjà réservé (§2.2).
- LevelPlayer : migration vers `useSoftEnd`, sortie pendant la fin douce comptée `time-up`, bouton « quitter » et « carte »
  via `returnTo` (après un niveau, le retour Android depuis la carte rouvre encore le niveau, comme aujourd'hui).
- Mise en avant d'une tuile, jeu du jour, récompenses ou séries affichées à l'enfant.
- Temps par activité sur le tableau de bord ; limites de temps par activité.
- Plus de deux jeux libres : la grille est prévue pour 3 tuiles, et au-delà il faudra revoir la disposition.
- Migration de la voix de la mécanique `spelling` vers `ui/voice.ts` (cadre §3.2).
