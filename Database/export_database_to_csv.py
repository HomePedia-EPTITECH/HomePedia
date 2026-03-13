import csv
from pathlib import Path

import psycopg2
from psycopg2.extras import DictCursor
from pymongo import MongoClient

from util.config import get_pg_params, get_mongo_db_name, get_mongo_uri


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "data/exports"


def export_postgres_communes_csv() -> Path:
    """
    Exporte la table homepedia.communes dans un CSV unique.

    - Fichier généré : exports/communes_postgres.csv
    - Colonnes : toutes les colonnes actuelles de homepedia.communes
    """
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    out_path = OUTPUT_DIR / "communes_postgres.csv"

    pg_params = get_pg_params()
    with psycopg2.connect(**pg_params) as conn:
        with conn.cursor(cursor_factory=DictCursor) as cur:
            cur.execute("SELECT * FROM homepedia.communes ORDER BY com, nccenr")
            rows = cur.fetchall()
            if not rows:
                # Crée quand même un fichier vide avec juste l'en-tête si possible
                with out_path.open("w", newline="", encoding="utf-8") as f:
                    f.write("")
                return out_path

            fieldnames = [desc.name for desc in cur.description]
            with out_path.open("w", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()
                for row in rows:
                    writer.writerow(dict(row))

    return out_path


def export_mongo_communes_csv() -> Path:
    """
    Exporte la collection Mongo communes_harvest dans un CSV.

    - Fichier généré : exports/communes_mongo.csv
    - Colonnes choisies :
        - com
        - metrics.* (toutes les clés de metrics à plat)
        - presentation.intro_text
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
        ["com"]
        + [f"metrics.{k}" for k in metric_keys]
        + ["presentation.intro_text"]
        + [f"real_estate.{k}" for k in real_estate_keys]
        + [f"reviews_summary.{k}" for k in reviews_summary_keys]
    )

    with out_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()

        for d in docs:
            row: dict = {}
            row["com"] = d.get("com")

            metrics = d.get("metrics") or {}
            for k in metric_keys:
                row[f"metrics.{k}"] = metrics.get(k)

            presentation = d.get("presentation") or {}
            row["presentation.intro_text"] = presentation.get("intro_text")

            real_estate = d.get("real_estate") or {}
            for k in real_estate_keys:
                row[f"real_estate.{k}"] = real_estate.get(k)

            reviews_summary = d.get("reviews_summary") or {}
            for k in reviews_summary_keys:
                row[f"reviews_summary.{k}"] = reviews_summary.get(k)

            writer.writerow(row)

    return out_path


def main() -> None:
    pg_csv = export_postgres_communes_csv()
    mongo_csv = export_mongo_communes_csv()
    print(f"PostgreSQL exporté vers : {pg_csv}")
    print(f"MongoDB exporté vers   : {mongo_csv}")


if __name__ == "__main__":
    main()

