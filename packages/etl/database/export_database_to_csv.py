import csv
from pathlib import Path

from pymongo import MongoClient

from packages.shared.util.config import get_mongo_db_name, get_mongo_uri


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "data/exports"


def export_mongo_communes_csv() -> Path:
    """
    Exporte la collection Mongo communes_harvest dans un CSV.

    - Fichier généré : exports/communes_mongo.csv
    - Colonnes choisies :
        - com
        - nom_commune
        - metrics.* (toutes les clés de metrics à plat)
        - real_estate.* (prix / parts)
        - reviews_summary.* (notes / nb_avis)
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

    # Détecte dynamiquement les clés de metrics présentes sur l'ensemble des docs
    metric_keys = set()
    real_estate_keys = set()
    reviews_summary_keys = set()
    for d in docs:
        metrics = d.get("metrics") or {}
        metric_keys.update(metrics.keys())
        re_data = d.get("real_estate") or {}
        real_estate_keys.update(re_data.keys())
        rs = d.get("reviews_summary") or {}
        reviews_summary_keys.update(rs.keys())

    metric_keys = sorted(metric_keys)
    real_estate_keys = sorted(real_estate_keys)
    reviews_summary_keys = sorted(reviews_summary_keys)

    fieldnames = (
        ["com", "nom_commune"]
        + [f"metrics.{k}" for k in metric_keys]
        + [f"real_estate.{k}" for k in real_estate_keys]
        + [f"reviews_summary.{k}" for k in reviews_summary_keys]
    )

    with out_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()

        for d in docs:
            row: dict = {}
            row["com"] = d.get("com")
            row["nom_commune"] = d.get("nom_commune")

            metrics = d.get("metrics") or {}
            for k in metric_keys:
                row[f"metrics.{k}"] = metrics.get(k)

            real_estate = d.get("real_estate") or {}
            for k in real_estate_keys:
                row[f"real_estate.{k}"] = real_estate.get(k)

            reviews_summary = d.get("reviews_summary") or {}
            for k in reviews_summary_keys:
                row[f"reviews_summary.{k}"] = reviews_summary.get(k)

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
            writer.writerow({k: d.get(k) for k in fieldnames})

    return out_path


def main() -> None:
    mongo_csv = export_mongo_communes_csv()
    print(f"MongoDB exporté vers : {mongo_csv}")
    mongo_direct_csv = export_mongo_communes_direct_csv()
    print(f"MongoDB (direct) exporté vers : {mongo_direct_csv}")


if __name__ == "__main__":
    main()
