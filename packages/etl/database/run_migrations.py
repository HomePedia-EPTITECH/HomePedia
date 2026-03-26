"""
Lance uniquement les migrations MongoDB.

À lancer après « docker compose up », depuis la racine du projet :

  python Database/run_migrations.py
"""

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = [
    "run_migrations_mongo.py",
]


def main():
    for name in SCRIPTS:
        path = ROOT / "Database" / name
        if not path.is_file():
            continue
        code = subprocess.run([sys.executable, str(path)], cwd=ROOT).returncode
        if code != 0:
            sys.exit(code)
    print("[run_migrations] Toutes les migrations sont à jour.")


if __name__ == "__main__":
    main()
