# HomePedia Backend (NestJS)

Backend NestJS en lecture seule pour exposer les donnees HomePedia au front.

## Arborescence

```text
src/
  db/
    db.module.ts
    db.service.ts
    mongo.module.ts
    mongo.service.ts
  modules/
    cities/
    overview/
    reviews/
  controllers/
  repositories/
  routes/
  services/
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

## Tests

```bash
npm test
```

La suite couvre:

- la validation de configuration runtime
- le healthcheck
- des tests HTTP sur `cities`, `reviews`, `overview` et `kpis`

## Swagger

- `GET /api/docs`

## Mode de fonctionnement

- API en lecture seule
- les bases sont alimentees par les scripts de scraping et ETL
- le backend expose les donnees sans modifier les donnees metier

## Routes

- `GET /api/health`
- `GET /api/cities`
- `GET /api/cities/:code`
- `GET /api/overview`
- `GET /api/reviews/cities/:code`
- `GET /api/kpis`
- `GET /api/kpis/:id`

## Healthcheck

`GET /api/health` verifie l'accessibilite de PostgreSQL et MongoDB.

- `200 OK` si PostgreSQL et MongoDB sont joignables
- `503 Service Unavailable` si au moins une des deux dependances est indisponible

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
    },
    "metricsSnapshot": {
      "nb_habitant": "2145906",
      "score_securite": "3.8"
    }
  },
  "meta": {
    "source": "mongo",
    "collection": "communes_harvest"
  }
}
```

## Base de donnees

Appliquer les migrations existantes depuis la racine du repo:

```bash
python packages/etl/database/run_migrations.py
```

La migration `packages/etl/database/postgres/migrations/02_create_kpis.sql` cree la table `bdd.kpis`.
