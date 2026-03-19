from pyspark.sql import functions as F

# Tension immobilière (prix moyen / revenu médian)
def compute_real_estate_pressure(df):
    return df.withColumn("annees_salaire_30m2",
        (F.col("prix_m2_moyen") * 30) / F.col("revenu_moyen")
)
