"""
Setup en une commande : lance Docker, attend Mongo, puis execute les migrations HomePedia.

A la racine du projet :

  python setup.py

Prerequis : Docker installe et demarre, fichier .env configure.
"""

import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
from packages.shared.util.config import get_mongo_uri, load_env

load_env()


def run(cmd, check=True):
    print(f"[setup] {subprocess.list2cmdline(cmd)}")
    try:
        result = subprocess.run(cmd, cwd=ROOT)
    except FileNotFoundError as exc:
        print(f"[setup] Commande introuvable: {cmd[0]} ({exc})")
        sys.exit(1)
    if check and result.returncode != 0:
        sys.exit(result.returncode)
    return result.returncode


def resolve_compose_file() -> Path:
    candidates = [
        ROOT / "docker" / "docker-compose.yml",
        ROOT / "docker-compose.yml",
    ]
    for path in candidates:
        if path.exists():
            return path
    print("[setup] Aucun fichier docker-compose.yml trouve (attendu dans ./docker/ ou a la racine).")
    sys.exit(1)


def resolve_database_main() -> Path:
    candidates = [
        ROOT / "packages" / "etl" / "database" / "main.py",
    ]
    for path in candidates:
        if path.exists():
            return path
    print("[setup] Aucun script database main.py trouve (attendu dans ./packages/etl/database/).")
    sys.exit(1)


def wait_mongo(timeout=120):
    try:
        from pymongo import MongoClient
    except ImportError:
        print("[setup] pymongo non installe, attente 10 s supplementaire...")
        time.sleep(10)
        return

    uri = get_mongo_uri()
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        try:
            client = MongoClient(uri, serverSelectionTimeoutMS=2000)
            client.admin.command("ping")
            print("[setup] Mongo pret.")
            return
        except Exception:
            time.sleep(2)
    print("[setup] Timeout : Mongo ne repond pas.")
    sys.exit(1)


def main():
    compose_file = resolve_compose_file()
    database_main = resolve_database_main()
    project_dir = compose_file.parent

    print("[setup] Lancement des conteneurs Docker...")
    run(
        [
            "docker",
            "compose",
            "--project-directory",
            str(project_dir),
            "-f",
            str(compose_file),
            "up",
            "-d",
        ]
    )

    print("[setup] Attente de Mongo...")
    wait_mongo()

    print("[setup] Execution des migrations HomePedia...")
    run([sys.executable, str(database_main)])

    print("[setup] Termine. Tu peux lancer le scrap ou l'app.")


if __name__ == "__main__":
    main()
