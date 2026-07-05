"""
upsert/postgres_upsert.py

Fonctions utilitaires d'upsert + SQL par table.
"""

import logging
from contextlib import contextmanager

import psycopg2
from pyspark.sql import DataFrame
from pyspark.sql.types import IntegerType, LongType, DoubleType, FloatType

# ─────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────
# Paramètres Postgres lus depuis la config partagée (charge le .env racine :
# POSTGRES_HOST/PORT/DB/USER/PASSWORD). Évite tout port codé en dur — utile
# notamment quand le Postgres Docker est publié sur un autre port que 5432.
import os
import sys
from pathlib import Path

_SHARED_DIR = Path(__file__).resolve().parents[2] / "packages" / "shared"
if str(_SHARED_DIR) not in sys.path:
    sys.path.insert(0, str(_SHARED_DIR))

try:
    from util.config import get_postgres_params

    _pg = get_postgres_params()
    PG_HOST = _pg["host"]
    PG_PORT = int(_pg["port"])
    PG_DB = _pg["db_name"]
    PG_USER = _pg["user"]
    PG_PASSWORD = _pg["password"]
except Exception:  # fallback si la config partagée n'est pas importable
    PG_HOST = os.getenv("POSTGRES_HOST", "localhost")
    PG_PORT = int(os.getenv("POSTGRES_PORT", "5433"))
    PG_DB = os.getenv("POSTGRES_DB", "homepedia")
    PG_USER = os.getenv("POSTGRES_USER", "admin")
    PG_PASSWORD = os.getenv("POSTGRES_PASSWORD", "admin")

JDBC_URL = f"jdbc:postgresql://{PG_HOST}:{PG_PORT}/{PG_DB}"

log = logging.getLogger(__name__)


# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────
@contextmanager
def pg_cursor():
    conn = psycopg2.connect(
        host=PG_HOST, port=PG_PORT, dbname=PG_DB,
        user=PG_USER, password=PG_PASSWORD,
    )
    try:
        with conn:
            with conn.cursor() as cur:
                yield cur
    finally:
        conn.close()


# Colonnes numériques légitimement NULL en PG (pas de valeur 0 par défaut à
# leur donner : commune sans transaction DVF connue != coordonnées (0, 0))
NULLABLE_COLUMNS = {
    "commune": {"latitude", "longitude", "metropole_id"},
}


def _fill_numeric_nulls(df: DataFrame, skip_columns: frozenset = frozenset()) -> DataFrame:
    """Remplace les nulls des colonnes numériques par 0 (contraintes NOT NULL en PG),
    sauf celles listées dans `skip_columns` qui sont légitimement nullable."""
    int_nulls = {
        f.name: 0 for f in df.schema.fields
        if isinstance(f.dataType, (IntegerType, LongType)) and f.name not in skip_columns
    }
    float_nulls = {
        f.name: 0.0 for f in df.schema.fields
        if isinstance(f.dataType, (DoubleType, FloatType)) and f.name not in skip_columns
    }
    if int_nulls:
        df = df.fillna(int_nulls)
    if float_nulls:
        df = df.fillna(float_nulls)
    return df


def write_to_staging(df: DataFrame, table: str) -> None:
    df = _fill_numeric_nulls(df, skip_columns=NULLABLE_COLUMNS.get(table, frozenset()))
    log.info(f"  → Staging : staging.{table} ({df.count()} lignes)")
    (
        df.write
        .format("jdbc")
        .option("url", JDBC_URL)
        .option("dbtable", f"staging.{table}")
        .option("user", PG_USER)
        .option("password", PG_PASSWORD)
        .option("driver", "org.postgresql.Driver")
        .mode("overwrite")
        .save()
    )


def run_upsert_sql(sql: str, table: str) -> None:
    log.info(f"  → Upsert  : bdd.{table}")
    with pg_cursor() as cur:
        cur.execute(sql)
        log.info(f"  ✓ {cur.rowcount} lignes affectées dans bdd.{table}")


def upsert_table(df: DataFrame, table: str, sql: str) -> None:
    log.info(f"[{table.upper()}] Début")
    write_to_staging(df, table)
    run_upsert_sql(sql, table)
    with pg_cursor() as cur:
        cur.execute(f"TRUNCATE staging.{table};")
    log.info(f"[{table.upper()}] ✓ Terminé\n")


