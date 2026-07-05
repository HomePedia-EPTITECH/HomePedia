"""Split the cleaned Spark DataFrame into Postgres table-shaped DataFrames."""

from __future__ import annotations

from pyspark.sql import DataFrame, Window, functions as F

from reference.french_geo_reference import (
    DEPARTMENT_CODE_TO_REGION_CODE,
    build_official_department_df,
    build_official_region_df,
    REGION_CODE_TO_NAME,
)


TABLE_COLUMNS = {
    "region": ["numero_region", "nom"],
    "departement": ["numero_departement", "nom", "region_id"],
    "metropole": ["id", "nom"],
    "commune": [
        "commune_id",
        "nom",
        "code_postal",
        "departement_id",
        "metropole_id",
        "maire",
        "latitude",
        "longitude",
    ],
    "education": [
        "commune_id",
        "nb_creches",
        "nb_ecoles_maternelles_publiques",
        "nb_ecoles_maternelles_privees",
        "nb_ecoles_primaires_publiques",
        "nb_ecoles_primaires_privees",
        "nb_colleges_publiques",
        "nb_colleges_privees",
        "nb_lycees_publiques",
        "nb_lycees_privees",
    ],
    "sante": [
        "commune_id",
        "nb_pharmacies",
        "nb_hopitaux",
        "nb_laboratoires_analyses",
        "nb_etablissement_handicapes",
        "nb_ehpa",
        "nb_medecins",
        "nb_dentistes",
        "nb_chirurgiens",
        "nb_dermatologues",
        "nb_anesthesistes",
        "nb_gastroenterologues",
        "nb_gynecologues",
        "nb_cancerologues",
        "nb_neurologues",
        "nb_ophtalmologues",
        "nb_orl",
        "nb_cardiologues",
        "nb_pediatres",
        "nb_pneumologues",
        "nb_psychologues",
        "nb_radiologues",
        "nb_rhumatologues",
        "nb_sages_femmes",
    ],
    "commerces": [
        "commune_id",
        "nb_hypermarches",
        "nb_supermarches",
        "nb_superettes",
        "nb_boulangeries",
        "nb_boucheries",
        "nb_restaurants",
        "nb_garages",
        "nb_stations_services",
        "nb_banques",
        "nb_bureaux_poste",
        "nb_coiffeurs",
        "nb_tabacs",
        "nb_bars_discotheques",
        "nb_bibliotheques",
        "nb_cinema",
        "nb_veterinaires",
    ],
    "demographie": [
        "commune_id",
        "population",
        "age_moyen",
        "pop_active",
        "taux_chomage",
        "densite",
        "revenu_moyen",
        "superficie",
        "part_0_14_ans",
        "part_15_29_ans",
        "part_30_44_ans",
        "part_45_59_ans",
        "part_60_74_ans",
        "part_75_89_ans",
        "part_90_plus",
        "part_cadres",
        "part_retraites",
        "part_employes",
        "part_ouvriers",
        "part_sans_diplome",
        "part_bac5_plus",
        "part_couple_avec_enfants",
        "part_personnes_seules",
    ],
    "scores": [
        "commune_id",
        "score_securite",
        "score_education",
        "score_loisirs",
        "score_environnement",
        "score_vie_pratique",
        "score_globale",
    ],
    "securite": [
        "commune_id",
        "agressions",
        "cambriolages",
        "vols_degradations",
        "stupefiants",
    ],
    "immobilier": [
        "commune_id",
        "prix_m2_maison",
        "prix_m2_appartement",
        "part_taux_proprietaires",
        "part_taux_locataires",
        "part_residences_principales",
        "part_residences_secondaires",
    ],
    "salaire": [
        "commune_id",
        "salaire_net_mensuel_moyen_cadre",
        "salaire_net_mensuel_moyen_prof_intermediaire",
        "salaire_net_mensuel_moyen_employe",
        "salaire_net_mensuel_moyen_ouvrier",
        "salaire_net_mensuel_moyen_total",
    ],
}

