"""
Applique les migrations MongoDB en attente.

A lancer apres le demarrage Docker, depuis la racine du projet :

  docker compose --project-directory . -f docker/docker-compose.yml up -d
  python packages/etl/database/run_migrations_mongo.py

Les fichiers dans packages/etl/database/mongo/migrations/ sont executes dans l'ordre du nom
(01_..., 02_..., 14_..., etc.).
"""

import subprocess
import sys
from pathlib import Path

try:
    from pymongo import MongoClient
except ImportError:
    MongoClient = None

PROJECT_ROOT = Path(__file__).resolve().parents[3]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from packages.shared.util.config import (
    get_mongo_db_name,
    get_mongo_params,
    get_mongo_uri,
    load_env,
)

ROOT = PROJECT_ROOT
DATABASE_DIR = Path(__file__).resolve().parent
MIGRATIONS_DIR = DATABASE_DIR / "mongo" / "migrations"

COMPOSE_FILE = ROOT / "docker" / "docker-compose.yml"
COMPOSE_PROJECT_DIR = COMPOSE_FILE.parent
COMPOSE_BASE = [
    "docker",
    "compose",
    "--project-directory",
    str(COMPOSE_PROJECT_DIR),
    "-f",
    str(COMPOSE_FILE),
]


def get_applied(client, db_name):
    db = client[db_name]
    coll = db.get_collection("schema_migrations")
    return {doc["_id"] for doc in coll.find({}, {"_id": 1})}


def record_applied(client, db_name, name):
    db = client[db_name]
    db.schema_migrations.insert_one({"_id": name})


def main():
    if not MongoClient:
        print("[Mongo migrations] pymongo requis : pip install pymongo")
        sys.exit(1)
    if not MIGRATIONS_DIR.is_dir():
        print(f"[Mongo migrations] Dossier introuvable : {MIGRATIONS_DIR}")
        sys.exit(1)

    files = sorted(f for f in MIGRATIONS_DIR.iterdir() if f.suffix.lower() == ".js")
    if not files:
        print("[Mongo migrations] Aucun fichier .js dans", MIGRATIONS_DIR)
        return

    load_env()
    params = get_mongo_params()
    db_name = get_mongo_db_name()
    uri = get_mongo_uri()

    try:
        client = MongoClient(uri)
        client.admin.command("ping")
    except Exception as exc:
        print("[Mongo migrations] Connexion impossible :", exc)
        sys.exit(1)

    applied = get_applied(client, db_name)

    for path in files:
        name = path.name
        if name in applied:
            print(f"[Mongo migrations] Deja applique : {name}")
            continue
        print(f"[Mongo migrations] Application : {name}")
        cmd = COMPOSE_BASE + [
            "exec",
            "-T",
            "mongo",
            "mongosh",
            "-u",
            params["user"],
            "-p",
            params["password"],
            "--authenticationDatabase",
            "admin",
            db_name,
            "--file",
            f"/migrations/{name}",
        ]
        result = subprocess.run(cmd, cwd=ROOT)
        if result.returncode != 0:
            print(f"[Mongo migrations] Erreur lors de {name}")
            sys.exit(result.returncode)
        record_applied(client, db_name, name)

    print("[Mongo migrations] Termine.")


if __name__ == "__main__":
    main()
