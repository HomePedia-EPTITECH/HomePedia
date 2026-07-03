from pyspark.sql import functions as F


def calculate_nb_equipements(df):
    """
    Agrège un volume simple d'équipements à partir des colonnes réellement
    disponibles après nettoyage.

    Ce total sert d'indicateur intermédiaire de "présence de services" avant
    normalisation par habitant.
    """
    education = (
        F.col("nb_ecoles_maternelles_publiques")
        + F.col("nb_ecoles_maternelles_privees")
        + F.col("nb_ecoles_primaires_publiques")
        + F.col("nb_ecoles_primaires_privees")
        + F.col("nb_colleges_publics")
        + F.col("nb_colleges_prives")
        + F.col("nb_lycees_publics")
        + F.col("nb_lycees_prives")
    )

    health = (
        F.col("nb_medecins")
        + F.col("nb_pharmacies")
        + F.col("nb_hopitaux")
        + F.col("nb_laboratoires_analyses")
    )

    daily_life = (
        F.col("nb_hypermarches")
        + F.col("nb_supermarches")
        + F.col("nb_superettes")
        + F.col("nb_boulangeries")
        + F.col("nb_boucheries")
        + F.col("nb_restaurants")
        + F.col("nb_banques")
        + F.col("nb_bureaux_poste")
    )

    return df.withColumn("nb_equipements", education + health + daily_life)
