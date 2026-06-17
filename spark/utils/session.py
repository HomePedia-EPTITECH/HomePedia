import os

from pyspark.sql import SparkSession
from pyspark.sql.functions import col, coalesce, when, cast, trim, regexp_replace
from pyspark.sql.types import IntegerType
from pyspark.sql import functions as F

# MongoDB configuration
MONGO_URI = os.getenv("MONGO_URI", "mongodb://admin:admin@localhost:27017/?authSource=admin")
MONGO_DB = os.getenv("MONGO_DB", "homepedia_raw")
MONGO_COLLECTION = os.getenv("SPARK_MONGO_COLLECTION", "communes_direct")

def get_spark():
    return (
        SparkSession.builder
        .appName("HomePedia")
        .config(
            "spark.jars.packages",
            "org.mongodb.spark:mongo-spark-connector_2.13:10.4.0,org.postgresql:postgresql:42.7.3",
        )
        .config("spark.driver.extraJavaOptions", "-Dlog4j.configuration=log4j.properties")
        .getOrCreate()
    )

def safe_cast_int(col_name):
    """
    Cast une colonne en INTEGER de manière sécurisée :
    - "" et null → null
    - "123" → 123
    - "2 434" → 2434
    - 123.45 → 123
    """
    cleaned = regexp_replace(trim(col(col_name)).cast("string"), "\\s+", "")  # Remove all spaces
    return when(
        (cleaned == "") | (cleaned.isNull()),
        None
    ).otherwise(
        cleaned.cast(IntegerType())
    ).alias(col_name)

def load_mongodb_collection(spark):
    """
    Load data from MongoDB collection and return as flattened Spark DataFrame
    """
    try:
    #     df = spark.read.format("mongodb") \
    #         .option("spark.mongodb.read.connection.uri", MONGO_URI) \
    #         .option("spark.mongodb.read.database", MONGO_DB) \
    #         .option("spark.mongodb.read.collection", MONGO_COLLECTION) \
    #         .option("spark.mongodb.read.inferSchema.sampleSize", "100000") \
    #         .option("pipeline", """
    # [
    #     {
    #         "$addFields": {
    #             "metrics": {
    #                 "$arrayToObject": {
    #                     "$map": {
    #                         "input": { "$objectToArray": "$metrics" },
    #                         "as": "m",
    #                         "in": {
    #                             "k": "$$m.k",
    #                             "v": { "$toString": "$$m.v" }
    #                         }
    #                     }
    #                 }
    #             }
    #         }
    #     }
    # ]
    # """) \
    #         .load()
        df = (
    spark.read.format("mongodb")
    .option("spark.mongodb.read.connection.uri", MONGO_URI)
    .option("spark.mongodb.read.database", MONGO_DB)
    .option("spark.mongodb.read.collection", MONGO_COLLECTION)
    .option("pipeline", """
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
    """)
    .load()
)

        # df = safe_string(df, "metrics.nb_avis")
        
        # Supprimer l'_id MongoDB
        if "_id" in df.columns:
            df = df.drop("_id")

        # === Aplatir les structs ===
        # metrics_cols = [col("metrics."+c).alias(c if c != "com" else "com_reviews") for c in df.select("metrics.*").columns]
        
        metrics_cols = [safe_metric_col(c) for c in df.select("metrics.*").columns]
        real_estate_cols = [col("real_estate."+c).alias(c) for c in df.select("real_estate.*").columns]


        # Colonnes racines
        root_cols = [c for c in df.columns if c not in ["metrics","real_estate","reviews_summary"]]

        # DataFrame aplati
        df_flat = df.select(root_cols + metrics_cols + real_estate_cols)
        
        # df_flat = safe_string(df_flat, "nb_avis")
        print(df_flat.columns)
        
        # === Supprimer les doublons ===
        df_flat = df_flat.drop("com_reviews", "presentation")  # ou mettre plusieurs colonnes si nécessaire

        # === Forcer la conversion des colonnes nb_* en INTEGER ===
        for col_name in df_flat.columns:
            if col_name.startswith("nb_"):
                try:
                    df_flat = df_flat.withColumn(col_name, safe_cast_int(col_name))
                except:
                    print(f"⚠ Warning: Could not safely cast {col_name} to INT")

        print(f"✓ Spark DataFrame created with {df_flat.count()} rows and {len(df_flat.columns)} columns")
        return df_flat

    except Exception as e:
        print(f"✗ Error connecting to MongoDB: {e}")
        raise
    
def safe_string(df, col_name):
    return df.withColumn(
        col_name,
        F.when(F.col(col_name).isNull() | (F.col(col_name) == ""), None)
        .otherwise(F.col(col_name).cast("string"))
    )
    
def safe_metric_col(c):
    alias = c if c != "com" else "com_reviews"
    return (
        F.when(
            F.col(f"metrics.{c}").cast("string") == "", None
        ).otherwise(F.col(f"metrics.{c}").cast("string"))
        .alias(alias)
    )
