"""
Initialisation de la file des pages ville (homepedia.city_pages_queue) à partir
du sitemap XML Bien-dans-ma-ville.

Ce script est pensé pour être exécuté à l'init de la base de données,
après les migrations Postgres, afin de remplir une fois pour toutes
la file d'URLs à scrapper.
"""

import logging
from pathlib import Path
from urllib.parse import urlparse
import sys
import re
import xml.etree.ElementTree as ET

import psycopg2
from psycopg2 import extras
import requests

_ROOT = Path(__file__).resolve().parents[1]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))
from util.config import get_pg_params

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")


SITEMAP_URL = "https://www.bien-dans-ma-ville.fr/sitemap-ville.xml"
CITY_PAGES_QUEUE_TABLE = "homepedia.city_pages_queue"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/121.0.0.0 Safari/537.36"
    )
}


def extract_com_id_from_url(url: str) -> str:
    """
    Extrait l'identifiant commune (com_id) à partir de la fin de l'URL.

    Ex : https://www.bien-dans-ma-ville.fr/paris-01284/   -> '01284'
         https://www.bien-dans-ma-ville.fr/bastia-2B033/ -> '2B033'
    """
    parsed = urlparse(url)
    path = parsed.path.rstrip("/")
    if not path:
        raise ValueError("Chemin vide dans l'URL")
    last_segment = path.split("/")[-1]
    m = re.search(r"-([0-9A-Za-z]{3,6})$", last_segment)
    if not m:
        raise ValueError(f"Impossible d'extraire com_id depuis le segment '{last_segment}'")
    return m.group(1)


def parse_sitemap() -> list[tuple[str, str]]:
    """
    Récupère et parse le sitemap XML.
    Retourne une liste de tuples (url, com_id).
    """
    logging.info("Récupération du sitemap : %s", SITEMAP_URL)
    resp = requests.get(SITEMAP_URL, headers=HEADERS, timeout=30)
    resp.raise_for_status()

    try:
        root = ET.fromstring(resp.content)
    except Exception as exc:
        logging.critical("Erreur de parsing XML du sitemap : %s", exc)
        raise

    urls: list[tuple[str, str]] = []
    seen: set[str] = set()

    for loc in root.iter():
        if loc.tag.endswith("loc"):
            url = (loc.text or "").strip()
            if not url:
                continue
            if url in seen:
                continue
            seen.add(url)
            try:
                com_id = extract_com_id_from_url(url)
            except ValueError as exc:
                logging.warning("URL sitemap ignorée (malformée) : %s", exc)
                continue
            urls.append((url, com_id))

    logging.info("Sitemap parsé : %d URLs valides trouvées.", len(urls))
    return urls


def init_city_pages_queue() -> None:
    """
    Insère / met à jour les URLs dans homepedia.city_pages_queue via UPSERT.
    """
    sitemap_urls = parse_sitemap()
    if not sitemap_urls:
        logging.warning("Aucune URL à insérer dans la file de collecte (sitemap vide).")
        return

    pg_params = get_pg_params()
    insert_sql = f"""
        INSERT INTO {CITY_PAGES_QUEUE_TABLE} (url, com_id)
        VALUES (%(url)s, %(com_id)s)
        ON CONFLICT (url) DO UPDATE
        SET com_id = EXCLUDED.com_id;
    """

    records = [{"url": url, "com_id": com_id} for (url, com_id) in sitemap_urls]

    logging.info(
        "Insertion / mise à jour de %d URLs dans la file des pages ville (%s).",
        len(records),
        CITY_PAGES_QUEUE_TABLE,
    )
    with psycopg2.connect(**pg_params) as conn:
        with conn.cursor() as cur:
            extras.execute_batch(cur, insert_sql, records, page_size=1000)
        conn.commit()
    logging.info("Initialisation de homepedia.city_pages_queue terminée.")


def main() -> None:
    try:
        init_city_pages_queue()
    except Exception as exc:  # pragma: no cover - simple CLI
        logging.critical("Erreur lors de l'initialisation de city_pages_queue : %s", exc)
        raise SystemExit(1)


if __name__ == "__main__":
    main()

