"""Official French geo reference used by the Spark ETL.

Source:
- https://geo.api.gouv.fr/regions?fields=code,nom&format=json
- https://geo.api.gouv.fr/departements?fields=code,nom,codeRegion,nomRegion&format=json
Snapshot used for the local pipeline on 2026-07-04.
"""

from __future__ import annotations

import re
from typing import Optional

from pyspark.sql import DataFrame, SparkSession

OFFICIAL_REGION_ROWS: list[tuple[str, str]] = [
    ("01", "Guadeloupe"),
    ("02", "Martinique"),
    ("03", "Guyane"),
    ("04", "La Réunion"),
    ("06", "Mayotte"),
    ("11", "Île-de-France"),
    ("24", "Centre-Val de Loire"),
    ("27", "Bourgogne-Franche-Comté"),
    ("28", "Normandie"),
    ("32", "Hauts-de-France"),
    ("44", "Grand Est"),
    ("52", "Pays de la Loire"),
    ("53", "Bretagne"),
    ("75", "Nouvelle-Aquitaine"),
    ("76", "Occitanie"),
    ("84", "Auvergne-Rhône-Alpes"),
    ("93", "Provence-Alpes-Côte d'Azur"),
    ("94", "Corse"),
]

OFFICIAL_DEPARTMENT_ROWS: list[tuple[str, str, str]] = [
    ("01", "Ain", "84"),
    ("02", "Aisne", "32"),
    ("03", "Allier", "84"),
    ("04", "Alpes-de-Haute-Provence", "93"),
    ("05", "Hautes-Alpes", "93"),
    ("06", "Alpes-Maritimes", "93"),
    ("07", "Ardèche", "84"),
    ("08", "Ardennes", "44"),
    ("09", "Ariège", "76"),
    ("10", "Aube", "44"),
    ("11", "Aude", "76"),
    ("12", "Aveyron", "76"),
    ("13", "Bouches-du-Rhône", "93"),
    ("14", "Calvados", "28"),
    ("15", "Cantal", "84"),
    ("16", "Charente", "75"),
    ("17", "Charente-Maritime", "75"),
    ("18", "Cher", "24"),
    ("19", "Corrèze", "75"),
    ("21", "Côte-d'Or", "27"),
    ("22", "Côtes-d'Armor", "53"),
    ("23", "Creuse", "75"),
    ("24", "Dordogne", "75"),
    ("25", "Doubs", "27"),
    ("26", "Drôme", "84"),
    ("27", "Eure", "28"),
    ("28", "Eure-et-Loir", "24"),
    ("29", "Finistère", "53"),
    ("2A", "Corse-du-Sud", "94"),
    ("2B", "Haute-Corse", "94"),
    ("30", "Gard", "76"),
    ("31", "Haute-Garonne", "76"),
    ("32", "Gers", "76"),
    ("33", "Gironde", "75"),
    ("34", "Hérault", "76"),
    ("35", "Ille-et-Vilaine", "53"),
    ("36", "Indre", "24"),
    ("37", "Indre-et-Loire", "24"),
    ("38", "Isère", "84"),
    ("39", "Jura", "27"),
    ("40", "Landes", "75"),
    ("41", "Loir-et-Cher", "24"),
    ("42", "Loire", "84"),
    ("43", "Haute-Loire", "84"),
    ("44", "Loire-Atlantique", "52"),
    ("45", "Loiret", "24"),
    ("46", "Lot", "76"),
    ("47", "Lot-et-Garonne", "75"),
    ("48", "Lozère", "76"),
    ("49", "Maine-et-Loire", "52"),
    ("50", "Manche", "28"),
    ("51", "Marne", "44"),
    ("52", "Haute-Marne", "44"),
    ("53", "Mayenne", "52"),
    ("54", "Meurthe-et-Moselle", "44"),
    ("55", "Meuse", "44"),
    ("56", "Morbihan", "53"),
    ("57", "Moselle", "44"),
    ("58", "Nièvre", "27"),
    ("59", "Nord", "32"),
    ("60", "Oise", "32"),
    ("61", "Orne", "28"),
    ("62", "Pas-de-Calais", "32"),
    ("63", "Puy-de-Dôme", "84"),
    ("64", "Pyrénées-Atlantiques", "75"),
    ("65", "Hautes-Pyrénées", "76"),
    ("66", "Pyrénées-Orientales", "76"),
    ("67", "Bas-Rhin", "44"),
    ("68", "Haut-Rhin", "44"),
    ("69", "Rhône", "84"),
    ("70", "Haute-Saône", "27"),
    ("71", "Saône-et-Loire", "27"),
    ("72", "Sarthe", "52"),
    ("73", "Savoie", "84"),
    ("74", "Haute-Savoie", "84"),
    ("75", "Paris", "11"),
    ("76", "Seine-Maritime", "28"),
    ("77", "Seine-et-Marne", "11"),
    ("78", "Yvelines", "11"),
    ("79", "Deux-Sèvres", "75"),
    ("80", "Somme", "32"),
    ("81", "Tarn", "76"),
    ("82", "Tarn-et-Garonne", "76"),
    ("83", "Var", "93"),
    ("84", "Vaucluse", "93"),
    ("85", "Vendée", "52"),
    ("86", "Vienne", "75"),
    ("87", "Haute-Vienne", "75"),
    ("88", "Vosges", "44"),
    ("89", "Yonne", "27"),
    ("90", "Territoire de Belfort", "27"),
    ("91", "Essonne", "11"),
    ("92", "Hauts-de-Seine", "11"),
    ("93", "Seine-Saint-Denis", "11"),
    ("94", "Val-de-Marne", "11"),
    ("95", "Val-d'Oise", "11"),
    ("971", "Guadeloupe", "01"),
    ("972", "Martinique", "02"),
    ("973", "Guyane", "03"),
    ("974", "La Réunion", "04"),
    ("976", "Mayotte", "06"),
]

