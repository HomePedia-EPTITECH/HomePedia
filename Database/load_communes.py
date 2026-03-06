import argparse
import csv
import json
import logging
import sys
from pathlib import Path
from typing import Dict, Iterable

import psycopg2
from psycopg2 import extras

# Permettre l'import du module util à la racine du projet
_ROOT = Path(__file__).resolve().parents[1]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))
from util.config import get_pg_params

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

ROOT_DIR = _ROOT


def iter_communes_from_csv(path: Path) -> Iterable[Dict[str, str]]:
    logging.info("Lecture CSV : %s", path)
    with path.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            com = (row.get("com") or "").strip()
            nccenr = (row.get("nccenr") or "").strip()
            if not com or not nccenr:
                continue
            yield {"com": com, "nccenr": nccenr}


def iter_communes_from_json(path: Path) -> Iterable[Dict[str, str]]:
    logging.info("Lecture JSON : %s", path)
    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)

    if isinstance(data, dict) and "rows" in data:
        rows = data["rows"]
    else:
        rows = data

    if not isinstance(rows, list):
        raise ValueError(
            f"Format JSON inattendu dans {path}, attendu liste d'objets ou clé 'rows'."
        )

    for row in rows:
        if not isinstance(row, dict):
            continue
        com = (str(row.get("com")) or "").strip()
        nccenr = (str(row.get("nccenr")) or "").strip()
        if not com or not nccenr:
            continue
        yield {"com": com, "nccenr": nccenr}


def load_communes(file_path: Path) -> None:
    if not file_path.is_file():
        raise FileNotFoundError(f"Fichier introuvable : {file_path}")

    ext = file_path.suffix.lower()
    if ext == ".csv":
        rows_iter = iter_communes_from_csv(file_path)
    elif ext == ".json":
        rows_iter = iter_communes_from_json(file_path)
    else:
        raise ValueError(f"Extension non supportée : {ext} (attendu .csv ou .json)")

    communes = list(rows_iter)
    if not communes:
        logging.warning("Aucune commune valide trouvée dans %s", file_path)
        return

    pg_params = get_pg_params()
    sql = """
        INSERT INTO homepedia.communes (com, nccenr)
        VALUES (%(com)s, %(nccenr)s)
        ON CONFLICT (com, nccenr) DO NOTHING
    """

    logging.info("Insertion de %d communes dans homepedia.communes", len(communes))
    with psycopg2.connect(**pg_params) as conn:
        with conn.cursor() as cur:
            extras.execute_batch(cur, sql, communes)
        conn.commit()
    logging.info("Chargement terminé (doublons ignorés si présents).")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Charge un fichier CSV/JSON de communes dans homepedia.communes."
    )
    parser.add_argument(
        "--file",
        "-f",
        dest="file",
        type=str,
        help="Chemin vers le fichier CSV ou JSON contenant les colonnes/champs 'com' et 'nccenr'.",
    )

    args = parser.parse_args()

    if args.file:
        file_path = Path(args.file)
    else:
        # Valeur par défaut : Database/data/communes_top100_2026.csv
        default = ROOT_DIR / "Database" / "data" / "communes_top100_2026.csv"
        logging.info("Aucun --file fourni, utilisation par défaut de %s", default)
        file_path = default

    try:
        load_communes(file_path)
    except Exception as e:  # pragma: no cover - gestion simple CLI
        logging.error("Erreur lors du chargement des communes : %s", e)
        raise SystemExit(1)


if __name__ == "__main__":
    main()
