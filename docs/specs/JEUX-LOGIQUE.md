# Spec — Jeux de logique et de devinette (mécaniques réutilisables)

Cadre : [README.md](README.md), [HUB.md](HUB.md), [MORPION-PENDU.md](MORPION-PENDU.md). Lot du 29/10/2026.

## 1. Résumé et décisions du PM

« Vas-y avec ça » (29/10) : de nouveaux petits jeux de logique et de devinette, **construits d'abord comme des
mécaniques paramétrables** (moteur générique, niveaux en JSON), pour servir à la fois :

1. de **niveaux sur la carte** : on alterne niveaux de compétence ciblée et niveaux de raisonnement ;
2. de **jeux libres** sur le hub : « la mécanique en manches illimitées », via un écran générique.

Décisions reprises telles quelles : « ajouter aussi le morpion en facile (une partie en 2 manches gagnantes) et le
pendu (3 mots à deviner) » comme niveaux de la carte.

| Mécanique (id) | Jeu | Carte | Jeu libre |
|---|---|---|---|
| `guess-number` | Devine le nombre | CE1 | oui (CE1) |
| `code-breaker` | Code secret (Mastermind en couleurs) | MS et CE1 | oui (MS et CE1) |
| `robot` | Robot à programmer | MS (pas à pas) et CE1 (programme) | oui (MS et CE1) |
| `tictactoe` | Morpion contre le téléphone | MS et CE1 | non (le jeu libre existe déjà) |
| `hangman` | Pendu | CE1 | non (le jeu libre existe déjà) |

Choix d'orchestration (le PM a délégué la planification) :

- **Niveau obligatoire** comme les autres (question laissée ouverte par le PM) : chaque niveau doit se gagner par
  compétence. Pour le morpion, la chance est neutralisée : une grille perdue coûte une vie mais on rejoue, et le niveau
  fixe 5 vies.
- **Alternance** : chaque monde compte **20 niveaux = 16 de compétence + 4 de raisonnement**, un niveau de raisonnement
  après chaque série de 4. `LEVELS_PER_WORLD` passe de 16 à 20 ; les mondes gardent ainsi leur alignement (une série de
  mots par monde en CE1). CE1 : 64 → 80 niveaux (4 mondes) ; MS : 32 → 40 (2 mondes).
- **Jeux libres** : `guess-number`, `code-breaker`, `robot` rejoignent le hub. Défauts : CE1 → dictée, morpion, pendu
  et les trois nouveaux (8 tuiles avec la carte) ; MS → coloriage, code secret, robot (4 tuiles).

## 2. Contrat commun des mécaniques « à plusieurs coups »

Le moteur (`LevelPlayer`) reste inchangé : **une manche = une bonne réponse**. Ces mécaniques gèrent leurs coups dans
leur vue et parlent au moteur par `onChoose` :

- **réussite** de la manche : `onChoose(round.answer)` (une seule fois) ;
- **raté** de la manche (budget de coups dépassé, grille perdue, fleur sans pétale, programme qui échoue) :
  `onChoose(MISS)` avec `MISS = 'miss'` (exporté par `src/engine/types.ts`), puis la manche **continue** (nouvelle
  grille, nouveau mot, on corrige le programme…) jusqu'à la réussite. Le moteur compte la manche comme ratée au
  premier essai et retire une vie (une seule par manche, même si `MISS` revient) ;
- la vue ignore tout tap quand `solved` est vrai ; `round.answer` n'est jamais égal à `MISS` ;
- tout élément tapable porte `data-choice="<id>"` (tutoriel, e2e), avec des ids qui ne valent jamais `round.answer` ni
  `MISS` : `key-7`, `peg-red`, `arrow-up`, `cell-4`, `letter-a`, `run`… ;
- `chanceOfFirstTry` vaut 0 pour ces cinq mécaniques (on ne réussit pas au hasard) ;
- **sans texte** pour les mécaniques jouables en MS (`code-breaker`, `robot`, `tictactoe`) ; `guess-number` et `hangman`
  (CE1) peuvent afficher des nombres, des lettres et des mots ;
