from pyspark.sql import DataFrame, functions as F
from pyspark.sql.types import IntegerType, DoubleType
from schema import COLUMN_SCHEMA


def apply_schema(df: DataFrame) -> DataFrame:
    for col_name, (_, transform) in COLUMN_SCHEMA.items():
        if col_name not in df.columns:
            continue
        c = F.col(col_name)
        if transform == "digits":
            cleaned = F.regexp_replace(c, r"[^\d]", "")
            df = df.withColumn(col_name,
                F.when((cleaned == "") | cleaned.isNull(), F.lit(None).cast(IntegerType()))
                .otherwise(cleaned.cast(IntegerType()))
            )
        elif transform == "percent":
            cleaned = F.regexp_replace(F.regexp_replace(c, ",", "."), r"[^\d.]", "")
            df = df.withColumn(col_name,
                F.when((cleaned == "") | cleaned.isNull(), F.lit(None).cast(DoubleType()))
                .otherwise(cleaned.cast(DoubleType()))
            )
        elif transform == "strip":
            df = df.withColumn(col_name,
                F.when(F.trim(c) == "", F.lit(None)).otherwise(F.trim(c))
            )
        elif transform == "round":
            df = df.withColumn(col_name, F.round(c.cast(DoubleType())).cast(IntegerType()))
    return df


def filter_low_reviews(df: DataFrame) -> DataFrame:
    return df.filter(F.col("nb_avis") >= 2)


def filter_price_outliers(df: DataFrame) -> DataFrame:
    return df.filter(
        F.col("prix_m2_appartement").isNotNull()
        & F.col("prix_m2_maison").isNotNull()
        & (F.col("prix_m2_appartement") > 500) & (F.col("prix_m2_appartement") < 30000)
        & (F.col("prix_m2_maison") > 500) & (F.col("prix_m2_maison") < 30000)
    )
