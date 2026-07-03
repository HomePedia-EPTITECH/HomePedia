from pyspark.sql import SparkSession
from pyspark.sql import functions as F
from pyspark.sql.functions import col, regexp_replace, trim, when
from pyspark.sql.types import IntegerType

MONGO_URI = "mongodb://admin:admin@localhost:27017/?authSource=admin"
MONGO_DB = "homepedia_raw"
MONGO_COLLECTION = "communes_direct"
MONGO_REAL_ESTATE_COLLECTION = "real_estate_history"

_DROP_COLS = {
    "_id",
    "avis_page",
    "city_page",
    "source",
    "created_at",
    "updated_at",
    "reviews_refs_count",
    "reviews_refs_last_collected_at",
    "salaire_last_ingested_at",
    "salaire_millesime",
    "salaire_source",
}


def get_spark():
    return (
        SparkSession.builder.appName("HomePedia")
        .config(
            "spark.jars.packages", "org.mongodb.spark:mongo-spark-connector_2.13:10.4.0"
        )
        .config(
            "spark.driver.extraJavaOptions", "-Dlog4j.configuration=log4j.properties"
        )
        .getOrCreate()
    )


def safe_cast_int(col_name):
    cleaned = regexp_replace(trim(col(col_name)).cast("string"), "\\s+", "")
    return (
        when((cleaned == "") | cleaned.isNull(), None)
        .otherwise(cleaned.cast(IntegerType()))
        .alias(col_name)
    )


def load_mongodb_collection(spark):
    try:
        df = (
            spark.read.format("mongodb")
            .option("spark.mongodb.read.connection.uri", MONGO_URI)
            .option("spark.mongodb.read.database", MONGO_DB)
            .option("spark.mongodb.read.collection", MONGO_COLLECTION)
            .option(
                "pipeline",
                """
                [{
                    "$addFields": {
                        "metrics": {
                            "$arrayToObject": {
                                "$map": {
                                    "input": { "$objectToArray": "$metrics" },
                                    "as": "m",
                                    "in": {
                                        "k": "$$m.k",
                                        "v": {
                                            "$cond": {
                                                "if": { "$eq": ["$$m.v", ""] },
                                                "then": null,
                                                "else": { "$toString": "$$m.v" }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }]
                """,
            )
            .load()
        )

        to_drop = [column for column in df.columns if column in _DROP_COLS]
        if to_drop:
            df = df.drop(*to_drop)

        metrics_cols = []
        if "metrics" in df.columns:
            metrics_cols = [safe_metric_col(column) for column in df.select("metrics.*").columns]

        real_estate_cols = []
        if "real_estate" in df.columns:
            real_estate_cols = [
                col(f"real_estate.{column}").alias(column)
                for column in df.select("real_estate.*").columns
            ]

        root_cols = [
            column
            for column in df.columns
            if column not in {"metrics", "real_estate", "reviews_summary"}
        ]

        df_flat = df.select(root_cols + metrics_cols + real_estate_cols)
        df_flat = df_flat.drop("com_reviews", "presentation")

        for col_name in df_flat.columns:
            if col_name.startswith("nb_"):
                try:
                    df_flat = df_flat.withColumn(col_name, safe_cast_int(col_name))
                except Exception:
                    print(f"Warning: could not safely cast {col_name} to INT")

        print(
            f"✓ Spark DataFrame created with {df_flat.count()} rows and {len(df_flat.columns)} columns"
        )
        return df_flat
    except Exception as e:
        print(f"✗ Error connecting to MongoDB: {e}")
        raise

def safe_string(df, col_name):
    return df.withColumn(
        col_name,
        F.when(F.col(col_name).isNull() | (F.col(col_name) == ""), None).otherwise(
            F.col(col_name).cast("string")
        ),
    )


def safe_metric_col(metric_name):
    alias = metric_name if metric_name != "com" else "com_reviews"
    return (
        F.when(F.col(f"metrics.{metric_name}").cast("string") == "", None)
        .otherwise(F.col(f"metrics.{metric_name}").cast("string"))
        .alias(alias)
    )


def load_real_estate_history(spark):
    """Transactions DVF (une ligne par transaction/parcelle) : com, latitude, longitude uniquement."""
    try:
        df = (
            spark.read.format("mongodb")
            .option("spark.mongodb.read.connection.uri", MONGO_URI)
            .option("spark.mongodb.read.database", MONGO_DB)
            .option("spark.mongodb.read.collection", MONGO_REAL_ESTATE_COLLECTION)
            .load()
            .select("com", "latitude", "longitude")
        )

        print(f"✓ Spark DataFrame loaded: {df.count()} rows from {MONGO_REAL_ESTATE_COLLECTION}")
        return df

    except Exception as e:
        print(f"✗ Error connecting to MongoDB: {e}")
        raise
