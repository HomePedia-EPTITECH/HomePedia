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
cd backend
cp .env.example .env
npm install
```

## Lancement

```bash
npm run start:dev
```

Le serveur demarre sur `http://localhost:3000` avec le prefixe global `api`.

## Swagger

- `GET /api/docs`

## Mode de fonctionnement

- API en lecture seule
- les bases sont alimentees par les scripts de scraping et ETL
- le backend expose les donnees mais ne modifie pas les donnees metier

## Routes

- `GET /api/health`
- `GET /api/cities`
- `GET /api/cities/:code`
- `GET /api/overview`
- `GET /api/reviews/cities/:code`
- `GET /api/kpis`
- `GET /api/kpis/:id`

## Base de donnees

Appliquer les migrations existantes depuis la racine du repo:

```bash
python Database/run_migrations.py
```

La migration `Database/postgres/migrations/02_create_kpis.sql` cree la table `bdd.kpis`.
