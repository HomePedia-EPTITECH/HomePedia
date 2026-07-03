from pyspark.sql import functions as F
from pyspark.sql.types import IntegerType, DoubleType
from jobs.cleaning.cleaning_jobs import apply_schema, filter_low_reviews, filter_price_outliers
from schema import COLUMN_SCHEMA

# Colonnes déclarées dans COLUMN_SCHEMA mais absentes du DataFrame Mongo (champ
# trop rare pour être vu par l'échantillonnage de schéma du connecteur Mongo
# Spark, ex: nb_cancerologues présent dans <1% des documents) alors que la
# colonne PostgreSQL correspondante est NOT NULL → valeur par défaut 0 / 0.0
_DEFAULT_ZERO_TYPES = {"int": IntegerType(), "float": DoubleType()}

def run_pipeline(df):
    df = apply_schema(df)
    for col_name, (col_type, _) in COLUMN_SCHEMA.items():
        if col_name not in df.columns and col_type in _DEFAULT_ZERO_TYPES:
            df = df.withColumn(col_name, F.lit(0).cast(_DEFAULT_ZERO_TYPES[col_type]))
    df = filter_low_reviews(df)
    df = filter_price_outliers(df)
    return df
