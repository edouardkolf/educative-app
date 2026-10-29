# Spec — Morpion et pendu (CE1)

Cadre : [README.md](README.md) et [HUB.md](HUB.md), qui font foi. Ce lot ajoute deux jeux libres au registre, sur le
socle existant (routes, fin douce, `GameRecordBase`, statistiques communes).

## 1. Résumé

- Deux jeux illimités hors parcours, visibles par défaut pour le parcours `ce1` : **morpion** (`#/tictactoe`) et
  **pendu** (`#/hangman`). Le parent peut les masquer dans la fiche enfant (bascules génériques de HUB.md §6.4).
- Le hub CE1 passe de 2 à 4 tuiles : grille 2 × 2, toutes de même taille. 5 tuiles (si le coloriage est aussi coché) :
  carte en pleine largeur puis 2 × 2.
- IndexedDB v3 : stores `tictactoes` et `hangmans`. Export v3 ; l'import accepte v1, v2 et v3 (tableaux absents des
  anciennes versions lus comme vides).

Demande du PM (29/10/2026) : « ajouter du morpion et puis un pendu » ; pour le pendu, « quelque chose d'accessible » :
le nombre de lettres et un indice (« Dauphin » → « Il vit dans la mer », « Lion » → « C'est un roi »…), une centaine
de mots.

## 2. Parcours de l'enfant

### 2.1 Morpion (`src/games/tictactoe/`)

- **Choix** : « Contre le téléphone » (avatar de l'enfant et téléphone souriant) ou « À deux » (croix et rond).
- **Partie** : grille 3 × 3 (cases ≥ 96 px), maison en haut à gauche, score de la séance (X – O) avec l'indicateur du
  joueur dont c'est le tour. Le téléphone « réfléchit » 650 ms puis joue.
- En solo, l'enfant a les croix. Le premier joueur **alterne** d'une grille à l'autre (l'enfant commence la première).
- Fin : ligne gagnante surlignée, fanfare si l'enfant (ou n'importe quel joueur à deux) gagne, son d'erreur douce si
  le téléphone gagne, rien de plus pour une égalité. Puis bouton « encore ».

### 2.2 Pendu (`src/games/hangman/`)

- Un mot tiré au hasard, sans reprendre les 40 derniers vus par l'enfant.
- Aides : pastille « N lettres », une case par lettre, **indice écrit** (et lu à voix haute par 🔊 si la voix du
  téléphone est prête ; sinon le bouton n'apparaît pas).
- Clavier de 26 lettres sans accent, ordre alphabétique : « e » révèle aussi é, è, ê. Lettre juste en vert, fausse
  grisée et secouée.
- **Pas de bonhomme pendu** : une fleur à 8 pétales, un pétale tombe par lettre absente (cadre « erreur douce »).
  8 erreurs permises.
- Fin : « Bravo, tu as trouvé ! » (fanfare) ou « La fleur a perdu ses pétales… Le mot était : » avec le mot en orange.
  Puis bouton « mot suivant ».

## 3. Règles (testables)

### 3.1 Morpion — `logic.ts`

1. 8 alignements ; grille pleine sans alignement = égalité.
2. Coup du téléphone : gagner si possible ; sinon bloquer l'enfant **3 fois sur 4** (`BLOCK_PROBABILITY`) ; sinon le
   centre une fois sur deux ; sinon une case libre au hasard. Il reste battable.

### 3.2 Pendu — `logic.ts`

1. Une lettre déjà proposée, hors alphabet, ou proposée après la fin est ignorée.
2. `found` quand toutes les lettres de base du mot sont proposées ; `lost` à `MAX_MISTAKES` (8) erreurs.

## 4. Données et contenu

### 4.1 Enregistrements

- `TicTacToeRecord` (`src/storage/tictactoes.ts`) : `mode` (`solo` | `duo`), `xStarts`, `moves` (cases 0–8 dans
  l'ordre), `outcome` (`x` | `o` | `draw` | null). Une partie = une grille, créée au premier coup (A9).
- `HangmanRecord` (`src/storage/hangmans.ts`) : `wordId`, `word` (copié), `guesses` (a–z), `mistakes`,
  `maxMistakes`, `outcome` (`found` | `lost` | null). Une partie = un mot, créée à la première lettre (A9).
- Clôture au lancement : `isFinished` = `outcome !== null` (générique, A3).
- `activeMs` : temps de page visible depuis le début de la grille ou du mot (`src/games/useActiveClock.ts`).

### 4.2 Catalogue du pendu (`src/games/hangman/words.ts`)

114 mots du quotidien (animaux, fruits, école, maison, nature, transports, corps, personnages), 3 à 10 lettres.
Ajouter un mot = une ligne `W(id, mot, indice)`. `content.test.ts` (dans `validate:content`, donc au build) vérifie :
≥ 100 mots, ids et mots uniques, id = mot sans accent, minuscules sans espace ni tiret, indice ≤ 60 caractères qui ne
contient pas le mot.

## 5. Statistiques (bloc propre à chaque jeu, en plus des indicateurs communs de HUB.md §5.5)

| Jeu | Indicateur | Définition |
|---|---|---|
| Morpion | Contre le téléphone : gagnées / perdues / nulles | grilles `solo` avec une issue, par issue |
| Morpion | Victoires contre le téléphone | gagnées / grilles `solo` avec une issue |
| Morpion | Grilles jouées à deux | grilles `duo` avec une issue |
| Pendu | Mots trouvés | `found` / mots avec une issue |
| Pendu | Erreurs par mot trouvé | moyenne de `mistakes` sur les mots `found` |
| Pendu | Derniers mots non trouvés | les 5 `lost` les plus récents |

## 6. Intégration

Fichiers touchés : `app/routes.ts`, `app/AppShell.tsx`, `games/index.ts`, `ui/icons/GameIcon.tsx`,
`screens/hub/hub.css`, `storage/{types,db,game-records,export-import,profiles,index}.ts`, `parent/ChildStats.tsx`,
`parent/import.ts`. Fin douce : `useSoftEnd`, unité = une grille ou un mot, `checkpoint()` au début de chacun.

## 7. Cas limites

- Profil CE1 dont le parent a déjà réglé une liste explicite de jeux : les nouveaux jeux n'apparaissent pas tant que
  le parent ne les coche pas (comportement voulu de `Profile.games`).
- Voix indisponible : le pendu reste jouable (l'indice est écrit) ; pas de badge d'indisponibilité.
- Sortie au milieu d'une grille ou d'un mot : partie abandonnée (`quit`), ou interrompue (`time-up`) pendant la fin douce.

## 8. Tests

- Vitest : `tictactoe/logic.test.ts`, `hangman/logic.test.ts`, `hangman/content.test.ts`, `hangman/stats.test.ts`,
  `useActiveClock.test.ts`, mise à niveau v2 → v3 (`db.test.ts`), clôture au lancement, suppression en cascade,
  export/import v3 (aller-retour, v2 acceptée, v3 incomplète refusée, version 4 refusée).
- E2E : `games-ce1.spec.ts` (morpion à deux et en solo, pendu trouvé puis perdu, statistiques parent) ; `hub.spec.ts`
  (hub CE1 à 4 tuiles, sans texte, sans défilement).

## 9. Hors périmètre / V2

- Difficulté progressive du pendu (mots plus longs après une série de réussites) ; tirage par thème.
- Morpion 4 × 4 ou niveau du téléphone réglable par le parent.
