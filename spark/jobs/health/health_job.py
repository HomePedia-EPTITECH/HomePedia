from pyspark.sql import functions as F


def _per_1000(column):
    return F.when(
        F.col("nb_habitant") > 0, F.round(column * 1000 / F.col("nb_habitant"), 4)
    ).otherwise(F.lit(0.0))


def _specialists_total():
    return (
        F.col("nb_dentistes")
        + F.col("nb_chirurgiens")
        + F.col("nb_dermatologues")
        + F.col("nb_anesthesistes")
        + F.col("nb_gastroenterologues")
        + F.col("nb_gynecologues")
        + F.col("nb_cancerologues")
        + F.col("nb_neurologues")
        + F.col("nb_ophtalmologues")
        + F.col("nb_orl")
        + F.col("nb_cardiologues")
        + F.col("nb_pediatres")
        + F.col("nb_pneumologues")
        + F.col("nb_psychologues")
        + F.col("nb_radiologues")
        + F.col("nb_rhumatologues")
    )


def medical_density(df):
    # densite_medicale = (medecins + specialistes) / population * 1000
    return df.withColumn(
        "densite_medicale", _per_1000(F.col("nb_medecins") + _specialists_total())
    )


def specialist_density(df):
    # densite_specialistes = somme_specialistes / population * 1000
    return df.withColumn("densite_specialistes", _per_1000(_specialists_total()))


def pharmacies_per_capita(df):
    # pharmacies_par_1000hab = nb_pharmacies / population * 1000
    return df.withColumn("pharmacies_par_1000hab", _per_1000(F.col("nb_pharmacies")))


def medical_autonomy_score(df):
    # part des generalistes dans l'offre de soins totale
    total_medical = F.col("nb_medecins") + _specialists_total()
    return df.withColumn(
        "score_autonomie_medicale",
        F.when(
            total_medical > 0, F.round(F.col("nb_medecins") * 100 / total_medical, 2)
        ).otherwise(F.lit(0.0)),
    )


def maternity_score(df):
    # score_maternite = gynecologues + sages_femmes + pediatres, rapporte a la population
    return df.withColumn(
        "score_maternite",
        _per_1000(
            F.col("nb_gynecologues") + F.col("nb_sages_femmes") + F.col("nb_pediatres")
        ),
    )


def mental_health_score(df):
    # approximation sur les psychologues uniquement
    return df.withColumn("score_sante_mentale", _per_1000(F.col("nb_psychologues")))


def dependency_score(df):
    # approximation sur les structures utiles a la dependance
    return df.withColumn(
        "score_dependance",
        _per_1000(
            F.col("nb_ehpa")
            + F.col("nb_etablissements_handicapes")
            + F.col("nb_hopitaux")
        ),
    )


def medical_desert_score(df):
    # desert_medical = 1 / densite_medicale
    # plus le score est eleve, plus la commune est consideree comme un desert medical
    density = F.greatest(F.col("densite_medicale"), F.lit(0.01))
    return df.withColumn("score_desert_medical", F.round(1 / density, 4))
