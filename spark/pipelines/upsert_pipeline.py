
"""
pipelines/upsert_pipeline.py

Reçoit le DataFrame final (après tous les pipelines de transformation)
et upserte chaque table vers PostgreSQL via le pattern staging → ON CONFLICT.
"""

import logging
from pyspark.sql import DataFrame
from upsert.postgres_upsert import upsert_table, SQL_UPSERT
from upsert.split_dataframe import split_by_table

log = logging.getLogger(__name__)


def run_upsert(df: DataFrame) -> None:
    """Point d'entrée : reçoit le DataFrame global et upserte toutes les tables."""
    log.info("=== Début upsert PostgreSQL ===\n")
    
    df = df.dropDuplicates(["com"])

    # Découpe le DataFrame global en sous-DataFrames par table
    dataframes = split_by_table(df)

    errors = []
    for table_name, sub_df in dataframes.items():
        try:
            upsert_table(sub_df, table_name, SQL_UPSERT[table_name])
        except Exception as e:
            log.error(f"[{table_name.upper()}] ✗ ERREUR : {e}")
            errors.append((table_name, str(e)))

    if errors:
        log.error(f"{len(errors)} table(s) en erreur :")
        for t, err in errors:
            log.error(f"  - {t} : {err}")
        raise RuntimeError("Upsert terminé avec des erreurs.")

    log.info("=== Upsert terminé avec succès ===")