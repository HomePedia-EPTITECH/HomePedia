"""
Point d'entrée unique : exécution des migrations (Postgres + Mongo).

Les données applicatives (communes, métriques, etc.) sont désormais chargées
par les pipelines de scraping (ex : Scrap/script_BDMV.py) à partir des sitemaps.
"""

import subprocess
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent

# Seules les migrations et l'initialisation de la file des pages ville sont exécutées automatiquement.
# Les scripts de chargement de données (CSV/JSON) sont désormais optionnels
# et lancés manuellement si besoin.
SCRIPTS = [
    "run_migrations.py",  # applique uniquement les migrations pas encore jouées
    "init_harvest_queue_from_sitemap.py",  # remplit homepedia.city_pages_queue à partir du sitemap
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
