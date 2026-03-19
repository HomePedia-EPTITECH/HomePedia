from pyspark.sql import functions as F

# Calcul du nombre total d'équipements pour chaque commune
def calculate_nb_equipements(df):
    return df.withColumn("nb_equipements",
        F.col("nb_ecoles_primaires") +
        F.col("nb_colleges") +
        F.col("nb_lycees") +
        F.col("nb_medecins") +
        F.col("nb_pharmacies") +
        F.col("nb_restaurants") +
        F.col("lignes_transport")
)