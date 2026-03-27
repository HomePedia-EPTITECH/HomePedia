import argparse
import csv
import json
import logging
from pathlib import Path
from typing import Dict, Iterable

from packages.shared.util.config import get_pg_params

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")


def iter_communes_from_csv(path: Path) -> Iterable[Dict[str, str]]:
    with path.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            com = (row.get("com") or "").strip()
            nccenr = (row.get("nccenr") or "").strip()
            if com and nccenr:
                yield {"com": com, "nccenr": nccenr}


def iter_communes_from_json(path: Path) -> Iterable[Dict[str, str]]:
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)

    rows = data["rows"] if isinstance(data, dict) and "rows" in data else data
    if not isinstance(rows, list):
        raise ValueError(f"Format JSON inattendu dans {path}")

    for row in rows:
        if not isinstance(row, dict):
            continue
        com = (str(row.get("com") or "")).strip()
        nccenr = (str(row.get("nccenr") or "")).strip()
        if com and nccenr:
            yield {"com": com, "nccenr": nccenr}


def load_communes(file_path: Path) -> None:
    if not file_path.is_file():
        raise FileNotFoundError(f"Fichier introuvable: {file_path}")

    if file_path.suffix.lower() == ".csv":
        rows = list(iter_communes_from_csv(file_path))
    elif file_path.suffix.lower() == ".json":
        rows = list(iter_communes_from_json(file_path))
    else:
        raise ValueError(f"Extension non supportee: {file_path.suffix}")

    if not rows:
        logging.warning("Aucune commune valide trouvee dans %s", file_path)
        return

    try:
        import psycopg2
        from psycopg2 import extras
    except ImportError as exc:
        raise RuntimeError(f"psycopg2 indisponible: {exc}") from exc

    sql = """
        INSERT INTO bdd.v_commune_2026 (com, nccenr)
        VALUES (%(com)s, %(nccenr)s)
        ON CONFLICT (com, nccenr) DO NOTHING
    """

    with psycopg2.connect(**get_pg_params()) as connection:
        with connection.cursor() as cursor:
            extras.execute_batch(cursor, sql, rows)
        connection.commit()

    logging.info("Chargement termine: %s commune(s) injectee(s)", len(rows))


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Charge un fichier CSV ou JSON de communes dans bdd.v_commune_2026."
    )
    parser.add_argument(
        "--file",
        "-f",
        required=True,
        help="Chemin vers le fichier source contenant les champs com et nccenr.",
    )
    args = parser.parse_args()
    load_communes(Path(args.file))


if __name__ == "__main__":
    main()
