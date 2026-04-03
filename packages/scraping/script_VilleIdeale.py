"""
Harvester Ville-Idéale.

Objectif :
    - Alimenter city_pages_queue depuis le sitemap Ville-Idéale (champ source='ville_ideale')
    - Scraper les pages ville pour extraire :
        * Notes /10 par critère depuis div#notes_graph table
        * Avis textuels depuis section#avis article.review (p.pos / p.neg)
        * Pagination des avis quand disponible
    - Persister :
        * métriques calculées dans communes_harvest_vi
        * avis bruts dans reviews_raw avec source='ville_ideale'

Usage :
    python packages/scraping/script_VilleIdeale.py
"""

import gzip
import hashlib
import logging
import random
import re
import sys
import threading
import time
import unicodedata
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterator, List, Optional, Tuple
from urllib.parse import unquote, urljoin, urlparse, urlunparse

import requests
from bs4 import BeautifulSoup
from pymongo import MongoClient, UpdateOne
from pymongo.errors import BulkWriteError, OperationFailure, PyMongoError
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

_PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from packages.scraping.models import (  # noqa: E402
    CityScrapePayload,
    CommuneDirectVIDoc,
    CommuneHarvestVIDoc,
    QueueDoc,
    ReviewRawModel,
    VilleIdealeNotesDoc,
)
from packages.shared.util.config import get_mongo_db_name, get_mongo_uri  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

SOURCE = "ville_ideale"
SITEMAP_URL = "https://www.ville-ideale.fr/sitemap.xml"
CITY_PAGES_QUEUE_COLLECTION = "city_pages_queue"
COMMUNES_HARVEST_VI_COLLECTION = "communes_harvest_vi"
COMMUNES_DIRECT_VI_COLLECTION = "communes_direct_vi"
MONGO_BULK_BATCH_SIZE = 500
MAX_REVIEW_PAGES_PER_CITY = 80  # garde-fou anti-boucle / pagination infinie
USE_VILLE_IDEALE_SITEMAP = False  # le sitemap VI n'est pas fiable (204/500). On s'appuie sur BDMV.
MAX_CONCURRENT_HTTP = 1  # anti-ban : 1 requête à la fois (plus sûr)
MIN_SECONDS_BETWEEN_REQUESTS = 1.25  # anti-ban : délai global minimal entre 2 requêtes
USE_PLAYWRIGHT_FALLBACK = True  # si le site renvoie un body vide via requests, fallback navigateur
MAX_CONSECUTIVE_HTTP_BLOCKS = 8  # arrêt sécurité si ban persistant


