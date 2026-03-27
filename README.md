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

Les chemins principaux sont maintenant:

- `docker/docker-compose.yml`
- `packages/etl/database/postgres/`
- `packages/etl/database/mongo/`
- `packages/scraping/`

Les details de baseline, de structure Mongo et d'exploitation sont dans `Docs/`.

## Backend NestJS

Le backend est maintenant sous `apps/backend`.

Routes exposees:

- `GET /api/health`
- `GET /api/cities`
- `GET /api/cities/:code`
- `GET /api/overview`
- `GET /api/reviews/cities/:code`
- `GET /api/kpis`
- `GET /api/kpis/:id`

Demarrage rapide:

```bash
cd apps/backend
cp .env.example .env
npm install
npm run start:dev
```

La migration KPI associee se trouve dans `packages/etl/database/postgres/migrations/02_create_kpis.sql`.
