"""
upsert/split_dataframe.py

Découpe le DataFrame global (issu des pipelines) en sous-DataFrames
correspondant à chaque table PostgreSQL.

Adapte les listes de colonnes si tes noms diffèrent après transformation.
"""

from pyspark.sql import DataFrame

    # "region": ["numero_region", "nom"],
    # "departement": ["numero_departement", "nom"],
    # "metropole": ["id", "nom"],
    # "commune": ["com", "nom", "code_postal", "departement_id", "metropole_id", "maire"],

# Colonnes attendues par table (doivent correspondre à ton schéma PostgreSQL)
TABLE_COLUMNS = {

    "commune": ["commune_id", "nom", "code_postal", "maire"],

    "education": [
        "commune_id",
        "nb_creches", "nb_ecoles_maternelles_publiques", "nb_ecoles_maternelles_privees",
        "nb_ecoles_primaires_publiques", "nb_ecoles_primaires_privees",
        "nb_colleges_publiques", "nb_colleges_privees",
        "nb_lycees_publiques", "nb_lycees_privees",
    ],

    "sante": [
        "commune_id",
        "nb_pharmacies", "nb_hopitaux", "nb_laboratoires_analyses",
        "nb_etablissement_handicapes", "nb_ehpa", "nb_medecins", "nb_dentistes",
        "nb_chirurgiens", "nb_dermatologues", "nb_anesthesistes", "nb_gastroenterologues",
        "nb_gynecologues", "nb_cancerologues", "nb_neurologues", "nb_ophtalmologues",
        "nb_orl", "nb_cardiologues", "nb_pediatres", "nb_pneumologues",
        "nb_psychologues", "nb_radiologues", "nb_rhumatologues", "nb_sages_femmes",
    ],

    "commerces": [
        "commune_id",
        "nb_hypermarches", "nb_supermarches", "nb_superettes", "nb_boulangeries",
        "nb_boucheries", "nb_restaurants", "nb_garages", "nb_stations_services",
        "nb_banques", "nb_bureaux_poste", "nb_coiffeurs", "nb_tabacs",
        "nb_bars_discotheques", "nb_bibliotheques", "nb_cinema", "nb_veterinaires",
    ],

    "demographie": [
        "commune_id",
        "population", "age_moyen", "pop_active", "taux_chomage", "densite",
        "revenu_moyen", "superficie",
        "part_0_14_ans", "part_15_29_ans", "part_30_44_ans", "part_45_59_ans",
        "part_60_74_ans", "part_75_89_ans", "part_90_plus",
        "part_cadres", "part_retraites", "part_employes", "part_ouvriers",
        "part_sans_diplome", "part_bac5_plus",
        "part_couple_avec_enfants", "part_personnes_seules",
    ],

    "scores": [
        "commune_id",
        "score_securite", "score_education", "score_loisirs",
        "score_environnement", "score_vie_pratique", "score_globale",
    ],

    "securite": [
        "commune_id",
        "agressions", "cambriolages", "vols_degradations", "stupefiants",
    ],

    "immobilier": [
        "commune_id",
        "prix_m2_maison", "prix_m2_appartement",
        "part_taux_proprietaires", "part_taux_locataires",
        "part_residences_principales", "part_residences_secondaires",
    ],

    "salaire": [
        "commune_id",
        "salaire_net_mensuel_moyen_cadre", "salaire_net_mensuel_moyen_prof_intermediaire",
        "salaire_net_mensuel_moyen_employe", "salaire_net_mensuel_moyen_ouvrier",
        "salaire_net_mensuel_moyen_total",
    ],
}

# Mapping optionnel : si vos colonnes sources ont des noms différents, mapez-les ici
# Clé = nom attendu (dans TABLE_COLUMNS), Valeur = nom dans votre dataframe source
COLUMN_RENAMING = {
    "commune_id" : "com",
    "nom": "nom_commune",
    "maire": "nom_maire",   # Renommez "nom_maire" en "maire"
    "nb_colleges_publiques": "nb_colleges_publics",
    "nb_colleges_privees" : "nb_colleges_prives", 
    "nb_lycees_publiques" : "nb_lycees_publics", 
    "nb_lycees_privees" : "nb_lycees_prives", 
    "nb_etablissement_handicapes" : "nb_etablissements_handicapes",
    "nb_cinema" : "nb_cinemas",
    "nb_stations_services" : "nb_stations_service",
    "population" : "nb_habitant",
    "densite" : "pop_densite",
    "superficie" : "superficie_km2",
    "part_couple_avec_enfants" : "part_couple_avec_enfant",
    "score_globale" : "note_moyenne_globale"
}


def split_by_table(df: DataFrame, rename_map: dict = None) -> dict[str, DataFrame]:
    """
    Retourne un dict { nom_table: DataFrame } avec uniquement
    les colonnes nécessaires à chaque table.
    
    Args:
        df: DataFrame Spark
        rename_map: Dict optionnel { colonne_attendue: colonne_source } pour renommer
    """
    # Utiliser le mapping global si aucun n'est fourni
    if rename_map is None:
        rename_map = COLUMN_RENAMING
    
    # Renommer les colonnes si nécessaire
    if rename_map:
        for target_col, source_col in rename_map.items():
            if source_col in df.columns:
                df = df.withColumnRenamed(source_col, target_col)
    
    result = {}
    available = set(df.columns)

    for table, cols in TABLE_COLUMNS.items():
        missing = [c for c in cols if c not in available]
        if missing:
            raise ValueError(
                f"[split_by_table] Colonnes manquantes pour '{table}' : {missing}\n"
                f"Colonnes disponibles : {sorted(available)}"
            )
        result[table] = df.select(cols)

    return result