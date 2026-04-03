"""
Ingestion DVF (Demandes de Valeurs Foncieres) avec PySpark.

Objectif:
    - Lire un CSV DVF massif (y compris .gz).
    - Nettoyer les mutations pour ne garder que les ventes exploitables.
    - Calculer le prix au m2.
    - Agreger par code INSEE commune (pivot `com`).
    - Upsert dans MongoDB:
        * `communes_direct` (merge sur `com`) avec indicateurs DVF.
        * `real_estate_history` (transactions simplifiees par commune).

Usage:
    python packages/etl/database/ingest_dvf_spark.py --input /path/to/valeursfoncieres-YYYY.txt.gz
"""

from __future__ import annotations

import argparse
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

from pymongo import MongoClient, UpdateOne
from pymongo.errors import PyMongoError

from pyspark.sql import DataFrame, SparkSession
from pyspark.sql import functions as F
from pyspark.sql.types import DoubleType, IntegerType

_PROJECT_ROOT = Path(__file__).resolve().parents[3]
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from packages.scraping.models import CommuneDirectDVFDoc, RealEstateHistoryDoc  # noqa: E402
from packages.shared.util.config import get_mongo_db_name, get_mongo_uri  # noqa: E402


COMMUNES_DIRECT_COLLECTION = "communes_direct"
REAL_ESTATE_HISTORY_COLLECTION = "real_estate_history"
DVF_SOURCE = "dvf"
MONGO_BULK_BATCH_SIZE = 1000


def _normalized_number(col_name: str) -> Any:
    cleaned = F.regexp_replace(F.col(col_name).cast("string"), r"\u00A0", "")
    cleaned = F.regexp_replace(cleaned, r"\s+", "")
    cleaned = F.regexp_replace(cleaned, ",", ".")
    cleaned = F.regexp_replace(cleaned, r"[^0-9.\-]", "")
    return cleaned.cast(DoubleType())


def _normalized_code(col_name: str) -> Any:
    return F.upper(F.regexp_replace(F.trim(F.col(col_name).cast("string")), r"\s+", ""))


def _build_com_code_expr() -> Any:
    dept = _normalized_code("Code departement")
    commune = _normalized_code("Code commune")
    commune_padded = F.when(F.length(dept) >= 3, F.lpad(commune, 2, "0")).otherwise(
        F.lpad(commune, 3, "0")
    )
    return (
        F.when(F.length(commune) >= 5, commune)
        .when((F.length(dept) > 0) & (F.length(commune) > 0), F.concat(dept, commune_padded))
        .otherwise(F.lit(None))
    )


def _assert_required_columns(df: DataFrame) -> None:
    required = {
        "Nature mutation",
        "Valeur fonciere",
        "Surface reelle bati",
        "Type local",
        "Code commune",
        "Code departement",
        "Date mutation",
    }
    missing = sorted(c for c in required if c not in set(df.columns))
    if missing:
        raise ValueError(
            "Colonnes DVF manquantes dans le CSV: "
            + ", ".join(missing)
            + ". Verifiez le separateur et la version du fichier."
        )


def _build_clean_dvf_df(df_raw: DataFrame, min_prix_m2: float, max_prix_m2: float) -> DataFrame:
    vente_df = (
        df_raw.withColumn("com", _build_com_code_expr())
        .withColumn("nature_mutation_norm", F.lower(F.trim(F.col("Nature mutation"))))
        .filter(F.col("nature_mutation_norm") == F.lit("vente"))
        .withColumn("type_local_norm", F.initcap(F.lower(F.trim(F.col("Type local")))))
        .withColumn("valeur_fonciere_num", _normalized_number("Valeur fonciere"))
        .withColumn("surface_reelle_bati_num", _normalized_number("Surface reelle bati"))
        .withColumn(
            "date_mutation_iso",
            F.date_format(F.to_date(F.col("Date mutation"), "dd/MM/yyyy"), "yyyy-MM-dd"),
        )
        .filter(F.col("com").isNotNull() & (F.length(F.col("com")) >= 5))
        .filter(F.col("valeur_fonciere_num").isNotNull() & (F.col("valeur_fonciere_num") > 0))
        .filter(
            F.col("surface_reelle_bati_num").isNotNull()
            & (F.col("surface_reelle_bati_num") > 0)
        )
        .withColumn(
            "prix_m2",
            (F.col("valeur_fonciere_num") / F.col("surface_reelle_bati_num")).cast(DoubleType()),
        )
        .filter(F.col("prix_m2").isNotNull())
        .filter((F.col("prix_m2") >= F.lit(min_prix_m2)) & (F.col("prix_m2") <= F.lit(max_prix_m2)))
    )
    return vente_df


