# HomePedia

Lancer le projet, appliquer les migrations, puis executer le scraping si besoin.

## Prerequis

- Docker installe et demarre
- Python 3 avec `pip install -r requirements.txt`

## Premier lancement

1. Copier `.env.example` vers `.env` a la racine.
2. Lancer `python setup.py`.
3. Lancer le scraper si besoin avec `python packages/scraping/script_BDMV.py`.

`setup.py` demarre Docker, attend MongoDB, puis applique les migrations disponibles pour PostgreSQL et MongoDB.

## Migrations et donnees

- Migrations globales: `python packages/etl/database/main.py`
- Migrations uniquement: `python packages/etl/database/run_migrations.py`
- Chargement PostgreSQL de communes de test: `python packages/etl/database/load_communes.py --file <chemin>`

Chemins principaux:

- `docker/docker-compose.yml`
- `apps/backend/`
- `packages/etl/database/postgres/`
- `packages/etl/database/mongo/`
- `packages/scraping/`
- `packages/shared/`

Les details de baseline, de structure Mongo et d'exploitation sont dans `Docs/`.

## Backend NestJS

Le backend NestJS est dans `apps/backend/`.

Lecture de donnees actuelle:

- `cities` et `overview` lisent Mongo `communes_direct`
- `cities/:code/details` combine `communes_direct`, `communes_harvest` et `reviews_raw`
- `departements` lit Mongo `departements`
- `reviews` lit `communes_harvest` et `reviews_raw`
- `kpis` est calcule depuis Mongo `communes_direct`

Routes exposees:

- `GET /api/health`
- `GET /api/cities`
- `GET /api/cities/:code`
- `GET /api/cities/:code/details`
- `GET /api/departements`
- `GET /api/departements/:code`
- `GET /api/departements/:code/cities`
- `GET /api/overview`
- `GET /api/reviews/cities/:code`
- `GET /api/kpis`
- `GET /api/kpis/:id`

Demarrage rapide:

```bash
cp .env.example .env
python setup.py
python run_backend.py --install
```

Le script SQL `packages/etl/database/postgres/migrations/02_create_kpis.sql` est present dans le depot, mais `/api/kpis` calcule actuellement ses KPI depuis Mongo.

Tu peux aussi lancer un autre script npm backend depuis la racine, par exemple `python run_backend.py --script test`.