COLUMN_RENAMING = {
    "commune_id": "com",
    "nom": "nom_commune",
    "maire": "nom_maire",
    "nb_colleges_publiques": "nb_colleges_publics",
    "nb_colleges_privees": "nb_colleges_prives",
    "nb_lycees_publiques": "nb_lycees_publics",
    "nb_lycees_privees": "nb_lycees_prives",
    "nb_etablissement_handicapes": "nb_etablissements_handicapes",
    "nb_cinema": "nb_cinemas",
    "nb_stations_services": "nb_stations_service",
    "population": "nb_habitant",
    "densite": "pop_densite",
    "superficie": "superficie_km2",
    "part_couple_avec_enfants": "part_couple_avec_enfant",
    "score_globale": "note_moyenne_globale",
}


def _literal_map(mapping: dict[str, str]) -> F.Column:
    items = []
    for key, value in mapping.items():
        items.extend([F.lit(key), F.lit(value)])
    return F.create_map(*items)


def _ensure_string_columns(df: DataFrame, columns: list[str]) -> DataFrame:
    for column in columns:
        if column in df.columns:
            df = df.withColumn(column, F.col(column).cast("string"))
    return df


def _ensure_optional_string_column(df: DataFrame, column: str) -> DataFrame:
    if column not in df.columns:
        return df.withColumn(column, F.lit(None).cast("string"))
    return df.withColumn(column, F.col(column).cast("string"))


def _normalize_geo_columns(df: DataFrame) -> tuple[DataFrame, DataFrame]:
    df = _ensure_string_columns(
        df,
        [
            "commune_id",
            "nom",
            "code_postal",
            "maire",
            "nom_region",
            "nom_departement",
            "nom_metropole",
        ],
    )
    df = _ensure_optional_string_column(df, "nom_departement")
    df = _ensure_optional_string_column(df, "nom_metropole")

    commune_code = F.upper(F.col("commune_id"))
    df = df.withColumn(
        "departement_id",
        F.when(commune_code.isNull(), F.lit(None).cast("string"))
        .when(commune_code.startswith("2A") | commune_code.startswith("2B"), F.substring(commune_code, 1, 2))
        .when(commune_code.startswith("97"), F.substring(commune_code, 1, 3))
        .otherwise(F.substring(commune_code, 1, 2)),
    )

    df = df.withColumn("region_id", F.element_at(_literal_map(DEPARTMENT_CODE_TO_REGION_CODE), F.col("departement_id")))
    df = df.withColumn("region", F.element_at(_literal_map(REGION_CODE_TO_NAME), F.col("region_id")))
    df = df.withColumn("departement", F.col("nom_departement"))

    metropole_df = (
        df.select(F.col("nom_metropole").alias("nom"))
        .where(F.col("nom").isNotNull() & (F.trim(F.col("nom")) != ""))
        .dropDuplicates()
        .orderBy("nom")
        .withColumn("id", F.row_number().over(Window.orderBy("nom")))
    )
    metropole_lookup = metropole_df.select(
        F.col("nom").alias("nom_metropole"),
        F.col("id").alias("metropole_lookup_id"),
    )
    df = df.join(metropole_lookup, on="nom_metropole", how="left")
    if "metropole_id" in df.columns:
        df = df.withColumn(
            "metropole_id",
            F.coalesce(F.col("metropole_id"), F.col("metropole_lookup_id")),
        )
    else:
        df = df.withColumn("metropole_id", F.col("metropole_lookup_id"))
    df = df.drop("metropole_lookup_id")

    return df, metropole_df


def split_by_table(df: DataFrame, rename_map: dict = None) -> dict[str, DataFrame]:
    """Return one DataFrame per PostgreSQL table."""
    if rename_map is None:
        rename_map = COLUMN_RENAMING

    for target_col, source_col in rename_map.items():
        if source_col in df.columns:
            df = df.withColumnRenamed(source_col, target_col)

    df, metropole_df = _normalize_geo_columns(df)
    available = set(df.columns)
    result: dict[str, DataFrame] = {}

    for table, cols in TABLE_COLUMNS.items():
        missing = [c for c in cols if c not in available and table not in {"region", "departement", "metropole"}]
        if missing:
            raise ValueError(
                f"[split_by_table] Colonnes manquantes pour '{table}' : {missing}\n"
                f"Colonnes disponibles : {sorted(available)}"
            )

        if table == "region":
            result[table] = build_official_region_df(df.sparkSession)
            continue

        if table == "departement":
            result[table] = build_official_department_df(df.sparkSession)
            continue

        if table == "metropole":
            result[table] = metropole_df
            continue

        result[table] = df.select(cols)

    return result
