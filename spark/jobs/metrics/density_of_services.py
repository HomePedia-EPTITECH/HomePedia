from pyspark.sql import functions as F


def density_of_services(df):
    """Calcule une densité simple de services pour 1000 habitants."""
    return df.withColumn(
        "equipements_par_1000hab",
        F.when(
            F.col("nb_habitant") > 0,
            F.round((F.col("nb_equipements") / F.col("nb_habitant")) * 1000, 2),
        ).otherwise(F.lit(0.0)),
    )
