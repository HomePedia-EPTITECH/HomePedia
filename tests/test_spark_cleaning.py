"""
Tests unitaires de la logique de nettoyage Spark (pas besoin de Mongo/Postgres).

    python -m unittest tests.test_spark_cleaning -v
"""

import sys
import unittest
from pathlib import Path

from pyspark.sql import SparkSession
from pyspark.sql.types import DoubleType, IntegerType, StructField, StructType

PROJECT_ROOT = Path(__file__).resolve().parents[1]
SPARK_DIR = PROJECT_ROOT / "spark"
if str(SPARK_DIR) not in sys.path:
    sys.path.insert(0, str(SPARK_DIR))

from jobs.cleaning.cleaning_jobs import apply_schema, filter_low_reviews, filter_price_outliers  # noqa: E402
from jobs.education.education_job import childcare_density, private_school_ratio, school_density  # noqa: E402
from jobs.geo.geo_job import aggregate_commune_coordinates  # noqa: E402
from pipelines.clean_data_pipeline import run_pipeline  # noqa: E402
from upsert.postgres_upsert import _fill_numeric_nulls  # noqa: E402
from upsert.split_dataframe import COLUMN_RENAMING, TABLE_COLUMNS, split_by_table  # noqa: E402

spark = None


def setUpModule():
    global spark
    spark = (
        SparkSession.builder
        .master("local[1]")
        .appName("homepedia-tests")
        .config("spark.ui.enabled", "false")
        .getOrCreate()
    )
    spark.sparkContext.setLogLevel("ERROR")


def tearDownModule():
    spark.stop()


class ApplySchemaTest(unittest.TestCase):
    def test_digits_transform_extracts_int_and_nulls_empty(self):
        df = spark.createDataFrame([("40 ans",), ("",), (None,)], ["age_moyen"])
        result = [r.age_moyen for r in apply_schema(df).collect()]
        self.assertEqual(result, [40, None, None])

    def test_digits_transform_strips_currency_and_spaces(self):
        df = spark.createDataFrame([("24 480 €/an",)], ["revenu_moyen"])
        result = apply_schema(df).collect()[0]
        self.assertEqual(result.revenu_moyen, 24480)

    def test_percent_transform_handles_comma_and_dot(self):
        df = spark.createDataFrame([("48.1%",), ("1,2%",)], ["taux_chomage"])
        result = [r.taux_chomage for r in apply_schema(df).collect()]
        self.assertEqual(result, [48.1, 1.2])

    def test_strip_transform_trims_and_nulls_blank(self):
        df = spark.createDataFrame([("  Paris  ",), ("   ",)], ["nom_commune"])
        result = [r.nom_commune for r in apply_schema(df).collect()]
        self.assertEqual(result, ["Paris", None])

    def test_round_transform_rounds_float_salaire_to_nearest_int(self):
        schema = StructType([StructField("salaire_net_mensuel_moyen_total", DoubleType())])
        df = spark.createDataFrame([(3340.046568,), (2410.6,), (None,)], schema=schema)
        result = [r.salaire_net_mensuel_moyen_total for r in apply_schema(df).collect()]
        self.assertEqual(result, [3340, 2411, None])


class FilterTest(unittest.TestCase):
    def test_filter_low_reviews_keeps_at_least_two_avis(self):
        df = spark.createDataFrame([(0,), (1,), (2,), (5,)], ["nb_avis"])
        kept = sorted(r.nb_avis for r in filter_low_reviews(df).collect())
        self.assertEqual(kept, [2, 5])

    def test_filter_price_outliers_keeps_only_plausible_prices(self):
        rows = [
            (600, 1200),    # les deux dans la plage -> gardé
            (100, 1200),    # appartement trop bas
            (600, 50000),   # maison trop haute
            (None, 1200),   # appartement manquant
        ]
        df = spark.createDataFrame(rows, ["prix_m2_appartement", "prix_m2_maison"])
        kept = filter_price_outliers(df).collect()
        self.assertEqual(len(kept), 1)
        self.assertEqual(kept[0].prix_m2_appartement, 600)
        self.assertEqual(kept[0].prix_m2_maison, 1200)


class RunPipelineTest(unittest.TestCase):
    def test_missing_numeric_schema_columns_default_to_zero(self):
        df = spark.createDataFrame(
            [("5", "600", "1200")],
            ["nb_avis", "prix_m2_appartement", "prix_m2_maison"],
        )
        result = run_pipeline(df).collect()[0].asDict()
        self.assertEqual(result["nb_avis"], 5)
        self.assertEqual(result["prix_m2_appartement"], 600)
        # Colonnes absentes du DataFrame source mais déclarées dans COLUMN_SCHEMA
        self.assertEqual(result["salaire_net_mensuel_moyen_cadre"], 0)
        self.assertEqual(result["taux_chomage"], 0.0)

    def test_rows_failing_filters_are_dropped(self):
        df = spark.createDataFrame(
            [("1", "600", "1200")],  # nb_avis=1 < 2 -> filtré
            ["nb_avis", "prix_m2_appartement", "prix_m2_maison"],
        )
        self.assertEqual(run_pipeline(df).count(), 0)


