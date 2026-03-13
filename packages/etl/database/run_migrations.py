"""
Lance toutes les migrations (Postgres puis Mongo) : n’applique que celles pas encore enregistrées.

À lancer après le démarrage Docker, depuis la racine du projet :

  docker compose --project-directory . -f docker/docker-compose.yml up -d
  python packages/etl/database/run_migrations.py

Tu peux aussi lancer uniquement Postgres ou Mongo :
  python packages/etl/database/run_migrations_postgres.py
  python packages/etl/database/run_migrations_mongo.py
"""

import subprocess
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[3]
DATABASE_DIR = Path(__file__).resolve().parent
SCRIPTS = [
    "run_migrations_postgres.py",
    "run_migrations_mongo.py",
]


def main():
    for name in SCRIPTS:
        path = DATABASE_DIR / name
        if not path.is_file():
            continue
        code = subprocess.run([sys.executable, str(path)], cwd=PROJECT_ROOT).returncode
        if code != 0:
            sys.exit(code)
    print("[run_migrations] Toutes les migrations sont à jour.")


if __name__ == "__main__":
    main()
