from pyspark.sql import DataFrame, functions as F
from typing import Callable

# ne pas prendre en compte les communes avec peu d'avis (moins de 10) pour éviter les biais
def filter_low_reviews(df: DataFrame) -> DataFrame:
    return df.filter(F.col("nb_avis") >= 2)


# Nettoyer les nombres avec des espaces (ex: "1 000" -> 1000) et les convertir en int
# Nettoyer les nombres avec des virgules (ex: "1,5" -> 1.5) et les convertir en float
# def clean_integer_values(df, columns):

#     for col in columns:
#         df = df.withColumn(
#             col,
#             F.coalesce(F.col(col), F.lit(0))
#         )
        
#         df = df.withColumn(
#             col,
#             F.regexp_replace(F.col(col), r"[^\d]", "").cast("int")
#         )
#     return df

# def clean_float_values(df, columns):

#     for col in columns:
        
#         df = df.withColumn(
#             col,
#             F.coalesce(F.col(col), F.lit(0.0))
#         )
        
#         df = df.withColumn(
#             col,
#             F.regexp_replace(F.col(col), ",", ".")
#         )
        
#         df = df.withColumn(
#             col,
#             F.regexp_replace(F.col(col), r"[^\d.]", "").cast("double")
#         )
#     return df


def _clean_values(df: DataFrame, columns: list, transform: Callable, default) -> DataFrame:
    dtype = "int" if isinstance(default, int) else "double"

    exprs = [F.col(c) for c in df.columns if c not in columns]
    for c in columns:
        cleaned = transform(F.col(c))
        exprs.append(
            F.coalesce(
                F.when(cleaned.isNotNull() & (cleaned != ""), cleaned.cast(dtype)),
                F.lit(default)
            ).alias(c)
        )
    return df.select(exprs)

def clean_integer_values(df: DataFrame, columns: list) -> DataFrame:
    
    if "nb_avis" in columns:
        print("=== BEFORE CLEAN nb_avis ===")
        

    result = _clean_values(
        df, columns,
        transform=lambda c: F.regexp_replace(c, r"[^\d]", ""),
        default=0
    )

    if "nb_avis" in columns:
        print("=== AFTER CLEAN nb_avis ===")
        result.select("nb_avis").show(20, False)

    return result

def clean_float_values(df: DataFrame, columns: list) -> DataFrame:
    return _clean_values(
        df, columns,
        transform=lambda c: F.regexp_replace(
            F.regexp_replace(c, ",", "."), r"[^\d.]", ""
        ),
        default=0.0
    )

# Détecter les outliers immobiliers (prix aberrants) et détecter les nulls
def filter_price_outliers(df: DataFrame) -> DataFrame:
    return df.filter(
        F.col("prix_m2_appartement").isNotNull()
        & F.col("prix_m2_maison").isNotNull()
        & (F.col("prix_m2_appartement") > 500) & (F.col("prix_m2_appartement") < 30000) 
        & (F.col("prix_m2_maison") > 500) & (F.col("prix_m2_maison") < 30000) 
    )