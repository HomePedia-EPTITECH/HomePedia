# HomePedia Backend (NestJS)

Backend NestJS en lecture seule pour exposer les donnees HomePedia au front.

## Arborescence

```text
src/
  common/
    format.ts
    postgres-read.repository.ts
    validation.ts
  config/
    app.config.ts
  db/
    db.module.ts
    db.service.ts
    mongo.module.ts
    mongo.service.ts
  filters/
    http-exception.filter.ts
  modules/
    geo/
      types.ts
    analytics/
      types.ts
    reviews/
      types.ts
    health/
      types.ts
  app.module.ts
  main.ts
```

## Installation

```bash
cd apps/backend
cp .env.example .env
npm install
```

## Configuration

Variables principales du backend:

```env
PORT=3000
CORS_ORIGIN=*
CORS_CREDENTIALS=false

POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=homepedia
POSTGRES_USER=admin
POSTGRES_PASSWORD=CHANGE_ME

MONGO_HOST=localhost
MONGO_PORT=27017
MONGO_DB=homepedia_raw
MONGO_ROOT_USER=CHANGE_ME
MONGO_ROOT_PASSWORD=CHANGE_ME
```

Le backend charge d'abord le `.env` racine du repo, puis complete avec `apps/backend/.env` si present.

Notes sur le CORS:

- `CORS_ORIGIN=*` autorise toutes les origines
- `CORS_ORIGIN=http://localhost:5173,http://localhost:3001` autorise plusieurs origines separees par des virgules
- `CORS_CREDENTIALS=true` active les credentials CORS
- `PORT` doit etre un entier valide entre `1` et `65535`

## Lancement

```bash
npm run start:dev
```

Le serveur demarre sur `http://localhost:3000` avec le prefixe global `api`.

## Docker

Construire et lancer le backend avec les bases depuis la racine du repo:

```bash
docker compose --env-file .env -f docker/docker-compose.yml up -d --build backend
```

Le service `backend`:

- build l'image depuis `apps/backend/Dockerfile`
- expose l'API sur `http://localhost:3000`
- attend `mongo` et `postgres` via `depends_on`
- declare explicitement ses variables `environment` avec interpolation `${...}`
- attend un lancement depuis la racine avec `--env-file .env`
- utilise `mongo` et `postgres` comme hosts reseau Docker

Arreter le backend conteneurise:

```bash
docker compose --env-file .env -f docker/docker-compose.yml stop backend
```

## Tests

```bash
npm test
```

La suite couvre:

- la validation de configuration runtime
- le healthcheck
- des tests HTTP sur `geo`, `reviews` et `analytics`
- des tests d'integration PostgreSQL sur les modules read-only

## Mode de fonctionnement

- API en lecture seule
- les bases sont alimentees par les scripts de scraping et ETL
- le backend expose les donnees sans modifier les donnees metier
- `geo` regroupe les donnees de villes, departements et regions
- `analytics` expose les syntheses et KPI
- `reviews` lit les avis MongoDB, avec une synthese legacy et une route paginee pour les avis bruts
- `health` porte le healthcheck applicatif

## Architecture

- `modules/geo` contient les features HTTP de geographie: villes, departements et regions
- `modules/analytics` contient les syntheses et KPI
- `modules/reviews` contient les endpoints Mongo de synthese et de pagination des avis
- `modules/health` contient le healthcheck
- `common/format.ts` centralise les conversions de valeurs et de dates
- `common/validation.ts` centralise la validation des requetes
- `common/postgres-read.repository.ts` factorise les helpers SQL read-only
- `filters/http-exception.filter.ts` unifie le format des erreurs
- `db/` centralise les acces PostgreSQL et MongoDB
- les fichiers `types.ts` definissent les types de reponse publics
- seuls les modules qui en ont besoin exposent un `dto`

## Routes