# ─────────────────────────────────────────────
# SQL D'UPSERT PAR TABLE
# ─────────────────────────────────────────────
SQL_UPSERT = {

    "region": """
        INSERT INTO bdd.region (numero_region, nom)
        SELECT numero_region, nom FROM staging.region
        ON CONFLICT (numero_region) DO UPDATE SET
            nom = EXCLUDED.nom;
    """,

    "departement": """
        INSERT INTO bdd.departement (numero_departement, nom, region_id)
        SELECT numero_departement, nom, region_id FROM staging.departement
        ON CONFLICT (numero_departement) DO UPDATE SET
            nom = EXCLUDED.nom,
            region_id = EXCLUDED.region_id;
    """,

    "metropole": """
        INSERT INTO bdd.metropole (id, nom)
        SELECT id, nom FROM staging.metropole
        ON CONFLICT (id) DO UPDATE SET
            nom = EXCLUDED.nom;
    """,

    "commune": """
        INSERT INTO bdd.commune (
            commune_id, nom, code_postal, departement_id, metropole_id, maire, latitude, longitude
        )
        SELECT
            commune_id, nom, code_postal, departement_id, metropole_id, maire, latitude, longitude
        FROM staging.commune
        ON CONFLICT (commune_id) DO UPDATE SET
            nom            = EXCLUDED.nom,
            code_postal    = EXCLUDED.code_postal,
            departement_id = EXCLUDED.departement_id,
            metropole_id   = EXCLUDED.metropole_id,
            maire          = EXCLUDED.maire,
            latitude       = EXCLUDED.latitude,
            longitude      = EXCLUDED.longitude;
    """,

    "education": """
        INSERT INTO bdd.education (
            commune_id,
            nb_creches, nb_ecoles_maternelles_publiques, nb_ecoles_maternelles_privees,
            nb_ecoles_primaires_publiques, nb_ecoles_primaires_privees,
            nb_colleges_publiques, nb_colleges_privees,
            nb_lycees_publiques, nb_lycees_privees
        )
        SELECT
            commune_id,
            nb_creches, nb_ecoles_maternelles_publiques, nb_ecoles_maternelles_privees,
            nb_ecoles_primaires_publiques, nb_ecoles_primaires_privees,
            nb_colleges_publiques, nb_colleges_privees,
            nb_lycees_publiques, nb_lycees_privees
        FROM staging.education
        ON CONFLICT (commune_id) DO UPDATE SET
            nb_creches                      = EXCLUDED.nb_creches,
            nb_ecoles_maternelles_publiques = EXCLUDED.nb_ecoles_maternelles_publiques,
            nb_ecoles_maternelles_privees   = EXCLUDED.nb_ecoles_maternelles_privees,
            nb_ecoles_primaires_publiques   = EXCLUDED.nb_ecoles_primaires_publiques,
            nb_ecoles_primaires_privees     = EXCLUDED.nb_ecoles_primaires_privees,
            nb_colleges_publiques           = EXCLUDED.nb_colleges_publiques,
            nb_colleges_privees             = EXCLUDED.nb_colleges_privees,
            nb_lycees_publiques             = EXCLUDED.nb_lycees_publiques,
            nb_lycees_privees               = EXCLUDED.nb_lycees_privees;
    """,

    "sante": """
        INSERT INTO bdd.sante (
            commune_id,
            nb_pharmacies, nb_hopitaux, nb_laboratoires_analyses,
            nb_etablissement_handicapes, nb_ehpa, nb_medecins, nb_dentistes,
            nb_chirurgiens, nb_dermatologues, nb_anesthesistes, nb_gastroenterologues,
            nb_gynecologues, nb_cancerologues, nb_neurologues, nb_ophtalmologues,
            nb_orl, nb_cardiologues, nb_pediatres, nb_pneumologues,
            nb_psychologues, nb_radiologues, nb_rhumatologues, nb_sages_femmes
        )
        SELECT
            commune_id,
            nb_pharmacies, nb_hopitaux, nb_laboratoires_analyses,
            nb_etablissement_handicapes, nb_ehpa, nb_medecins, nb_dentistes,
            nb_chirurgiens, nb_dermatologues, nb_anesthesistes, nb_gastroenterologues,
            nb_gynecologues, nb_cancerologues, nb_neurologues, nb_ophtalmologues,
            nb_orl, nb_cardiologues, nb_pediatres, nb_pneumologues,
            nb_psychologues, nb_radiologues, nb_rhumatologues, nb_sages_femmes
        FROM staging.sante
        ON CONFLICT (commune_id) DO UPDATE SET
            nb_pharmacies               = EXCLUDED.nb_pharmacies,
            nb_hopitaux                 = EXCLUDED.nb_hopitaux,
            nb_laboratoires_analyses    = EXCLUDED.nb_laboratoires_analyses,
            nb_etablissement_handicapes = EXCLUDED.nb_etablissement_handicapes,
            nb_ehpa                     = EXCLUDED.nb_ehpa,
            nb_medecins                 = EXCLUDED.nb_medecins,
            nb_dentistes                = EXCLUDED.nb_dentistes,
            nb_chirurgiens              = EXCLUDED.nb_chirurgiens,
            nb_dermatologues            = EXCLUDED.nb_dermatologues,
            nb_anesthesistes            = EXCLUDED.nb_anesthesistes,
            nb_gastroenterologues       = EXCLUDED.nb_gastroenterologues,
            nb_gynecologues             = EXCLUDED.nb_gynecologues,
            nb_cancerologues            = EXCLUDED.nb_cancerologues,
            nb_neurologues              = EXCLUDED.nb_neurologues,
            nb_ophtalmologues           = EXCLUDED.nb_ophtalmologues,
            nb_orl                      = EXCLUDED.nb_orl,
            nb_cardiologues             = EXCLUDED.nb_cardiologues,
            nb_pediatres                = EXCLUDED.nb_pediatres,
            nb_pneumologues             = EXCLUDED.nb_pneumologues,
            nb_psychologues             = EXCLUDED.nb_psychologues,
            nb_radiologues              = EXCLUDED.nb_radiologues,
            nb_rhumatologues            = EXCLUDED.nb_rhumatologues,
            nb_sages_femmes             = EXCLUDED.nb_sages_femmes;
    """,

    "commerces": """
        INSERT INTO bdd.commerces (
            commune_id,
            nb_hypermarches, nb_supermarches, nb_superettes, nb_boulangeries,
            nb_boucheries, nb_restaurants, nb_garages, nb_stations_services,
            nb_banques, nb_bureaux_poste, nb_coiffeurs, nb_tabacs,
            nb_bars_discotheques, nb_bibliotheques, nb_cinema, nb_veterinaires
        )
        SELECT
            commune_id,
            nb_hypermarches, nb_supermarches, nb_superettes, nb_boulangeries,
            nb_boucheries, nb_restaurants, nb_garages, nb_stations_services,
            nb_banques, nb_bureaux_poste, nb_coiffeurs, nb_tabacs,
            nb_bars_discotheques, nb_bibliotheques, nb_cinema, nb_veterinaires
        FROM staging.commerces
        ON CONFLICT (commune_id) DO UPDATE SET
            nb_hypermarches      = EXCLUDED.nb_hypermarches,
            nb_supermarches      = EXCLUDED.nb_supermarches,
            nb_superettes        = EXCLUDED.nb_superettes,
            nb_boulangeries      = EXCLUDED.nb_boulangeries,
            nb_boucheries        = EXCLUDED.nb_boucheries,
            nb_restaurants       = EXCLUDED.nb_restaurants,
            nb_garages           = EXCLUDED.nb_garages,
            nb_stations_services = EXCLUDED.nb_stations_services,
            nb_banques           = EXCLUDED.nb_banques,
            nb_bureaux_poste     = EXCLUDED.nb_bureaux_poste,
            nb_coiffeurs         = EXCLUDED.nb_coiffeurs,
            nb_tabacs            = EXCLUDED.nb_tabacs,
            nb_bars_discotheques = EXCLUDED.nb_bars_discotheques,
            nb_bibliotheques     = EXCLUDED.nb_bibliotheques,
            nb_cinema            = EXCLUDED.nb_cinema,
            nb_veterinaires      = EXCLUDED.nb_veterinaires;
    """,

    "demographie": """
        INSERT INTO bdd.demographie (
            commune_id,
            population, age_moyen, pop_active, taux_chomage, densite,
            revenu_moyen, superficie,
            part_0_14_ans, part_15_29_ans, part_30_44_ans, part_45_59_ans,
            part_60_74_ans, part_75_89_ans, part_90_plus,
            part_cadres, part_retraites, part_employes, part_ouvriers,
            part_sans_diplome, part_bac5_plus,
            part_couple_avec_enfants, part_personnes_seules
        )
        SELECT
            commune_id,
            population, age_moyen, pop_active, taux_chomage, densite,
            revenu_moyen, superficie,
            part_0_14_ans, part_15_29_ans, part_30_44_ans, part_45_59_ans,
            part_60_74_ans, part_75_89_ans, part_90_plus,
            part_cadres, part_retraites, part_employes, part_ouvriers,
            part_sans_diplome, part_bac5_plus,
            part_couple_avec_enfants, part_personnes_seules
        FROM staging.demographie
        ON CONFLICT (commune_id) DO UPDATE SET
            population               = EXCLUDED.population,
            age_moyen                = EXCLUDED.age_moyen,
            pop_active               = EXCLUDED.pop_active,
            taux_chomage             = EXCLUDED.taux_chomage,
            densite                  = EXCLUDED.densite,
            revenu_moyen             = EXCLUDED.revenu_moyen,
            superficie               = EXCLUDED.superficie,
            part_0_14_ans            = EXCLUDED.part_0_14_ans,
            part_15_29_ans           = EXCLUDED.part_15_29_ans,
            part_30_44_ans           = EXCLUDED.part_30_44_ans,
            part_45_59_ans           = EXCLUDED.part_45_59_ans,
            part_60_74_ans           = EXCLUDED.part_60_74_ans,
            part_75_89_ans           = EXCLUDED.part_75_89_ans,
            part_90_plus             = EXCLUDED.part_90_plus,
            part_cadres              = EXCLUDED.part_cadres,
            part_retraites           = EXCLUDED.part_retraites,
            part_employes            = EXCLUDED.part_employes,
            part_ouvriers            = EXCLUDED.part_ouvriers,
            part_sans_diplome        = EXCLUDED.part_sans_diplome,
            part_bac5_plus           = EXCLUDED.part_bac5_plus,
            part_couple_avec_enfants = EXCLUDED.part_couple_avec_enfants,
            part_personnes_seules    = EXCLUDED.part_personnes_seules;
    """,

    "scores": """
        INSERT INTO bdd.scores (
            commune_id,
            score_securite, score_education, score_loisirs,
            score_environnement, score_vie_pratique, score_globale
        )
        SELECT
            commune_id,
            score_securite, score_education, score_loisirs,
            score_environnement, score_vie_pratique, score_globale
        FROM staging.scores
        ON CONFLICT (commune_id) DO UPDATE SET
            score_securite      = EXCLUDED.score_securite,
            score_education     = EXCLUDED.score_education,
            score_loisirs       = EXCLUDED.score_loisirs,
            score_environnement = EXCLUDED.score_environnement,
            score_vie_pratique  = EXCLUDED.score_vie_pratique,
            score_globale       = EXCLUDED.score_globale;
    """,

    "securite": """
        INSERT INTO bdd.securite (commune_id, agressions, cambriolages, vols_degradations, stupefiants)
        SELECT commune_id, agressions, cambriolages, vols_degradations, stupefiants
        FROM staging.securite
        ON CONFLICT (commune_id) DO UPDATE SET
            agressions        = EXCLUDED.agressions,
            cambriolages      = EXCLUDED.cambriolages,
            vols_degradations = EXCLUDED.vols_degradations,
            stupefiants       = EXCLUDED.stupefiants;
    """,

    "immobilier": """
        INSERT INTO bdd.immobilier (
            commune_id,
            prix_m2_maison, prix_m2_appartement,
            part_taux_proprietaires, part_taux_locataires,
            part_residences_principales, part_residences_secondaires
        )
        SELECT
            commune_id,
            prix_m2_maison, prix_m2_appartement,
            part_taux_proprietaires, part_taux_locataires,
            part_residences_principales, part_residences_secondaires
        FROM staging.immobilier
        ON CONFLICT (commune_id) DO UPDATE SET
            prix_m2_maison              = EXCLUDED.prix_m2_maison,
            prix_m2_appartement         = EXCLUDED.prix_m2_appartement,
            part_taux_proprietaires     = EXCLUDED.part_taux_proprietaires,
            part_taux_locataires        = EXCLUDED.part_taux_locataires,
            part_residences_principales = EXCLUDED.part_residences_principales,
            part_residences_secondaires = EXCLUDED.part_residences_secondaires;
    """,

    "salaire": """
        INSERT INTO bdd.salaire (
            commune_id,
            salaire_net_mensuel_moyen_cadre, salaire_net_mensuel_moyen_prof_intermediaire,
            salaire_net_mensuel_moyen_employe, salaire_net_mensuel_moyen_ouvrier,
            salaire_net_mensuel_moyen_total
        )
        SELECT
            commune_id,
            salaire_net_mensuel_moyen_cadre, salaire_net_mensuel_moyen_prof_intermediaire,
            salaire_net_mensuel_moyen_employe, salaire_net_mensuel_moyen_ouvrier,
            salaire_net_mensuel_moyen_total
        FROM staging.salaire
        ON CONFLICT (commune_id) DO UPDATE SET
            salaire_net_mensuel_moyen_cadre              = EXCLUDED.salaire_net_mensuel_moyen_cadre,
            salaire_net_mensuel_moyen_prof_intermediaire = EXCLUDED.salaire_net_mensuel_moyen_prof_intermediaire,
            salaire_net_mensuel_moyen_employe            = EXCLUDED.salaire_net_mensuel_moyen_employe,
            salaire_net_mensuel_moyen_ouvrier            = EXCLUDED.salaire_net_mensuel_moyen_ouvrier,
            salaire_net_mensuel_moyen_total              = EXCLUDED.salaire_net_mensuel_moyen_total;
    """,
}
