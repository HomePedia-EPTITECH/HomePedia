import csv
import json
import sys
from pathlib import Path

from pymongo import MongoClient

PROJECT_ROOT = Path(__file__).resolve().parents[3]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from packages.shared.util.config import get_mongo_db_name, get_mongo_uri


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "data/exports"

HARVEST_BLOCKS = [
    "admin_codes",
    "admin_details",
    "links",
    "demography",
    "security",
    "quality_of_life",
    "services",
    "real_estate",
    "reviews_summary",
    "reviews_refs",
]


def export_mongo_communes_csv() -> Path:
    """
    Exporte la collection Mongo communes_harvest dans un CSV.

    - Fichier généré : exports/communes_mongo.csv
    - Colonnes choisies :
        - com
        - nom_commune
        - source
        - updated_at
        - admin_codes.*, admin_details.*, links.*
        - demography.*, security.*, quality_of_life.*, services.*, real_estate.*
        - reviews_summary.*, reviews_refs.*
    - Les champs manquants sont laissés vides.
    """
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    out_path = OUTPUT_DIR / "communes_mongo.csv"

    client = MongoClient(get_mongo_uri())
    db = client[get_mongo_db_name()]
    coll = db["communes_harvest"]

    docs = list(coll.find({}))
    if not docs:
        with out_path.open("w", newline="", encoding="utf-8") as f:
            f.write("")
        return out_path

    block_keys = collect_block_keys(docs, HARVEST_BLOCKS)
    fieldnames = ["com", "nom_commune", "source", "updated_at"]
    for block_name in HARVEST_BLOCKS:
        fieldnames.extend(f"{block_name}.{key}" for key in block_keys[block_name])

    with out_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()

        for d in docs:
            row = {
                "com": d.get("com"),
                "nom_commune": d.get("nom_commune"),
                "source": d.get("source"),
                "updated_at": serialize_csv_value(d.get("updated_at")),
            }

            for block_name in HARVEST_BLOCKS:
                block = d.get(block_name) or {}
                for key in block_keys[block_name]:
                    row[f"{block_name}.{key}"] = serialize_csv_value(block.get(key))

            writer.writerow(row)

    return out_path


def export_mongo_communes_direct_csv() -> Path:
    """
    Exporte la collection Mongo communes_direct (doc "table" aplatie par commune) dans un CSV.

    - Fichier généré : exports/communes_direct_mongo.csv
    - Colonnes : union dynamique de toutes les clés présentes sur l'ensemble des documents
      (hors `_id`), donc "tout direct direct".
    """
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    out_path = OUTPUT_DIR / "communes_direct_mongo.csv"

    client = MongoClient(get_mongo_uri())
    db = client[get_mongo_db_name()]
    coll = db["communes_direct"]

    docs = list(coll.find({}, {"_id": 0}))
    if not docs:
        with out_path.open("w", newline="", encoding="utf-8") as f:
            f.write("")
        return out_path

    fieldnames = set()
    for d in docs:
        fieldnames.update(d.keys())
    fieldnames = sorted(fieldnames)

    with out_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for d in docs:
            writer.writerow({k: serialize_csv_value(d.get(k)) for k in fieldnames})

    return out_path


def collect_block_keys(docs: list[dict], block_names: list[str]) -> dict[str, list[str]]:
    block_keys: dict[str, set[str]] = {block_name: set() for block_name in block_names}

    for document in docs:
        for block_name in block_names:
            block = document.get(block_name) or {}
            if isinstance(block, dict):
                block_keys[block_name].update(block.keys())

    return {
        block_name: sorted(keys)
        for block_name, keys in block_keys.items()
    }


def serialize_csv_value(value):
    if isinstance(value, (dict, list)):
        return json.dumps(value, ensure_ascii=False, sort_keys=True)
    return value


def main() -> None:
    mongo_csv = export_mongo_communes_csv()
    print(f"MongoDB exporté vers : {mongo_csv}")
    mongo_direct_csv = export_mongo_communes_direct_csv()
    print(f"MongoDB (direct) exporté vers : {mongo_direct_csv}")


if __name__ == "__main__":
    main()