def _build_aggregate_df(df_clean: DataFrame) -> DataFrame:
    maison = F.when(F.col("type_local_norm") == F.lit("Maison"), F.col("prix_m2"))
    appartement = F.when(F.col("type_local_norm") == F.lit("Appartement"), F.col("prix_m2"))
    return df_clean.groupBy("com").agg(
        F.avg(maison).cast(DoubleType()).alias("prix_m2_moyen_maison"),
        F.avg(appartement).cast(DoubleType()).alias("prix_m2_moyen_appartement"),
        F.count(F.lit(1)).cast(IntegerType()).alias("nb_ventes_totales"),
    )


def _build_history_df(df_clean: DataFrame) -> DataFrame:
    no_disposition_expr = (
        F.coalesce(F.col("No disposition").cast("string"), F.lit(""))
        if "No disposition" in df_clean.columns
        else F.lit("")
    )
    tx_id = F.sha2(
        F.concat_ws(
            "|",
            F.coalesce(F.col("com"), F.lit("")),
            F.coalesce(F.col("date_mutation_iso"), F.lit("")),
            F.coalesce(F.col("Nature mutation").cast("string"), F.lit("")),
            F.coalesce(F.col("type_local_norm"), F.lit("")),
            F.coalesce(F.col("valeur_fonciere_num").cast("string"), F.lit("")),
            F.coalesce(F.col("surface_reelle_bati_num").cast("string"), F.lit("")),
            F.coalesce(F.col("prix_m2").cast("string"), F.lit("")),
            no_disposition_expr,
        ),
        256,
    )
    return df_clean.select(
        tx_id.alias("transaction_id"),
        F.lit(DVF_SOURCE).alias("source"),
        F.col("com"),
        F.col("date_mutation_iso").alias("date_mutation"),
        F.col("Nature mutation").alias("nature_mutation"),
        F.col("type_local_norm").alias("type_local"),
        F.col("valeur_fonciere_num").alias("valeur_fonciere"),
        F.col("surface_reelle_bati_num").alias("surface_reelle_bati"),
        F.col("prix_m2"),
    )


def _flush_bulk(collection: Any, operations: List[UpdateOne]) -> int:
    if not operations:
        return 0
    result = collection.bulk_write(operations, ordered=False)
    return (result.upserted_count or 0) + (result.modified_count or 0)


def _upsert_history_partition(
    rows: Iterable[Any],
    mongo_uri: str,
    mongo_db_name: str,
    now_utc: datetime,
) -> None:
    client: Optional[MongoClient] = None
    try:
        client = MongoClient(mongo_uri, retryWrites=True)
        coll = client[mongo_db_name][REAL_ESTATE_HISTORY_COLLECTION]
        ops: List[UpdateOne] = []
        for row in rows:
            data = row.asDict(recursive=True)
            tx_id = data.get("transaction_id")
            com = data.get("com")
            if not tx_id or not com:
                continue
            payload: RealEstateHistoryDoc = {
                "transaction_id": tx_id,
                "source": DVF_SOURCE,
                "com": str(com),
                "date_mutation": data.get("date_mutation"),
                "nature_mutation": data.get("nature_mutation") or "Vente",
                "type_local": data.get("type_local"),
                "valeur_fonciere": float(data["valeur_fonciere"])
                if data.get("valeur_fonciere") is not None
                else None,
                "surface_reelle_bati": float(data["surface_reelle_bati"])
                if data.get("surface_reelle_bati") is not None
                else None,
                "prix_m2": float(data["prix_m2"]) if data.get("prix_m2") is not None else None,
                "updated_at": now_utc,
            }
            ops.append(
                UpdateOne(
                    {"transaction_id": payload["transaction_id"]},
                    {
                        "$set": payload,
                        "$setOnInsert": {"created_at": now_utc},
                    },
                    upsert=True,
                )
            )
            if len(ops) >= MONGO_BULK_BATCH_SIZE:
                _flush_bulk(coll, ops)
                ops.clear()
        if ops:
            _flush_bulk(coll, ops)
    finally:
        if client is not None:
            client.close()


