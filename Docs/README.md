# Documentation

- **`scrap-bases.md`** : moteur de scraping, structure des bases (PostgreSQL, MongoDB), flux de données.

## Config détaillée

Les variables d’environnement sont décrites dans **`.env.example`** à la racine. Copie-le en `.env` et adapte les valeurs.

## Migrations

Les migrations (Postgres et Mongo) sont dans `Database/postgres/migrations/` et `Database/mongo/migrations/`. Le script `python Database/run_migrations.py` (ou `python Database/main.py`) n’applique que celles pas encore enregistrées.

**Si tu as déjà appliqué des migrations à la main** (ex. 01 à 14) et que tu ne veux pas les rejouer, enregistre-les une fois (baseline) :

- **PostgreSQL** : `INSERT INTO bdd.schema_migrations (name) VALUES ('01_init_communes.sql'), ('02_seed_communes.sql'), ('03_gold_zone.sql') ON CONFLICT (name) DO NOTHING;` (ajoute les autres au besoin).
- **MongoDB** : `db.schema_migrations.insertMany([{ _id: "01_init_communes_harvest.js" }, ...]);`

Puis `python Database/run_migrations.py` ne jouera que les suivantes.

## Accès aux bases (host)

- **PostgreSQL** : `localhost:5432` (DB et user selon `.env`).
- **MongoDB** : `mongodb://<user>:<password>@localhost:27017/?authSource=admin` (DB selon `.env`).

## Réinitialiser tout

```bash
docker compose down -v
docker compose up -d
python setup.py
```