- cibles tactiles ≥ 56 px (≥ 44 px pour un clavier ou un pavé, comme la dictée) ; tient en 360 × 640 sans défiler ;
- pas de son de touche ; `playError` est joué par le moteur à chaque `MISS`, la vue n'en rajoute pas.

## 3. Les mécaniques (paramètres : `src/engine/types.ts`, schéma : `content/level.schema.json`)

### 3.1 `guess-number` — Devine le nombre (CE1)

Le téléphone pense à un nombre de `range`. L'enfant propose ; réponse « plus grand » ou « plus petit » (flèche et mot).
Une droite graduée montre l'intervalle qui reste possible (bornes en couleur, la zone éliminée se grise).
`input: 'tiles'` : tous les nombres de la plage en grille (plages ≤ 30), les éliminés se grisent ; `'keypad'` : pavé
numérique + ✓. Raté si l'enfant dépasse `maxGuesses` propositions (une proposition hors de l'intervalle encore possible
compte quand même) ; la manche continue jusqu'au nombre trouvé.

### 3.2 `code-breaker` — Code secret (MS et CE1)

Un code de `length` pions parmi `colors` (avec ou sans répétition). L'enfant compose une ligne (tap sur un pot de
couleur remplit la case libre suivante ; tap sur une case la vide), puis ✓. Indice par ligne :
`feedback: 'positional'` (chaque pion reçoit une marque : ✓ vert bien placé, point orange présent ailleurs, rien
sinon) ou `'counts'` (classique : nombre de bien placés et de mal placés, sans dire lesquels). Les lignes précédentes
restent visibles. Raté si `maxGuesses` lignes sont dépassées. Chaque couleur a aussi une forme (`Token`), pour les
daltoniens et pour la petite.

### 3.3 `robot` — Robot à programmer (MS et CE1)

Grille `size` × `size`, un robot (orienté), un trésor, `obstacles` rochers (le générateur garantit un chemin dont la
longueur minimale tombe dans `pathLength`). Flèches haut / bas / gauche / droite (déplacement absolu, pas de rotation).
`mode: 'step'` (MS) : chaque flèche déplace tout de suite ; un choc contre un rocher ou un bord fait vibrer le robot sans
le bouger ; raté au premier choc. `mode: 'program'` (CE1) : l'enfant aligne au plus `maxArrows` flèches (tap pour
retirer), puis ▶ ; le robot exécute pas à pas ; s'il heurte quelque chose ou s'arrête ailleurs que sur le trésor, il
revient au départ, le programme reste affiché pour être corrigé, et la manche est ratée (premier échec seulement).

### 3.4 `tictactoe` — Morpion (MS et CE1)

Réutilise `src/games/tictactoe/logic.ts` (niveaux, minimax, `threatCells`). Une manche = gagner une grille contre le
téléphone au niveau `level`. Grille perdue : `MISS`, puis nouvelle grille. Égalité : nouvelle grille, sans raté. L'enfant
commence la première grille de chaque manche puis on alterne (`childStarts`). `hint` : coup de pouce (menace qui
clignote). Sans texte. Niveau type : `rounds: 2` (« 2 manches gagnantes »), `lives: 5`, `level: 'easy'`, `hint: true`.

### 3.5 `hangman` — Pendu (CE1)

Réutilise `src/games/hangman/` (`logic.ts`, `words.ts`, `Flower.tsx`). Une manche = trouver un mot (nombre de lettres,
indice, clavier sans accent, fleur à `maxMistakes` pétales). Mot perdu : le mot s'affiche 2 s, `MISS`, puis un autre mot
de la même liste. `words` : ids du catalogue (absent = tout le catalogue) ; `minLength`/`maxLength` filtrent. Niveau
type : `rounds: 3` (« 3 mots à deviner »).

## 4. Jeux libres (écran générique `src/games/puzzle/`)

- Routes `#/guess-number`, `#/code-breaker`, `#/robot` ; une seule implémentation, `PuzzleScreen`, paramétrée par l'id.
- Choix de difficulté au départ : trois boutons à étoiles (1, 2, 3), sans texte, ★ présélectionné à chaque ouverture
  (comme le morpion). Chaque difficulté = des paramètres de la mécanique (`presets.ts`, contrôlés par le même validateur
  que les niveaux).
