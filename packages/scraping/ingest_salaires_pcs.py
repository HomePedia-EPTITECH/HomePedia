"""
Ingestion des salaires par categorie socio-professionnelle (Insee, Base Tous
Salaries) vers MongoDB (Python standard uniquement : csv).

Source : Insee, "Salaires dans le secteur prive selon le sexe, l'age et la
categorie socioprofessionnelle" (jeu DS_BTS_SAL_EQTP_SEX_PCS), filtre au
niveau commune (GEO_OBJECT=COM).
Mesure : salaire net EQTP mensuel moyen (pas horaire), en euros.

Pas de diffusion Insee pour les communes de moins de 2000 habitants, ni pour
les croisements a trop faible effectif (CONF_STATUS=C -> valeur vide/None).

Defaut : packages/scraping/salaires_pcs_communes.csv

Usage :
    python packages/scraping/ingest_salaires_pcs.py
    python packages/scraping/ingest_salaires_pcs.py --input autre.csv --time-period 2023
"""

from __future__ import annotations

import argparse
import csv
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from pymongo import MongoClient, UpdateOne

_SCRAPER_DIR = Path(__file__).resolve().parent
_PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from packages.scraping.models import (  # noqa: E402
    CommuneDirectSalaireDoc,
    SalairePcsHistoryDoc,
)
from packages.shared.util.config import get_mongo_db_name, get_mongo_uri  # noqa: E402


COMMUNES_DIRECT_COLLECTION = "communes_direct"
SALAIRES_HISTORY_COLLECTION = "salaires_pcs_history"
SALAIRES_SOURCE = "insee_bts_pcs"
MONGO_BULK_BATCH_SIZE = 1000
DEFAULT_INPUT_CSV = _SCRAPER_DIR / "salaires_pcs_communes.csv"
TARGET_MEASURE = "SALAIRE_NET_EQTP_MENSUEL_MOYENNE"

# Code PCS_ESE (Insee) -> (libelle, champ aplati dans communes_direct)
PCS_FIELDS: Dict[str, tuple[str, str]] = {
    "1T3": ("Cadres y compris chefs d'entreprises", "salaire_net_mensuel_moyen_cadre"),
    "4": ("Professions intermediaires", "salaire_net_mensuel_moyen_prof_intermediaire"),
    "5": ("Employes", "salaire_net_mensuel_moyen_employe"),
    "6": ("Ouvriers", "salaire_net_mensuel_moyen_ouvrier"),
    "_T": ("Total", "salaire_net_mensuel_moyen_total"),
}


def _parse_obs_value(raw: Optional[str]) -> Optional[float]:
    if raw is None:
        return None
    t = raw.strip()
    if not t:
        return None
    try:
        return float(t)
    except ValueError:
        return None


def _flush_bulk(coll: Any, ops: List[UpdateOne]) -> None:
    if ops:
        coll.bulk_write(ops, ordered=False)


def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Ingestion salaires par PCS (Insee BTS, stdlib Python) -> MongoDB."
    )
    p.add_argument(
        "--input",
        default=str(DEFAULT_INPUT_CSV),
        help=f"Chemin CSV Insee filtre COM (defaut: {DEFAULT_INPUT_CSV}).",
    )
    p.add_argument(
        "--time-period",
        type=int,
        default=None,
        help="Millesime a retenir pour communes_direct (defaut: le plus recent present dans le fichier).",
    )
    p.add_argument("--mongo-uri", default=get_mongo_uri(), help="URI MongoDB.")
    p.add_argument("--mongo-db", default=get_mongo_db_name(), help="Nom de la base MongoDB.")
    p.add_argument("--dry-run", action="store_true")
    return p.parse_args()