def _upsert_communes_direct_partition(
    rows: Iterable[Any],
    mongo_uri: str,
    mongo_db_name: str,
    now_utc: datetime,
) -> None:
    client: Optional[MongoClient] = None
    try:
        client = MongoClient(mongo_uri, retryWrites=True)
        coll = client[mongo_db_name][COMMUNES_DIRECT_COLLECTION]
        ops: List[UpdateOne] = []
        for row in rows:
            data = row.asDict(recursive=True)
            com = data.get("com")
            if not com:
                continue
            payload: CommuneDirectDVFDoc = {
                "com": str(com),
                "prix_m2_moyen_maison": float(data["prix_m2_moyen_maison"])
                if data.get("prix_m2_moyen_maison") is not None
                else None,
                "prix_m2_moyen_appartement": float(data["prix_m2_moyen_appartement"])
                if data.get("prix_m2_moyen_appartement") is not None
                else None,
                "nb_ventes_totales": int(data["nb_ventes_totales"])
                if data.get("nb_ventes_totales") is not None
                else None,
                "dvf_last_ingested_at": now_utc,
                "dvf_source": DVF_SOURCE,
            }
            ops.append(
                UpdateOne(
                    {"com": payload["com"]},
                    {
                        "$set": payload,
                        "$setOnInsert": {
                            "com": payload["com"],
                            "source": DVF_SOURCE,
                            "created_at": now_utc,
                        },
                    },
                    upsert=True,
                )
            )
            if len(ops) >= MONGO_BULK_BATCH_SIZE:
                _flush_bulk(coll, ops)
                ops.clear()
        if ops:
            _flush_bulk(coll, ops)
    finally:
        if client is not None:
            client.close()


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Ingestion DVF PySpark -> MongoDB.")
    parser.add_argument(
        "--input",
        required=True,
        help="Chemin fichier DVF CSV (.txt, .csv, .gz) ou pattern Spark.",
    )
    parser.add_argument(
        "--sep",
        default="|",
        help="Separateur CSV DVF (par defaut: '|').",
    )
    parser.add_argument(
        "--mongo-uri",
        default=get_mongo_uri(),
        help="URI MongoDB (par defaut via config partagee).",
    )
    parser.add_argument(
        "--mongo-db",
        default=get_mongo_db_name(),
        help="Nom base MongoDB (par defaut via config partagee).",
    )
    parser.add_argument(
        "--app-name",
        default="homepedia-dvf-ingest",
        help="Nom Spark app.",
    )
    parser.add_argument(
        "--min-prix-m2",
        type=float,
        default=100.0,
        help="Seuil mini coherence prix/m2 (defaut: 100).",
    )
    parser.add_argument(
        "--max-prix-m2",
        type=float,
        default=50000.0,
        help="Seuil maxi coherence prix/m2 (defaut: 50000).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Execute lecture+aggregation sans ecriture Mongo.",
    )
    return parser.parse_args()


def main() -> None:
    args = _parse_args()
    spark = SparkSession.builder.appName(args.app_name).getOrCreate()
    spark.sparkContext.setLogLevel("WARN")
    now_utc = datetime.now(timezone.utc)

    try:
        df_raw = (
            spark.read.option("header", True)
            .option("sep", args.sep)
            .option("quote", '"')
            .option("escape", '"')
            .option("multiLine", False)
            .csv(args.input)
        )
        _assert_required_columns(df_raw)

        df_clean = _build_clean_dvf_df(
            df_raw=df_raw,
            min_prix_m2=args.min_prix_m2,
            max_prix_m2=args.max_prix_m2,
        ).cache()
        agg_df = _build_aggregate_df(df_clean)
        history_df = _build_history_df(df_clean)

        total_rows = df_raw.count()
        clean_rows = df_clean.count()
        agg_rows = agg_df.count()
        print(f"[dvf] lignes lues         : {total_rows}")
        print(f"[dvf] ventes nettoyees    : {clean_rows}")
        print(f"[dvf] communes agregees   : {agg_rows}")

        if args.dry_run:
            print("[dvf] dry-run actif: aucune ecriture Mongo.")
            return

        history_df.foreachPartition(
            lambda rows: _upsert_history_partition(
                rows=rows,
                mongo_uri=args.mongo_uri,
                mongo_db_name=args.mongo_db,
                now_utc=now_utc,
            )
        )
        agg_df.foreachPartition(
            lambda rows: _upsert_communes_direct_partition(
                rows=rows,
                mongo_uri=args.mongo_uri,
                mongo_db_name=args.mongo_db,
                now_utc=now_utc,
            )
        )
        print("[dvf] ingestion terminee (communes_direct + real_estate_history).")
    finally:
        spark.stop()


if __name__ == "__main__":
    main()
