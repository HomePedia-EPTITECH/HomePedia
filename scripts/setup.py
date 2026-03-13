"""
Setup en une commande : lance Docker, attend que Postgres et Mongo soient prêts, puis exécute tous les scripts Database (migrations + chargement des données).

À la racine du projet :

  python scripts/setup.py

Prérequis : Docker installé et démarré, fichier .env configuré.
"""

import subprocess
import sys
import time
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
SHARED_DIR = PROJECT_ROOT / "packages" / "shared"
if str(SHARED_DIR) not in sys.path:
    sys.path.insert(0, str(SHARED_DIR))
from util.config import load_env, get_pg_params, get_mongo_uri

load_env()


def run(cmd, check=True):
    print(f"[setup] {subprocess.list2cmdline(cmd)}")
    r = subprocess.run(cmd, cwd=PROJECT_ROOT)
    if check and r.returncode != 0:
        sys.exit(r.returncode)
    return r.returncode


def wait_postgres(timeout=120):
    try:
        import psycopg2
    except ImportError:
        print("[setup] psycopg2 non installé, attente 15 s avant de continuer…")
        time.sleep(15)
        return
    pg = get_pg_params()
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        try:
            psycopg2.connect(**pg, connect_timeout=2)
            print("[setup] Postgres prêt.")
            return
        except Exception:
            time.sleep(2)
    print("[setup] Timeout : Postgres ne répond pas.")
    sys.exit(1)


def wait_mongo(timeout=120):
    try:
        from pymongo import MongoClient
    except ImportError:
        print("[setup] pymongo non installé, attente 10 s supplémentaire…")
        time.sleep(10)
        return
    uri = get_mongo_uri()
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        try:
            client = MongoClient(uri, serverSelectionTimeoutMS=2000)
            client.admin.command("ping")
            print("[setup] Mongo prêt.")
            return
        except Exception:
            time.sleep(2)
    print("[setup] Timeout : Mongo ne répond pas.")
    sys.exit(1)


def main():
    print("[setup] Lancement des conteneurs Docker…")
    compose_file = PROJECT_ROOT / "docker" / "docker-compose.yml"
    compose_base = [
        "docker",
        "compose",
        "--project-directory",
        str(PROJECT_ROOT),
        "-f",
        str(compose_file),
    ]
    run(compose_base + ["up", "-d"])

    print("[setup] Attente de Postgres et Mongo…")
    wait_postgres()
    wait_mongo()

    print("[setup] Exécution des scripts Database (migrations + données)…")
    run([sys.executable, str(PROJECT_ROOT / "packages" / "etl" / "database" / "main.py")])

    print("[setup] Terminé. Tu peux lancer le scrap ou l’app.")


if __name__ == "__main__":
    main()
