"""
Ingestion DVF vers MongoDB (Python standard uniquement : csv + gzip + hashlib).

Pas de PySpark ni Java, pas de pandas : lecture ligne a ligne du CSV (fichiers
gros ou petits), agrege par commune, ecriture bulk Mongo.

Formats :
    - full (data.gouv, snake_case) : code_commune, nom_commune, code_postal, ...
    - cerema (|) : Code commune, Nature mutation, ...

Defaut : packages/scraping/full.csv

Usage :
    python packages/scraping/ingest_dvf_spark.py
    python packages/scraping/ingest_dvf_spark.py --input data.txt.gz --format cerema --sep '|'
"""

from __future__ import annotations

import argparse
import csv
import gzip
import hashlib
import re
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, DefaultDict, Dict, Iterator, List, Optional, TextIO, Tuple

from pymongo import MongoClient, UpdateOne

_SCRAPER_DIR = Path(__file__).resolve().parent
_PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from packages.scraping.models import CommuneDirectDVFDoc, RealEstateHistoryDoc  # noqa: E402
from packages.shared.util.config import get_mongo_db_name, get_mongo_uri  # noqa: E402


COMMUNES_DIRECT_COLLECTION = "communes_direct"
REAL_ESTATE_HISTORY_COLLECTION = "real_estate_history"
DVF_SOURCE = "dvf"
MONGO_BULK_BATCH_SIZE = 1000
DEFAULT_INPUT_CSV = _SCRAPER_DIR / "full.csv"

AggBucket = Dict[str, Any]


def _norm_spaces(s: Optional[str]) -> str:
    if s is None:
        return ""
    return re.sub(r"\s+", " ", str(s).strip())


def _norm_code(s: Optional[str]) -> str:
    return re.sub(r"\s+", "", _norm_spaces(s)).upper()


def _parse_float(value: Optional[str]) -> Optional[float]:
    if value is None:
        return None
    t = str(value).replace("\xa0", "")
    t = re.sub(r"\s+", "", t)
    t = t.replace(",", ".")
    t = re.sub(r"[^0-9.\-]", "", t)
    if not t or t in ("-", "."):
        return None
    try:
        return float(t)
    except ValueError:
        return None


def _build_com(dept_raw: Optional[str], commune_raw: Optional[str]) -> Optional[str]:
    dept = _norm_code(dept_raw)
    commune = _norm_code(commune_raw)
    if not commune:
        return None
    if len(commune) >= 5:
        return commune
    if not dept:
        return None
    pad = 2 if len(dept) >= 3 else 3
    comm_padded = commune.zfill(pad)
    return dept + comm_padded


def _parse_date_mutation(raw: Optional[str], fmt: str) -> Optional[str]:
    s = _norm_spaces(raw)
    if not s:
        return None
    if fmt == "full":
        m = re.match(r"^(\d{4})-(\d{2})-(\d{2})", s)
        if m:
            return f"{m.group(1)}-{m.group(2)}-{m.group(3)}"
        m = re.match(r"^(\d{2})/(\d{2})/(\d{4})$", s)
        if m:
            return f"{m.group(3)}-{m.group(2)}-{m.group(1)}"
        return None
    m = re.match(r"^(\d{2})/(\d{2})/(\d{4})$", s)
    if m:
        return f"{m.group(3)}-{m.group(2)}-{m.group(1)}"
    return None


def _type_local_norm(raw: Optional[str]) -> Optional[str]:
    s = _norm_spaces(raw)
    if not s:
        return None
    return s.lower().title()


def _detect_format(fieldnames: Optional[List[str]]) -> str:
    if not fieldnames:
        raise ValueError("CSV sans en-tete.")
    cols = set(fieldnames)
    if "code_commune" in cols and "nature_mutation" in cols:
        return "full"
    if "Code commune" in cols and "Nature mutation" in cols:
        return "cerema"
    raise ValueError(
        "Format DVF inconnu. Utilisez --format full ou --format cerema."
    )


def _resolve_sep_and_format(
    input_path: str, format_arg: str, sep_arg: Optional[str]
) -> Tuple[str, str]:
    if format_arg != "auto":
        sep = sep_arg if sep_arg is not None else ("," if format_arg == "full" else "|")
        return sep, format_arg
    p = Path(input_path)
    if p.is_file():
        try:
            text = p.read_text(encoding="utf-8", errors="replace")
        except OSError:
            text = ""
        first = text.splitlines()[0] if text else ""
        if "code_commune" in first:
            return (sep_arg or ",", "full")
        if "Code commune" in first:
            return (sep_arg or "|", "cerema")
    return (sep_arg or ",", "full")


def _row_val(row: Dict[str, str], full_key: str, cerema_key: str, fmt: str) -> str:
    key = full_key if fmt == "full" else cerema_key
    v = row.get(key)
    return "" if v is None else str(v)


