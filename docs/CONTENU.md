# Guide du contenu pédagogique

## Principe

Un niveau = un fichier JSON. Un parcours = l'ordre des niveaux sur la carte de l'application.

## Ajouter un niveau

1. Créer un fichier `content/levels/<parcours>/<id>.json` avec les paramètres du niveau.
2. Ajouter l'`id` du niveau au tableau `levels` dans `content/tracks/<parcours>.json`.
3. Valider en local : `npm run validate:content`.
4. Pousser vers `main` : la CI valide automatiquement, puis publie.

## Champs communs

| Champ | Rôle | Exemple |
|---|---|---|
| `$schema` | Chemin vers le schéma (à copier tel quel) | `"../../level.schema.json"` |
| `id` | Identifiant unique (lettres, chiffres, tirets) | `"ms-suite-01"` |
| `title` | Titre lisible par le parent | `"Suite de 2 couleurs"` |
| `skill` | Compétence cible | `"patterns"`, `"counting"`, `"visual-discrimination"`, `"categorization"` |
| `objective` | Objectif pédagogique en une phrase | `"Continuer une suite AB…"` |
| `mechanic` | Type de mécanique | `"sequence"`, `"count"`, `"odd-one-out"` |
| `rounds` | Nombre de manches | 4 (avec tutoriel) ou 5+ |
| `tutorial` | Affiche la main animée (optionnel) | `true` ou absent |
| `stars` | Seuils d'étoiles (optionnel) | Défaut : 0 raté → 3 ⭐, 1 raté → 2 ⭐ |
| `audio` | Réservé aux consignes audio V2 | Absent en V1 |
| `params` | Paramètres de difficulté (méca-spécifiques) | Voir ci-dessous |

## Paramètres par mécanique

### Sequence (algorithmes & suites)

Continuer un motif répété. Exemple complet (extrait de ms-suite-01.json) :

```json
{
  "mechanic": "sequence",
  "params": {
    "pattern": "AB",
    "vary": "color",
    "colors": ["red", "blue", "yellow"],
    "shapes": ["circle"],
    "length": 5,
    "blank": "end",
    "choices": 2
  }
}
```

**Champs** :
- `pattern` : Motif répété (AB, AAB, ABB, ABC, etc.)
- `vary` : Ce qui distingue les éléments (`"color"`, `"shape"`, `"both"`)
- `colors` : Liste des couleurs disponibles
- `shapes` : Liste des formes disponibles
- `length` : Nombre total de cases
- `blank` : `"end"` (continuer) ou `"middle"` (combler un trou)
- `choices` : Nombre de propositions (2–4)

### Count (dénombrement)

Compter des objets et taper le bon nombre. Exemple (extrait de ms-compte-01.json) :

```json
{
  "mechanic": "count",
  "params": {
    "min": 1,
    "max": 3,
    "objects": ["apple", "strawberry", "ball"],
    "layout": "line",
    "choices": 3,
    "answers": "digits+dots"
  }
}
```

**Champs** :
- `min` / `max` : Plage de nombres possibles
- `objects` : Objets à compter (un type par manche)
- `layout` : `"line"` (alignés), `"scatter"` (éparpillés), `"dice"` (constellations)
- `choices` : Nombre de propositions (2–4)
- `answers` : `"digits"` (chiffres), `"dots"` (points), `"digits+dots"` (chiffres + points)

### Odd-one-out (trouver l'intrus)

Repérer l'élément qui ne correspond pas. Exemple (extrait de ms-intrus-01.json) :

```json
{
  "mechanic": "odd-one-out",
  "params": {
    "items": 3,
    "differBy": "color",
    "colors": ["red", "blue", "yellow", "green"],
    "shapes": ["circle", "square", "star"],
    "distract": false
  }
}
```

**Champs** :
- `items` : Nombre d'éléments affichés (3–6)
- `differBy` : `"color"`, `"shape"`, `"category"`
- `colors` : Couleurs possibles (optionnel si `differBy` = `"category"`)
- `shapes` : Formes possibles (optionnel si `differBy` = `"category"`)
- `categories` : Catégories possibles (optionnel si `differBy` ≠ `"category"`)
- `distract` : `true` → ajoute une difficulté (éléments varient sur une autre dimension)

## Valeurs autorisées

Consulter le fichier `content/level.schema.json`, section `definitions`.

**Couleurs** : red, blue, yellow, green, purple, orange
**Formes** : circle, square, triangle, star, heart, diamond
**Catégories** : fruit, animal, vehicle, toy
**Objets** : apple, banana, pear, strawberry, cherries, grapes, dog, cat, rabbit, fish, bird, ladybug, car, bus, bike, boat, train, tractor, ball, teddy, balloon, kite, yoyo, drum

## Vérifier le contenu en local

```bash
npm run validate:content
```

En cas d'erreur, le message affiche le nom du fichier fautif. Corriger le JSON et relancer.

**Astuce VS Code** : Le champ `$schema` active l'autocomplétion et la validation en temps réel.

## Progression

Voir le document `docs/PROGRESSION-MS.md` pour la structure générale du parcours moyenne section et les instructions pédagogiques.