REGION_CODE_TO_NAME: dict[str, str] = {code: name for code, name in OFFICIAL_REGION_ROWS}
DEPARTMENT_CODE_TO_REGION_CODE: dict[str, str] = {
    code: region_code for code, _, region_code in OFFICIAL_DEPARTMENT_ROWS
}
DEPARTMENT_CODE_TO_NAME: dict[str, str] = {
    code: name for code, name, _ in OFFICIAL_DEPARTMENT_ROWS
}

_REGION_PREFIX_RE = re.compile(r"^(?:région|region)\s+", re.IGNORECASE)
_DEPARTMENT_PREFIX_RE = re.compile(
    r"^(?:département|departement)\s+(?:de|du|des)\s+",
    re.IGNORECASE,
)


def build_official_region_df(spark: SparkSession) -> DataFrame:
    rows = [(index, code, name) for index, (code, name) in enumerate(OFFICIAL_REGION_ROWS)]
    return (
        spark.createDataFrame(rows, ["_order", "numero_region", "nom"])
        .orderBy("_order")
        .drop("_order")
    )


def build_official_department_df(spark: SparkSession) -> DataFrame:
    rows = [
        (index, code, name, region_code)
        for index, (code, name, region_code) in enumerate(OFFICIAL_DEPARTMENT_ROWS)
    ]
    return (
        spark.createDataFrame(rows, ["_order", "numero_departement", "nom", "region_id"])
        .orderBy("_order")
        .drop("_order")
    )


def extract_department_code(commune_code: Optional[str]) -> Optional[str]:
    """Derive the department code from an INSEE commune code."""
    code = (commune_code or "").strip().upper()
    if not code:
        return None
    if code.startswith(("2A", "2B")):
        return code[:2]
    if code.startswith("97") and len(code) >= 3:
        return code[:3]
    if len(code) >= 3 and code[:3] in DEPARTMENT_CODE_TO_REGION_CODE:
        return code[:3]
    return code[:2]


def normalize_scraped_region_name(value: Optional[str]) -> Optional[str]:
    text = (value or "").strip()
    if not text:
        return None
    text = _REGION_PREFIX_RE.sub("", text).strip()
    return text or None


def normalize_scraped_department_name(value: Optional[str]) -> Optional[str]:
    text = (value or "").strip()
    if not text:
        return None
    text = _DEPARTMENT_PREFIX_RE.sub("", text).strip()
    text = re.sub(r"^l[’']", "", text, flags=re.IGNORECASE).strip()
    text = re.sub(r"^la\s+", "", text, flags=re.IGNORECASE).strip()
    text = re.sub(r"^le\s+", "", text, flags=re.IGNORECASE).strip()
    text = re.sub(r"^les\s+", "", text, flags=re.IGNORECASE).strip()
    return text or None


def get_region_code_from_department(department_code: Optional[str]) -> Optional[str]:
    code = (department_code or "").strip().upper()
    if not code:
        return None
    return DEPARTMENT_CODE_TO_REGION_CODE.get(code)


def get_region_name(region_code: Optional[str], fallback: Optional[str] = None) -> Optional[str]:
    code = (region_code or "").strip().upper()
    if code in REGION_CODE_TO_NAME:
        return REGION_CODE_TO_NAME[code]
    return normalize_scraped_region_name(fallback)
