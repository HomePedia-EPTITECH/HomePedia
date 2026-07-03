"""
Test d'intégrité de la base PostgreSQL (schémas bdd/staging).

À lancer avec le container `homepedia_postgres` démarré :

    python -m unittest tests.test_database_integrity -v
"""

import unittest
from pathlib import Path

import psycopg2

from packages.shared.util import config

PROJECT_ROOT = Path(__file__).resolve().parents[1]
MIGRATIONS_DIR = PROJECT_ROOT / "packages" / "etl" / "database" / "postgres" / "migrations"

# Tables indépendantes de commune_id
STANDALONE_TABLES = ["region", "departement", "metropole"]

# Tables "domaine" : une ligne par commune, PK = commune_id, FK vers bdd.commune
DOMAIN_TABLES = [
    "education", "sante", "commerces", "demographie",
    "scores", "securite", "immobilier", "salaire",
]

ALL_BDD_TABLES = STANDALONE_TABLES + ["commune"] + DOMAIN_TABLES

# Bornes plausibles par colonne (min, max), None = pas de borne de ce côté
VALUE_RANGES = {
    "scores": {
        "score_securite": (0, 5),
        "score_education": (0, 5),
        "score_loisirs": (0, 5),
        "score_environnement": (0, 5),
        "score_vie_pratique": (0, 5),
        "score_globale": (0, 5),
    },
    "demographie": {
        "pop_active": (0, 100),
        "taux_chomage": (0, 100),
        "part_0_14_ans": (0, 100),
        "part_15_29_ans": (0, 100),
        "part_30_44_ans": (0, 100),
        "part_45_59_ans": (0, 100),
        "part_60_74_ans": (0, 100),
        "part_75_89_ans": (0, 100),
        "part_90_plus": (0, 100),
        "part_cadres": (0, 100),
        "part_retraites": (0, 100),
        "part_employes": (0, 100),
        "part_ouvriers": (0, 100),
        "part_sans_diplome": (0, 100),
        "part_bac5_plus": (0, 100),
        "part_couple_avec_enfants": (0, 100),
        "part_personnes_seules": (0, 100),
        "population": (0, None),
        "age_moyen": (0, None),
        "densite": (0, None),
        "revenu_moyen": (0, None),
        "superficie": (0, None),
    },
    "immobilier": {
        "prix_m2_maison": (500, 30000),
        "prix_m2_appartement": (500, 30000),
        "part_taux_proprietaires": (0, 100),
        "part_taux_locataires": (0, 100),
        "part_residences_principales": (0, 100),
        "part_residences_secondaires": (0, 100),
    },
    "salaire": {
        "salaire_net_mensuel_moyen_cadre": (0, None),
        "salaire_net_mensuel_moyen_prof_intermediaire": (0, None),
        "salaire_net_mensuel_moyen_employe": (0, None),
        "salaire_net_mensuel_moyen_ouvrier": (0, None),
        "salaire_net_mensuel_moyen_total": (0, None),
    },
    "securite": {
        "agressions": (0, None),
        "cambriolages": (0, None),
        "vols_degradations": (0, None),
        "stupefiants": (0, None),
    },
    # latitude/longitude sont NULL pour ~95% des communes (pas de transaction
    # DVF connue) : les requêtes `< low`/`> high` ci-dessous ignorent déjà les
    # NULL naturellement, donc aucune commune "non peuplée" ne fait échouer ce test.
    "commune": {
        "latitude": (-90, 90),
        "longitude": (-180, 180),
    },
}

# Colonnes nullable (contrairement aux autres colonnes numériques du schéma)
NULLABLE_FLOAT_COLUMNS = {
    "commune": ["latitude", "longitude"],
}

# Colonnes qui doivent être des entiers Postgres (regression test arrondi salaires)
INTEGER_COLUMNS = {
    "salaire": [
        "salaire_net_mensuel_moyen_cadre",
        "salaire_net_mensuel_moyen_prof_intermediaire",
        "salaire_net_mensuel_moyen_employe",
        "salaire_net_mensuel_moyen_ouvrier",
        "salaire_net_mensuel_moyen_total",
    ],
}

FK_CONSTRAINTS = {table: f"fk_{table}_commune" for table in DOMAIN_TABLES}
PK_CONSTRAINTS = {table: f"pk_{table}" for table in ALL_BDD_TABLES}


class DatabaseIntegrityTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        params = config.get_postgres_params()
        try:
            cls.conn = psycopg2.connect(
                host=params["host"],
                port=params["port"],
                dbname=params["db_name"],
                user=params["user"],
                password=params["password"],
                connect_timeout=3,
            )
        except psycopg2.OperationalError as exc:
            raise unittest.SkipTest(f"PostgreSQL injoignable (container lancé ?) : {exc}")

    @classmethod
    def tearDownClass(cls):
        cls.conn.close()

    def _fetchone(self, sql, params=None):
        with self.conn.cursor() as cur:
            cur.execute(sql, params)
            return cur.fetchone()

    def _fetchall(self, sql, params=None):
        with self.conn.cursor() as cur:
            cur.execute(sql, params)
            return cur.fetchall()

    # ------------------------------------------------------------------
    # 1. Migrations à jour
    # ------------------------------------------------------------------
    def test_no_pending_migrations(self):
        files = sorted(f.name for f in MIGRATIONS_DIR.iterdir() if f.suffix.lower() == ".sql")
        applied = {row[0] for row in self._fetchall("SELECT name FROM schema_migrations")}
        pending = [f for f in files if f not in applied]
        self.assertEqual(pending, [], f"Migrations non appliquées : {pending}")

    # ------------------------------------------------------------------
    # 2. Structure : schémas + tables attendues
    # ------------------------------------------------------------------
    def test_expected_schemas_exist(self):
        schemas = {row[0] for row in self._fetchall(
            "SELECT schema_name FROM information_schema.schemata"
        )}
        for expected in ("bdd", "staging"):
            self.assertIn(expected, schemas)

    def test_expected_tables_exist(self):
        for schema in ("bdd", "staging"):
            tables = {row[0] for row in self._fetchall(
                "SELECT table_name FROM information_schema.tables WHERE table_schema = %s",
                (schema,),
            )}
            for table in ALL_BDD_TABLES:
                with self.subTest(schema=schema, table=table):
                    self.assertIn(table, tables)

    # ------------------------------------------------------------------
    # 3. Contraintes PK/FK
    # ------------------------------------------------------------------
    def test_primary_keys_present(self):
        constraints = {row[0] for row in self._fetchall(
            "SELECT conname FROM pg_constraint WHERE connamespace = 'bdd'::regnamespace"
        )}
        for table, pk_name in PK_CONSTRAINTS.items():
            with self.subTest(table=table):
                self.assertIn(pk_name, constraints)

    def test_foreign_keys_present(self):
        constraints = {row[0] for row in self._fetchall(
            "SELECT conname FROM pg_constraint WHERE connamespace = 'bdd'::regnamespace"
        )}
        for table, fk_name in FK_CONSTRAINTS.items():
            with self.subTest(table=table):
                self.assertIn(fk_name, constraints)

    # ------------------------------------------------------------------
    # 4. Cohérence des volumes : comptage, orphelins, doublons
    # ------------------------------------------------------------------
    def test_domain_tables_match_commune_count(self):
        commune_count = self._fetchone("SELECT count(*) FROM bdd.commune")[0]
        self.assertGreater(commune_count, 0, "bdd.commune est vide")
        for table in DOMAIN_TABLES:
            with self.subTest(table=table):
                count = self._fetchone(f"SELECT count(*) FROM bdd.{table}")[0]
                self.assertEqual(
                    count, commune_count,
                    f"bdd.{table} a {count} lignes, attendu {commune_count} (comme bdd.commune)",
                )

    def test_no_orphan_commune_id(self):
        for table in DOMAIN_TABLES:
            with self.subTest(table=table):
                orphans = self._fetchone(f"""
                    SELECT count(*) FROM bdd.{table} t
                    WHERE NOT EXISTS (SELECT 1 FROM bdd.commune c WHERE c.commune_id = t.commune_id)
                """)[0]
                self.assertEqual(orphans, 0, f"bdd.{table} contient {orphans} commune_id orphelins")

    def test_no_duplicate_primary_keys(self):
        for table in ["commune"] + DOMAIN_TABLES:
            with self.subTest(table=table):
                total, distinct = self._fetchone(
                    f"SELECT count(*), count(DISTINCT commune_id) FROM bdd.{table}"
                )
                self.assertEqual(total, distinct, f"bdd.{table} contient des commune_id dupliqués")

    # ------------------------------------------------------------------
    # 5. Staging propre (vidée après chaque upsert)
    # ------------------------------------------------------------------
    def test_staging_tables_are_empty(self):
        for table in STANDALONE_TABLES + ["commune"] + DOMAIN_TABLES:
            with self.subTest(table=table):
                count = self._fetchone(f"SELECT count(*) FROM staging.{table}")[0]
                self.assertEqual(
                    count, 0,
                    f"staging.{table} contient {count} lignes : pipeline probablement interrompu",
                )

    # ------------------------------------------------------------------
    # 6. Plages de valeurs plausibles
    # ------------------------------------------------------------------
    def test_value_ranges(self):
        for table, columns in VALUE_RANGES.items():
            for column, (low, high) in columns.items():
                with self.subTest(table=table, column=column):
                    if low is not None:
                        bad = self._fetchone(
                            f"SELECT count(*) FROM bdd.{table} WHERE {column} < %s", (low,)
                        )[0]
                        self.assertEqual(bad, 0, f"bdd.{table}.{column} a {bad} valeur(s) < {low}")
                    if high is not None:
                        bad = self._fetchone(
                            f"SELECT count(*) FROM bdd.{table} WHERE {column} > %s", (high,)
                        )[0]
                        self.assertEqual(bad, 0, f"bdd.{table}.{column} a {bad} valeur(s) > {high}")

    def test_nullable_float_columns_are_double_and_nullable(self):
        for table, columns in NULLABLE_FLOAT_COLUMNS.items():
            for column in columns:
                with self.subTest(table=table, column=column):
                    data_type, is_nullable = self._fetchone("""
                        SELECT data_type, is_nullable FROM information_schema.columns
                        WHERE table_schema = 'bdd' AND table_name = %s AND column_name = %s
                    """, (table, column))
                    self.assertEqual(data_type, "double precision")
                    self.assertEqual(is_nullable, "YES", f"bdd.{table}.{column} devrait être nullable")

    def test_integer_columns_have_integer_type(self):
        for table, columns in INTEGER_COLUMNS.items():
            for column in columns:
                with self.subTest(table=table, column=column):
                    data_type = self._fetchone("""
                        SELECT data_type FROM information_schema.columns
                        WHERE table_schema = 'bdd' AND table_name = %s AND column_name = %s
                    """, (table, column))[0]
                    self.assertEqual(
                        data_type, "integer",
                        f"bdd.{table}.{column} est en {data_type}, attendu integer",
                    )


if __name__ == "__main__":
    unittest.main()
