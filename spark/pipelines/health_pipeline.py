from jobs.health.health_job import (
    dependency_score,
    maternity_score,
    medical_autonomy_score,
    medical_density,
    medical_desert_score,
    mental_health_score,
    pharmacies_per_capita,
    specialist_density,
)


def run_pipeline(df):
    df = medical_density(df)
    df = specialist_density(df)
    df = pharmacies_per_capita(df)
    df = medical_autonomy_score(df)
    df = maternity_score(df)
    df = mental_health_score(df)
    df = dependency_score(df)
    df = medical_desert_score(df)
    return df
