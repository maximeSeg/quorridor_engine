# Quoridor Lab 🎯

> IA vs IA en continu + génération automatique de puzzles tactiques

![Quoridor Lab screenshot](https://placehold.co/800x400/0c0c0a/d4a843?text=Quoridor+Lab)

## Fonctionnalités

- **IA vs IA en continu** — parties automatiques avec minimax alpha-bêta (profondeur 2–3)
- **Génération de puzzles** — détection automatique de positions tactiques intéressantes
- **Bibliothèque de puzzles** — persistance localStorage, difficultés easy/medium/hard
- **Visualiseur de puzzles** — indice, solution, marquage résolu
- **Export JSON** — sauvegardez vos puzzles
- **Contrôle de vitesse** — ×0.5, ×1, ×3, ×10
- **Évaluation en temps réel** — avantage rouge/bleu via BFS

## Structure

```
quoridor-lab/
├── index.html          ← Application principale
├── js/
│   ├── engine.js       ← Règles complètes du jeu (BFS, moves, fences)
│   ├── ai.js           ← Minimax αβ + détection de puzzles
│   ├── renderer.js     ← Rendu canvas du plateau
│   └── store.js        ← Persistance puzzles (localStorage)
└── README.md
```

## Déploiement

### GitHub Pages (recommandé)

1. **Créer le repo**
   ```bash
   git init
   git add .
   git commit -m "feat: initial quoridor lab"
   ```

2. **Pousser sur GitHub**
   ```bash
   gh repo create quoridor-lab --public --push --source=.
   # ou manuellement :
   git remote add origin https://github.com/VOTRE_USER/quoridor-lab.git
   git push -u origin main
   ```

3. **Activer GitHub Pages**
   - Aller dans `Settings` → `Pages`
   - Source : `Deploy from a branch` → `main` → `/ (root)`
   - Votre site sera accessible sur : `https://VOTRE_USER.github.io/quoridor-lab`

> ⚠️ Pas de build step nécessaire — le projet utilise des ES modules natifs.
> GitHub Pages sert les fichiers statiques directement.

### Serveur local

```bash
# Python
python -m http.server 8080

# Node
npx serve .

# Puis ouvrir http://localhost:8080
```

> ⚠️ **Ne pas ouvrir `index.html` directement** (`file://`) — les ES modules nécessitent un serveur HTTP.

## Architecture de l'IA

### Minimax avec alpha-bêta

```
profondeur 2 → ouverture (< 4 barrières posées)
profondeur 3 → milieu/fin de partie
```

**Tri des coups** (move ordering) :
- Coups pion : priorité aux cases réduisant la distance BFS au but
- Barrières : priorité aux barrières allongeant le chemin adverse

**Évaluation** :
```
score = (distance_bleue_au_but - distance_rouge_au_but) × 10
      + (barrières_rouge - barrières_bleue)
```

### Détection de puzzles

Un état est retenu comme puzzle si :
1. ≥ 3 barrières posées (position non triviale)
2. Écart BFS ≤ 4 (position tendue)
3. Delta entre meilleur coup et 2e ≥ 8 points (décision critique)
4. Position non dupliquée (même emplacements de pions + même nb de barrières)

## Raccourcis clavier

| Touche | Action |
|--------|--------|
| `Space` | Pause / Reprendre |
| `Escape` | Fermer le puzzle |

## Contribuer

Les puzzles peuvent être exportés en JSON et partagés. Format :

```json
{
  "id": "...",
  "state": {
    "pawns": [{"r": 4, "c": 4}, {"r": 3, "c": 4}],
    "fences": [{"r": 3, "c": 3, "dir": "h"}],
    "fences_left": [9, 9],
    "turn": 0,
    "winner": null,
    "ply": 7
  },
  "bestMove": {"type": "fence", "r": 2, "c": 4, "dir": "v"},
  "score": 18,
  "difficulty": "medium",
  "d0": 4,
  "d1": 5,
  "ply": 7
}
```

## Roadmap

- [ ] Profondeur adaptative selon temps CPU disponible (iterative deepening)
- [ ] Mode puzzle interactif (jouer le coup soi-même)
- [ ] Évaluation avec random walks (comme suggéré dans la thèse de Glendenning)
- [ ] Export PGN-like pour replay complet de parties
- [ ] Mode 4 joueurs
