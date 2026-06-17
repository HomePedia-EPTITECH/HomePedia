# Documentation

- **`scrap-bases.md`** : moteur de scraping, structure MongoDB, flux de données.
- **`ci-cd.md`** : workflows GitHub Actions, branch protection, variables/secrets nécessaires.

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



## Workflows GitHub Actions

- `ci-pr.yml` (PR vers `develop`/`main`):
  - `lint_python`: `ruff check`
  - `unit_tests`: `pytest`
  - `docker_build`: build image jobs (sans push)
  - `terraform_validate`: `fmt`, `init -backend=false`, `validate`
- `release-manual.yml` (manuel):
  - build + push image ECR
  - terraform plan/apply optionnel
  - lancement ECS task optionnel

## Branch protection (manuel, GitHub UI)

Configurer les règles de protection sur `develop` et `main`:

- Require a pull request before merging
- Require status checks to pass before merging
- Checks obligatoires:
  - `lint_python`
  - `unit_tests`
  - `docker_build`
  - `terraform_validate`

## Variables/Secrets GitHub Environments

Créer deux environments GitHub: `dev` et `prod`.

### Variables (`vars`)

- `AWS_GITHUB_ROLE_ARN`
- `AWS_REGION`
- `ECR_REPOSITORY`
- `S3_BUCKET_NAME`
- `POSTGRES_DB` (optionnel, default `homepedia`)
- `POSTGRES_USER` (optionnel, default `homepedia`)
- `MONGO_DB` (optionnel, default `homepedia_raw`)
- `DVF_S3_KEY` (optionnel, default `dvf/full.csv`)
- `SCRAPER_MAX_WORKERS` (optionnel, default `12`)
- `POSTGRES_INSTANCE_CLASS` (optionnel, default `db.t4g.micro`)
- `SKIP_FINAL_SNAPSHOT` (optionnel, default `true`)
- `DELETION_PROTECTION` (optionnel, default `false`)
- `LOG_RETENTION_DAYS` (optionnel, default `14`)

Si usage `ecs_job` dans `release-manual.yml`:

- `ECS_CLUSTER_NAME`
- `ECS_SUBNET_IDS` (comma-separated, ex: `subnet-aaa,subnet-bbb`)
- `ECS_SECURITY_GROUP_ID`
- `ECS_TASKDEF_BOOTSTRAP`
- `ECS_TASKDEF_SCRAPING_BDMV`
- `ECS_TASKDEF_SCRAPING_VILLEIDEALE`
- `ECS_TASKDEF_INGEST_DVF`
- `ECS_TASKDEF_SPARK_JOB`

### Secrets (`secrets`)

- `POSTGRES_PASSWORD`
- `MONGO_URI`