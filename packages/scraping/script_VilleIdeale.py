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
import re
import sys
import threading
import time
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterator, List, Optional, Tuple
from urllib.parse import urljoin, urlparse, urlunparse

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
MONGO_BULK_BATCH_SIZE = 500
MAX_REVIEW_PAGES_PER_CITY = 80  # garde-fou anti-boucle / pagination infinie


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
        segment = re.sub(r"\.html?$", "", segment, flags=re.IGNORECASE)
        m = re.search(r"_((?:2A|2B)\d{3}|\d{5})\b", segment, flags=re.IGNORECASE)
        if not m:
            raise ValueError(f"Impossible d'extraire com_id depuis '{segment}'")
        return m.group(1).upper()

    def _extract_nom_commune_from_url(self, url: str, fallback: str) -> str:
        try:
            parsed = urlparse(url)
            segment = parsed.path.rstrip("/").split("/")[-1]
            segment = re.sub(r"\.html?$", "", segment, flags=re.IGNORECASE)
            m = re.search(r"_((?:2A|2B)\d{3}|\d{5})\b", segment, flags=re.IGNORECASE)
            name_part = segment[: m.start()] if m else segment
            name_part = name_part.replace("-", " ").replace("_", " ").strip()
            return name_part.upper() if name_part else fallback
        except Exception:
            return fallback

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
            path = p.path.rstrip("/")
            segs = [s for s in path.split("/") if s]
            if not segs:
                return False
            # Ville-Idéale : pages ville sous forme /slug_75056 (souvent sans slash final)
            last = segs[-1].lower()
            if last.endswith(".xml") or last.endswith(".xml.gz") or "sitemap" in last:
                return False
            if len(segs) != 1:
                return False
            if not re.search(r"_((?:2a|2b)\d{3}|\d{5})\b", last, flags=re.IGNORECASE):
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

        try:
            urls = self._fetch_city_urls_from_sitemap()
        except Exception as exc:
            logger.warning("Impossible de synchroniser la queue depuis le sitemap: %s", exc)
            return
        if not urls:
            logger.warning("Sitemap vide/non exploitable: aucune URL ajoutée à la queue.")
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
        self.total_in_queue = self.queue_store.count_documents({"source": SOURCE})
        self.already_done = self.queue_store.count_documents({"source": SOURCE, "is_processed": True})
        remaining = self.queue_store.count_documents({"source": SOURCE, "is_processed": False})
        if remaining == 0:
            logger.info("Aucune URL à traiter dans la queue Mongo pour source=%s.", SOURCE)
            return iter(())
        logger.info(
            "Queue chargée (%s) : %d entrée(s) à traiter, %d déjà traitée(s) sur %d.",
            SOURCE,
            remaining,
            self.already_done,
            self.total_in_queue,
        )
        cursor = (
            self.queue_store.find(
                {"source": SOURCE, "is_processed": False},
                {"url": 1, "com_id": 1, "nom_commune_guess": 1},
            )
            .sort("url", 1)
            .batch_size(500)
        )
        for d in cursor:
            d = d  # type: QueueDoc
            url = d.get("url")
            com_id = d.get("com_id")
            if not url or not com_id:
                continue
            nom_commune = d.get("nom_commune_guess") or self._extract_nom_commune_from_url(url, com_id)
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
            )
            adapter = HTTPAdapter(max_retries=retries, pool_connections=20, pool_maxsize=20)
            session.mount("http://", adapter)
            session.mount("https://", adapter)
            self._thread_local.session = session
        return session

    def _safe_get(self, session: requests.Session, url: str) -> Optional[BeautifulSoup]:
        try:
            resp = session.get(url, headers=self.headers, timeout=20)
            resp.raise_for_status()
            return BeautifulSoup(resp.text, "html.parser")
        except requests.RequestException as exc:
            logger.warning("Erreur HTTP sur %s : %s", url, exc)
            return None

    # ------------------------------------------------------------------ #
    #  Extracteurs Ville-Idéale                                          #
    # ------------------------------------------------------------------ #

    def _extract_notes(self, soup: BeautifulSoup) -> Dict[str, Optional[float]]:
        """
        Notes /10 attendues dans div#notes_graph table.
        Retourne un mapping standardisé.
        """
        mapping = {
            "environnement": "note_environnement_10",
            "transports": "note_transports_10",
            "santé": "note_sante_10",
            "sante": "note_sante_10",
            "sécurité": "note_securite_10",
            "securite": "note_securite_10",
            "sports et loisirs": "note_sports_loisirs_10",
            "sport et loisirs": "note_sports_loisirs_10",
            "culture": "note_culture_10",
            "enseignement": "note_enseignement_10",
            "commerces": "note_commerces_10",
            "qualité de vie": "note_qualite_vie_10",
            "qualite de vie": "note_qualite_vie_10",
        }
        out: VilleIdealeNotesDoc = {v: None for v in mapping.values()}  # type: ignore[assignment]

        container = soup.find("div", id="notes_graph") or soup.select_one("#notes_graph")
        if not container:
            return out
        table = container.find("table") if container else None
        if not table:
            return out

        for row in table.find_all("tr"):
            cells = row.find_all(["th", "td"])
            if len(cells) < 2:
                continue
            label = self._normalize_spaces(cells[0].get_text(" ", strip=True)).lower()
            val = self._normalize_spaces(cells[-1].get_text(" ", strip=True))
            if not label:
                continue
            key = mapping.get(label)
            if not key:
                label = re.sub(r"\s+", " ", label)
                key = mapping.get(label)
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
        Avis attendus dans section#avis article.review.
        On extrait séparément p.pos / p.neg.
        """
        reviews: List[Dict[str, Any]] = []
        avis_section = soup.find("section", id="avis") or soup.select_one("section#avis")
        scope = avis_section or soup

        for article in scope.select("article.review"):
            external_id = (
                article.get("data-id")
                or article.get("id")
                or (article.get("data-review-id") if article else None)
            )

            pos_parts = [
                self._normalize_spaces(p.get_text(" ", strip=True))
                for p in article.select("p.pos")
            ]
            neg_parts = [
                self._normalize_spaces(p.get_text(" ", strip=True))
                for p in article.select("p.neg")
            ]
            pos_text = self._normalize_spaces(" ".join([x for x in pos_parts if x]))
            neg_text = self._normalize_spaces(" ".join([x for x in neg_parts if x]))

            # texte fallback si le HTML n'utilise pas pos/neg partout
            raw_text = self._normalize_spaces(article.get_text(" ", strip=True))
            if not (pos_text or neg_text):
                # on garde un texte non vide pour ne pas perdre l'avis
                pos_text = None
                neg_text = None
                text_for_model = raw_text
            else:
                text_for_model = self._normalize_spaces(
                    " | ".join([t for t in [pos_text and f"+ {pos_text}", neg_text and f"- {neg_text}"] if t])
                )

            # rating / date (best effort)
            rating_el = article.select_one('[itemprop="ratingValue"], .rating, .note, .score')
            rating = self._parse_float(rating_el.get_text(" ", strip=True)) if rating_el else None
            time_el = article.find("time")
            date_val = None
            if time_el:
                date_val = time_el.get("datetime") or time_el.get_text(" ", strip=True)
            else:
                date_candidate = article.select_one(".date, .review_date")
                if date_candidate:
                    date_val = date_candidate.get_text(" ", strip=True)
            date_iso = self._parse_date_iso(date_val)

            if not text_for_model:
                continue

            reviews.append(
                {
                    "id": self._normalize_spaces(str(external_id)) if external_id else None,
                    "text": text_for_model,
                    "positive": pos_text,
                    "negative": neg_text,
                    "rating": rating,
                    "date": date_iso,
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

        payload = CityScrapePayload(com=com, nom_commune=name)
        notes: VilleIdealeNotesDoc = self._extract_notes(soup)  # type: ignore[assignment]
        reviews_full, review_pages = self._extract_all_reviews(session, base_url)

        now_utc = datetime.now(timezone.utc)
        doc: CommuneHarvestVIDoc = {
            "com": com,
            "nom_commune": name,
            "source": SOURCE,
            "links": {"city_page": base_url},
            "notes": notes,
            "nb_avis": len(reviews_full),
            "reviews_refs": {
                "count": len(reviews_full),
                "pages": review_pages,
                "last_collected_at": now_utc,
            },
            "updated_at": now_utc,
        }

        # Spark-ready: on duplique les notes en colonnes racine (comme communes_direct côté BDMV)
        for k, v in (notes or {}).items():
            doc[k] = v  # type: ignore[index]

        try:
            self.city_store.update_one({"com": com}, {"$set": doc}, upsert=True)
            self._upsert_reviews_raw(
                com=com,
                url_page=base_url,
                reviews_full=reviews_full,
                nom_commune=name,
            )
        except PyMongoError:
            logger.exception("Erreur Mongo pendant persist ville com=%s nom=%s url=%s", com, name, base_url)
            return None

        return {"com": com, "nom_commune": name, "url": base_url}

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

    def _mark_queue_processed_mongo(self, url: str) -> None:
        now_utc = datetime.now(timezone.utc)
        self.queue_store.update_one(
            {"url": url},
            {"$set": {"is_processed": True, "processed_at": now_utc, "updated_at": now_utc}, "$inc": {"attempt_count": 1}},
        )

    def _mark_queue_failed_mongo(self, url: str, error_msg: str) -> None:
        now_utc = datetime.now(timezone.utc)
        self.queue_store.update_one(
            {"url": url},
            {"$set": {"last_error": error_msg[:500], "updated_at": now_utc}, "$inc": {"attempt_count": 1}},
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
                self._mark_queue_processed_mongo(url)
                self._update_progress()
            else:
                self._mark_queue_failed_mongo(url, "Aucune donnée collectée")
            return row
        except Exception as exc:
            try:
                self._mark_queue_failed_mongo(url, str(exc))
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
            queue_entries = self._load_queue_entries()
            pending_count = self.total_in_queue - self.already_done
            if pending_count <= 0:
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