def main() -> None:
    args = _parse_args()
    now_utc = datetime.now(timezone.utc)

    input_path = Path(args.input)
    if not input_path.is_file():
        raise FileNotFoundError(f"Fichier introuvable : {input_path}")

    # Premiere passe : determiner le millesime le plus recent si non fourni.
    time_period = args.time_period
    if time_period is None:
        with open(input_path, "r", encoding="utf-8", newline="") as f:
            reader = csv.DictReader(f, delimiter=";")
            periods = set()
            for row in reader:
                tp = (row.get("TIME_PERIOD") or "").strip()
                if tp.isdigit():
                    periods.add(int(tp))
        if not periods:
            raise ValueError("Aucun TIME_PERIOD trouve dans le fichier.")
        time_period = max(periods)

    client: Optional[MongoClient] = None
    hist_coll = None
    direct_coll = None
    if not args.dry_run:
        client = MongoClient(args.mongo_uri, retryWrites=True)
        hist_coll = client[args.mongo_db][SALAIRES_HISTORY_COLLECTION]
        direct_coll = client[args.mongo_db][COMMUNES_DIRECT_COLLECTION]

    total_rows = 0
    kept_rows = 0
    history_ops: List[UpdateOne] = []
    # communes_direct : agrege uniquement le millesime retenu, sexe total (_T)
    direct_fields: Dict[str, Dict[str, Any]] = {}

    with open(input_path, "r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f, delimiter=";")
        for row in reader:
            total_rows += 1
            if (row.get("GEO_OBJECT") or "").strip() != "COM":
                continue
            if (row.get("DERA_MEASURE") or "").strip() != TARGET_MEASURE:
                continue
            pcs_code = (row.get("PCS_ESE") or "").strip()
            if pcs_code not in PCS_FIELDS:
                continue
            tp_raw = (row.get("TIME_PERIOD") or "").strip()
            if not tp_raw.isdigit():
                continue
            tp = int(tp_raw)
            com = (row.get("GEO") or "").strip()
            if not com:
                continue
            sex = (row.get("SEX") or "").strip()
            conf_status = (row.get("CONF_STATUS") or "").strip()
            value = _parse_obs_value(row.get("OBS_VALUE"))
            pcs_label, direct_field = PCS_FIELDS[pcs_code]
            kept_rows += 1

            if not args.dry_run and hist_coll is not None:
                payload: SalairePcsHistoryDoc = {
                    "com": com,
                    "source": SALAIRES_SOURCE,
                    "pcs_code": pcs_code,
                    "pcs_label": pcs_label,
                    "sex": sex,
                    "time_period": tp,
                    "salaire_net_eqtp_mensuel_moyen": value,
                    "conf_status": conf_status,
                    "updated_at": now_utc,
                }
                history_ops.append(
                    UpdateOne(
                        {"com": com, "pcs_code": pcs_code, "sex": sex, "time_period": tp},
                        {"$set": payload, "$setOnInsert": {"created_at": now_utc}},
                        upsert=True,
                    )
                )
                if len(history_ops) >= MONGO_BULK_BATCH_SIZE:
                    _flush_bulk(hist_coll, history_ops)
                    history_ops.clear()

            if sex == "_T" and tp == time_period:
                direct_fields.setdefault(com, {})[direct_field] = value

    if not args.dry_run and hist_coll is not None and history_ops:
        _flush_bulk(hist_coll, history_ops)

    if not args.dry_run and direct_coll is not None:
        direct_ops: List[UpdateOne] = []
        for com, fields in direct_fields.items():
            set_fields: Dict[str, Any] = {
                "salaire_net_mensuel_moyen_cadre": fields.get("salaire_net_mensuel_moyen_cadre"),
                "salaire_net_mensuel_moyen_prof_intermediaire": fields.get(
                    "salaire_net_mensuel_moyen_prof_intermediaire"
                ),
                "salaire_net_mensuel_moyen_employe": fields.get("salaire_net_mensuel_moyen_employe"),
                "salaire_net_mensuel_moyen_ouvrier": fields.get("salaire_net_mensuel_moyen_ouvrier"),
                "salaire_net_mensuel_moyen_total": fields.get("salaire_net_mensuel_moyen_total"),
                "salaire_millesime": time_period,
                "salaire_last_ingested_at": now_utc,
                "salaire_source": SALAIRES_SOURCE,
            }
            direct_ops.append(
                UpdateOne(
                    {"com": com},
                    {
                        "$set": set_fields,
                        "$setOnInsert": {
                            "com": com,
                            "source": SALAIRES_SOURCE,
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

    print(f"[salaires] millesime retenu  : {time_period}")
    print(f"[salaires] lignes lues       : {total_rows}")
    print(f"[salaires] lignes retenues   : {kept_rows}")
    print(f"[salaires] communes agregees : {len(direct_fields)}")
    if args.dry_run:
        print("[salaires] dry-run : aucune ecriture Mongo.")
    else:
        print("[salaires] termine (communes_direct + salaires_pcs_history).")


if __name__ == "__main__":
    main()