- `GET /api/health`
- `GET /api/cities`
- `GET /api/cities/:code`
- `GET /api/cities/:code/details`
- `GET /api/departements`
- `GET /api/departements/:code`
- `GET /api/departements/:code/cities`
- `GET /api/regions`
- `GET /api/regions/:code`
- `GET /api/regions/:code/departements`
- `GET /api/overview` legacy
- `GET /api/analytics/overview` recommended
- `GET /api/reviews/cities/:cityCode` legacy summary `data/meta`
- `GET /api/reviews/cities/:cityCode/items?limit=100&cursor=...` paginated raw items

`/api/overview` est conservee pour compatibilite legacy. L'endpoint recommande pour les syntheses est `/api/analytics/overview`.
`/api/reviews/cities/:cityCode` est la route legacy de synthese `data/meta`.
`/api/reviews/cities/:cityCode/items` est la route paginee pour les avis bruts.

### Filtres `GET /api/cities`

Parametres principaux disponibles:

- `search`
- `code_dept`
- `nom_region`
- `note_moyenne_globale_min`
- `nb_avis_min`
- `prix_m2_maison_max`
- `prix_m2_appartement_max`
- `sortBy`
- `order`
- `page`
- `limit`

## Exemple `GET /api/analytics/overview`

```json
{
  "data": {
    "totals": {
      "cities": 34871,
      "reviewedCities": 10234,
      "reviewsAvailable": true
    },
    "averages": {
      "population": 52743.18,
      "securityScore": 3.74,
      "environmentScore": 3.92
    },
    "highlights": {
      "safestCities": [
        {
          "code": "75056",
          "name": "Paris",
          "securityScore": 3.8,
          "environmentScore": 4.1
        }
      ],
      "greenestCities": []
    }
  }
}
```

## Healthcheck

`GET /api/health` verifie l'accessibilite de PostgreSQL et MongoDB.

- `200 OK` si PostgreSQL est joignable
- MongoDB est remonte dans les checks car il reste necessaire pour les routes d'avis
- `503 Service Unavailable` si PostgreSQL est indisponible

## `GET /api/reviews/cities/:cityCode`

Endpoint de synthese legacy des avis pour une ville. Il renvoie les donnees `data/meta` et sert de compatibilite avec l'ancien format.

```json
{
  "data": {
    "code": "75056",
    "sourceUrl": "https://www.bien-dans-ma-ville.fr/paris-75056/",
    "harvestedAt": "2026-03-24T12:00:00.000Z",
    "reviews": {
      "positive": [],
      "negative": [],
      "all": ["Ville calme et agreable", "Transports compliques"]
    }
  },
  "meta": {
    "source": "mongo",
    "collection": "reviews_raw"
  }
}
```

## `GET /api/reviews/cities/:cityCode/items`

Endpoint pagine des avis bruts en provenance de MongoDB.

- `limit` est optionnel, par defaut `100`, avec un maximum de `100`
- `cursor` est optionnel et doit etre un `ObjectId` Mongo

```json
{
  "cityCode": "75056",
  "sourceUrl": "https://www.bien-dans-ma-ville.fr/paris-75056/",
  "harvestedAt": "2026-03-24T12:00:00.000Z",
  "reviews": [
    {
      "id": "66b3b4f0d4c4f8a9a1234561",
      "text": "Ville calme et agreable",
      "sentimentLabel": "positive",
      "source": "bdmv",
      "urlPage": "https://www.bien-dans-ma-ville.fr/paris-75056/avis.html",
      "collectedAt": "2026-03-24T12:00:00.000Z"
    }
  ],
  "pagination": {
    "limit": 100,
    "hasMore": true,
    "nextCursor": "66b3b4f0d4c4f8a9a1234561"
  }
}
```

## Base de donnees

Appliquer les migrations existantes depuis la racine du repo:

```bash
python packages/etl/database/run_migrations.py
```

Le backend ne publie plus de route `kpis`. Les chiffres de synthese exposes au front passent par `/api/analytics/overview`.
