from pyspark.sql import functions as F


def quality_of_life(df):
    """
    Score composite de qualité de vie basé sur les notes agrégées réellement
    disponibles dans le dataset nettoyé.
    """
    weighted_score = (
        F.col("score_environnement") * F.lit(0.30)
        + F.col("score_vie_pratique") * F.lit(0.25)
        + F.col("score_loisirs") * F.lit(0.20)
        + F.col("score_education") * F.lit(0.15)
        + F.col("score_securite") * F.lit(0.10)
    )

    return df.withColumn("score_qualite_vie_calcule", F.round(weighted_score, 2))
