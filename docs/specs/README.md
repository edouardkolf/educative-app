# Specs — hub, dictée quotidienne, coloriage magique

Ce dossier contient les spécifications du lot « jeux illimités hors parcours ». Ce fichier est le **cadre commun** :
les trois specs le respectent, et en cas de désaccord entre deux specs, c'est lui qui tranche (ou on l'amende ici).

| Spec | Fichier | Couvre |
|---|---|---|
| Hub et socle commun | [HUB.md](HUB.md) | écran hub, navigation, routes, temps de jeu et fin douce, stockage v2 et export v2, registre des jeux, jeux visibles par enfant, place des statistiques côté parent |
| Dictée quotidienne (CE1) | [DICTEE.md](DICTEE.md) | séries de mots, tirage, voix du téléphone, saisie, correction, enregistrements, statistiques |
| Coloriage magique (MS) | [COLORIAGE.md](COLORIAGE.md) | dessins et zones, code magique, pots et récipient de mélange, progression, enregistrements, statistiques |

## 1. Pourquoi ce lot

Les tests utilisateurs montrent que les enfants enchaînent les niveaux trop vite. Le contenu du parcours est fini
(de l'ordre de 25 min pour tout le parcours MS, 70 min pour le CE1), alors que l'usage visé est de **15 minutes par
jour en semaine**. Les enfants demandent aussi à se concentrer sur une activité : la seconde (MS) adore les couleurs
et les figures faites de formes (fusée, château…), la grande (CE1) veut préparer ses dictées.

## 2. Décisions du PM (28/09/2026), à reprendre telles quelles

- **CE1 — dictées quotidiennes.** « En début de dictée elle choisit où elle en est et tu proposes une dictée d'une
  dizaine de mots : 5 de la série en cours et 5 au hasard dans les séries précédentes. On se servira de la voix du
  téléphone et il fait une phrase dans laquelle est le mot (ça servira ensuite pour ver, vers, verre, vert…). Ce jeu
  existe en dehors du parcours classique. »
- **Maternelle — coloriage magique.** « Il faut mettre la bonne couleur dans la case et elle n'a que les couleurs
  primaires, mais elle peut mélanger dans un petit récipient jusqu'à 2 couleurs. »
- **Les deux jeux sont illimités** et accessibles depuis un **hub** à ajouter ; c'est aussi du hub qu'on accède à la
  carte pour progresser.
- **Hors périmètre de ce lot** : adapter le rythme de la carte (étape du jour, maîtrise espacée…). « On verra
  ensuite. » Le hub doit seulement pouvoir l'accueillir plus tard.

## 3. Décisions transverses

### 3.1 Navigation et routes

Nouvelles routes (`src/app/routes.ts`, fichier CONTRAT) :

| Route | Hash | Écran |
|---|---|---|
| `{ name: 'hub' }` | `#/hub` | hub de l'enfant |
| `{ name: 'dictation' }` | `#/dictation` | dictée quotidienne |
| `{ name: 'coloring' }` | `#/coloring` | coloriage magique |

- Profils → tap sur un avatar → **hub** (et non plus la carte).
- Hub → carte, ou un jeu. Le bouton maison du hub ramène aux profils.
- Le bouton maison de la carte et des jeux ramène au **hub**.
- Écran de fin (lune) : après les minutes accordées par le parent, retour au **hub** (et non plus à la carte).

### 3.2 Arborescence du code

- `src/screens/Hub.tsx` : l'écran hub.
- `src/games/index.ts` (**CONTRAT**) : le registre des jeux hors parcours, `GameId = 'dictation' | 'coloring'`.
  Pour chaque jeu : sa route, son picto, son libellé pour le parent, sa disponibilité par défaut selon le parcours.
- `src/games/dictation/` et `src/games/coloring/` : écrans, logique pure (+ tests Vitest à côté), CSS.
- `src/ui/voice.ts` : la synthèse vocale partagée (spécifiée par DICTEE.md ; la mécanique `spelling` pourra y migrer
  plus tard).
- On peut importer le code des mécaniques existantes (figures du constructeur, dessins du labo des couleurs,
  catalogue de mots). Toute **modification** d'un fichier existant doit être listée explicitement dans la spec.

### 3.3 Temps de jeu et fin douce (ARCHITECTURE §8)

- L'horloge de session compte le temps actif sur `hub`, `map`, `play`, `dictation` et `coloring`.
- Sur le hub et la carte, le verrou (lune) s'applique tout de suite.
- En jeu (`play`, `dictation`, `coloring`), c'est une **fin douce** : l'« unité en cours » se termine (60 s au plus),
  puis le jeu enregistre la partie comme interrompue (`time-up`), appelle `clearSoftEnd()` et navigue vers `locked`.
  Unité en cours : une manche pour `play`, un mot pour la dictée, une case pour le coloriage.
- HUB.md spécifie la généralisation de `SessionProvider` et de la garde de route. Si c'est utile, elle définit aussi
  un hook partagé pour les jeux. Les specs de jeu disent ce qu'est leur unité en cours et ce qui est sauvegardé.

### 3.4 Stockage (IndexedDB v2) et export v2

- `DB_VERSION` passe à 2, avec un seul bloc `if (oldVersion < 2)` qui crée les stores `dictations` et `colorings`
  (clé `id`, index `profileId`). HUB.md spécifie la migration et l'export v2 : l'import accepte v1 (tableaux absents,
  donc vides) et v2, et ignore les lignes orphelines comme aujourd'hui.
- Chaque spec de jeu définit le type de ses enregistrements, leur validation à l'import et la clôture des parties
  restées `in_progress` au lancement suivant (comme `closeStaleRuns`).
- Tout nouveau champ de `Profile` reste **optionnel** : les profils et les exports v1 doivent rester valides.

### 3.5 Cycle de vie d'une partie de jeu

Même vocabulaire que les parties de niveaux, pour que les statistiques gardent les définitions d'ARCHITECTURE §7 :

- une **partie** = une dictée (une dizaine de mots) ou un coloriage (un dessin) ;
- `status : 'in_progress' | 'completed' | 'abandoned'` ;
- `endReason : 'quit' | 'closed' | 'time-up' | null` (pas de vies dans ces jeux, donc pas de `out-of-lives`) ;
- `quit`/`closed` = **abandon** ; `time-up` = **interruption**, ce n'est pas un abandon.

### 3.6 Espace parent

- HUB.md dit où le parent choisit les jeux visibles pour chaque enfant (fiche enfant). Par défaut, ils dépendent du
  parcours : `ms` → coloriage, `ce1` → dictée. HUB.md dit aussi où apparaissent les statistiques de chaque jeu (page
  de statistiques de l'enfant).
- Chaque spec de jeu définit le contenu de son bloc de statistiques : indicateurs avec une définition exacte, comme
  en ARCHITECTURE §7. Elle définit aussi ses réglages propres, s'il y en a.

### 3.7 Règles UX enfant (rappel d'ARCHITECTURE §9)

- Hub et coloriage **sans texte** (enfant de 4 ans non lectrice). La dictée a droit aux lettres et aux mots
  (exception CE1).
- Cibles tactiles ≥ 72 px pour les choix de jeu, ≥ 56 px pour la navigation. Toute exception doit être justifiée
  dans la spec (ex. un clavier de lettres sur un téléphone).
- Tap d'abord ; le glisser-déposer seulement en alternative.
- Erreur douce. Aucun compte à rebours visible, aucune récompense aléatoire. Sons de réussite et d'erreur douce.
- « Illimité » : ni cadenas ni vies, ni progression de carte. Le jeu se joue tant que le temps de la séance le permet.

### 3.8 Contraintes techniques

- Aucune nouvelle dépendance npm. Tout fonctionne hors ligne et reste sur le téléphone.
- Logique pure testée avec Vitest ; parcours e2e Playwright (la synthèse vocale y est simulée).
- Fichiers CONTRAT (`routes.ts`, `engine/types.ts`, `storage/types.ts`, `games/index.ts`) : on les modifie
  volontairement, et la spec liste ces modifications.
- Identifiants de code en anglais ; textes pour le parent et documentation en français.

## 4. Format d'une spec

Dense et précise : une spec doit pouvoir être implémentée par un agent `implementer` sans deviner. Environ 250 à
450 lignes. Sections :

1. **Résumé** (5 lignes) et décisions du PM reprises telles quelles.
2. **Parcours de l'enfant**, écran par écran : états, transitions, sons, animations.
3. **Règles** du jeu ou de l'écran : précises et testables.
4. **Données et contenu** : types TypeScript proposés, où ils vivent, comment on en ajoute.
5. **Stockage et statistiques** : enregistrements, définitions exactes des indicateurs.
6. **Intégration** : routes, temps et fin douce, espace parent, hub.
7. **Cas limites.**
8. **Tests** : unitaires et e2e.
9. **Découpage en tâches** d'implémentation : fichiers attribués à chaque tâche, pour des agents en parallèle, avec
   les dépendances entre tâches.
10. **Questions ouvertes pour le PM**, chacune avec une recommandation.
11. **Hors périmètre / V2.**