- Une **partie** = une manche (un nombre, un code, un trajet). Elle est créée au premier coup (A9) : la vue appelle
  `onChoose` pour la première fois, ou l'écran crée la partie au premier tap (événement `onFirstInteraction`, voir
  contrat). Réussie : enregistrée, petite fête, puis manche suivante automatique (900 ms ou `solvedDelayMs`). Maison en
  haut à gauche, compteur de manches réussies de la séance (pastilles). Fin douce : `useSoftEnd`, unité = une manche.
- Store IndexedDB **`puzzles`** (DB v4, export v4 ; l'import accepte v1 à v4) : `PuzzleRecord` (`src/storage/puzzles.ts`)
  — `game`, `preset`, `firstTry` (null tant que non résolue), `misses` (nombre de `MISS` reçus), `outcome`
  (`'solved' | null`). Les trois jeux partagent le store ; ChildStats filtre par `game`.
- Statistiques par jeu (bloc `PuzzleStats`) : par difficulté, manches résolues et part réussie du premier coup.

## 5. Hub

- 6 à 9 tuiles : grille de 3 colonnes ; la carte s'étend sur assez de colonnes pour qu'il n'y ait pas de trou
  (`span = 1 + (3 − count % 3) % 3`, au plus 3) : 7 tuiles → carte en pleine largeur + 2 × 3 ; 8 → carte sur 2 colonnes
  + 7 jeux ; 9 → 3 × 3. Tuiles ≥ 120 px de haut, pictos réduits, l'écran ne défile jamais en 360 × 640.
- Pictos `GameIcon` pour les trois jeux libres ; `MechanicIcon` pour les cinq mécaniques (carte et stats parent).

## 6. Découpage (fichiers exclusifs par tâche)

| Tâche | Fichiers | Dépend de |
|---|---|---|
| T0 contrats (orchestrateur) | `engine/types.ts`, `level.schema.json`, `engine/chance.ts`, `mechanics/index.ts`, souches, `app/routes.ts`, `games/index.ts`, labels de `parent/ChildStats.tsx`, cette spec | — |
| T1 `guess-number` | `src/mechanics/guess-number/**` | T0 |
| T2 `code-breaker` | `src/mechanics/code-breaker/**` | T0 |
| T3 `robot` | `src/mechanics/robot/**` | T0 |
| T4 `tictactoe` + `hangman` | `src/mechanics/tictactoe/**`, `src/mechanics/hangman/**` | T0 |
| T5 stockage v4 + stats | `src/storage/{puzzles,types,db,game-records,export-import,profiles,index}.ts` + tests, `src/games/puzzle/PuzzleStats.tsx`, `src/games/puzzle/stats.ts`, `src/parent/ChildStats.tsx` (montage), `src/parent/import.ts` | T0 |
| T6 jeu libre + hub + pictos | `src/games/puzzle/{PuzzleScreen.tsx,presets.ts,puzzle.css,presets.test.ts}`, `src/screens/hub/hub.css`, `src/ui/icons/{GameIcon,MechanicIcon}.tsx`, `src/app/AppShell.tsx` | T0 (et T5 pour l'API, contrat fixé) |
| T7 contenu | `content/levels/{ce1,ms}/*-logique-*.json`, `content/tracks/*.json`, `src/screens/map/layout.ts` (+ test), test d'alternance, `docs/PROGRESSION-*.md` | T1–T4 |
| T8 e2e | `tests/e2e/**` | T5–T7 |
| T9 revue | lecture seule | T8 |

## 7. Cas limites

- **Progression existante** : un niveau de raisonnement inséré avant le niveau en cours d'une enfant devient le premier
  niveau débloqué : l'avatar y revient. Les niveaux déjà réussis restent réussis, la frontière reste jouable. Assumé :
  les nouveaux niveaux sont « à rattraper ».
- Les mondes passent à 20 niveaux : `seenWorld` reste valable (index de monde).
- Un profil dont la liste de jeux libres est explicite ne voit pas les nouveaux jeux tant que le parent ne les coche pas.

## 8. Hors périmètre

Memory, bataille navale, « Qui est-ce ? » (lot suivant, même contrat) ; montée de niveau automatique dans les jeux libres.
