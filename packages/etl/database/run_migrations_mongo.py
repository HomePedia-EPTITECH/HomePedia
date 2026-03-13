"""
Applique les migrations MongoDB en attente (celles pas encore dans la collection schema_migrations).
À lancer après le démarrage Docker, depuis la racine du projet :

  docker compose --project-directory . -f docker/docker-compose.yml up -d
  python packages/etl/database/run_migrations_mongo.py

Les fichiers dans packages/etl/database/mongo/migrations/ sont exécutés dans l’ordre du nom (01_..., 02_..., 14_..., etc.).
Si tu as déjà appliqué des migrations à la main (ex. 01 à 14), enregistre-les une fois :

  db.schema_migrations.insertMany([
    { _id: "01_init_city_backups.js" }, { _id: "02_xxx.js" }, ...
  ]);
"""

import subprocess
import sys
from pathlib import Path

try:
    from pymongo import MongoClient
except ImportError:
    MongoClient = None

PROJECT_ROOT = Path(__file__).resolve().parents[3]
SHARED_DIR = PROJECT_ROOT / "packages" / "shared"
if str(SHARED_DIR) not in sys.path:
    sys.path.insert(0, str(SHARED_DIR))
from util.config import get_mongo_params

ROOT = PROJECT_ROOT
DATABASE_DIR = Path(__file__).resolve().parent
MIGRATIONS_DIR = DATABASE_DIR / "mongo" / "migrations"

COMPOSE_FILE = ROOT / "docker" / "docker-compose.yml"
COMPOSE_BASE = [
    "docker",
    "compose",
    "--project-directory",
    str(ROOT),
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

    params = get_mongo_params()
    uri = f"mongodb://{params['user']}:{params['password']}@{params['host']}:{params['port']}/?authSource=admin"
    try:
        client = MongoClient(uri)
        client.admin.command("ping")
    except Exception as e:
        print("[Mongo migrations] Connexion impossible :", e)
        sys.exit(1)

    applied = get_applied(client, params["db_name"])

    for path in files:
        name = path.name
        if name in applied:
            print(f"[Mongo migrations] Déjà appliqué : {name}")
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
            params["db_name"],
            "--file",
            f"/migrations/{name}",
        ]
        result = subprocess.run(cmd, cwd=ROOT)
        if result.returncode != 0:
            print(f"[Mongo migrations] Erreur lors de {name}")
            sys.exit(result.returncode)
        record_applied(client, params["db_name"], name)

    print("[Mongo migrations] Terminé.")


if __name__ == "__main__":
    main()
