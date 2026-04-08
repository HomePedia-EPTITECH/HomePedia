# HomePedia Backend (NestJS)

Backend NestJS en lecture seule pour exposer les donnees HomePedia au front.

## Arborescence

```text
src/
  common/
  config/
  controllers/
  db/
    db.module.ts
    db.service.ts
    mongo.module.ts
    mongo.service.ts
  filters/
  models/
  modules/
    cities/
    departements/
    overview/
    reviews/
  services/
  app.module.ts
  main.ts
  openapi.ts
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
- des tests HTTP sur `cities`, `reviews` et `overview`
- des tests d'integration PostgreSQL sur les modules read-only

## Swagger

- `GET /api/docs`
- `openapi.json` genere a la racine de `apps/backend`

Generer le contrat OpenAPI statique:

```bash
npm run openapi:generate
```

## Mode de fonctionnement

- API en lecture seule
- les bases sont alimentees par les scripts de scraping et ETL
- le backend expose les donnees sans modifier les donnees metier
- PostgreSQL est la source de verite pour `cities`, `departements` et `overview`
- MongoDB est reserve aux avis bruts dans `reviews_raw`
- `cities/:code/details` lit la ville sur PostgreSQL puis enrichit la reponse avec les avis Mongo si disponibles
- le filtre `nb_avis_min` utilise MongoDB pour restreindre la liste des villes, mais les donnees renvoyees restent issues de PostgreSQL

## Routes

- `GET /api/health`
- `GET /api/cities`
- `GET /api/cities/:code`
- `GET /api/cities/:code/details`
- `GET /api/departements`
- `GET /api/departements/:code`
- `GET /api/departements/:code/cities`
- `GET /api/overview`
- `GET /api/reviews/cities/:code`

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

`GET /api/departements/:code/cities` reutilise les memes filtres que `GET /api/cities`, avec `code_dept` impose par le parametre d'URL.

## Exemple `GET /api/cities/75056/details`

```json
{
  "data": {
    "city": {
      "code": "75056",
      "name": "Paris"
    },
    "admin": {
      "codeDept": "75",
      "postalCode": "75000",
      "region": "Ile-de-France"
    },
    "reviews": {
      "count": 120,
      "positive": ["Ville tres dynamique"],
      "negative": ["Trafic dense"]
    }
  }
}
```

## Healthcheck

`GET /api/health` verifie l'accessibilite de PostgreSQL et MongoDB.

- `200 OK` si PostgreSQL est joignable
- MongoDB est remonte dans les checks car il reste necessaire pour les routes d'avis
- `503 Service Unavailable` si PostgreSQL est indisponible

## Exemple `GET /api/reviews/cities/75056`

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

## Base de donnees

Appliquer les migrations existantes depuis la racine du repo:

```bash
python packages/etl/database/run_migrations.py
```

Le backend ne publie plus de route `kpis`. Les chiffres de synthese exposes au front passent par `/api/overview`.
