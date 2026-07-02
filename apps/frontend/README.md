# HomePedia — Frontend

Interface web pour comparer les villes françaises selon des critères
immobiliers et de qualité de vie.

## Stack

- **React 19** + **TypeScript** + **Vite**
- **Tailwind CSS v4** + **shadcn/ui** (style new-york, dark mode exclusif)
- **react-map-gl / Mapbox GL** pour la carte
- **Recharts** pour les graphiques (radar, aires, barres)
- **React Router v7**

> ⚠️ Aucune donnée réelle ni back n'est encore branché : toutes les données
> proviennent d'un **mock typé** (`src/data/`) modélisé d'après le schéma réel
> `data/exports/communes_postgres.csv`. Le jour où le back NestJS existe, seule
> l'implémentation de la façade `src/data/index.ts` change ; l'UI reste stable.

## Démarrage

```bash
cd apps/frontend
npm install
cp .env.example .env   # optionnel : renseigner VITE_MAPBOX_TOKEN
npm run dev            # http://localhost:5173
```

Sans token Mapbox, l'écran Carte affiche un fallback listant les villes
filtrées (aucun crash).

## Scripts

| Script            | Rôle                          |
| ----------------- | ----------------------------- |
| `npm run dev`     | Serveur de dev (HMR)          |
| `npm run build`   | Typecheck (`tsc`) + build prod |
| `npm run preview` | Prévisualise le build         |

## Structure

```
src/
├── app/
│   ├── router.tsx         # Routes
│   └── preferences.tsx    # Context : pondérations + comparateur
├── components/
│   ├── ui/                # Primitives shadcn/ui
│   ├── layout/            # Navbar, recherche universelle, layout
│   └── shared/            # ScoreBadge, StatCard, WeightsPanel, Logo
├── data/                  # Mock data + moteur de scoring (façade "API")
│   ├── types.ts           # Modèle Commune, Weights…
│   ├── communes.ts        # 32 villes réelles + dérivations
│   ├── scoring.ts         # Normalisation + score personnalisé
│   └── index.ts           # getCommuneById, searchCommunes, filtres, formats
└── pages/                 # Les 5 écrans
    ├── Landing.tsx        # Landing + quiz (budget + priorités)
    ├── Results.tsx        # Classement + pondérations + filtres
    ├── MapView.tsx        # Carte Mapbox (pins par score)
    ├── CityDetail.tsx     # Fiche ville (radar, charts, services, avis)
    └── Compare.tsx        # Comparateur 2–3 villes
```

## Écrans

1. **Landing + Quiz** — capte budget & priorités, traduit en pondérations.
2. **Résultats** — table triée par score personnalisé, curseurs de pondération
   en temps réel, filtres région/département/taille.
3. **Carte** — pins colorés (rouge → vert) selon le score, taille selon la
   population, filtres budget/score/région.
4. **Fiche ville** — KPIs, prix + historique DVF, radar qualité de vie 9 axes,
   démographie, sécurité vs moyenne nationale, services (santé/éducation/
   commerces), avis.
5. **Comparateur** — jusqu'à 3 villes côte à côte, meilleure valeur surlignée,
   radar superposé.

## Design system

Dark mode exclusif, primaire `#3B82F6`. Tokens définis en CSS (oklch) dans
`src/index.css` (`@theme inline`). Palette de charts multi-couleur via
`--chart-1..6`.

## Pistes d'amélioration

- Code-splitting (`React.lazy`) pour isoler `mapbox-gl` (~1,8 Mo) de l'entrée.
- Persistance des préférences (localStorage).
- Brancher la façade `src/data` sur l'API NestJS.
