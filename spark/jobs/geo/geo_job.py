from pyspark.sql import functions as F


def aggregate_commune_coordinates(df):
    """Centroïde (moyenne) des transactions DVF par commune : une commune peut
    avoir plusieurs transactions à des coordonnées légèrement différentes
    (parcelle), donc on moyenne plutôt que de garder une valeur arbitraire."""
    return (
        df.filter(F.col("com").isNotNull() & F.col("latitude").isNotNull() & F.col("longitude").isNotNull())
        .groupBy("com")
        .agg(F.avg("latitude").alias("latitude"), F.avg("longitude").alias("longitude"))
    )
