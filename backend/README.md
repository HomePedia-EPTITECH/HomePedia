# HomePedia Backend (NestJS)

Backend NestJS minimal pour exposer des KPIs avec PostgreSQL.

## Arborescence

```text
src/
  routes/
  controllers/
  services/
  repositories/
  db/
```

## Installation

```bash
cd backend
cp .env.example .env
npm install
```

## Lancement

```bash
npm run start:dev
```

Le serveur démarre sur `http://localhost:3000` avec le préfixe global `api`.

## Routes

- `GET /api/health`
- `POST /api/kpis`
- `GET /api/kpis`
- `GET /api/kpis/:id`
- `PATCH /api/kpis/:id`
- `DELETE /api/kpis/:id`

## Exemple payload KPI

```json
{
  "name": "median_rent",
  "value": 17.4,
  "unit": "EUR/m2",
  "source": "insee",
  "capturedAt": "2026-03-12T10:00:00Z"
}
```

## Base de données

Appliquer les migrations existantes depuis la racine du repo:

```bash
python Database/run_migrations.py
```

La migration `Database/postgres/migrations/02_create_kpis.sql` crée la table `bdd.kpis`.

