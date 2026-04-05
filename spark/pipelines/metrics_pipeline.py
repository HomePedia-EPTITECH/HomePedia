from jobs.metrics import calculate_nb_equipements, density_of_services, compute_real_estate_pressure, normalize_real_estate_pressure, quality_of_life



# jobs


def run_pipeline(df):
    # df = quality_of_life(df)
    df = calculate_nb_equipements(df)
    df = density_of_services(df)
    df = compute_real_estate_pressure(df)
    df = normalize_real_estate_pressure(df)
    return df
