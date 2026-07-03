from pyspark.sql import functions as F


def price_per_sqm(df):
    return df.withColumn(
        "prix_m2_moyen",
        F.round((F.col("prix_m2_maison") + F.col("prix_m2_appartement")) / 2, 2),
    )


def housing_tension(df):
    return df.withColumn(
        "annees_salaire_30m2",
        F.when(
            F.col("revenu_moyen") > 0,
            F.round((F.col("prix_m2_moyen") * 30) / F.col("revenu_moyen"), 4),
        ).otherwise(F.lit(0.0)),
    )


def price_gap_house_apartment(df):
    return df.withColumn(
        "ecart_maison_appart",
        F.round(F.col("prix_m2_maison") - F.col("prix_m2_appartement"), 2),
    )


def owner_renter_ratio(df):
    return df.withColumn(
        "ratio_proprio_locataire",
        F.when(
            F.col("part_taux_locataires") > 0,
            F.round(
                F.col("part_taux_proprietaires") / F.col("part_taux_locataires"), 4
            ),
        ).otherwise(F.lit(0.0)),
    )


def secondary_residence_ratio(df):
    return df.withColumn(
        "ratio_residences_secondaires",
        F.when(
            F.col("part_residences_principales") > 0,
            F.round(
                F.col("part_residences_secondaires")
                / F.col("part_residences_principales"),
                4,
            ),
        ).otherwise(F.lit(0.0)),
    )


def house_premium(df):
    return df.withColumn(
        "prime_maison",
        F.when(
            F.col("prix_m2_appartement") > 0,
            F.round(
                (
                    (F.col("prix_m2_maison") - F.col("prix_m2_appartement"))
                    / F.col("prix_m2_appartement")
                )
                * 100,
                2,
            ),
        ).otherwise(F.lit(0.0)),
    )
