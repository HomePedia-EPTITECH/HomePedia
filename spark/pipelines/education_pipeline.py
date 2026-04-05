from jobs.education.education_job import (school_density, childcare_density, private_school_ratio)

def run_pipeline(df):
    
    df = school_density(df)
    df = childcare_density(df)
    df = private_school_ratio(df)
    return df
    