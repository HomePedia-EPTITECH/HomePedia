from utils.session import get_spark, load_mongodb_collection
from pipelines.clean_data_pipeline import run_pipeline as clean_data_pipeline
from pipelines.education_pipeline import run_pipeline as education_pipeline
from pipelines.geo_pipeline import run_pipeline as geo_pipeline
from pipelines.metrics_pipeline import run_pipeline as metrics_pipeline
from pipelines.upsert_pipeline import run_upsert
import logging
from pathlib import Path
import os

os.environ["SPARK_DRIVER_JAVA_OPTIONS"] = (
    "-Dlog4j.configuration=file://$(pwd)/spark/log4j.properties"
)

BASE_DIR = Path(__file__).resolve().parent
output_path = BASE_DIR / "output" / "data_cleaned"

# Réduire les logs Spark
logging.getLogger("org").setLevel(logging.WARN)
logging.getLogger("akka").setLevel(logging.WARN)

spark = get_spark()
spark.sparkContext.setLogLevel("ERROR")

# ── Chargement ────────────────────────────────────────────────
df = load_mongodb_collection(spark).persist()
df = geo_pipeline(spark, df)

# ── Pipelines de transformation ───────────────────────────────
result = clean_data_pipeline(df)
result = education_pipeline(result)
result = metrics_pipeline(result)
print("Pipeline terminé")
# print("Rows:", result.count())
# print("Columns:", len(result.columns))


# ── Export CSV (optionnel) ────────────────────────────────────
print("WRITE START")

# result.coalesce(1).write.mode("overwrite").option("header", "true").csv(str(output_path))
# result.coalesce(1).write.option("header","true").json("./output/data_cleaned.json", mode="overwrite")
print("WRITE END")

# ── Upsert PostgreSQL ─────────────────────────────────────────
run_upsert(result)


spark.stop()
