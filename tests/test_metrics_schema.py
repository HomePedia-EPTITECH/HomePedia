import csv
import unittest
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
EXPORT_CSV = PROJECT_ROOT / "data" / "exports" / "communes_postgres.csv"


RAW_COLUMNS_REQUIRED_BY_METRICS = {
    "nb_habitant",
    "revenu_moyen",
    "prix_m2_maison",
    "prix_m2_appartement",
    "part_taux_proprietaires",
    "part_taux_locataires",
    "part_residences_principales",
    "part_residences_secondaires",
    "score_securite",
    "score_education",
    "score_loisirs",
    "score_environnement",
    "score_vie_pratique",
    "nb_ecoles_maternelles_publiques",
    "nb_ecoles_maternelles_privees",
    "nb_ecoles_primaires_publiques",
    "nb_ecoles_primaires_privees",
    "nb_colleges_publics",
    "nb_colleges_prives",
    "nb_lycees_publics",
    "nb_lycees_prives",
    "nb_medecins",
    "nb_pharmacies",
    "nb_hopitaux",
    "nb_laboratoires_analyses",
    "nb_hypermarches",
    "nb_supermarches",
    "nb_superettes",
    "nb_boulangeries",
    "nb_boucheries",
    "nb_restaurants",
    "nb_banques",
    "nb_bureaux_poste",
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
    "nb_etablissements_handicapes",
    "nb_ehpa",
}


METRICS_COLUMNS_COMPUTED = {
    "score_qualite_vie_calcule",
    "prix_m2_moyen",
    "ecart_maison_appart",
    "ratio_proprio_locataire",
    "ratio_residences_secondaires",
    "prime_maison",
    "nb_equipements",
    "equipements_par_1000hab",
    "annees_salaire_30m2",
    "tension_immobiliere",
    "densite_medicale",
    "densite_specialistes",
    "pharmacies_par_1000hab",
    "score_autonomie_medicale",
    "score_maternite",
    "score_sante_mentale",
    "score_dependance",
    "score_desert_medical",
}


class MetricsSchemaTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with EXPORT_CSV.open(newline="", encoding="utf-8") as handle:
            cls.header = set(next(csv.reader(handle)))

    def test_metrics_raw_columns_exist_in_export(self):
        missing = sorted(RAW_COLUMNS_REQUIRED_BY_METRICS - self.header)
        self.assertEqual(
            missing,
            [],
            f"Colonnes manquantes pour la pipeline de metriques: {missing}",
        )

    def test_computed_metrics_names_are_unique(self):
        self.assertEqual(
            len(METRICS_COLUMNS_COMPUTED),
            len(set(METRICS_COLUMNS_COMPUTED)),
        )


if __name__ == "__main__":
    unittest.main()
