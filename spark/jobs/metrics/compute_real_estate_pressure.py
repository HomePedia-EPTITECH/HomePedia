from pyspark.sql import functions as F


def compute_real_estate_pressure(df):
    """
    Approxime la tension immobilière:
    nombre d'années de revenu moyen nécessaires pour acheter 30 m².

    Le revenu moyen disponible dans le dataset est annuel.
    """
    prix_m2_moyen = (F.col("prix_m2_maison") + F.col("prix_m2_appartement")) / 2

    return df.withColumn("prix_m2_moyen", F.round(prix_m2_moyen, 2)).withColumn(
        "annees_salaire_30m2",
        F.when(
            F.col("revenu_moyen") > 0,
            F.round((F.col("prix_m2_moyen") * 30) / F.col("revenu_moyen"), 4),
        ).otherwise(F.lit(0.0)),
    )