class SplitByTableTest(unittest.TestCase):
    def test_missing_columns_raise_clear_error(self):
        df = spark.createDataFrame([(1002,)], ["com"])
        with self.assertRaises(ValueError):
            split_by_table(df)

    def test_split_renames_and_selects_expected_columns_per_table(self):
        # Construit une ligne couvrant toutes les colonnes attendues par toutes les
        # tables (sous leur nom source, avant renommage), pour vérifier que le
        # renommage + la sélection ne cassent silencieusement aucune table.
        source_columns = []
        for target_cols in TABLE_COLUMNS.values():
            for target in target_cols:
                source = COLUMN_RENAMING.get(target, target)
                if source not in source_columns:
                    source_columns.append(source)

        string_sources = {"nom_commune", "nom_maire"}
        values = [1 if col not in string_sources else "x" for col in source_columns]
        values[source_columns.index("com")] = 1002
        values[source_columns.index("salaire_net_mensuel_moyen_total")] = 2188

        df = spark.createDataFrame([tuple(values)], source_columns)
        result = split_by_table(df)

        self.assertEqual(set(result.keys()), set(TABLE_COLUMNS.keys()))
        for table, expected_cols in TABLE_COLUMNS.items():
            with self.subTest(table=table):
                self.assertEqual(sorted(result[table].columns), sorted(expected_cols))

        self.assertEqual(result["commune"].collect()[0].commune_id, 1002)
        self.assertEqual(result["salaire"].collect()[0].salaire_net_mensuel_moyen_total, 2188)


class FillNumericNullsTest(unittest.TestCase):
    def test_fills_int_and_float_nulls_with_zero(self):
        schema = StructType([
            StructField("a", IntegerType()),
            StructField("b", DoubleType()),
        ])
        df = spark.createDataFrame([(None, None), (1, 2.5)], schema=schema)
        rows = _fill_numeric_nulls(df).collect()
        self.assertEqual((rows[0].a, rows[0].b), (0, 0.0))
        self.assertEqual((rows[1].a, rows[1].b), (1, 2.5))

    def test_skip_columns_are_left_null(self):
        schema = StructType([
            StructField("a", IntegerType()),
            StructField("latitude", DoubleType()),
        ])
        df = spark.createDataFrame([(None, None)], schema=schema)
        row = _fill_numeric_nulls(df, skip_columns=frozenset({"latitude"})).collect()[0]
        self.assertEqual(row.a, 0)
        self.assertIsNone(row.latitude)


class GeoJobTest(unittest.TestCase):
    def test_averages_coordinates_per_commune(self):
        df = spark.createDataFrame(
            [
                ("01001", 46.0, 5.0),
                ("01001", 46.2, 5.2),
                ("01002", 45.0, 4.0),
            ],
            ["com", "latitude", "longitude"],
        )
        result = {r.com: (r.latitude, r.longitude) for r in aggregate_commune_coordinates(df).collect()}
        self.assertAlmostEqual(result["01001"][0], 46.1)
        self.assertAlmostEqual(result["01001"][1], 5.1)
        self.assertEqual(result["01002"], (45.0, 4.0))

    def test_rows_with_null_coordinates_are_excluded(self):
        df = spark.createDataFrame(
            [("01001", 46.0, 5.0), ("01003", None, None)],
            ["com", "latitude", "longitude"],
        )
        result = aggregate_commune_coordinates(df).collect()
        self.assertEqual({r.com for r in result}, {"01001"})


class EducationJobTest(unittest.TestCase):
    def test_school_density_per_1000_habitants(self):
        df = spark.createDataFrame(
            [(1000, 2, 1, 1, 0, 1, 0)],
            ["nb_habitant", "nb_ecoles_primaires_publiques", "nb_ecoles_primaires_privees",
             "nb_colleges_publics", "nb_colleges_prives", "nb_lycees_publics", "nb_lycees_prives"],
        )
        result = school_density(df).collect()[0]
        self.assertEqual(result.densite_scolaire, 5.0)  # (2+1+1+0+1+0)*1000/1000

    def test_school_density_defaults_to_zero_without_habitants(self):
        df = spark.createDataFrame([(0, 2)], ["nb_habitant", "nb_ecoles_primaires_publiques"])
        result = school_density(df).collect()[0]
        self.assertEqual(result.densite_scolaire, 0)

    def test_childcare_density_per_1000_habitants(self):
        df = spark.createDataFrame(
            [(2000, 1, 1)], ["nb_habitant", "nb_creches", "nb_ecoles_maternelles_publiques"]
        )
        result = childcare_density(df).collect()[0]
        self.assertEqual(result.densite_pour_enfants, 1.0)  # (1+1+0)*1000/2000

    def test_private_school_ratio(self):
        df = spark.createDataFrame(
            [(2, 2, 3, 3)],
            ["nb_ecoles_maternelles_privees", "nb_ecoles_primaires_privees",
             "nb_ecoles_maternelles_publiques", "nb_ecoles_primaires_publiques"],
        )
        result = private_school_ratio(df).collect()[0]
        self.assertEqual(result.ratio_prive_school, 0.4)  # 4 privees / 10 total


if __name__ == "__main__":
    unittest.main()
