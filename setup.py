"""
Setup en une commande : lance Docker, attend Mongo, puis exécute les scripts Database (Mongo uniquement).

À la racine du projet :

  python setup.py

Prérequis : Docker installé et démarré, fichier .env configuré.
"""

import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
from packages.shared.util.config import load_env, get_mongo_uri

load_env()


def run(cmd, check=True):
    print(f"[setup] {subprocess.list2cmdline(cmd)}")
    try:
        r = subprocess.run(cmd, cwd=ROOT)
    except FileNotFoundError as exc:
        print(f"[setup] Commande introuvable: {cmd[0]} ({exc})")
        sys.exit(1)
    if check and r.returncode != 0:
        sys.exit(r.returncode)
    return r.returncode


def resolve_compose_file() -> Path:
    candidates = [
        ROOT / "docker" / "docker-compose.yml",
        ROOT / "docker-compose.yml",
    ]
    for path in candidates:
        if path.exists():
            return path
    print(
        "[setup] Aucun fichier docker-compose.yml trouvé (attendu dans ./docker/ ou à la racine)."
    )
    sys.exit(1)


def resolve_database_main() -> Path:
    candidates = [
        ROOT / "packages" / "etl" / "database" / "main.py",
        ROOT / "Database" / "main.py",
    ]
    for path in candidates:
        if path.exists():
            return path
    print(
        "[setup] Aucun script database main.py trouvé "
        "(attendu dans ./packages/etl/database/ ou ./Database/)."
    )
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
    compose_file = resolve_compose_file()
    database_main = resolve_database_main()
    print("[setup] Lancement des conteneurs Docker…")
    # Important: aligner le project-directory avec les scripts de migrations.
    # Ici on se base sur le dossier du fichier compose (ex: ./docker),
    # sinon `docker compose exec mongo ...` peut viser un autre "projet" Compose.
    project_dir = compose_file.parent
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

    print("[setup] Attente de Mongo…")
    wait_mongo()

    print("[setup] Exécution des scripts Database (migrations + données)…")
    run([sys.executable, str(database_main)])

    print("[setup] Terminé. Tu peux lancer le scrap ou l’app.")


if __name__ == "__main__":
    main()
