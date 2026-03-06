"""
Point d'entrée unique pour lancer tous les scripts de chargement / setup de la base.

Ajoute ici chaque nouveau script Python à exécuter : ils seront lancés dans l'ordre.
"""

import subprocess
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent

SCRIPTS = [
    "load_communes.py",
]


def main() -> None:
    database_dir = Path(__file__).resolve().parent

    for script_name in SCRIPTS:
        script_path = database_dir / script_name
        if not script_path.is_file():
            print(f"[main] Ignoré (fichier absent) : {script_name}")
            continue
        print(f"[main] Lancement : {script_name}")
        result = subprocess.run(
            [sys.executable, str(script_path)],
            cwd=PROJECT_ROOT,
        )
        if result.returncode != 0:
            print(f"[main] Erreur : {script_name} a quitté avec le code {result.returncode}")
            sys.exit(result.returncode)

    print("[main] Tous les scripts ont été exécutés.")


if __name__ == "__main__":
    main()