class VilleIdealeHarvester:
    def __init__(self) -> None:
        self.mongo_client = MongoClient(
            get_mongo_uri(),
            maxPoolSize=50,
            minPoolSize=0,
            serverSelectionTimeoutMS=8000,
            connectTimeoutMS=8000,
            socketTimeoutMS=30000,
            retryWrites=True,
            appname="homepedia-ville-ideale-harvester",
        )
        self.raw_db = self.mongo_client[get_mongo_db_name()]
        self.queue_store = self.raw_db[CITY_PAGES_QUEUE_COLLECTION]
        self.city_store = self.raw_db[COMMUNES_HARVEST_VI_COLLECTION]
        self.city_direct_store = self.raw_db[COMMUNES_DIRECT_VI_COLLECTION]
        self.reviews_store = self.raw_db["reviews_raw"]

        self.headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/121.0.0.0 Safari/537.36"
            )
        }

        self._progress_lock = threading.Lock()
        self._thread_local = threading.local()
        self._http_semaphore = threading.Semaphore(MAX_CONCURRENT_HTTP)
        self._http_throttle_lock = threading.Lock()
        self._last_http_ts: float = 0.0
        self._playwright_lock = threading.Lock()
        self._consecutive_http_blocks: int = 0
        self.total_in_queue: int = 0
        self.already_done: int = 0
        self.newly_processed: int = 0
        self.active_workers: int = 0
        self.max_active_workers: int = 0
        self.start_time: float = 0.0

        self.mongo_client.admin.command("ping")
        self._ensure_mongo_indexes()

    def _ensure_mongo_indexes(self) -> None:
        def safe_create_index(collection, keys, **kwargs) -> None:
            try:
                collection.create_index(keys, **kwargs)
            except OperationFailure as exc:
                if getattr(exc, "code", None) == 85:
                    logger.info("Index déjà présent (%s): %s", collection.name, exc)
                    return
                raise

        # Queue : on garde le même contrat, mais avec le champ source
        safe_create_index(
            self.queue_store,
            [("url", 1)],
            unique=True,
            name="idx_city_pages_queue_url_unique",
        )
        safe_create_index(
            self.queue_store,
            [("source", 1), ("is_processed", 1), ("url", 1)],
            name="idx_city_pages_queue_by_source_status_url",
        )
        safe_create_index(
            self.queue_store,
            [("source", 1), ("com_id", 1), ("is_processed", 1)],
            name="idx_city_pages_queue_by_source_com_status",
        )

        safe_create_index(self.city_store, [("com", 1)], unique=True)
        safe_create_index(self.city_direct_store, [("com", 1)], unique=True)
        safe_create_index(self.reviews_store, [("com", 1), ("collected_at", -1)])
        safe_create_index(
            self.reviews_store,
            [("source", 1), ("com", 1), ("external_comment_id", 1)],
            unique=True,
            name="idx_reviews_raw_unique_external_id",
            partialFilterExpression={"external_comment_id": {"$exists": True, "$type": "string"}},
        )
        safe_create_index(
            self.reviews_store,
            [("source", 1), ("com", 1), ("text_hash", 1)],
            unique=True,
            name="idx_reviews_raw_unique_text_hash",
            partialFilterExpression={"text_hash": {"$exists": True, "$type": "string"}},
        )

    # ------------------------------------------------------------------ #
    #  Normalisation (Spark-ready)                                       #
    # ------------------------------------------------------------------ #

    def _normalize_spaces(self, value: str) -> str:
        return re.sub(r"\s+", " ", value or "").strip()

    def _compute_text_hash(self, text: str) -> str:
        normalized = self._normalize_spaces(text).lower()
        return hashlib.sha1(normalized.encode("utf-8")).hexdigest()

    def _parse_float(self, value: Any) -> Optional[float]:
        if value is None:
            return None
        if isinstance(value, (int, float)):
            return float(value)
        s = self._normalize_spaces(str(value))
        if not s:
            return None
        # ex: "7,8/10" -> "7,8", "7.8" -> "7.8"
        s = s.replace("\xa0", " ")
        s = re.sub(r"/\s*10\b", "", s, flags=re.IGNORECASE).strip()
        m = re.search(r"[-+]?\d+(?:[.,]\d+)?", s)
        if not m:
            return None
        return float(m.group(0).replace(",", "."))

    def _parse_int(self, value: Any) -> Optional[int]:
        if value is None:
            return None
        if isinstance(value, int):
            return value
        s = self._normalize_spaces(str(value))
        if not s:
            return None
        s = s.replace("\xa0", " ")
        digits = re.sub(r"[^\d]", "", s)
        return int(digits) if digits else None

    def _parse_date_iso(self, value: Any) -> Optional[str]:
        if value is None:
            return None
        s = self._normalize_spaces(str(value))
        if not s:
            return None
        # priorité au format ISO dans un attribut datetime
        m = re.match(r"^\d{4}-\d{2}-\d{2}", s)
        if m:
            return m.group(0)
        # formats FR usuels : "12/03/2024" ou "12-03-2024"
        m = re.search(r"\b(\d{2})[/-](\d{2})[/-](\d{4})\b", s)
        if m:
            d, mo, y = m.group(1), m.group(2), m.group(3)
            return f"{y}-{mo}-{d}"
        # formats texte : "12 mars 2024"
        months = {
            "janvier": "01",
            "février": "02",
            "fevrier": "02",
            "mars": "03",
            "avril": "04",
            "mai": "05",
            "juin": "06",
            "juillet": "07",
            "août": "08",
            "aout": "08",
            "septembre": "09",
            "octobre": "10",
            "novembre": "11",
            "décembre": "12",
            "decembre": "12",
        }
        m = re.search(
            r"\b(\d{1,2})\s+(janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)\s+(\d{4})\b",
            s,
            flags=re.IGNORECASE,
        )
        if m:
            day = f"{int(m.group(1)):02d}"
            month = months.get(m.group(2).lower())
            year = m.group(3)
            if month:
                return f"{year}-{month}-{day}"
        return None

    # ------------------------------------------------------------------ #
    #  Queue : sitemap -> URLs villes                                    #
    # ------------------------------------------------------------------ #

    def _extract_com_id_from_url(self, url: str) -> str:
        """
        Extrait le code INSEE depuis les URLs Ville-Idéale.
        Exemple : https://www.ville-ideale.fr/paris_75056 -> '75056'
        """
        parsed = urlparse(url)
        segment = parsed.path.rstrip("/").split("/")[-1]
        segment = unquote(segment)
        segment = re.sub(r"\.html?$", "", segment, flags=re.IGNORECASE)
        m = re.search(r"[_-]((?:2A|2B)\d{3}|\d{5})\b", segment, flags=re.IGNORECASE)
        if not m:
            raise ValueError(f"Impossible d'extraire com_id depuis '{segment}'")
        return m.group(1).upper()

    def _extract_nom_commune_from_url(self, url: str, fallback: str) -> str:
        try:
            parsed = urlparse(url)
            segment = parsed.path.rstrip("/").split("/")[-1]
            segment = unquote(segment)
            segment = re.sub(r"\.html?$", "", segment, flags=re.IGNORECASE)
            m = re.search(r"[_-]((?:2A|2B)\d{3}|\d{5})\b", segment, flags=re.IGNORECASE)
            name_part = segment[: m.start()] if m else segment
            name_part = name_part.replace("-", " ").replace("_", " ").strip()
            return name_part.upper() if name_part else fallback
        except Exception:
            return fallback

    def _slugify_city_name(self, value: str) -> str:
        """
        Slug compatible Ville-Idéale depuis nom commune.
        Ex:
            "L'Haÿ-les-Roses" -> "l-hay-les-roses"
            "PARIS 15E ARRONDISSEMENT" -> "paris-15e-arrondissement"
        """
        s = (value or "").strip().lower()
        s = s.replace("’", "'")
        s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode("ascii")
        s = s.replace("'", "-")
        s = re.sub(r"[^a-z0-9]+", "-", s)
        s = re.sub(r"-{2,}", "-", s).strip("-")
        return s

    def _build_vi_url(self, nom_commune: str, com_id: str) -> str:
        slug = self._slugify_city_name(nom_commune)
        return f"https://www.ville-ideale.fr/{slug}_{com_id}"

    def _fetch_city_candidates_from_bdmv_data(self) -> List[Tuple[str, str]]:
        """
        Récupère les couples (com_id, nom_commune) depuis les données déjà collectées BDMV.
        Ordre de priorité :
            1) city_pages_queue (source=bdmv)
            2) communes_direct
            3) communes_harvest
        """
        candidates: Dict[str, str] = {}

        # 1) Queue BDMV (y compris anciennes lignes sans champ source)
        cursor_q = self.queue_store.find(
            {
                "$or": [
                    {"source": "bdmv"},
                    {"source": {"$exists": False}, "url": {"$regex": r"bien-dans-ma-ville\.fr", "$options": "i"}},
                ]
            },
            {"com_id": 1, "nom_commune_guess": 1, "url": 1},
        ).batch_size(1000)
        for d in cursor_q:
            com_id = (d.get("com_id") or "").strip().upper()
            url = (d.get("url") or "").strip()
            if not com_id and url:
                try:
                    com_id = self._extract_com_id_from_url(url)
                except ValueError:
                    com_id = ""
            name = (d.get("nom_commune_guess") or "").strip()
            if not name and url:
                name = self._extract_nom_commune_from_url(url, com_id)
            if com_id and name and com_id not in candidates:
                candidates[com_id] = name

        # 2) communes_direct (nom réel de commune)
        direct_store = self.raw_db["communes_direct"]
        cursor_d = direct_store.find({}, {"com": 1, "nom_commune": 1}).batch_size(1000)
        for d in cursor_d:
            com_id = (d.get("com") or "").strip().upper()
            name = (d.get("nom_commune") or "").strip()
            if com_id and name and com_id not in candidates:
                candidates[com_id] = name

        # 3) communes_harvest
        harvest_store = self.raw_db["communes_harvest"]
        cursor_h = harvest_store.find({}, {"com": 1, "nom_commune": 1}).batch_size(1000)
        for d in cursor_h:
            com_id = (d.get("com") or "").strip().upper()
            name = (d.get("nom_commune") or "").strip()
            if com_id and name and com_id not in candidates:
                candidates[com_id] = name

        return sorted(candidates.items(), key=lambda x: x[0])

    def _sync_queue_from_bdmv_reference(self, force_rescrape: bool = True) -> int:
        """
        Fallback si sitemap Ville-Idéale indisponible :
        fabrique les URLs Ville-Idéale depuis les communes déjà connues côté BDMV.
        """
        now_utc = datetime.now(timezone.utc)
        city_pairs = self._fetch_city_candidates_from_bdmv_data()
        if not city_pairs:
            logger.warning("Aucune commune source trouvée côté BDMV pour fallback VI.")
            return 0

        ops: List[UpdateOne] = []
        written_ops = 0
        for com_id, nom_commune in city_pairs:
            url = self._build_vi_url(nom_commune=nom_commune, com_id=com_id)
            update_set: Dict[str, Any] = {
                "updated_at": now_utc,
                "source": SOURCE,
                "com_id": com_id,
                "nom_commune_guess": nom_commune,
            }
            if force_rescrape:
                update_set["is_processed"] = False
                update_set["processed_at"] = None
                update_set["last_error"] = None
            ops.append(
                UpdateOne(
                    # Priorité : ligne VI existante par (source, com_id),
                    # fallback : ligne déjà présente avec la même URL VI (legacy sans source).
                    {"$or": [{"source": SOURCE, "com_id": com_id}, {"url": url}]},
                    {
                        "$setOnInsert": {
                            "attempt_count": 0,
                            "created_at": now_utc,
                        },
                        "$set": {
                            **update_set,
                            "url": url,
                        },
                    },
                    upsert=True,
                )
            )
            if len(ops) >= MONGO_BULK_BATCH_SIZE:
                try:
                    res = self.queue_store.bulk_write(ops, ordered=False)
                    written_ops += (res.upserted_count or 0) + (res.modified_count or 0)
                except BulkWriteError as exc:
                    logger.warning("BulkWrite queue fallback partiellement échoué: %s", exc.details)
                ops.clear()
        if ops:
            try:
                res = self.queue_store.bulk_write(ops, ordered=False)
                written_ops += (res.upserted_count or 0) + (res.modified_count or 0)
            except BulkWriteError as exc:
                logger.warning("BulkWrite queue fallback partiellement échoué: %s", exc.details)

        logger.info(
            "Queue VI alimentée depuis référentiel BDMV: %d écriture(s) effectives.",
            written_ops,
        )
        return written_ops

    def _fetch_city_urls_from_sitemap(self) -> List[str]:
        base_origin = f"{urlparse(SITEMAP_URL).scheme}://{urlparse(SITEMAP_URL).netloc}"

        def parse_xml_bytes(data: bytes) -> ET.Element:
            raw = data
            if raw[:2] == b"\x1f\x8b":
                raw = gzip.decompress(raw)
            return ET.fromstring(raw)

        def is_city_url(u: str) -> bool:
            p = urlparse(u)
            if p.netloc and p.netloc != urlparse(base_origin).netloc:
                return False
            path = unquote(p.path.rstrip("/"))
            segs = [s for s in path.split("/") if s]
            if not segs:
                return False
            # Ville-Idéale : pages ville sous forme /slug_75056 (souvent sans slash final)
            last = segs[-1].lower()
            if last.endswith(".xml") or last.endswith(".xml.gz") or "sitemap" in last:
                return False
            if len(segs) != 1:
                return False
            if not re.search(r"[_-]((?:2a|2b)\d{3}|\d{5})\b", last, flags=re.IGNORECASE):
                return False
            try:
                _ = self._extract_com_id_from_url(u)
            except ValueError:
                return False
            return True

        to_visit: List[str] = [SITEMAP_URL, f"{base_origin}/sitemap_index.xml"]
        visited: set[str] = set()
        city_urls: set[str] = set()

        try:
            robots = requests.get(f"{base_origin}/robots.txt", headers=self.headers, timeout=20)
            if robots.ok:
                for line in robots.text.splitlines():
                    if line.lower().startswith("sitemap:"):
                        u = line.split(":", 1)[1].strip()
                        if u and u not in to_visit:
                            to_visit.append(u)
        except requests.RequestException:
            pass

        while to_visit:
            sitemap_url = to_visit.pop()
            if sitemap_url in visited:
                continue
            visited.add(sitemap_url)
            try:
                resp = requests.get(sitemap_url, headers=self.headers, timeout=30)
                resp.raise_for_status()
            except requests.RequestException:
                continue

            xml_locs: List[str] = []
            try:
                root = parse_xml_bytes(resp.content)
                for loc in root.findall(".//{*}loc"):
                    if loc.text:
                        xml_locs.append(loc.text.strip())
            except Exception:
                soup = BeautifulSoup(resp.text, "html.parser")
                for a in soup.find_all("a", href=True):
                    href = a["href"].strip()
                    if href.startswith("http"):
                        xml_locs.append(href)

            for u in xml_locs:
                if u.endswith(".xml") or u.endswith(".xml.gz") or "/sitemap" in u:
                    if u not in visited:
                        to_visit.append(u)
                    continue
                if is_city_url(u):
                    city_urls.add(u)

        return sorted(city_urls)

    def _sync_queue_from_sitemap(self, force_rescrape: bool = True) -> None:
        now_utc = datetime.now(timezone.utc)
        if force_rescrape:
            self.queue_store.update_many(
                {"source": SOURCE},
                {
                    "$set": {
                        "is_processed": False,
                        "processed_at": None,
                        "last_error": None,
                        "updated_at": now_utc,
                    }
                },
            )

        if not USE_VILLE_IDEALE_SITEMAP:
            self._sync_queue_from_bdmv_reference(force_rescrape=force_rescrape)
            return

        try:
            urls = self._fetch_city_urls_from_sitemap()
        except Exception as exc:
            logger.warning("Impossible de synchroniser la queue depuis le sitemap: %s", exc)
            urls = []
        if not urls:
            logger.warning("Sitemap vide/non exploitable: fallback depuis les communes BDMV.")
            written = self._sync_queue_from_bdmv_reference(force_rescrape=force_rescrape)
            if written <= 0:
                logger.warning("Aucune URL VI générée via fallback BDMV.")
            return

        ops: List[UpdateOne] = []
        written_ops = 0
        skipped_invalid = 0
        for url in urls:
            try:
                com_id = self._extract_com_id_from_url(url)
            except ValueError:
                skipped_invalid += 1
                continue
            nom_commune_guess = self._extract_nom_commune_from_url(url, com_id)
            update_set: Dict[str, Any] = {
                "updated_at": now_utc,
                "source": SOURCE,
                "com_id": com_id,
                "nom_commune_guess": nom_commune_guess,
            }
            if force_rescrape:
                update_set["is_processed"] = False
                update_set["processed_at"] = None
                update_set["last_error"] = None

            ops.append(
                UpdateOne(
                    {"url": url},
                    {
                        "$setOnInsert": {
                            "url": url,
                            "attempt_count": 0,
                            "created_at": now_utc,
                        },
                        "$set": update_set,
                    },
                    upsert=True,
                )
            )
            if len(ops) >= MONGO_BULK_BATCH_SIZE:
                try:
                    self.queue_store.bulk_write(ops, ordered=False)
                    written_ops += len(ops)
                except BulkWriteError as exc:
                    logger.warning("BulkWrite queue partiellement échoué: %s", exc.details)
                    written_ops += len(ops)
                ops.clear()

        if ops:
            try:
                self.queue_store.bulk_write(ops, ordered=False)
                written_ops += len(ops)
            except BulkWriteError as exc:
                logger.warning("BulkWrite queue partiellement échoué: %s", exc.details)
                written_ops += len(ops)

        logger.info(
            "Queue synchronisée depuis sitemap (%s): %d URL(s) upsert, %d ignorée(s).",
            SOURCE,
            written_ops,
            skipped_invalid,
        )

    def _load_queue_entries(self) -> Iterator[Tuple[str, str, str]]:
        """
        IMPORTANT : ne pas utiliser `yield` directement ici.
        Sinon la fonction devient un générateur lazy et les compteurs (total/already_done)
        ne sont pas initialisés avant l'itération.
        """
        self.total_in_queue = self.queue_store.count_documents({"source": SOURCE})
        self.already_done = self.queue_store.count_documents(
            {"source": SOURCE, "is_processed": True}
        )
        remaining = self.queue_store.count_documents(
            {"source": SOURCE, "is_processed": False}
        )
        if remaining == 0:
            logger.info(
                "Aucune URL à traiter dans la queue Mongo pour source=%s.", SOURCE
            )
            return iter(())
        logger.info(
            "Queue chargée (%s) : %d entrée(s) à traiter, %d déjà traitée(s) sur %d.",
            SOURCE,
            remaining,
            self.already_done,
            self.total_in_queue,
        )
        cursor = self.queue_store.find(
            {"source": SOURCE, "is_processed": False},
            {"url": 1, "com_id": 1, "nom_commune_guess": 1},
        ).sort("url", 1)
        cursor = cursor.batch_size(500)
        return self._iter_queue_entries(cursor=cursor)

    def _iter_queue_entries(self, cursor: Any) -> Iterator[Tuple[str, str, str]]:
        for d in cursor:
            d = d  # type: QueueDoc
            url = d.get("url")
            com_id = d.get("com_id")
            if not url or not com_id:
                continue
            nom_commune = d.get("nom_commune_guess") or self._extract_nom_commune_from_url(
                url, com_id
            )
            yield (com_id, nom_commune, url)

    # ------------------------------------------------------------------ #
    #  HTTP                                                              #
    # ------------------------------------------------------------------ #

    def _get_thread_session(self) -> requests.Session:
        session = getattr(self._thread_local, "session", None)
        if session is None:
            session = requests.Session()
            session.headers.update(self.headers)
            retries = Retry(
                total=3,
                connect=3,
                read=3,
                backoff_factor=0.6,
                status_forcelist=[429, 500, 502, 503, 504],
                allowed_methods=["GET"],
                raise_on_status=False,
                respect_retry_after_header=True,
            )
            adapter = HTTPAdapter(max_retries=retries, pool_connections=20, pool_maxsize=20)
            session.mount("http://", adapter)
            session.mount("https://", adapter)
            self._thread_local.session = session
        return session

    def _polite_wait(self) -> None:
        """Throttle global + jitter pour éviter le ban IP."""
        with self._http_throttle_lock:
            now = time.monotonic()
            wait_for = (self._last_http_ts + MIN_SECONDS_BETWEEN_REQUESTS) - now
            if wait_for > 0:
                time.sleep(wait_for)
            # jitter pour éviter un pattern trop régulier (plus large)
            time.sleep(random.uniform(0.20, 0.60))
            self._last_http_ts = time.monotonic()

    def _register_http_block(self, reason: str, url: str) -> None:
        self._consecutive_http_blocks += 1
        # backoff progressif (cap à ~2 minutes)
        sleep_s = min(120.0, (2.0 ** min(self._consecutive_http_blocks, 6)) + random.uniform(0.0, 3.0))
        logger.warning(
            "Blocage HTTP détecté (%s). consecutive=%d, sleep=%.1fs url=%s",
            reason,
            self._consecutive_http_blocks,
            sleep_s,
            url,
        )
        time.sleep(sleep_s)
        if self._consecutive_http_blocks >= MAX_CONSECUTIVE_HTTP_BLOCKS:
            raise RuntimeError(
                f"Blocage HTTP persistant (>= {MAX_CONSECUTIVE_HTTP_BLOCKS}). "
                f"Stop pour éviter un ban plus long. Dernière URL: {url}"
            )

    def _reset_http_blocks_on_success(self) -> None:
        if self._consecutive_http_blocks:
            self._consecutive_http_blocks = 0

    def _safe_get(self, session: requests.Session, url: str) -> Optional[BeautifulSoup]:
        # Limite les requêtes simultanées + throttle global.
        with self._http_semaphore:
            self._polite_wait()
            try:
                resp = session.get(url, headers=self.headers, timeout=20)
                # Backoff explicite si 429/403 (même si Retry gère une partie)
                if resp.status_code in (403, 429):
                    self._register_http_block(f"status={resp.status_code}", url)
                    return None
                resp.raise_for_status()
                if not resp.content:
                    self._register_http_block("empty_body", url)
                    return None
                self._reset_http_blocks_on_success()
                return BeautifulSoup(resp.text, "html.parser")
            except requests.RequestException as exc:
                logger.warning("Erreur HTTP sur %s : %s", url, exc)
                if USE_PLAYWRIGHT_FALLBACK:
                    soup = self._safe_get_playwright(url)
                    if soup:
                        self._reset_http_blocks_on_success()
                        return soup
                return None

    def _safe_get_playwright(self, url: str) -> Optional[BeautifulSoup]:
        """
        Fallback navigateur (Playwright) : utile si le site renvoie un body vide aux clients non-browser.
        Garde un lock global pour éviter de lancer trop d'instances en parallèle.
        """
        with self._playwright_lock:
            try:
                from playwright.sync_api import sync_playwright  # type: ignore
            except Exception:
                logger.warning(
                    "Playwright indisponible: impossible de fallback navigateur pour %s",
                    url,
                )
                return None
            try:
                with sync_playwright() as p:
                    browser = p.chromium.launch(headless=True)
                    context = browser.new_context(
                        user_agent=self.headers.get("User-Agent"),
                        locale="fr-FR",
                    )
                    page = context.new_page()
                    page.goto(url, wait_until="domcontentloaded", timeout=30000)
                    html = page.content() or ""
                    context.close()
                    browser.close()
                html = html.strip()
                if not html:
                    logger.warning("Playwright a aussi renvoyé un body vide pour %s", url)
                    return None
                return BeautifulSoup(html, "html.parser")
            except Exception as exc:
                logger.warning("Fallback Playwright en échec sur %s: %s", url, exc)
                return None

    # ------------------------------------------------------------------ #
    #  Extracteurs Ville-Idéale                                          #
    # ------------------------------------------------------------------ #

    def _extract_notes(self, soup: BeautifulSoup) -> Dict[str, Optional[float]]:
        """
        Notes /10 attendues dans table#tablonotes.
        Retourne un mapping standardisé.
        """
        mapping = {
            "environnement": "note_environnement_10",
            "transports": "note_transports_10",
            "sante": "note_sante_10",
            "sécurité": "note_securite_10",
            "securite": "note_securite_10",
            "sports et loisirs": "note_sports_loisirs_10",
            "sportset loisirs": "note_sports_loisirs_10",
            "culture": "note_culture_10",
            "enseignement": "note_enseignement_10",
            "commerces": "note_commerces_10",
            "qualite de vie": "note_qualite_vie_10",
            "qualité de vie": "note_qualite_vie_10",
        }
        out: VilleIdealeNotesDoc = {v: None for v in mapping.values()}  # type: ignore[assignment]

        table = soup.select_one("table#tablonotes")
        if not table:
            return out

        for row in table.find_all("tr"):
            th = row.find("th")
            td = row.find("td")
            if not th or not td:
                continue
            label_raw = self._normalize_spaces(th.get_text(" ", strip=True))
            val = self._normalize_spaces(td.get_text(" ", strip=True))
            if not label_raw:
                continue
            label = self._normalize_spaces(label_raw).lower()
            label_norm = (
                unicodedata.normalize("NFKD", label).encode("ascii", "ignore").decode("ascii")
            )
            label_norm = self._normalize_spaces(label_norm)
            key = mapping.get(label_norm) or mapping.get(label)
            if not key:
                # fallback : retire ponctuation / doubles espaces
                label_norm2 = re.sub(r"[^a-z0-9 ]+", " ", label_norm)
                label_norm2 = self._normalize_spaces(label_norm2)
                key = mapping.get(label_norm2)
            if key:
                out[key] = self._parse_float(val)
        return out  # type: ignore[return-value]

    def _canonicalize_url(self, base_url: str, href: str) -> str:
        u = urljoin(base_url, href)
        p = urlparse(u)
        # on garde query + path, mais on drop les fragments
        return urlunparse((p.scheme, p.netloc, p.path, p.params, p.query, ""))

    def _discover_review_pages(self, base_url: str, soup_first: BeautifulSoup) -> List[str]:
        """
        Retourne une liste de pages (URLs) à scraper pour les avis.
        Stratégie :
            - inclut base_url
            - récupère les liens de pagination présents dans la zone avis
            - tente un fallback "page=2..N" si on détecte au moins un lien "page="
        """
        pages: List[str] = [self._canonicalize_url(base_url, base_url)]
        avis_section = soup_first.find("section", id="avis") or soup_first.select_one("section#avis")
        scope = avis_section or soup_first
        hrefs: set[str] = set()

        for a in scope.select('a[href*="page="], a[rel="next"], nav a[href], .pagination a[href]'):
            href = a.get("href")
            if not href:
                continue
            hrefs.add(self._canonicalize_url(base_url, href))

        # filtre garde-fou : rester sur le même host + même page ville (path)
        base = urlparse(base_url)
        base_path = base.path
        filtered: List[str] = []
        max_page = 1
        for u in hrefs:
            pu = urlparse(u)
            if pu.netloc != base.netloc:
                continue
            if pu.path != base_path:
                continue
            filtered.append(u)
            m = re.search(r"(?:\?|&)page=(\d+)\b", pu.query)
            if m:
                max_page = max(max_page, int(m.group(1)))

        if max_page > 1:
            max_page = min(max_page, MAX_REVIEW_PAGES_PER_CITY)
            for i in range(2, max_page + 1):
                pages.append(self._canonicalize_url(base_url, f"{base_url}?page={i}"))

        for u in sorted(set(filtered)):
            if u not in pages:
                pages.append(u)

        return pages[:MAX_REVIEW_PAGES_PER_CITY]

    def _extract_reviews_from_soup(self, soup: BeautifulSoup) -> List[Dict[str, Any]]:
        """
        Avis attendus dans div.comm.
        - ID externe : div.interact
        - Note avis : strong.moyenne
        - Points positifs/négatifs : <p> avec <b>/<strong> 'Les points positifs :' / 'Les points négatifs :'
        """
        reviews: List[Dict[str, Any]] = []
        scope = soup

        def extract_points_from_p(p_tag: Any, expected_label: str) -> Optional[str]:
            """
            p contient typiquement: <p><b>Les points positifs : </b>...texte...</p>
            On enlève le label du texte final.
            """
            if not p_tag:
                return None
            label_el = p_tag.find(["b", "strong"])
            if not label_el:
                return None
            label_txt = self._normalize_spaces(label_el.get_text(" ", strip=True)).lower()
            expected = self._normalize_spaces(expected_label).lower()
            # accepte "Les points positifs :" ou "Les points positifs : " etc.
            if not label_txt.startswith(expected):
                return None
            # texte complet du <p>, puis suppression du préfixe
            full = self._normalize_spaces(p_tag.get_text(" ", strip=True))
            # retire "Les points positifs :" (avec ou sans espaces)
            cleaned = re.sub(
                r"^les points positifs\s*:\s*",
                "",
                full,
                flags=re.IGNORECASE,
            )
            cleaned = re.sub(
                r"^les points n(?:e|é)gatifs\s*:\s*",
                "",
                cleaned,
                flags=re.IGNORECASE,
            )
            cleaned = self._normalize_spaces(cleaned)
            return cleaned or None

        for comm in scope.select("div.comm"):
            # ID externe
            external_id = None
            interact = comm.select_one("div.interact")
            if interact:
                # HTML réel : <div class="interact" id="131011">
                attr_id = self._normalize_spaces(interact.get("id") or "")
                if attr_id.isdigit():
                    external_id = attr_id
                else:
                    m = re.search(r"\b(\d{3,})\b", interact.get_text(" ", strip=True))
                    if m:
                        external_id = m.group(1)

            # Note avis
            rating = None
            note_el = comm.select_one("strong.moyenne")
            if note_el:
                rating = self._parse_float(note_el.get_text(" ", strip=True))

            pos_text = None
            neg_text = None

            for p in comm.find_all("p"):
                pos_text = pos_text or extract_points_from_p(p, "Les points positifs :")
                neg_text = neg_text or extract_points_from_p(p, "Les points négatifs :")
                # fallback sans accent
                neg_text = neg_text or extract_points_from_p(p, "Les points negatifs :")

            # Texte intégral pour IA: concat propre (sans labels)
            text_parts = []
            if pos_text:
                text_parts.append(pos_text)
            if neg_text:
                text_parts.append(neg_text)
            text_for_model = self._normalize_spaces("\n\n".join(text_parts))

            if not text_for_model:
                # fallback: texte brut du bloc avis (si la structure diffère)
                text_for_model = self._normalize_spaces(comm.get_text(" ", strip=True))
                if not text_for_model:
                    continue

            reviews.append(
                {
                    "id": self._normalize_spaces(str(external_id)) if external_id else None,
                    "text": text_for_model,
                    "positive": pos_text,
                    "negative": neg_text,
                    "rating": rating,
                    "date": None,
                }
            )
        return reviews

    def _extract_all_reviews(self, session: requests.Session, base_url: str) -> Tuple[List[Dict[str, Any]], List[str]]:
        soup_first = self._safe_get(session, base_url)
        if not soup_first:
            return [], []

        pages = self._discover_review_pages(base_url, soup_first)
        all_reviews: List[Dict[str, Any]] = []
        visited: set[str] = set()
        for url in pages:
            if url in visited:
                continue
            visited.add(url)
            soup = soup_first if url == self._canonicalize_url(base_url, base_url) else self._safe_get(session, url)
            if not soup:
                continue
            all_reviews.extend(self._extract_reviews_from_soup(soup))
        return all_reviews, pages

    # ------------------------------------------------------------------ #
    #  Mongo writes                                                      #
    # ------------------------------------------------------------------ #

    def _upsert_reviews_raw(
        self,
        com: str,
        url_page: str,
        reviews_full: List[Dict[str, Any]],
        nom_commune: Optional[str] = None,
    ) -> None:
        if not reviews_full:
            return
        now_utc = datetime.now(timezone.utc)
        ops: List[UpdateOne] = []
        writes_count = 0

        for item in reviews_full:
            text = self._normalize_spaces(item.get("text") or "")
            if not text:
                continue
            text_hash = self._compute_text_hash(text)
            external_comment_id = self._normalize_spaces(item.get("id") or "") or None

            model = ReviewRawModel(
                com=com,
                source=SOURCE,
                external_comment_id=external_comment_id,
                text=text,
                rating=item.get("rating"),
                date=item.get("date"),
                collected_at=now_utc,
                url_page=url_page,
            )

            selector = {"source": model.source, "com": model.com, "external_comment_id": model.external_comment_id}
            if not model.external_comment_id:
                selector = {"source": model.source, "com": model.com, "text_hash": text_hash}

            ops.append(
                UpdateOne(
                    selector,
                    {
                        "$set": {
                            "source": model.source,
                            "com": model.com,
                            "nom_commune": nom_commune,
                            "external_comment_id": model.external_comment_id,
                            "text": model.text,
                            "text_hash": text_hash,
                            "rating": model.rating,
                            "date": model.date,
                            "collected_at": model.collected_at,
                            "url_page": model.url_page,
                            # champs additionnels (toujours Spark-friendly)
                            "positive": item.get("positive"),
                            "negative": item.get("negative"),
                        }
                    },
                    upsert=True,
                )
            )

            if len(ops) >= MONGO_BULK_BATCH_SIZE:
                try:
                    self.reviews_store.bulk_write(ops, ordered=False)
                    writes_count += len(ops)
                except BulkWriteError as exc:
                    logger.warning("BulkWrite reviews partiellement échoué pour %s: %s", com, exc.details)
                    writes_count += len(ops)
                ops.clear()

        if ops:
            try:
                self.reviews_store.bulk_write(ops, ordered=False)
                writes_count += len(ops)
            except BulkWriteError as exc:
                logger.warning("BulkWrite reviews partiellement échoué pour %s: %s", com, exc.details)
                writes_count += len(ops)

        if writes_count:
            logger.debug("Reviews raw upsert (%s): %d opération(s) pour com=%s", SOURCE, writes_count, com)

    # ------------------------------------------------------------------ #
    #  Traitement d'une ville                                            #
    # ------------------------------------------------------------------ #

    def process_city(self, city_info: Tuple[str, str, str]) -> Optional[Dict[str, Any]]:
        com, name, base_url = city_info
        session = self._get_thread_session()
        soup = self._safe_get(session, base_url)
        if not soup:
            return None

        resolved_city_url = base_url
        canonical_el = soup.select_one('link[rel="canonical"][href]')
        if canonical_el:
            candidate = self._canonicalize_url(base_url, canonical_el.get("href", ""))
            try:
                if self._extract_com_id_from_url(candidate) == com:
                    resolved_city_url = candidate
            except ValueError:
                pass

        payload = CityScrapePayload(com=com, nom_commune=name)
        notes: VilleIdealeNotesDoc = self._extract_notes(soup)  # type: ignore[assignment]
        reviews_full, review_pages = self._extract_all_reviews(session, resolved_city_url)

        now_utc = datetime.now(timezone.utc)
        doc: CommuneHarvestVIDoc = {
            "com": com,
            "nom_commune": name,
            "source": SOURCE,
            "links": {"city_page": resolved_city_url},
            "notes": notes,
            "nb_avis": len(reviews_full),
            "reviews_refs": {
                "count": len(reviews_full),
                "pages": review_pages,
                "last_collected_at": now_utc,
            },
            "updated_at": now_utc,
        }
        direct_doc = self._build_commune_direct_document(commune_doc=doc)

        try:
            self.city_store.update_one({"com": com}, {"$set": doc}, upsert=True)
            self.city_direct_store.update_one({"com": com}, {"$set": direct_doc}, upsert=True)
            self._upsert_reviews_raw(
                com=com,
                url_page=resolved_city_url,
                reviews_full=reviews_full,
                nom_commune=name,
            )
        except PyMongoError:
            logger.exception("Erreur Mongo pendant persist ville com=%s nom=%s url=%s", com, name, base_url)
            return None

        return {"com": com, "nom_commune": name, "url": resolved_city_url}

    def _build_commune_direct_document(self, commune_doc: CommuneHarvestVIDoc) -> CommuneDirectVIDoc:
        """Aplatit communes_harvest_vi -> communes_direct_vi (Spark-ready), style BDMV."""
        notes = commune_doc.get("notes") or {}
        reviews_refs = commune_doc.get("reviews_refs") or {}
        links = commune_doc.get("links") or {}
        direct: CommuneDirectVIDoc = {
            "com": commune_doc.get("com"),
            "nom_commune": commune_doc.get("nom_commune"),
            "source": commune_doc.get("source"),
            "city_page": links.get("city_page"),
            "nb_avis": commune_doc.get("nb_avis"),
            "reviews_refs_count": reviews_refs.get("count"),
            "reviews_refs_last_collected_at": reviews_refs.get("last_collected_at"),
            "updated_at": commune_doc.get("updated_at"),
            "note_environnement_10": notes.get("note_environnement_10"),
            "note_transports_10": notes.get("note_transports_10"),
            "note_sante_10": notes.get("note_sante_10"),
            "note_securite_10": notes.get("note_securite_10"),
            "note_sports_loisirs_10": notes.get("note_sports_loisirs_10"),
            "note_culture_10": notes.get("note_culture_10"),
            "note_enseignement_10": notes.get("note_enseignement_10"),
            "note_commerces_10": notes.get("note_commerces_10"),
            "note_qualite_vie_10": notes.get("note_qualite_vie_10"),
        }
        return direct

    # ------------------------------------------------------------------ #
    #  Progression / queue                                               #
    # ------------------------------------------------------------------ #

    def _update_progress(self) -> None:
        with self._progress_lock:
            self.newly_processed += 1
            done = self.already_done + self.newly_processed
            total = self.total_in_queue or 1
            pct = (done / total) * 100.0
            elapsed = max(time.time() - self.start_time, 1e-6)
            rate_per_min = (self.newly_processed / elapsed) * 60.0
            elapsed_h = int(elapsed // 3600)
            elapsed_m = int((elapsed % 3600) // 60)
            elapsed_s = int(elapsed % 60)
            current_workers = self.active_workers
            max_workers = self.max_active_workers
        logger.info(
            "Progression (%s) : %d/%d traitées (%.2f%%) — %02d:%02d:%02d — %.2f villes/min — workers: %d (max: %d).",
            SOURCE,
            done,
            total,
            pct,
            elapsed_h,
            elapsed_m,
            elapsed_s,
            rate_per_min,
            current_workers,
            max_workers,
        )

    def _mark_queue_processed_mongo(self, com_id: str, old_url: str, resolved_url: Optional[str] = None) -> None:
        now_utc = datetime.now(timezone.utc)
        self.queue_store.update_one(
            {"source": SOURCE, "com_id": com_id},
            {
                "$set": {
                    "is_processed": True,
                    "processed_at": now_utc,
                    "updated_at": now_utc,
                    "url": resolved_url or old_url,
                    "resolved_url": resolved_url or old_url,
                },
                "$inc": {"attempt_count": 1},
            },
        )

    def _mark_queue_failed_mongo(self, com_id: str, old_url: str, error_msg: str) -> None:
        now_utc = datetime.now(timezone.utc)
        self.queue_store.update_one(
            {"source": SOURCE, "com_id": com_id},
            {
                "$set": {
                    "last_error": error_msg[:500],
                    "updated_at": now_utc,
                    "url": old_url,
                },
                "$inc": {"attempt_count": 1},
            },
        )

    def _process_queue_entry(self, entry: Tuple[str, str, str]) -> Optional[Dict[str, Any]]:
        com, nom_commune, url = entry
        with self._progress_lock:
            self.active_workers += 1
            if self.active_workers > self.max_active_workers:
                self.max_active_workers = self.active_workers
        try:
            row = self.process_city((com, nom_commune, url))
            if row:
                self._mark_queue_processed_mongo(
                    com_id=com,
                    old_url=url,
                    resolved_url=(row.get("url") if isinstance(row, dict) else None),
                )
                self._update_progress()
            else:
                self._mark_queue_failed_mongo(com_id=com, old_url=url, error_msg="Aucune donnée collectée")
            return row
        except Exception as exc:
            try:
                self._mark_queue_failed_mongo(com_id=com, old_url=url, error_msg=str(exc))
            except PyMongoError:
                logger.exception("Impossible de marquer la queue en échec pour %s", url)
            logger.warning("Erreur de traitement queue pour %s (%s): %s", nom_commune, com, exc)
            return None
        finally:
            with self._progress_lock:
                self.active_workers -= 1

    # ------------------------------------------------------------------ #
    #  Pipeline                                                          #
    # ------------------------------------------------------------------ #

    def start(self) -> None:
        try:
            self._sync_queue_from_sitemap(force_rescrape=True)
            vi_total = self.queue_store.count_documents({"source": SOURCE})
            vi_pending = self.queue_store.count_documents(
                {"source": SOURCE, "is_processed": False}
            )
            logger.info(
                "Snapshot queue (%s): total=%d, pending=%d",
                SOURCE,
                vi_total,
                vi_pending,
            )
            queue_entries = self._load_queue_entries()
            pending_count = self.total_in_queue - self.already_done
            if pending_count <= 0:
                logger.warning(
                    "Aucune entrée pending à scraper pour source=%s (total=%d, already_done=%d).",
                    SOURCE,
                    self.total_in_queue,
                    self.already_done,
                )
                return

            self.start_time = time.time()
            max_workers = 12
            logger.info(
                "Début de la collecte (%s) pour %d villes avec ThreadPoolExecutor(max_workers=%d).",
                SOURCE,
                pending_count,
                max_workers,
            )

            success_count = 0
            failure_count = 0
            with ThreadPoolExecutor(max_workers=max_workers) as executor:
                for row in executor.map(self._process_queue_entry, queue_entries, chunksize=8):
                    if row:
                        success_count += 1
                    else:
                        failure_count += 1

            elapsed = max(time.time() - self.start_time, 1e-6)
            rate_per_min = (success_count / elapsed) * 60.0
            elapsed_h = int(elapsed // 3600)
            elapsed_m = int((elapsed % 3600) // 60)
            elapsed_s = int(elapsed % 60)
            logger.info(
                "Collecte terminée (%s): %d traitée(s), %d erreur(s) sur %d — %02d:%02d:%02d (%.1fs, %.2f/min). Max workers: %d.",
                SOURCE,
                success_count,
                failure_count,
                pending_count,
                elapsed_h,
                elapsed_m,
                elapsed_s,
                elapsed,
                rate_per_min,
                self.max_active_workers,
            )
        except PyMongoError:
            logger.exception("Erreur Mongo fatale du pipeline (%s).", SOURCE)
        except Exception as err:
            logger.critical("Erreur fatale du pipeline (%s) : %s", SOURCE, err)
        finally:
            try:
                self.mongo_client.close()
            except Exception:
                pass


if __name__ == "__main__":
    VilleIdealeHarvester().start()

