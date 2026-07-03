# Documentation

- **`scrap-bases.md`** : moteur de scraping, structure MongoDB, flux de données.
- **`data-analysis.md`** : périmètre, livrables et priorités du lot analyse des données.

## Config détaillée

Les variables d’environnement sont décrites dans **`.env.example`** à la racine. Copie-le en `.env` et adapte les valeurs.

## Migrations

Les migrations MongoDB sont dans `packages/etl/database/mongo/migrations/`. Le script `python -m packages.etl.database.run_migrations` n’applique que celles pas encore enregistrées.

**Si tu as déjà appliqué des migrations à la main** (ex. 01 à 14) et que tu ne veux pas les rejouer, enregistre-les une fois (baseline) :

- **MongoDB** : `db.schema_migrations.insertMany([{ _id: "01_init_communes_harvest.js" }, ...]);`

Puis `python -m packages.etl.database.run_migrations` ne jouera que les suivantes.

## Accès aux bases (host)

- **MongoDB** : `mongodb://<user>:<password>@localhost:27017/?authSource=admin` (DB selon `.env`).

## Réinitialiser tout

```bash
docker compose down -v
docker compose up -d
python setup.py
```
