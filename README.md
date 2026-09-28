# Petits Malins

Jeux éducatifs pour la maternelle et le CE1, sous forme de PWA : installable sur Android, plein écran, hors ligne,
sans compte et sans serveur. Les données restent sur le téléphone.

- **Pour l'enfant** : un hub sans texte, qui mène à la carte à étoiles de sa classe et à un jeu libre, illimité.
  - Moyenne section : six mécaniques (compléter une suite, compter, trouver l'intrus, mélanger des couleurs, trier par famille, construire une figure géométrique), aucun texte à lire.
    Jeu libre : le **coloriage magique** (les figures du constructeur à peindre avec trois couleurs primaires et un petit récipient de mélange, un code à décoder qui se complique au fil des dessins).
  - CE1 : comparer des nombres (<, =, >), additions, soustractions, tables de multiplication (jusqu'à 4 × 4), orthographe des mots invariables (une série par monde), lecture attentive (Lis et montre), suites logiques (motifs, puis compter de 2 en 2, de 10 en 10, à rebours…).
    Jeu libre : la **dictée quotidienne** (5 mots de la série choisie et 5 des séries précédentes, dictés par la voix du téléphone dans une phrase, écrits au clavier intégré, corrigés tout de suite).
- **Pour le parent** : espace protégé par code, statistiques par enfant, par niveau et par jeu (temps par activité, mots fragiles, recettes de couleurs), jeux visibles et palier du coloriage, minuteur et quota quotidien, export et import JSON.

## Documentation

| Document | Pour quoi faire |
|---|---|
| [docs/DEPLOIEMENT.md](docs/DEPLOIEMENT.md) | Publier sur GitHub Pages et installer sur Android |
| [docs/CONTENU.md](docs/CONTENU.md) | Ajouter ou modifier un niveau (du JSON uniquement) |
| [docs/PROGRESSION-MS.md](docs/PROGRESSION-MS.md) | La progression pédagogique de moyenne section |
| [docs/PROGRESSION-CE1.md](docs/PROGRESSION-CE1.md) | La progression pédagogique de CE1 |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Stack, structure, modèle de données, définitions des statistiques |
| [docs/specs/](docs/specs/README.md) | Specs du hub, de la dictée quotidienne et du coloriage magique (cadre commun et arbitrages) |

## Commandes

```bash
npm install
npm run dev               # serveur de développement
npm test                  # tests unitaires + validation du contenu
npm run build             # build de production (dist/)
npm run test:e2e          # parcours complet dans un Chrome mobile simulé
```

## Crédits / licences

- **Andika** – SIL International, [SIL Open Font License 1.1](https://openfontlicense.org/).
- **Fredoka** – Milena Brandão, [SIL Open Font License 1.1](https://openfontlicense.org/).
- **Noto Emoji** (Google) – [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0), images SVG embarquées dans `public/emoji`.
