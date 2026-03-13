# HomePedia

## Initialisation des bases (PostgreSQL + MongoDB) avec Docker Compose

Ce repo fournit un fichier Docker Compose (`docker/docker-compose.yml`) pour démarrer localement :

- **PostgreSQL** (DB par défaut : `homepedia`, user : `admin`)
- **MongoDB** (DB par défaut : `homepedia_raw`)

### Pré-requis

- Docker Desktop (ou équivalent) installé et démarré.

### Configuration `.env`

Crée un fichier `.env` à la racine du projet (ou copie l’exemple) :

```bash
cp .env.example .env
```

```bash
# Exemple minimal
POSTGRES_DB=homepedia
POSTGRES_USER=admin
POSTGRES_PASSWORD=CHANGE_ME
POSTGRES_PORT=5432

MONGO_DB=homepedia_raw
MONGO_ROOT_USER=CHANGE_ME
MONGO_ROOT_PASSWORD=CHANGE_ME
MONGO_PORT=27017
```

### Démarrage des bases

**Option 1 – Tout en une commande (recommandé)**  
À la racine du projet, après avoir créé et édité ton `.env` :

```bash
cp .env.example .env      # puis édite .env (identifiants, etc.)
python scripts/setup.py
```

`scripts/setup.py` lance Docker, attend que Postgres et Mongo soient prêts, puis exécute les scripts de `packages/etl/database` (migrations + chargement des données). Ensuite tu peux lancer le scrap ou l’app.

**Option 2 – Étape par étape**

```bash
cp .env.example .env
docker compose --project-directory . -f docker/docker-compose.yml up -d
docker compose --project-directory . -f docker/docker-compose.yml ps         # vérifie que les conteneurs sont "Up"
python packages/etl/database/main.py   # migrations + chargement des données
```

### Migrations (suivi automatique)

Tout ce qui concerne les bases (init, migrations, scripts de chargement) est dans **`packages/etl/database/`** : init et migrations sont montés dans les conteneurs Docker via `docker/docker-compose.yml`.

Les scripts dans `packages/etl/database/postgres/init/` et `packages/etl/database/mongo/init/` s’exécutent **une seule fois** (au tout premier démarrage, volume vide). Ensuite, les évolutions de schéma se font via des **migrations** versionnées et tracées.

- **PostgreSQL** : init dans `packages/etl/database/postgres/init/`, migrations dans `packages/etl/database/postgres/migrations/` (ex. `01_init_communes.sql`, `02_…`, `14_…`).
- **MongoDB** : init dans `packages/etl/database/mongo/init/`, migrations dans `packages/etl/database/mongo/migrations/` (ex. `01_init_city_backups.js`, `02_…`, `14_…`).

Pour appliquer **uniquement les migrations pas encore jouées** (par ex. 15, 16 si tu es déjà à 14) :

```bash
python packages/etl/database/run_migrations.py
```

Ce script enregistre chaque migration appliquée (Postgres : table `bdd.schema_migrations`, Mongo : collection `schema_migrations`). Tu peux le relancer à chaque fois : seules les nouvelles seront exécutées.

**Si tu as déjà appliqué des migrations à la main** (ex. 01 à 14) et que tu ne veux pas les rejouer, fais une fois un **baseline** :

- **PostgreSQL** (depuis `psql` ou un client) :
  ```sql
  INSERT INTO bdd.schema_migrations (name) VALUES
    ('01_init_communes.sql'), ('02_seed_communes.sql'), ('03_gold_zone.sql')
    -- ajoute ici toutes celles déjà appliquées, ex. ('04_xxx.sql'), … ('14_xxx.sql')
  ON CONFLICT (name) DO NOTHING;
  ```
- **MongoDB** (depuis `mongosh` sur la DB concernée) :
  ```js
  db.schema_migrations.insertMany([
    { _id: "01_init_city_backups.js" },
    // { _id: "02_xxx.js" }, … { _id: "14_xxx.js" }
  ]);
  ```

Ensuite, `python packages/etl/database/run_migrations.py` ne jouera que les migrations après 14.

### Ordre recommandé après « docker compose up »

 - **Depuis zéro** : utilise **`python scripts/setup.py`** à la racine (Docker + attente + migrations + données).
 - **Déjà en cours** (conteneurs déjà up) : **`python packages/etl/database/main.py`** (migrations en attente + chargement des données).

`packages/etl/database/main.py` lance dans l’ordre : **run_migrations.py** (Postgres puis Mongo, uniquement les migrations pas encore appliquées), puis **load_communes.py** (et les autres scripts listés dans `packages/etl/database/main.py`).

Si tu préfères découper :

1. **Migrations seules** : `python packages/etl/database/run_migrations.py`
2. **Chargement des données seules** : `python packages/etl/database/load_communes.py` (ou retire `run_migrations.py` de la liste dans `packages/etl/database/main.py`)

### Chargement des données (après les migrations)

Les données (communes, etc.) sont chargées par `packages/etl/database/main.py` via les scripts listés dedans (`load_communes.py`, etc.). À lancer après que les tables existent (ou laisser `main.py` faire d’abord les migrations, comme ci‑dessus).

### Accès depuis ta machine (host)

- **PostgreSQL** : `localhost:5432` (DB `homepedia`, user `admin`, password = `POSTGRES_PASSWORD`)
- **MongoDB** : `mongodb://<user>:<password>@localhost:27017/?authSource=admin` (DB `homepedia_raw`)

### Réinitialiser (tout supprimer et recréer)

```bash
docker compose --project-directory . -f docker/docker-compose.yml down -v
docker compose --project-directory . -f docker/docker-compose.yml up -d
```
