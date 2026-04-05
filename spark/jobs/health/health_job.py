from pyspark.sql import functions as F

def medical_density(df):
    # densite_medicale = (nb_medecins + specialistes) / population * 1000
    return

def specialist_density(df):
    # densite_specialistes = (somme_specialistes) / population * 1000
    return

def pharmacies_per_capita(df):
    # pharmacies_par_1000hab = nb_pharmacies / population * 1000
    return

def medical_autonomy_score(df):
    # score_autonomie_medicale = (nb_medecins_disponibles) / (nb_medecins_total) * 100
    return

def maternity_score(df):
    # score_maternite = gynecologues + sages_femmes + pediatres
    return

def mental_health_score(df):
    # score_sante_mentale = (nb_psychologues + nb_psychiatres) / population * 1000
    return

def dependency_score(df):
    # score_dependance = (nb_infirmiers + nb_aides_soignants) / population * 1000
    return

def medical_desert_score(df):
    # desert_medical = 1 / densite_medicale
    # Plus le score est élevé, plus la commune est considérée comme un désert médical
    return


