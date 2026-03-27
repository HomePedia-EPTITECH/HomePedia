"""
Lance les migrations PostgreSQL puis MongoDB.

A lancer apres `docker compose up`, depuis la racine du projet:

  python packages/etl/database/run_migrations.py
"""

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = [
    "run_migrations_postgres.py",
    "run_migrations_mongo.py",
]


def main() -> None:
    for name in SCRIPTS:
        path = ROOT / "database" / name
        if not path.is_file():
            continue
        code = subprocess.run([sys.executable, str(path)], cwd=ROOT).returncode
        if code != 0:
            sys.exit(code)
    print("[run_migrations] Toutes les migrations sont a jour.")


if __name__ == "__main__":
    main()
