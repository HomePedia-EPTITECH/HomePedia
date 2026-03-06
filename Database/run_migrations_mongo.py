"""
Applique les migrations MongoDB en attente (celles pas encore dans la collection schema_migrations).
À lancer après « docker compose up », depuis la racine du projet : python Database/run_migrations_mongo.py

Les fichiers dans Database/mongo/migrations/ sont exécutés dans l’ordre du nom (01_..., 02_..., 14_..., etc.).
Si tu as déjà appliqué des migrations à la main (ex. 01 à 14), enregistre-les une fois :

  db.schema_migrations.insertMany([
    { _id: "01_init_communes_harvest.js" }, { _id: "02_xxx.js" }, ...
  ]);
"""

import subprocess
import sys
from pathlib import Path

try:
    from pymongo import MongoClient
except ImportError:
    MongoClient = None

_ROOT = Path(__file__).resolve().parents[1]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))
from util.config import get_mongo_params

ROOT = _ROOT
MIGRATIONS_DIR = ROOT / "Database" / "mongo" / "migrations"


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
        cmd = [
            "docker",
            "compose",
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
