from jobs.geo.geo_job import aggregate_commune_coordinates
from utils.session import load_real_estate_history


def run_pipeline(spark, df):
    # Signature différente des autres pipelines (besoin de `spark` pour
    # relire une 2e collection Mongo en plus du DataFrame principal)
    geo_df = aggregate_commune_coordinates(load_real_estate_history(spark))
    # Le df de base peut déjà porter latitude/longitude (ex. communes seedées) :
    # on les retire avant la jointure pour éviter des colonnes dupliquées
    # (AMBIGUOUS_REFERENCE). Les coords agrégées depuis DVF font foi.
    df = df.drop("latitude", "longitude")
    return df.join(geo_df, on="com", how="left")
