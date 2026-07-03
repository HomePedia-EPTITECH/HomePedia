from pyspark.sql import functions as F


def _col(df, name):
    """Retourne la colonne si elle existe, sinon 0."""
    return F.col(name) if name in df.columns else F.lit(0)


def school_density(df):
    total = (
        _col(df, 'nb_ecoles_primaires_publiques')
        + _col(df, 'nb_ecoles_primaires_privees')
        + _col(df, 'nb_colleges_publics')
        + _col(df, 'nb_colleges_prives')
        + _col(df, 'nb_lycees_publics')
        + _col(df, 'nb_lycees_prives')
    )
    return df.withColumn(
        "densite_scolaire",
        F.when(F.col("nb_habitant") > 0, F.round(total * 1000 / F.col("nb_habitant"), 2))
        .otherwise(0)
    )


def childcare_density(df):
    total = (
        _col(df, 'nb_creches')
        + _col(df, 'nb_ecoles_maternelles_publiques')
        + _col(df, 'nb_ecoles_maternelles_privees')
    )
    return df.withColumn(
        "densite_pour_enfants",
        F.when(F.col("nb_habitant") > 0, F.round(total / F.col("nb_habitant") * 1000, 2))
        .otherwise(0)
    )


def private_school_ratio(df):
    nb_private = (
        _col(df, 'nb_ecoles_maternelles_privees')
        + _col(df, 'nb_ecoles_primaires_privees')
        + _col(df, 'nb_colleges_prives')
        + _col(df, 'nb_lycees_prives')
    )
    nb_total = nb_private + (
        _col(df, 'nb_ecoles_maternelles_publiques')
        + _col(df, 'nb_ecoles_primaires_publiques')
        + _col(df, 'nb_colleges_publics')
        + _col(df, 'nb_lycees_publics')
    )
    return df.withColumn(
        "ratio_prive_school",
        F.when(nb_total > 0, F.round(nb_private / nb_total, 2))
        .otherwise(0)
    )
