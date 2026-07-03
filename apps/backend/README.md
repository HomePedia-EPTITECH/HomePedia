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
      dto/
        city-response.dto.ts
        departement-response.dto.ts
        get-cities-query.dto.ts
        region-response.dto.ts
      geo-cities.postgres.repository.ts
      geo-departements.postgres.repository.ts
      geo-regions.postgres.repository.ts
      geo.module.ts
      geo.service.ts
    reviews/
      dto/
        city-review-items-response.dto.ts
        city-reviews-response.dto.ts
        get-city-reviews-items-query.dto.ts
      reviews.controller.ts
      reviews.module.ts
      reviews.repository.ts
      reviews.service.ts
    communes/
      dto/
        commune-detail-response.dto.ts
        commune-list-response.dto.ts
        commune-search-response.dto.ts
        communes-list-query.dto.ts
        communes-rank-request.dto.ts
        communes-rank-response.dto.ts
        national-stats-response.dto.ts
      communes.controller.ts
      communes.module.ts
      communes.repository.ts
      communes.scoring.ts
      communes.service.ts
      communes.types.ts
    health/
      dto/
        health-response.dto.ts
      health.controller.ts
      health.module.ts
      health.service.ts
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

Le serveur demarre sur `http://localhost:3000`.

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
- des tests HTTP sur les routes publiques `communes`, `geo` et `health`
- des tests d'integration PostgreSQL sur les modules read-only

## Mode de fonctionnement

- API en lecture seule
- les bases sont alimentees par les scripts de scraping et ETL
- le backend expose les donnees sans modifier les donnees metier
- `communes` regroupe les routes publiques de communes, ranking et statistiques
- `geo` regroupe les routes publiques de regions et departements
- `reviews` regroupe les routes Mongo d'avis bruts
- `health` porte le healthcheck applicatif

## Architecture

- `modules/communes` contient les routes HTTP publiques de communes, ranking et statistiques
- `modules/geo` contient les acces SQL aux regions, departements et cities
- `modules/reviews` contient les routes HTTP publiques de reviews Mongo
- `modules/health` contient le healthcheck
- `common/format.ts` centralise les conversions de valeurs et de dates
- `common/validation.ts` centralise la validation des requetes
- `common/postgres-read.repository.ts` factorise les helpers SQL read-only
- `filters/http-exception.filter.ts` unifie le format des erreurs
- `db/` centralise les acces PostgreSQL et MongoDB pour les reviews
- les fichiers `types.ts` definissent les types metier internes
- les DTO HTTP publics vivent dans les dossiers `dto/` des modules concernes
- les modules exposent des `dto` lorsque leur contrat HTTP public le justifie

## Definition de `taille`

`taille` est un champ derive, non stocke en base.

Valeurs possibles:

- `village`
- `ville`
- `metropole`

Regle de calcul actuelle:

- `metropole` si la commune est rattachee a une metropole
- `metropole` si sa population est superieure ou egale a `80000`
- `ville` si sa population est superieure ou egale a `3000`
- `village` sinon

Ce champ sert au filtrage, aux labels UI et au classement.
Le front ne doit pas inventer sa propre regle de taille.

## Routes

- `GET /health`
- `GET /communes`
- `POST /communes/rank`
- `GET /communes/search`
- `GET /communes/:id`
- `GET /stats/national`
- `GET /regions`
- `GET /departements`
- `GET /regions/:code`
- `GET /regions/:code/departements`
- `GET /departements/:code`
- `GET /departements/:code/cities`
- `GET /reviews/cities/:cityCode`
- `GET /reviews/cities/:cityCode/items`

`GET /health` verifie l'accessibilite de PostgreSQL et MongoDB.

- `200 OK` si les dependances sont joignables
- `503 Service Unavailable` si elles ne le sont pas

PostgreSQL sert les routes communes, geo et stats.
Mongo sert uniquement les routes `reviews`.

## Base de donnees

Appliquer les migrations existantes depuis la racine du repo:

```bash
python packages/etl/database/run_migrations.py
```