def _process_row(
    row: Dict[str, str],
    fmt: str,
    min_prix_m2: float,
    max_prix_m2: float,
) -> Optional[Dict[str, Any]]:
    nature = _norm_spaces(_row_val(row, "nature_mutation", "Nature mutation", fmt)).lower()
    if nature != "vente":
        return None

    if fmt == "full":
        com = _build_com(
            _row_val(row, "code_departement", "", fmt) or None,
            _row_val(row, "code_commune", "", fmt) or None,
        )
        valeur = _parse_float(_row_val(row, "valeur_fonciere", "", fmt))
        surface = _parse_float(_row_val(row, "surface_reelle_bati", "", fmt))
        date_iso = _parse_date_mutation(
            _row_val(row, "date_mutation", "", fmt) or None, "full"
        )
        nature_disp = _norm_spaces(_row_val(row, "nature_mutation", "", fmt)) or "Vente"
        type_raw = _row_val(row, "type_local", "", fmt) or None
    else:
        com = _build_com(
            _row_val(row, "", "Code departement", fmt) or None,
            _row_val(row, "", "Code commune", fmt) or None,
        )
        valeur = _parse_float(_row_val(row, "", "Valeur fonciere", fmt))
        surface = _parse_float(_row_val(row, "", "Surface reelle bati", fmt))
        date_iso = _parse_date_mutation(
            _row_val(row, "", "Date mutation", fmt) or None, "cerema"
        )
        nature_disp = _norm_spaces(_row_val(row, "", "Nature mutation", fmt)) or "Vente"
        type_raw = _row_val(row, "", "Type local", fmt) or None

    if not com or len(com) < 5:
        return None
    if valeur is None or valeur <= 0 or surface is None or surface <= 0:
        return None
    prix_m2 = valeur / surface
    if prix_m2 < min_prix_m2 or prix_m2 > max_prix_m2:
        return None

    tnorm = _type_local_norm(type_raw)

    id_mut = _norm_spaces(_row_val(row, "id_mutation", "", fmt)) if fmt == "full" else ""
    id_parcelle = _norm_spaces(_row_val(row, "id_parcelle", "", fmt)) if fmt == "full" else ""
    code_postal = _norm_spaces(_row_val(row, "code_postal", "", fmt)) if fmt == "full" else ""
    nom_commune = _norm_spaces(_row_val(row, "nom_commune", "", fmt)) if fmt == "full" else ""
    lon = _parse_float(_row_val(row, "longitude", "", fmt)) if fmt == "full" else None
    lat = _parse_float(_row_val(row, "latitude", "", fmt)) if fmt == "full" else None
    no_disp = _norm_spaces(_row_val(row, "numero_disposition", "No disposition", fmt))

    tx_parts = [
        id_mut,
        id_parcelle,
        com,
        date_iso or "",
        nature_disp,
        tnorm or "",
        str(valeur),
        str(surface),
        str(prix_m2),
        no_disp,
    ]
    tx_id = hashlib.sha256("|".join(tx_parts).encode("utf-8")).hexdigest()

    return {
        "transaction_id": tx_id,
        "com": com,
        "date_mutation": date_iso,
        "nature_mutation": nature_disp,
        "type_local": tnorm,
        "valeur_fonciere": valeur,
        "surface_reelle_bati": surface,
        "prix_m2": prix_m2,
        "id_mutation": id_mut or None,
        "id_parcelle": id_parcelle or None,
        "code_postal": code_postal or None,
        "nom_commune": nom_commune or None,
        "longitude": lon,
        "latitude": lat,
    }


def _open_text_input(path: str) -> Tuple[TextIO, Callable[[], None]]:
    p = Path(path)
    if not p.is_file():
        raise FileNotFoundError(f"Fichier introuvable : {path}")
    if path.lower().endswith(".gz"):
        f = gzip.open(path, "rt", encoding="utf-8", newline="")
        return f, f.close
    f = open(path, "r", encoding="utf-8", newline="")
    return f, f.close


def _flush_bulk(coll: Any, ops: List[UpdateOne]) -> None:
    if ops:
        coll.bulk_write(ops, ordered=False)


def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Ingestion DVF (stdlib Python) -> MongoDB.")
    p.add_argument(
        "--input",
        default=str(DEFAULT_INPUT_CSV),
        help=f"Chemin CSV ou .gz (defaut: {DEFAULT_INPUT_CSV}).",
    )
    p.add_argument(
        "--format",
        choices=("auto", "full", "cerema"),
        default="auto",
        help="Schema CSV (auto = apres lecture de l'entete).",
    )
    p.add_argument(
        "--sep",
        default=None,
        help="Separateur (defaut selon format).",
    )
    p.add_argument(
        "--mongo-uri",
        default=get_mongo_uri(),
        help="URI MongoDB.",
    )
    p.add_argument(
        "--mongo-db",
        default=get_mongo_db_name(),
        help="Nom de la base MongoDB.",
    )
    p.add_argument(
        "--min-prix-m2",
        type=float,
        default=100.0,
    )
    p.add_argument(
        "--max-prix-m2",
        type=float,
        default=50000.0,
    )
    p.add_argument(
        "--dry-run",
        action="store_true",
    )
    return p.parse_args()


