from pyspark.sql import SparkSession
from pyspark.sql import functions as F

MONGO_URI = "mongodb://admin:admin@localhost:27017/?authSource=admin"
MONGO_DB = "homepedia_raw"
MONGO_COLLECTION = "communes_direct"
MONGO_REAL_ESTATE_COLLECTION = "real_estate_history"

# Colonnes MongoDB sans intérêt pour le pipeline
_DROP_COLS = {
    "_id", "avis_page", "city_page", "source",
    "created_at", "updated_at",
    "reviews_refs_count", "reviews_refs_last_collected_at",
    "salaire_last_ingested_at", "salaire_millesime", "salaire_source",
}

def get_spark():
    return (
        SparkSession.builder
        .appName("HomePedia")
        .config("spark.jars.packages", "org.mongodb.spark:mongo-spark-connector_2.13:10.4.0")
        .config("spark.driver.extraJavaOptions", "-Dlog4j.configuration=log4j.properties")
        .getOrCreate()
    )

def load_mongodb_collection(spark):
    try:
        df = (
            spark.read.format("mongodb")
            .option("spark.mongodb.read.connection.uri", MONGO_URI)
            .option("spark.mongodb.read.database", MONGO_DB)
            .option("spark.mongodb.read.collection", MONGO_COLLECTION)
            .load()
        )

        to_drop = [c for c in df.columns if c in _DROP_COLS]
        if to_drop:
            df = df.drop(*to_drop)

        print(f"✓ Spark DataFrame loaded: {df.count()} rows, {len(df.columns)} columns")
        return df

    except Exception as e:
        print(f"✗ Error connecting to MongoDB: {e}")
        raise


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
