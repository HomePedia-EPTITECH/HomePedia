from pyspark.sql import DataFrame, functions as F

# Score composite de qualité de vie (moyenne pondérée des notes)
def quality_of_life(df):
    return df.withColumn("score_qualite_vie_calculate",
        F.round(
            (F.col("note_securite") * 0.25 +
            F.col("note_transports") * 0.20 +
            F.col("note_ecoles") * 0.20 +
            F.col("note_proprete") * 0.15 +
            F.col("note_commerces") * 0.10 +
            F.col("note_espaces_verts") * 0.10)
        )
)