def main() -> None:
    args = _parse_args()
    sep, fmt_hint = _resolve_sep_and_format(args.input, args.format, args.sep)
    now_utc = datetime.now(timezone.utc)

    stream, closer = _open_text_input(args.input)
    try:
        reader = csv.DictReader(stream, delimiter=sep)
        fieldnames = reader.fieldnames
        if args.format == "auto":
            fmt = _detect_format(list(fieldnames) if fieldnames else [])
        else:
            fmt = args.format

        agg: DefaultDict[str, AggBucket] = defaultdict(
            lambda: {
                "m_sum": 0.0,
                "m_n": 0,
                "a_sum": 0.0,
                "a_n": 0,
                "tot": 0,
            }
        )

        total_rows = 0
        clean_rows = 0
        history_ops: List[UpdateOne] = []

        client: Optional[MongoClient] = None
        hist_coll = None
        direct_coll = None
        if not args.dry_run:
            client = MongoClient(args.mongo_uri, retryWrites=True)
            hist_coll = client[args.mongo_db][REAL_ESTATE_HISTORY_COLLECTION]
            direct_coll = client[args.mongo_db][COMMUNES_DIRECT_COLLECTION]

        for row in reader:
            total_rows += 1
            rec = _process_row(row, fmt, args.min_prix_m2, args.max_prix_m2)
            if rec is None:
                continue
            clean_rows += 1
            com = rec["com"]
            b = agg[com]
            b["tot"] += 1
            tl = rec["type_local"]
            pm = rec["prix_m2"]
            if tl == "Maison":
                b["m_sum"] += pm
                b["m_n"] += 1
            elif tl == "Appartement":
                b["a_sum"] += pm
                b["a_n"] += 1

            if not args.dry_run and hist_coll is not None:
                payload: RealEstateHistoryDoc = {
                    "transaction_id": rec["transaction_id"],
                    "source": DVF_SOURCE,
                    "com": com,
                    "id_mutation": rec.get("id_mutation"),
                    "code_postal": rec.get("code_postal"),
                    "nom_commune": rec.get("nom_commune"),
                    "longitude": rec.get("longitude"),
                    "latitude": rec.get("latitude"),
                    "id_parcelle": rec.get("id_parcelle"),
                    "date_mutation": rec.get("date_mutation"),
                    "nature_mutation": rec.get("nature_mutation") or "Vente",
                    "type_local": rec.get("type_local"),
                    "valeur_fonciere": rec.get("valeur_fonciere"),
                    "surface_reelle_bati": rec.get("surface_reelle_bati"),
                    "prix_m2": rec.get("prix_m2"),
                    "updated_at": now_utc,
                }
                history_ops.append(
                    UpdateOne(
                        {"transaction_id": payload["transaction_id"]},
                        {"$set": payload, "$setOnInsert": {"created_at": now_utc}},
                        upsert=True,
                    )
                )
                if len(history_ops) >= MONGO_BULK_BATCH_SIZE:
                    _flush_bulk(hist_coll, history_ops)
                    history_ops.clear()

        if not args.dry_run and hist_coll is not None and history_ops:
            _flush_bulk(hist_coll, history_ops)

        if not args.dry_run and direct_coll is not None:
            direct_ops: List[UpdateOne] = []
            for com, b in agg.items():
                pm_maison = (b["m_sum"] / b["m_n"]) if b["m_n"] else None
                pm_app = (b["a_sum"] / b["a_n"]) if b["a_n"] else None
                payload_cd: CommuneDirectDVFDoc = {
                    "com": com,
                    "prix_m2_moyen_maison": pm_maison,
                    "prix_m2_moyen_appartement": pm_app,
                    "nb_ventes_totales": b["tot"],
                    "dvf_last_ingested_at": now_utc,
                    "dvf_source": DVF_SOURCE,
                }
                direct_ops.append(
                    UpdateOne(
                        {"com": com},
                        {
                            "$set": payload_cd,
                            "$setOnInsert": {
                                "com": com,
                                "source": DVF_SOURCE,
                                "created_at": now_utc,
                            },
                        },
                        upsert=True,
                    )
                )
                if len(direct_ops) >= MONGO_BULK_BATCH_SIZE:
                    _flush_bulk(direct_coll, direct_ops)
                    direct_ops.clear()
            if direct_ops:
                _flush_bulk(direct_coll, direct_ops)

        if client is not None:
            client.close()

        print(f"[dvf] format={fmt} sep={sep!r}")
        print(f"[dvf] lignes lues       : {total_rows}")
        print(f"[dvf] ventes retenues   : {clean_rows}")
        print(f"[dvf] communes agregees : {len(agg)}")
        if args.dry_run:
            print("[dvf] dry-run : aucune ecriture Mongo.")
        else:
            print("[dvf] termine (communes_direct + real_estate_history).")
    finally:
        closer()


if __name__ == "__main__":
    main()
