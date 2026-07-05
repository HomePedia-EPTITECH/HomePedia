"""Official French geo reference used by the Spark ETL.

Source:
- geo.api.gouv.fr/regions?fields=code,nom&format=json
- geo.api.gouv.fr/departements?fields=code,nom,codeRegion,nomRegion&format=json
Snapshot used for the local pipeline on 2026-07-04.
"""

from __future__ import annotations

import re
from typing import Optional

REGION_CODE_TO_NAME: dict[str, str] = {
    "11": "Île-de-France",
    "24": "Centre-Val de Loire",
    "27": "Bourgogne-Franche-Comté",
    "28": "Normandie",
    "32": "Hauts-de-France",
    "44": "Grand Est",
    "52": "Pays de la Loire",
    "53": "Bretagne",
    "75": "Nouvelle-Aquitaine",
    "76": "Occitanie",
    "84": "Auvergne-Rhône-Alpes",
    "93": "Provence-Alpes-Côte d'Azur",
    "94": "Corse",
    "01": "Guadeloupe",
    "02": "Martinique",
    "03": "Guyane",
    "04": "La Réunion",
    "06": "Mayotte",
}

DEPARTMENT_CODE_TO_REGION_CODE: dict[str, str] = {
    "01": "84",
    "02": "32",
    "03": "84",
    "04": "93",
    "05": "93",
    "06": "93",
    "07": "84",
    "08": "44",
    "09": "76",
    "10": "44",
    "11": "76",
    "12": "76",
    "13": "93",
    "14": "28",
    "15": "84",
    "16": "75",
    "17": "75",
    "18": "24",
    "19": "75",
    "21": "27",
    "22": "53",
    "23": "75",
    "24": "75",
    "25": "27",
    "26": "84",
    "27": "28",
    "28": "24",
    "29": "53",
    "2A": "94",
    "2B": "94",
    "30": "76",
    "31": "76",
    "32": "76",
    "33": "75",
    "34": "76",
    "35": "53",
    "36": "24",
    "37": "24",
    "38": "84",
    "39": "27",
    "40": "75",
    "41": "24",
    "42": "84",
    "43": "84",
    "44": "52",
    "45": "24",
    "46": "76",
    "47": "75",
    "48": "76",
    "49": "52",
    "50": "28",
    "51": "44",
    "52": "44",
    "53": "52",
    "54": "44",
    "55": "44",
    "56": "53",
    "57": "44",
    "58": "27",
    "59": "32",
    "60": "32",
    "61": "28",
    "62": "32",
    "63": "84",
    "64": "75",
    "65": "76",
    "66": "76",
    "67": "44",
    "68": "44",
    "69": "84",
    "70": "27",
    "71": "27",
    "72": "52",
    "73": "84",
    "74": "84",
    "75": "11",
    "76": "28",
    "77": "11",
    "78": "11",
    "79": "75",
    "80": "32",
    "81": "76",
    "82": "76",
    "83": "93",
    "84": "93",
    "85": "52",
    "86": "75",
    "87": "75",
    "88": "44",
    "89": "27",
    "90": "27",
    "91": "11",
    "92": "11",
    "93": "11",
    "94": "11",
    "95": "11",
    "971": "01",
    "972": "02",
    "973": "03",
    "974": "04",
    "976": "06",
}

_REGION_PREFIX_RE = re.compile(r"^(?:région|region)\s+", re.IGNORECASE)
_DEPARTMENT_PREFIX_RE = re.compile(
    r"^(?:département|departement)\s+(?:de|du|des)\s+",
    re.IGNORECASE,
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
