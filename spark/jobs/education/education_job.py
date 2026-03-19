from pyspark.sql import functions as F

# Calcul de la densité scolaire : nombre d'écoles primaires, collèges et lycées pour 1000 habitants
def school_density(df):
    nb_ecoles_primaires = df['nb_ecoles_primaires_publiques'] + df['nb_ecoles_primaires_privees']
    nb_colleges = df['nb_colleges_publics'] + df['nb_colleges_prives']
    nb_lycees = df['nb_lycees_publics'] + df['nb_lycees_prives']

    return df.withColumn("densite_scolaire", (nb_ecoles_primaires + nb_colleges + nb_lycees) / df['nb_habitant'] * 1000)

# Calcul de densité de la petite enfance pour 1000 habitants
def childcare_density(df):
    nb_creches = df['nb_creches']
    nb_maternelles = df['nb_ecoles_maternelles_publiques'] + df['nb_ecoles_maternelles_privees']

    return df.withColumn("densite_pour_enfants", (nb_creches + nb_maternelles) / df['nb_habitant'] * 1000)

# Calcul du ratio d'école privée 
def private_school_ratio(df):
    nb_private_school = df['nb_ecoles_maternelles_privees'] + df['nb_ecoles_primaires_privees'] + df['nb_colleges_prives'] + df['nb_lycees_prives']
    nb_school = nb_private_school + df['nb_ecoles_maternelles_publiques'] + df['nb_ecoles_primaires_publiques'] + df['nb_colleges_publics'] + df['nb_lycees_publics'] 
    

    return df.withColumn("ratio_prive_school", nb_private_school / nb_school)

