from pyspark.sql import functions as F

# Calcul de la densité scolaire : nombre d'écoles primaires, collèges et lycées pour 1000 habitants
def school_density(df):
    total = (
        F.col('nb_ecoles_primaires_publiques')
        + F.col('nb_ecoles_primaires_privees')
        + F.col('nb_colleges_publics')
        + F.col('nb_colleges_prives')
        + F.col('nb_lycees_publics')
        + F.col('nb_lycees_prives')
    )

    return df.withColumn(
        "densite_scolaire",
        F.when(F.col("nb_habitant") > 0, F.round(total * 1000 / F.col("nb_habitant"), 2))
        .otherwise(0)
    )

# Calcul de densité de la petite enfance pour 1000 habitants
def childcare_density(df):
    nb_creches = df['nb_creches']
    nb_maternelles = df['nb_ecoles_maternelles_publiques'] + df['nb_ecoles_maternelles_privees']
    
    return df.withColumn(
        "densite_pour_enfants", 
        F.when(F.col("nb_habitant") > 0, F.round((nb_creches + nb_maternelles) / F.col("nb_habitant") * 1000, 2))
        .otherwise(0)
    )


# Calcul du ratio d'école privée 
def private_school_ratio(df):
    nb_private_school = df['nb_ecoles_maternelles_privees'] + df['nb_ecoles_primaires_privees'] + df['nb_colleges_prives'] + df['nb_lycees_prives']
    nb_school = nb_private_school + df['nb_ecoles_maternelles_publiques'] + df['nb_ecoles_primaires_publiques'] + df['nb_colleges_publics'] + df['nb_lycees_publics'] 
    
    return df.withColumn(
        "ratio_prive_school", 
        F.when(nb_school > 0, F.round(nb_private_school / nb_school, 2))
        .otherwise(0)
    )

