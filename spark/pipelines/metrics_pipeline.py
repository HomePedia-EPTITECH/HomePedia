from jobs.metrics import (
    calculate_nb_equipements,
    density_of_services,
    compute_real_estate_pressure,
    normalize_real_estate_pressure,
    quality_of_life,
)
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
from jobs.real_estate.real_estate_job import (
    house_premium,
    owner_renter_ratio,
    price_gap_house_apartment,
    price_per_sqm,
    secondary_residence_ratio,
)


def run_pipeline(df):
    df = quality_of_life(df)
    df = price_per_sqm(df)
    df = price_gap_house_apartment(df)
    df = owner_renter_ratio(df)
    df = secondary_residence_ratio(df)
    df = house_premium(df)
    df = calculate_nb_equipements(df)
    df = density_of_services(df)
    df = compute_real_estate_pressure(df)
    df = normalize_real_estate_pressure(df)
    df = medical_density(df)
    df = specialist_density(df)
    df = pharmacies_per_capita(df)
    df = medical_autonomy_score(df)
    df = maternity_score(df)
    df = mental_health_score(df)
    df = dependency_score(df)
    df = medical_desert_score(df)
    return df
