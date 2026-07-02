from pyspark.sql import functions as F

# Ratio équipements / habitant (densité de services)
def density_of_services(df):
    return df.withColumn("equipements_par_1000hab",
    F.round((F.col("nb_equipements") / F.col("population")) * 1000, 2)
)