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

Pour une **première initialisation** (si vous n'avez encore rien dans Docker) :

```bash
cp .env.example .env      # puis éditez .env pour mettre vos vrais identifiants
docker compose up -d      # télécharge les images, crée les volumes et lance Postgres + Mongo
docker compose ps         # vérifie que les conteneurs sont bien "Up"
```

### Migrations (manuel)

Les scripts dans `docker/*/init/` s’exécutent **une seule fois** (au tout premier démarrage, volume vide).
Pour faire évoluer les schémas **sans reset** des volumes, on passe en **manuel**.

#### PostgreSQL

- Mets tes fichiers dans `docker/postgres/migrations/` (ex: `02_new_table.sql`)
- Lance la migration :

```bash
docker compose exec -T postgres psql -U admin -d homepedia -f /migrations/02_new_table.sql
```

#### MongoDB

- Mets tes fichiers dans `docker/mongo/migrations/` (ex: `02_add_index.js`)
- Lance la migration :

```bash
docker compose exec -T mongo mongosh -u "$MONGO_ROOT_USER" -p "$MONGO_ROOT_PASSWORD" --authenticationDatabase admin /migrations/02_add_index.js
```

Recommandation simple : écris tes migrations Mongo de façon **idempotente** (si tu relances, ça ne casse pas).

### Accès depuis ta machine (host)

- **PostgreSQL** : `localhost:5432` (DB `homepedia`, user `admin`, password = `POSTGRES_PASSWORD`)
- **MongoDB** : `mongodb://<user>:<password>@localhost:27017/?authSource=admin` (DB `homepedia_raw`)

### Réinitialiser (tout supprimer et recréer)

```bash
docker compose down -v
docker compose up -d
```