# Petits Malins

Jeux éducatifs pour la maternelle, sous forme de PWA : installable sur Android, plein écran, hors ligne,
sans compte et sans serveur. Les données restent sur le téléphone.

- **Pour l'enfant** : une carte à étoiles, trois mécaniques (compléter une suite, compter, trouver l'intrus), aucun texte à lire.
- **Pour le parent** : espace protégé par code, statistiques par enfant et par niveau, minuteur et quota quotidien, export et import JSON.

## Documentation

| Document | Pour quoi faire |
|---|---|
| [docs/DEPLOIEMENT.md](docs/DEPLOIEMENT.md) | Publier sur GitHub Pages et installer sur Android |
| [docs/CONTENU.md](docs/CONTENU.md) | Ajouter ou modifier un niveau (du JSON uniquement) |
| [docs/PROGRESSION-MS.md](docs/PROGRESSION-MS.md) | La progression pédagogique de moyenne section |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Stack, structure, modèle de données, définitions des statistiques |

## Commandes

```bash
npm install
npm run dev               # serveur de développement
npm test                  # tests unitaires + validation du contenu
npm run build             # build de production (dist/)
npm run test:e2e          # parcours complet dans un Chrome mobile simulé
```
