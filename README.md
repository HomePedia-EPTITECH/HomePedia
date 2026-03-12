# HomePedia

## Initialisation des bases (PostgreSQL + MongoDB) avec Docker Compose

Ce repo fournit un `docker-compose.yml` pour démarrer localement :

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
python setup.py
```

`setup.py` lance Docker (`docker compose up -d`), attend que Postgres et Mongo soient prêts, puis exécute tous les scripts du dossier Database (migrations + chargement des données). Ensuite tu peux lancer le scrap ou l’app.

**Option 2 – Étape par étape**

```bash
cp .env.example .env
docker compose up -d
docker compose ps         # vérifie que les conteneurs sont "Up"
python Database/main.py   # migrations + chargement des données
```

### Migrations (suivi automatique)

Tout ce qui concerne les bases (init, migrations, scripts de chargement) est dans le dossier **`Database/`** : init et migrations sont montés dans les conteneurs Docker via le `docker-compose.yml`.

Les scripts dans `Database/postgres/init/` et `Database/mongo/init/` s’exécutent **une seule fois** (au tout premier démarrage, volume vide). Ensuite, les évolutions de schéma se font via des **migrations** versionnées et tracées.

- **PostgreSQL** : init dans `Database/postgres/init/`, migrations dans `Database/postgres/migrations/` (ex. `01_init_communes.sql`, `02_…`, `14_…`).
- **MongoDB** : init dans `Database/mongo/init/`, migrations dans `Database/mongo/migrations/` (ex. `01_init_city_backups.js`, `02_…`, `14_…`).

Pour appliquer **uniquement les migrations pas encore jouées** (par ex. 15, 16 si tu es déjà à 14) :

```bash
python Database/run_migrations.py
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

Ensuite, `python Database/run_migrations.py` ne jouera que les migrations après 14.

### Ordre recommandé après « docker compose up »

- **Depuis zéro** : utilise **`python setup.py`** à la racine (Docker + attente + migrations + données).
- **Déjà en cours** (conteneurs déjà up) : **`python Database/main.py`** (migrations en attente + chargement des données).

`Database/main.py` lance dans l’ordre : **run_migrations.py** (Postgres puis Mongo, uniquement les migrations pas encore appliquées), puis **load_communes.py** (et les autres scripts listés dans `Database/main.py`).

Si tu préfères découper :

1. **Migrations seules** : `python Database/run_migrations.py`
2. **Chargement des données seules** : `python Database/load_communes.py` (ou retire `run_migrations.py` de la liste dans `Database/main.py`)

### Chargement des données (après les migrations)

Les données (communes, etc.) sont chargées par `Database/main.py` via les scripts listés dedans (`load_communes.py`, etc.). À lancer après que les tables existent (ou laisser `main.py` faire d’abord les migrations, comme ci‑dessus).

### Accès depuis ta machine (host)

- **PostgreSQL** : `localhost:5432` (DB `homepedia`, user `admin`, password = `POSTGRES_PASSWORD`)
- **MongoDB** : `mongodb://<user>:<password>@localhost:27017/?authSource=admin` (DB `homepedia_raw`)

### Réinitialiser (tout supprimer et recréer)

```bash
docker compose down -v
docker compose up -d
```

## Backend NestJS (KPI API)

Un squelette backend est disponible dans `backend/` avec une architecture légère:

- `routes/`
- `controllers/`
- `services/`
- `repositories/`
- `db/`

Routes exposées (préfixe global `api`):

- `GET /api/health`
- `POST /api/kpis`
- `GET /api/kpis`
- `GET /api/kpis/:id`
- `PATCH /api/kpis/:id`
- `DELETE /api/kpis/:id`

La table SQL associée est créée par la migration:
`Database/postgres/migrations/02_create_kpis.sql`

Démarrage rapide:

```bash
cd backend
cp .env.example .env
npm install
npm run start:dev
```
