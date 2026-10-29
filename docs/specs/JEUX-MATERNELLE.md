# Spec — Jeux de maternelle : memory, ranger, labyrinthe

Cadre : [README.md](README.md), [JEUX-LOGIQUE.md](JEUX-LOGIQUE.md) (contrat des mécaniques à plusieurs coups, §2 — il
s'applique tel quel ici), [HUB.md](HUB.md). Lot du 29/10/2026, pour la petite (moyenne section, 4 ans, non lectrice).

## 1. Résumé et décisions du PM

« Je dirais 3, 5 et 6 vu ce que la petite aime bien » : **memory**, **ranger du plus petit au plus grand**,
**labyrinthe au doigt**. « Elle aime gagner mais le faire seule c'est bien aussi. On peut commencer avec une version
seule » : le memory se joue seule (retrouver toutes les paires), pas contre le téléphone. Labyrinthe : deux modes,
taper les cases puis tracer au doigt (règle « taper d'abord, glisser en alternative »).

| Mécanique (id) | Jeu | Compétence | Carte MS | Jeu libre |
|---|---|---|---|---|
| `memory` | Memory (paires) | `memory` (mémoire, attention) | oui | oui (MS, CE1 décoché) |
| `order` | Ranger du plus petit au plus grand | `comparison` (grandeurs, quantités) | oui | non |
| `maze` | Labyrinthe | `spatial` (se repérer, tracer) | oui | non |

Choix d'orchestration : la carte MS gagne un **3e monde** (la montagne, niveaux 41 à 60) : 16 niveaux de compétence
(memory, ranger, labyrinthe, plus quelques marches au-dessus des suites et de l'intrus) et 4 de raisonnement (suite du
code secret, du robot et du morpion), en gardant l'alternance (une place sur cinq). Pas de phonologie dans ce lot
(non retenue par le PM ; à proposer plus tard comme niveaux de carte).

## 2. Contrat

Celui de JEUX-LOGIQUE.md §2 : `onChoose(round.answer)` une fois à la réussite de la manche, `onChoose(MISS)` au premier
raté puis la manche continue ; `data-choice` sur tout élément tapable ; **aucun texte** ; cibles ≥ 72 px pour les choix
(≥ 56 px si la grille l'impose, à justifier) ; rien ne défile en 360 × 640 ; erreur douce ; `prefers-reduced-motion`.
Objets illustrés : catalogue `src/ui/objects.ts` (émojis embarqués, `<Emoji>`), jamais de nouvel émoji sans fichier
dans `public/emoji/`.

## 3. Les mécaniques

### 3.1 `memory`

Cartes face cachée en grille (`pairs` paires, 2 à 8). L'enfant retourne deux cartes ; paire : elles restent visibles avec
une petite fête ; sinon elles se recachent après ~900 ms (taps ignorés pendant ce temps). Manche réussie quand tout est
retourné. Raté de la manche (`MISS`, une fois) quand les essais ratés dépassent `maxMisses`. `objects` : réservoir
d'objets (ids du catalogue), au moins `pairs`. `peek` (ms, optionnel) : toutes les cartes se montrent au début pendant
ce temps, pour les plus petits. Dos de carte identique et joli (motif), faces = émojis.

### 3.2 `order`

`items` (3 à 5) éléments mélangés en haut, `items` cases vides en bas, de gauche à droite. L'enfant tape les éléments dans
l'ordre croissant : chaque bon tap envoie l'élément dans la case suivante ; un mauvais tap fait vibrer l'élément
(`MISS`, une fois) sans le placer. `mode: 'size'` : le même objet à des tailles nettement différentes (écart minimal
`minGap` entre deux tailles consécutives, en %) ; `mode: 'quantity'` : des cartes de 1 à 9 points (constellations de dé
jusqu'à 6, puis en ligne), valeurs distinctes. La dernière case porte un repère visuel de « grand » (et la première de
« petit ») : une petite et une grande silhouette, sans texte.

### 3.3 `maze`

Grille `size` × `size` (4 à 7), labyrinthe parfait généré (un seul chemin), un animal au départ et sa nourriture à
l'arrivée (paires fixes du catalogue : lapin-carotte, chien-os si disponibles… sinon objets du catalogue).
`mode: 'tap'` : taper une case voisine accessible y déplace l'animal (une case à la fois) ; taper une case séparée par
un mur ou non voisine : l'animal secoue la tête. `mode: 'trace'` : l'enfant pose le doigt sur l'animal et glisse ; le
trait suit les cases franchies ; s'il franchit un mur, le trait revient à la dernière case valide. Raté (`MISS`, une
fois) au 3e choc contre un mur (`tap`) ou à la 3e coupure (`trace`). `minPath` : longueur minimale du chemin (cases).

## 4. Jeu libre memory

Le memory rejoint les jeux libres de logique : `PUZZLE_GAMES` gagne `'memory'` (store `puzzles` inchangé, pas de
nouvelle version de base), route `#/memory`, registre `GAMES` (défaut : `ms`), `PuzzleScreen` générique, presets
★ 3 paires (aperçu 1,5 s), ★★ 6 paires, ★★★ 8 paires. Le hub MS passe à 5 tuiles.

## 5. Découpage

| Tâche | Fichiers | Dépend de |
|---|---|---|
| M0 contrats (orchestrateur) | `engine/types.ts`, `level.schema.json`, `engine/chance.ts`, `mechanics/index.ts`, souches, `storage/puzzles.ts` (`PUZZLE_GAMES`), `app/routes.ts`, `games/index.ts`, labels parent, cette spec | — |
| M1 `memory` (+ presets jeu libre) | `src/mechanics/memory/**`, `src/games/puzzle/presets.ts` (+ test), `GameIcon`/`MechanicIcon` (memory) | M0 |
| M2 `order` | `src/mechanics/order/**`, `MechanicIcon` (order) | M0 |
| M3 `maze` | `src/mechanics/maze/**`, `MechanicIcon` (maze) | M0 |
| M4 contenu | niveaux MS du 3e monde, `content/tracks/ms.json`, `docs/PROGRESSION-MS.md` | M1–M3 |
| M5 e2e + revue | `tests/e2e/**` | M4 |
