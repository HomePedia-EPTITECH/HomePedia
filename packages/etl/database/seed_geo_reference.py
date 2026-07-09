"""
Seed de la référence géographique (régions + départements) dans PostgreSQL,
et rattachement des communes à leur département.

Le back lit :
    - bdd.region      (numero_region, nom)
    - bdd.departement (numero_departement, nom, region_id -> region.numero_region)
    - bdd.commune.departement_id -> departement.numero_departement

Le pipeline Spark ne peuple PAS ces tables ni le lien commune->département.
Ce script comble ce trou avec la référence INSEE officielle (métropole + DOM).
Le département d'une commune se déduit de son code INSEE : les 2 (ou 3) premiers
chiffres. Comme commune_id est stocké en entier (le zéro de tête est perdu), on
utilise la division entière commune_id // 1000 pour la métropole.

Corse (2A/2B) non gérée (numero_departement est un entier) — absente du jeu de
test actuel.

Usage :
    python3 packages/etl/database/seed_geo_reference.py
"""

from __future__ import annotations

import sys
from pathlib import Path

_PROJECT_ROOT = Path(__file__).resolve().parents[3]
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

import psycopg2  # noqa: E402

from packages.shared.util.config import load_env, get_postgres_params  # noqa: E402

# region_num -> (nom, [(code_dept, nom_dept), ...])
REGION_DEPTS: dict[int, tuple[str, list[tuple[str, str]]]] = {
    11: ("Île-de-France", [
        ("75", "Paris"), ("77", "Seine-et-Marne"), ("78", "Yvelines"),
        ("91", "Essonne"), ("92", "Hauts-de-Seine"), ("93", "Seine-Saint-Denis"),
        ("94", "Val-de-Marne"), ("95", "Val-d'Oise"),
    ]),
    24: ("Centre-Val de Loire", [
        ("18", "Cher"), ("28", "Eure-et-Loir"), ("36", "Indre"),
        ("37", "Indre-et-Loire"), ("41", "Loir-et-Cher"), ("45", "Loiret"),
    ]),
    27: ("Bourgogne-Franche-Comté", [
        ("21", "Côte-d'Or"), ("25", "Doubs"), ("39", "Jura"), ("58", "Nièvre"),
        ("70", "Haute-Saône"), ("71", "Saône-et-Loire"), ("89", "Yonne"),
        ("90", "Territoire de Belfort"),
    ]),
    28: ("Normandie", [
        ("14", "Calvados"), ("27", "Eure"), ("50", "Manche"), ("61", "Orne"),
        ("76", "Seine-Maritime"),
    ]),
    32: ("Hauts-de-France", [
        ("02", "Aisne"), ("59", "Nord"), ("60", "Oise"), ("62", "Pas-de-Calais"),
        ("80", "Somme"),
    ]),
    44: ("Grand Est", [
        ("08", "Ardennes"), ("10", "Aube"), ("51", "Marne"), ("52", "Haute-Marne"),
        ("54", "Meurthe-et-Moselle"), ("55", "Meuse"), ("57", "Moselle"),
        ("67", "Bas-Rhin"), ("68", "Haut-Rhin"), ("88", "Vosges"),
    ]),
    52: ("Pays de la Loire", [
        ("44", "Loire-Atlantique"), ("49", "Maine-et-Loire"), ("53", "Mayenne"),
        ("72", "Sarthe"), ("85", "Vendée"),
    ]),
    53: ("Bretagne", [
        ("22", "Côtes-d'Armor"), ("29", "Finistère"), ("35", "Ille-et-Vilaine"),
        ("56", "Morbihan"),
    ]),
    75: ("Nouvelle-Aquitaine", [
        ("16", "Charente"), ("17", "Charente-Maritime"), ("19", "Corrèze"),
        ("23", "Creuse"), ("24", "Dordogne"), ("33", "Gironde"), ("40", "Landes"),
        ("47", "Lot-et-Garonne"), ("64", "Pyrénées-Atlantiques"),
        ("79", "Deux-Sèvres"), ("86", "Vienne"), ("87", "Haute-Vienne"),
    ]),
    76: ("Occitanie", [
        ("09", "Ariège"), ("11", "Aude"), ("12", "Aveyron"), ("30", "Gard"),
        ("31", "Haute-Garonne"), ("32", "Gers"), ("34", "Hérault"), ("46", "Lot"),
        ("48", "Lozère"), ("65", "Hautes-Pyrénées"), ("66", "Pyrénées-Orientales"),
        ("81", "Tarn"), ("82", "Tarn-et-Garonne"),
    ]),
    84: ("Auvergne-Rhône-Alpes", [
        ("01", "Ain"), ("03", "Allier"), ("07", "Ardèche"), ("15", "Cantal"),
        ("26", "Drôme"), ("38", "Isère"), ("42", "Loire"), ("43", "Haute-Loire"),
        ("63", "Puy-de-Dôme"), ("69", "Rhône"), ("73", "Savoie"),
        ("74", "Haute-Savoie"),
    ]),
    93: ("Provence-Alpes-Côte d'Azur", [
        ("04", "Alpes-de-Haute-Provence"), ("05", "Hautes-Alpes"),
        ("06", "Alpes-Maritimes"), ("13", "Bouches-du-Rhône"), ("83", "Var"),
        ("84", "Vaucluse"),
    ]),
    1: ("Guadeloupe", [("971", "Guadeloupe")]),
    2: ("Martinique", [("972", "Martinique")]),
    3: ("Guyane", [("973", "Guyane")]),
    4: ("La Réunion", [("974", "La Réunion")]),
    6: ("Mayotte", [("976", "Mayotte")]),
}


def main() -> None:
    load_env()
    pg = get_postgres_params()
    conn = psycopg2.connect(
        host=pg["host"], port=int(pg["port"]), dbname=pg["db_name"],
        user=pg["user"], password=pg["password"],
    )
    conn.autocommit = False
    try:
        with conn.cursor() as cur:
            regions = [(num, nom) for num, (nom, _) in REGION_DEPTS.items()]
            cur.executemany(
                """
                INSERT INTO bdd.region (numero_region, nom) VALUES (%s, %s)
                ON CONFLICT (numero_region) DO UPDATE SET nom = EXCLUDED.nom
                """,
                regions,
            )
            print(f"[geo] régions : {len(regions)} upsertées")

            depts = [
                (int(code), nom, region_num)
                for region_num, (_, dept_list) in REGION_DEPTS.items()
                for code, nom in dept_list
            ]
            cur.executemany(
                """
                INSERT INTO bdd.departement (numero_departement, nom, region_id)
                VALUES (%s, %s, %s)
                ON CONFLICT (numero_departement)
                DO UPDATE SET nom = EXCLUDED.nom, region_id = EXCLUDED.region_id
                """,
                depts,
            )
            print(f"[geo] départements : {len(depts)} upsertés")

            # Rattache chaque commune à son département (métropole : //1000).
            cur.execute(
                """
                UPDATE bdd.commune
                SET departement_id = commune_id / 1000
                WHERE departement_id IS NULL
                """
            )
            print(f"[geo] communes rattachées : {cur.rowcount}")

        conn.commit()
        print("[geo] terminé.")
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()
