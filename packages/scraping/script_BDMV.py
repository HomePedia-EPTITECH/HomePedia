import re
import sys
import time
import threading
import logging
import gzip
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup
from pymongo import MongoClient, UpdateOne
from pymongo.errors import OperationFailure
from unidecode import unidecode

_ROOT = Path(__file__).resolve().parents[1]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))
from models import (
    CommuneHarvestDoc,
    CityScrapePayload,
    QueueDoc,
    ReviewRawModel,
)
from packages.shared.util.config import get_mongo_db_name, get_mongo_uri

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")


SITEMAP_URL = "https://www.bien-dans-ma-ville.fr/sitemap.xml"
CITY_PAGES_QUEUE_COLLECTION = "city_pages_queue"
COMMUNES_DIRECT_COLLECTION = "communes_direct"


class HomepediaHarvester:
    def __init__(self) -> None:
        self.mongo_client = MongoClient(get_mongo_uri())
        self.raw_db = self.mongo_client[get_mongo_db_name()]
        self.queue_store = self.raw_db[CITY_PAGES_QUEUE_COLLECTION]
        self.city_store = self.raw_db["communes_harvest"]
        self.city_direct_store = self.raw_db[COMMUNES_DIRECT_COLLECTION]
        self.reviews_store = self.raw_db["reviews_raw"]
        self.dept_store = self.raw_db["departements"]
        self.headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/121.0.0.0 Safari/537.36"
            )
        }
        # Compteurs pour le suivi de progression / perf
        self._progress_lock = threading.Lock()
        self._thread_local = threading.local()
        self.total_in_queue: int = 0
        self.already_done: int = 0
        self.newly_processed: int = 0
        self.active_workers: int = 0
        self.max_active_workers: int = 0
        self.start_time: float = 0.0

        self._ensure_mongo_indexes()

    def _ensure_mongo_indexes(self) -> None:
        def safe_create_index(collection, keys, **kwargs) -> None:
            try:
                collection.create_index(keys, **kwargs)
            except OperationFailure as exc:
                # Code 85 = même index déjà présent sous un autre nom.
                if getattr(exc, "code", None) == 85:
                    logging.info("Index déjà présent (%s): %s", collection.name, exc)
                    return
                raise

        # Aligner les index avec les migrations Mongo nommées.
        safe_create_index(
            self.queue_store,
            [("url", 1)],
            unique=True,
            name="idx_city_pages_queue_url_unique",
        )
        safe_create_index(
            self.queue_store,
            [("is_processed", 1), ("url", 1)],
            name="idx_city_pages_queue_unprocessed_by_url",
        )
        safe_create_index(
            self.queue_store,
            [("com_id", 1), ("is_processed", 1)],
            name="idx_city_pages_queue_by_com_and_status",
        )
        safe_create_index(
            self.queue_store,
            [("attempt_count", 1), ("updated_at", -1)],
            name="idx_city_pages_queue_attempts_recent",
        )
        safe_create_index(self.city_store, [("com", 1)], unique=True)
        safe_create_index(self.city_direct_store, [("com", 1)], unique=True)
        safe_create_index(self.reviews_store, [("com", 1), ("collected_at", -1)])
        safe_create_index(self.dept_store, [("code_dept", 1)], unique=True)

    # ---------- OUTILS / FILE DES PAGES VILLE ----------

    def _extract_com_id_from_url(self, url: str) -> str:
        """
        Extrait l'identifiant commune (com_id) à partir de la fin de l'URL.

        Ex : https://www.bien-dans-ma-ville.fr/paris-01284/  -> '01284'
        """
        try:
            parsed = urlparse(url)
            path = parsed.path.rstrip("/")
            if not path:
                raise ValueError("Chemin vide dans l'URL")
            last_segment = path.split("/")[-1]
            # Tolère les URLs finissant en .html.
            last_segment = re.sub(r"\.html?$", "", last_segment, flags=re.IGNORECASE)
            # Exemples valides:
            # - olmeta-di-capocorso-2B187   -> 2B187
            # - paris-75056                 -> 75056
            # - paris-75056-cedex (fallback)-> 75056
            m = re.search(r"-((?:2A|2B)\d{3}|\d{5})$", last_segment, flags=re.IGNORECASE)
            if not m:
                # Fallback: dernière séquence plausible dans le segment
                m = re.search(r"((?:2A|2B)\d{3}|\d{5})", last_segment, flags=re.IGNORECASE)
            if not m:
                raise ValueError(f"Impossible d'extraire com_id depuis le segment '{last_segment}'")
            return m.group(1).upper()
        except Exception as exc:
            # Gestion robuste des URLs malformées
            raise ValueError(f"URL malformée '{url}': {exc}") from exc

    def _extract_nom_commune_from_url(self, url: str, fallback: str) -> str:
        try:
            parsed = urlparse(url)
            slug = parsed.path.rstrip("/").split("/")[-1]
            slug = re.sub(r"\.html?$", "", slug, flags=re.IGNORECASE)
            m = re.search(r"-((?:2A|2B)\d{3}|\d{5})$", slug, flags=re.IGNORECASE)
            name_part = slug[: m.start()] if m else slug
            return name_part.replace("-", " ").upper()
        except Exception:
            return fallback

    def _fetch_city_urls_from_sitemap(self) -> List[str]:
        """
        Récupère les URLs ville depuis le sitemap principal.
        Gère les deux formats:
        - sitemap index (qui pointe vers d'autres sitemaps)
        - urlset direct
        """
        base_origin = f"{urlparse(SITEMAP_URL).scheme}://{urlparse(SITEMAP_URL).netloc}"

        def parse_xml_bytes(data: bytes) -> ET.Element:
            raw = data
            # Certains providers servent des .xml.gz
            if raw[:2] == b"\x1f\x8b":
                raw = gzip.decompress(raw)
            return ET.fromstring(raw)

        def is_city_url(u: str) -> bool:
            p = urlparse(u)
            path = p.path.rstrip("/")
            segments = [s for s in path.split("/") if s]
            segment = segments[-1].lower() if segments else ""
            if "/avis.html" in u:
                return False
            if "/classement-" in u:
                return False
            # On ne veut que les pages ville à la racine: /slug-code/
            # Exclut /blog/... , /actualites/... etc.
            if len(segments) != 1:
                return False
            if u.endswith(".xml") or u.endswith(".xml.gz") or "/sitemap" in u:
                return False
            # Filtre souple: garder les pages avec slug type "nom-nom-xxxxx".
            if not ("-" in segment and len(segment) >= 6):
                return False
            try:
                _ = self._extract_com_id_from_url(u)
            except ValueError:
                return False
            return True

        # Sources d'entrée robustes (selon config du site)
        to_visit: List[str] = [
            SITEMAP_URL,
            f"{base_origin}/sitemap_index.xml",
        ]
        visited: set[str] = set()
        city_urls: set[str] = set()

        # robots.txt peut déclarer les sous-sitemaps réels
        try:
            robots = requests.get(f"{base_origin}/robots.txt", headers=self.headers, timeout=20)
            if robots.ok:
                for line in robots.text.splitlines():
                    if line.lower().startswith("sitemap:"):
                        u = line.split(":", 1)[1].strip()
                        if u and u not in to_visit:
                            to_visit.append(u)
        except Exception:
            pass

        while to_visit:
            sitemap_url = to_visit.pop()
            if sitemap_url in visited:
                continue
            visited.add(sitemap_url)

            try:
                resp = requests.get(sitemap_url, headers=self.headers, timeout=30)
                resp.raise_for_status()
            except Exception:
                continue

            xml_locs: List[str] = []
            try:
                root = parse_xml_bytes(resp.content)
                for loc in root.findall(".//{*}loc"):
                    if loc.text:
                        xml_locs.append(loc.text.strip())
            except Exception:
                # Fallback si endpoint renvoie du HTML
                soup = BeautifulSoup(resp.text, "html.parser")
                for a in soup.find_all("a", href=True):
                    href = a["href"].strip()
                    if href.startswith("http"):
                        xml_locs.append(href)

            for u in xml_locs:
                # Sous-sitemap (index)
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
            # Important: si la queue existe déjà, on remet tout en non traité
            # pour relancer un run complet même si le sitemap est partiellement indisponible.
            self.queue_store.update_many(
                {},
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
            logging.warning("Impossible de synchroniser la queue Mongo depuis le sitemap: %s", exc)
            return
        if not urls:
            logging.warning("Sitemap vide ou non exploitable: aucune URL ajoutée à la queue.")
            return
        ops: List[UpdateOne] = []
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
        if ops:
            self.queue_store.bulk_write(ops, ordered=False)
            mode = "rescrape complet" if force_rescrape else "ajout nouvelles URLs"
            logging.info(
                "Queue Mongo synchronisée depuis sitemap: %d URLs (%s), %d URL(s) ignorée(s).",
                len(ops),
                mode,
                skipped_invalid,
            )
        else:
            logging.warning(
                "Aucune URL exploitable après parsing sitemap (%d candidates, %d ignorées).",
                len(urls),
                skipped_invalid,
            )

    def _load_queue_entries(self) -> List[Tuple[str, str, str]]:
        self.total_in_queue = self.queue_store.count_documents({})
        self.already_done = self.queue_store.count_documents({"is_processed": True})
        rows = list(
            self.queue_store.find(
                {"is_processed": False},
                {"url": 1, "com_id": 1, "nom_commune_guess": 1},
            ).sort("url", 1)
        )
        if not rows:
            logging.info("Aucune URL à traiter dans la queue Mongo.")
            return []
        entries: List[Tuple[str, str, str]] = []
        for d in rows:
            d = d  # type: QueueDoc
            url = d.get("url")
            com_id = d.get("com_id")
            nom_commune = d.get("nom_commune_guess") or self._extract_nom_commune_from_url(url, com_id)
            entries.append((com_id, nom_commune, url))
        logging.info(
            "Queue Mongo chargée : %d entrées à traiter, %d déjà traitées sur un total de %d.",
            len(entries),
            self.already_done,
            self.total_in_queue,
        )
        return entries

    # ---------- OUTILS HTTP / SCRAP ----------

    def _generate_url(self, com: str, name: str) -> str:
        name_clean = unidecode(name).lower().replace(" ", "-")
        return f"https://www.bien-dans-ma-ville.fr/{name_clean}-{com}/"

    def _safe_get(self, session: requests.Session, url: str) -> Optional[BeautifulSoup]:
        try:
            resp = session.get(url, headers=self.headers, timeout=20)
            resp.raise_for_status()
            return BeautifulSoup(resp.text, "html.parser")
        except Exception as exc:
            logging.warning("Erreur HTTP sur %s : %s", url, exc)
            return None

    def _get_thread_session(self) -> requests.Session:
        session = getattr(self._thread_local, "session", None)
        if session is None:
            session = requests.Session()
            session.headers.update(self.headers)
            self._thread_local.session = session
        return session
    def _extract_demographics(self, soup: BeautifulSoup, metrics: Dict[str, Any]) -> None:
        try:
            label_stats = {
                "Nombre d'habitants": "nb_habitant",
                "Nombre d’habitants": "nb_habitant",
                "Age moyen": "age_moyen",
                "Âge moyen": "age_moyen",
                "Pop active": "pop_active",
                "Taux chômage": "taux_chomage",
                "Taux de chômage": "taux_chomage",
                "Pop densité": "pop_densite",
                "Densité de population": "pop_densite",
                "Revenu moyen": "revenu_moyen",
            }
            table = soup.find("table", class_="bloc_chiffre")
            if not table:
                section = soup.find("section", id="chiffres")
                if section:
                    table = section.find("table")
            if table:
                for row in table.find_all("tr"):
                    th = row.find("th")
                    tds = row.find_all("td")
                    if th and tds and th.get_text(strip=True) in label_stats:
                        metrics[label_stats[th.get_text(strip=True)]] = tds[0].get_text(strip=True)
                    elif len(tds) >= 2 and tds[0].get_text(strip=True) in label_stats:
                        metrics[label_stats[tds[0].get_text(strip=True)]] = tds[1].get_text(
                            strip=True
                        )
            text = soup.get_text()
            m = re.search(r"superficie\s+de\s+([\d\s]+)\s*km²", text, re.IGNORECASE)
            if m:
                metrics["superficie_km2"] = m.group(1).replace("\xa0", " ").strip()
            m_est = re.search(r"estimée\s+à\s+([\d\s]+)\s+habitants", text)
            if m_est:
                metrics["estimation_pop_2026"] = m_est.group(1).replace("\xa0", " ").strip()
            m_2025 = re.search(r"\((\d[\d\s]*?)\s+en\s+2025\)", text)
            if m_2025:
                metrics["estimation_pop_2025"] = m_2025.group(1).replace("\xa0", " ").strip()
            label_charts = {
                "Tranche d'âge": {
                    "0-14 ans": "part_0_14_ans",
                    "15-29 ans": "part_15_29_ans",
                    "30-44 ans": "part_30_44_ans",
                    "45-59 ans": "part_45_59_ans",
                    "60-74 ans": "part_60_74_ans",
                    "75-89 ans": "part_75_89_ans",
                    "90 ans et +": "part_90_plus",
                },
                "Activité professionnelle": {
                    "Cadres et sup.": "part_cadres",
                    "Retraité": "part_retraites",
                    "Employé": "part_employes",
                    "Ouvrier": "part_ouvriers",
                },
                "Niveau de diplôme": {
                    "Sans diplôme ou CEP": "part_sans_diplome",
                    "BAC+5 ou plus": "part_bac5_plus",
                },
                "Composition des ménages": {
                    "Couple avec enfant(s)": "part_couple_avec_enfant",
                    "Personnes seules": "part_personnes_seules",
                },
            }
            for chart in soup.find_all("div", class_="chart"):
                h3 = chart.find("h3")
                title = h3.get_text(strip=True) if h3 else None
                if not title or title not in label_charts:
                    continue
                mapping = label_charts[title]
                for item in chart.select("div.graph div.item"):
                    h4 = item.find("h4")
                    pourcent = item.find("div", class_="pourcent")
                    label = h4.get_text(strip=True) if h4 else None
                    if label and pourcent and label in mapping:
                        metrics[mapping[label]] = pourcent.get_text(strip=True)
            m_part1 = re.search(r"Participation\s*:\s*([\d,.\s]+)%", text)
            if m_part1:
                metrics["participation_1er_tour"] = m_part1.group(1).replace(",", ".").strip()
            m_inscrits = re.search(r"(\d[\d\s]*?)\s+inscrits", text)
            if m_inscrits:
                metrics["inscrits_election"] = m_inscrits.group(1).replace("\xa0", " ").strip()
            idx_2nd = text.find("Second tour")
            if idx_2nd >= 0:
                m_part2 = re.search(r"Participation\s*:\s*([\d,.\s]+)%", text[idx_2nd:])
                if m_part2:
                    metrics["participation_2nd_tour"] = m_part2.group(1).replace(",", ".").strip()
            # Code postal : priorité au <small> sous le titre (section #entete)
            # Ex: <h1>Paris <small>75001 Paris</small></h1>
            small_candidates = []
            h1 = soup.find("h1")
            if h1:
                direct_small = h1.find("small")
                if direct_small:
                    small_candidates.append(direct_small)
                small_candidates.extend(h1.find_all_next("small", limit=3))
            if not small_candidates:
                small_candidates = soup.find_all("small", limit=10)
            for sm in small_candidates:
                sm_txt = sm.get_text(" ", strip=True)
                m_small = re.search(r"\b(\d{5})\b", sm_txt)
                if m_small:
                    metrics["code_postal"] = m_small.group(1)
                    break
            for link in soup.select('a[href*="/regions/"]'):
                t = link.get_text(strip=True)
                if t and t not in {"Régions"}:
                    metrics["nom_region"] = t
                    break
            for link in soup.select('a[href*="/departements/"]'):
                t = link.get_text(strip=True)
                if t and t not in {"Départements"}:
                    metrics["nom_departement"] = t
                    break
            for link in soup.select('a[href*="/metropoles/"]'):
                t = link.get_text(strip=True)
                if t and t not in {"Métropoles"}:
                    metrics["nom_metropole"] = t
                    break
            section_mairie = soup.find("section", id="mairie")
            if not section_mairie:
                for h2 in soup.find_all("h2"):
                    if "Mairie" in (h2.get_text() or ""):
                        section_mairie = h2.find_parent("section") or h2.find_next("section")
                        break
            if section_mairie:
                m_maire = re.search(
                    r"(?:M\.|Mme|Monsieur|Madame)\s+[\w\s\-]+(?=\s*Maire|\s*$)",
                    section_mairie.get_text(),
                )
                if m_maire:
                    metrics["nom_maire"] = m_maire.group(0).strip()
        except Exception as exc:
            logging.warning("Erreur extraction démographie : %s", exc)

    def _extract_security_services(
        self, soup: BeautifulSoup, metrics: Dict[str, Any]
    ) -> Dict[str, Any]:
        result: Dict[str, Any] = {"services_population": [], "services_population_counts": {}}
        try:
            # Mapping label -> clé de métrique normalisée
            label_to_metric = {
                # Commerce
                "Hypermarché": "nb_hypermarches",
                "Supermarché": "nb_supermarches",
                "Supérette": "nb_superettes",
                "Boulangerie": "nb_boulangeries",
                "Boucherie": "nb_boucheries",
                "Restaurant": "nb_restaurants",
                "Garage": "nb_garages",
                "Station-service": "nb_stations_service",
                "Banque": "nb_banques",
                "La poste": "nb_bureaux_poste",
                "Coiffeur": "nb_coiffeurs",
                "Tabac": "nb_tabacs",
                "Bars / discothèque": "nb_bars_discotheques",
                "Bibliothèque": "nb_bibliotheques",
                "Cinéma": "nb_cinemas",
                "Vétérinaire": "nb_veterinaires",
                # Santé
                "Pharmacie": "nb_pharmacies",
                "Hôpital": "nb_hopitaux",
                "Laboratoire d'analyses médicales": "nb_laboratoires_analyses",
                "Etablissement pour handicapé": "nb_etablissements_handicapes",
                "EHPA": "nb_ehpa",
                "Médecin": "nb_medecins",
                "Dentiste": "nb_dentistes",
                "Chirurgien": "nb_chirurgiens",
                "Dermatologue": "nb_dermatologues",
                "Anesthésiste": "nb_anesthesistes",
                "Gastro-entérologue": "nb_gastroenterologues",
                "Gynécologue": "nb_gynecologues",
                "Cancérologue": "nb_cancerologues",
                "Neurologue": "nb_neurologues",
                "Ophtalmologue": "nb_ophtalmologues",
                "ORL": "nb_orl",
                "Cardiologue": "nb_cardiologues",
                "Pédiatre": "nb_pediatres",
                "Pneumologue": "nb_pneumologues",
                "Psychologue": "nb_psychologues",
                "Radiologue": "nb_radiologues",
                "Rhumatologue": "nb_rhumatologues",
                "Sage-femme": "nb_sages_femmes",
                # Éducation
                "Crèche": "nb_creches",
                "Ecole maternelle Public": "nb_ecoles_maternelles_publiques",
                "Ecole maternelle Privé": "nb_ecoles_maternelles_privees",
                "Ecole primaire Public": "nb_ecoles_primaires_publiques",
                "Ecole primaire Privé": "nb_ecoles_primaires_privees",
                "Collège Public": "nb_colleges_publics",
                "Collège Privé": "nb_colleges_prives",
                "Lycée Public": "nb_lycees_publics",
                "Lycée Privé": "nb_lycees_prives",
            }
            sec_section = soup.find("section", id="securite")
            if not sec_section:
                for h2 in soup.find_all("h2"):
                    if "Sécurité" in (h2.get_text() or ""):
                        sec_section = h2.find_parent("section") or h2.find_next("section")
                        break
            if sec_section:
                sec_table = sec_section.find("table")
                if sec_table:
                    label_secu = {
                        "Agressions physiques / sexuelles": "agressions",
                        "Cambriolages": "cambriolages",
                        "Vols / dégradations": "vols_degradations",
                        "Stupéfiants": "stupefiants",
                    }
                    for row in sec_table.find_all("tr"):
                        th = row.find("th")
                        tds = row.find_all("td")
                        if th and tds:
                            label = th.get_text(strip=True)
                            if label in label_secu:
                                metrics[label_secu[label]] = tds[0].get_text(strip=True)
            services_section = soup.find("section", id="services")
            if not services_section:
                for h2 in soup.find_all("h2"):
                    if "Services à la population" in (h2.get_text() or ""):
                        services_section = h2.find_parent("section") or h2.find_next("section")
                        break
            if services_section:
                items = services_section.find_all(["li", "p"])
                for el in items:
                    txt = el.get_text(" ", strip=True)
                    if txt:
                        result["services_population"].append(txt)
                # Tables structurées (Commerce / Santé / Éducation, etc.)
                for table in services_section.find_all("table"):
                    # Catégorie éventuelle (Commerce / Santé / Éducation)
                    category = None
                    heading = table.find_previous(["h2", "h3"])
                    if heading:
                        h_text = heading.get_text(strip=True)
                        if "Commerce" in h_text:
                            category = "commerce"
                        elif "Santé" in h_text:
                            category = "sante"
                        elif "Éducation" in h_text or "Education" in h_text:
                            category = "education"
                    for row in table.find_all("tr"):
                        cells = row.find_all(["th", "td"])
                        if len(cells) < 2:
                            continue
                        label = cells[0].get_text(" ", strip=True)
                        value = cells[1].get_text(" ", strip=True)
                        if not label or not value:
                            continue
                        result["services_population_counts"][label] = value
                        # Renseigner aussi dans metrics (si mappé)
                        metric_key = label_to_metric.get(label)
                        if metric_key:
                            metrics[metric_key] = value
                        if category:
                            by_cat = result.setdefault("services_population_counts_by_category", {})
                            by_cat.setdefault(category, {})[label] = value
        except Exception as exc:
            logging.warning("Erreur extraction sécurité/services : %s", exc)
        return result

    def _extract_real_estate(self, session: requests.Session, base_url: str) -> Dict[str, Any]:
        result: Dict[str, Any] = {
            "prix_m2_maison": None,
            "prix_m2_appartement": None,
            "part_residences_principales": None,
            "part_residences_secondaires": None,
            "part_taux_proprietaires": None,
            "part_taux_locataires": None,
        }
        try:
            immobilier_url = base_url.rstrip("/") + "/immobilier.html"
            soup_imm = self._safe_get(session, immobilier_url)
            if not soup_imm:
                return result
            text = soup_imm.get_text(" ", strip=True)

            # 1) Prix moyen au m² par type (table principale)
            price_table = soup_imm.find("table")
            if price_table:
                rows = price_table.find_all("tr")
                for idx, row in enumerate(rows):
                    cells = row.find_all(["th", "td"])
                    if len(cells) < 4:
                        continue
                    # convention observée : ligne 0 = maisons, ligne 1 = appartements
                    prix_m2_cell = cells[3].get_text(" ", strip=True)
                    prix_m2_cell = prix_m2_cell.replace("\xa0", " ").strip()
                    if not prix_m2_cell:
                        continue
                    if idx == 0 and not result["prix_m2_maison"]:
                        result["prix_m2_maison"] = prix_m2_cell
                    elif idx == 1 and not result["prix_m2_appartement"]:
                        result["prix_m2_appartement"] = prix_m2_cell

            # fallback regex si jamais la structure de table change
            if not result["prix_m2_maison"] or not result["prix_m2_appartement"]:
                price_patterns: List[Tuple[str, str]] = [
                    (r"Prix moyen.*maison.*?([\d\s]+ ?€)", "prix_m2_maison"),
                    (r"Prix moyen.*appartement.*?([\d\s]+ ?€)", "prix_m2_appartement"),
                    (r"Maison\s*:\s*([\d\s]+ ?€)", "prix_m2_maison"),
                    (r"Appartement\s*:\s*([\d\s]+ ?€)", "prix_m2_appartement"),
                ]
                for pattern, key in price_patterns:
                    m = re.search(pattern, text, re.IGNORECASE)
                    if m and not result.get(key):
                        result[key] = m.group(1).replace("\xa0", " ").strip()

            # 2) Usage des habitations (camembert rendu dans un <canvas> avec data-data)
            usage_canvas = soup_imm.find("canvas", id="chart_immo_usage")
            if not usage_canvas:
                usage_canvas = soup_imm.find(
                    "canvas",
                    attrs={"aria-label": re.compile("Usage des habitations", re.IGNORECASE)},
                )
            if usage_canvas:
                data_attr = usage_canvas.get("data-data")
                if data_attr:
                    # data-data du type "[89.23,4.2,6.57]"
                    nums = re.findall(r"[-+]?\d*\.?\d+", data_attr)
                    if len(nums) >= 2:
                        # 1er = résidences principales, 2e = résidences secondaires
                        result["part_residences_principales"] = f"{nums[0]}%"
                        result["part_residences_secondaires"] = f"{nums[1]}%"

            # 3) Type de logement (propriétaires / locataires)
            logement_canvas = soup_imm.find("canvas", id="chart_immo_logement")
            if not logement_canvas:
                logement_canvas = soup_imm.find(
                    "canvas",
                    attrs={"aria-label": re.compile("Type de logement", re.IGNORECASE)},
                )
            if logement_canvas:
                data_attr = logement_canvas.get("data-data")
                if data_attr:
                    nums = re.findall(r"[-+]?\d*\.?\d+", data_attr)
                    if len(nums) >= 2:
                        # 1er = propriétaires, 2e = locataires (selon le tableau associé)
                        result["part_taux_proprietaires"] = f"{nums[0]}%"
                        result["part_taux_locataires"] = f"{nums[1]}%"
        except Exception as exc:
            logging.warning("Erreur extraction immobilier : %s", exc)
        return result

    def _extract_reviews_summary(
        self, soup_avis: BeautifulSoup, metrics: Dict[str, Any]
    ) -> Dict[str, Any]:
        summary: Dict[str, Any] = {}
        try:
            text = soup_avis.get_text()
            m_note = re.search(r"(\d[,.]?\d*)\s*/\s*5", text)
            if m_note:
                metrics["note_moyenne_globale"] = m_note.group(1).replace(",", ".")
                summary["note_moyenne_globale"] = metrics["note_moyenne_globale"]
            m_avis = re.search(r"(\d+)\s+commentaires?", text, re.IGNORECASE)
            if m_avis:
                metrics["nb_avis"] = m_avis.group(1)
                summary["nb_avis"] = metrics["nb_avis"]
            section_note = soup_avis.find("section", id="note")
            if not section_note:
                for h2 in soup_avis.find_all("h2"):
                    if "Moyenne par critère" in (h2.get_text() or ""):
                        section_note = h2.find_parent("section") or h2.find_next("section")
                        break
            if section_note:
                table = section_note.find("table")
                if table:
                    label_scores = {
                        "Sécurité": "score_securite",
                        "Éducation": "score_education",
                        "Sport / Loisir": "score_loisirs",
                        "Environnement": "score_environnement",
                        "Vie pratique": "score_vie_pratique",
                    }
                    for row in table.find_all("tr"):
                        th = row.find("th", scope="row")
                        tds = row.find_all("td")
                        if th and tds:
                            label = th.get_text(strip=True)
                            if label in label_scores:
                                val_span = tds[0].find("span")
                                value = (
                                    val_span.get_text(strip=True)
                                    if val_span
                                    else tds[0].get_text(strip=True)
                                )
                                key = label_scores[label]
                                metrics[key] = value
                                summary[key] = value
        except Exception as exc:
            logging.warning("Erreur extraction résumé avis : %s", exc)
        return summary

    def _extract_reviews_full(
        self, soup_avis: BeautifulSoup
    ) -> Tuple[List[Dict[str, Any]], Dict[str, List[str]]]:
        full_reviews: List[Dict[str, Any]] = []
        sentiment_source = {"positive": [], "negative": [], "all": []}
        try:
            for p in soup_avis.find_all("p", class_="review_positive"):
                txt = p.get_text(strip=True)
                if txt:
                    sentiment_source["positive"].append(txt)
                    sentiment_source["all"].append(txt)
            for p in soup_avis.find_all("p", class_="review_negative"):
                txt = p.get_text(strip=True)
                if txt:
                    sentiment_source["negative"].append(txt)
                    sentiment_source["all"].append(txt)
            for p in soup_avis.find_all("p", class_="review_text"):
                txt = p.get_text(strip=True)
                if txt and txt not in sentiment_source["all"]:
                    sentiment_source["all"].append(txt)
            for container in soup_avis.select(
                '[itemprop="review"], article.review, div.review, li.review'
            ):
                text_el = (
                    container.find("p", class_="review_text") or container.find("p") or container
                )
                text = text_el.get_text(" ", strip=True) if text_el else None
                if not text:
                    continue
                rating_el = container.select_one(
                    '[itemprop="ratingValue"], .rating, .note, .review_note'
                )
                rating = rating_el.get_text(strip=True) if rating_el else None
                date_el = container.find("time") or container.select_one(".date, .review_date")
                date = date_el.get("datetime") or date_el.get_text(strip=True) if date_el else None
                full_reviews.append({"text": text, "rating": rating, "date": date})

            # Structure spécifique Bien-dans-ma-ville : <div class="commentaire" data-pouce="...">
            # Exemple: https://www.bien-dans-ma-ville.fr/rennes-35238/avis.html
            for div in soup_avis.find_all("div", class_="commentaire"):
                # Identifiant interne du commentaire
                comment_id = div.get("data-pouce")
                text_el = div.find("p") or div
                text = text_el.get_text(" ", strip=True) if text_el else None
                if not text:
                    continue
                if text not in sentiment_source["all"]:
                    sentiment_source["all"].append(text)
                # Note et date ne sont pas triviales à extraire sur cette structure,
                # on les laisse à None pour l'instant.
                full_reviews.append({"text": text, "rating": None, "date": None, "id": comment_id})
        except Exception as exc:
            logging.warning("Erreur extraction avis détaillés : %s", exc)
        return full_reviews, sentiment_source

    # ---------- TRAITEMENT D'UNE VILLE ----------

    def _init_metrics(self, com: str, nom_commune: str) -> Dict[str, Any]:
        return {
            "com": com,
            "nom_commune": nom_commune,
            "nb_habitant": None,
            "age_moyen": None,
            "pop_active": None,
            "taux_chomage": None,
            "pop_densite": None,
            "revenu_moyen": None,
            "superficie_km2": None,
            "agressions": None,
            "cambriolages": None,
            "vols_degradations": None,
            "stupefiants": None,
            "note_moyenne_globale": None,
            "nb_avis": None,
            "score_securite": None,
            "score_education": None,
            "score_loisirs": None,
            "score_environnement": None,
            "score_vie_pratique": None,
            "estimation_pop_2026": None,
            "estimation_pop_2025": None,
            "part_0_14_ans": None,
            "part_15_29_ans": None,
            "part_30_44_ans": None,
            "part_45_59_ans": None,
            "part_60_74_ans": None,
            "part_75_89_ans": None,
            "part_90_plus": None,
            "part_cadres": None,
            "part_retraites": None,
            "part_employes": None,
            "part_ouvriers": None,
            "part_sans_diplome": None,
            "part_bac5_plus": None,
            "part_couple_avec_enfant": None,
            "part_personnes_seules": None,
            "participation_1er_tour": None,
            "participation_2nd_tour": None,
            "inscrits_election": None,
            "code_postal": None,
            "nom_region": None,
            "nom_departement": None,
            "nom_metropole": None,
            "nom_maire": None,
        }

    def process_city(self, city_info: Tuple[str, str, Optional[str]]) -> Optional[Dict[str, Any]]:
        """
        city_info : (com, nom_commune, base_url)
        base_url doit provenir du sitemap / scrap_queue.
        """
        if len(city_info) != 3:
            logging.error("city_info invalide (attendu 3 éléments) : %r", city_info)
            return None

        com, name, base_url = city_info
        if not base_url:
            # fallback : génération à partir du nom
            base_url = self._generate_url(com, name)

        avis_url = base_url.rstrip("/") + "/avis.html"
        result = CityScrapePayload(com=com, nom_commune=name)
        result.metrics.update(self._init_metrics(com, name))

        soup_ville: Optional[BeautifulSoup] = None
        soup_avis: Optional[BeautifulSoup] = None
        try:
            session = self._get_thread_session()
            soup_ville = self._safe_get(session, base_url)
            if not soup_ville:
                logging.warning("Impossible de charger la page ville pour %s (%s)", name, com)
                return None
            self._extract_demographics(soup_ville, result.metrics)
            result.security_services = self._extract_security_services(soup_ville, result.metrics)
            result.real_estate = self._extract_real_estate(session, base_url)
            soup_avis = self._safe_get(session, avis_url)
            if soup_avis:
                result.reviews_summary = self._extract_reviews_summary(soup_avis, result.metrics)
                full_reviews, sentiment_source = self._extract_reviews_full(soup_avis)
            else:
                full_reviews, sentiment_source = (
                    [],
                    {"positive": [], "negative": [], "all": []},
                )
            source_soup = soup_avis or soup_ville
            if not source_soup:
                logging.warning("Aucun HTML exploitable pour %s (%s)", name, com)
                return None
            result.reviews_full = full_reviews
            commune_doc = self._build_commune_document(
                result=result,
                base_url=base_url,
                avis_url=avis_url,
                sentiment_source=sentiment_source,
            )
            self.city_store.update_one(
                {"com": com},
                {
                    "$set": {
                        **commune_doc,
                    }
                },
                upsert=True,
            )
            direct_doc = self._build_commune_direct_document(commune_doc=commune_doc)
            self.city_direct_store.update_one(
                {"com": com},
                {"$set": direct_doc},
                upsert=True,
            )
            self._upsert_departement_reference(commune_doc)
            self._upsert_reviews_raw(
                com=com,
                source="bdmv",
                url_page=avis_url,
                reviews_full=result.reviews_full,
                nom_commune=result.nom_commune,
            )
            if not result.has_any_demographic_or_reviews():
                logging.warning("Aucune donnée trouvée pour %s (%s)", name, com)
            else:
                # Log détaillé en DEBUG uniquement pour éviter le bruit en production
                logging.debug(
                    "Collecté: %s (%s) — %s hab., note %s",
                    name,
                    com,
                    result.metrics.get("nb_habitant") or "?",
                    result.metrics.get("note_moyenne_globale") or "?",
                )
            return {"com": result.com, "nom_commune": result.nom_commune, "url": base_url}
        except Exception as exc:
            logging.warning("Erreur sur %s (%s): %s", name, com, exc)
            return None

    # ---------- GESTION QUEUE / PROGRESSION ----------
    def _extract_dept_code_from_com(self, com: str) -> str:
        com_str = (com or "").strip().upper()
        if not com_str:
            return "00"
        if com_str.startswith("97") and len(com_str) >= 3:
            return com_str[:3]
        if com_str.startswith("2A") or com_str.startswith("2B"):
            return com_str[:2]
        return com_str[:2]

    def _build_commune_document(
        self,
        result: CityScrapePayload,
        base_url: str,
        avis_url: str,
        sentiment_source: Dict[str, List[str]],
    ) -> CommuneHarvestDoc:
        m = result.metrics
        services_keys = [k for k in m.keys() if k.startswith("nb_")]
        now_utc = datetime.now(timezone.utc)
        return {
            "com": result.com,
            "nom_commune": result.nom_commune,
            "source": "bdmv",
            "admin_codes": {
                "code_dept": self._extract_dept_code_from_com(result.com),
            },
            "links": {"city_page": base_url, "avis_page": avis_url},
            "admin_details": {
                "code_postal": m.get("code_postal"),
                "nom_region": m.get("nom_region"),
                "nom_departement": m.get("nom_departement"),
                "nom_metropole": m.get("nom_metropole"),
                "nom_maire": m.get("nom_maire"),
            },
            "demography": {k: m.get(k) for k in m if k.startswith("part_") or k in {
                "nb_habitant", "age_moyen", "pop_active", "taux_chomage", "pop_densite",
                "revenu_moyen", "superficie_km2", "estimation_pop_2025", "estimation_pop_2026",
                "participation_1er_tour", "participation_2nd_tour", "inscrits_election",
            }},
            "security": {k: m.get(k) for k in ("agressions", "cambriolages", "vols_degradations", "stupefiants")},
            "quality_of_life": {k: m.get(k) for k in (
                "note_moyenne_globale",
                "nb_avis",
                "score_securite",
                "score_education",
                "score_loisirs",
                "score_environnement",
                "score_vie_pratique",
            )},
            "services": {k: m.get(k) for k in services_keys},
            "real_estate": result.real_estate,
            "reviews_summary": result.reviews_summary,
            "reviews_refs": {"count": len(result.reviews_full), "last_collected_at": now_utc},
            "updated_at": now_utc,
        }

    def _build_commune_direct_document(self, commune_doc: CommuneHarvestDoc) -> Dict[str, Any]:
        """
        “Table directe” : une doc par commune, avec les champs importants aplatis en colonnes.
        """
        direct: Dict[str, Any] = {
            "com": commune_doc.get("com"),
            "nom_commune": commune_doc.get("nom_commune"),
            "source": commune_doc.get("source"),
            "code_dept": (commune_doc.get("admin_codes") or {}).get("code_dept"),
            "code_postal": (commune_doc.get("admin_details") or {}).get("code_postal"),
            "nom_region": (commune_doc.get("admin_details") or {}).get("nom_region"),
            "nom_departement": (commune_doc.get("admin_details") or {}).get("nom_departement"),
            "nom_metropole": (commune_doc.get("admin_details") or {}).get("nom_metropole"),
            "nom_maire": (commune_doc.get("admin_details") or {}).get("nom_maire"),
            "city_page": (commune_doc.get("links") or {}).get("city_page"),
            "avis_page": (commune_doc.get("links") or {}).get("avis_page"),
            "reviews_refs_count": (commune_doc.get("reviews_refs") or {}).get("count"),
            "reviews_refs_last_collected_at": (commune_doc.get("reviews_refs") or {}).get("last_collected_at"),
            "updated_at": commune_doc.get("updated_at"),
        }

        # Aplatit les “blocs” principaux en champs racine (pour table / filtres front).
        for k, v in (commune_doc.get("demography") or {}).items():
            direct.setdefault(k, v)
        for k, v in (commune_doc.get("security") or {}).items():
            direct.setdefault(k, v)
        for k, v in (commune_doc.get("quality_of_life") or {}).items():
            direct.setdefault(k, v)
        for k, v in (commune_doc.get("services") or {}).items():
            direct.setdefault(k, v)
        for k, v in (commune_doc.get("real_estate") or {}).items():
            direct.setdefault(k, v)
        return direct

    def _upsert_departement_reference(self, commune_doc: CommuneHarvestDoc) -> None:
        admin_codes = commune_doc.get("admin_codes") or {}
        admin = commune_doc.get("admin_details") or {}
        code_dept = (admin_codes.get("code_dept") or "").strip().upper()
        if not code_dept:
            return
        now_utc = datetime.now(timezone.utc)
        self.dept_store.update_one(
            {"code_dept": code_dept},
            {
                "$set": {
                    "code_dept": code_dept,
                    "nom_departement": admin.get("nom_departement"),
                    "updated_at": now_utc,
                },
                "$setOnInsert": {
                    "created_at": now_utc,
                },
            },
            upsert=True,
        )

    def _upsert_reviews_raw(
        self,
        com: str,
        source: str,
        url_page: str,
        reviews_full: List[Dict[str, Any]],
        nom_commune: Optional[str] = None,
    ) -> None:
        if not reviews_full:
            return
        now_utc = datetime.now(timezone.utc)
        ops: List[UpdateOne] = []
        for item in reviews_full:
            text = (item.get("text") or "").strip()
            if not text:
                continue
            model = ReviewRawModel(
                com=com,
                source=source,
                external_comment_id=item.get("id"),
                text=text,
                rating=item.get("rating"),
                date=item.get("date"),
                collected_at=now_utc,
                url_page=url_page,
            )
            selector = {
                "source": model.source,
                "com": model.com,
                "external_comment_id": model.external_comment_id,
            }
            if not model.external_comment_id:
                selector = {
                    "source": model.source,
                    "com": model.com,
                    "text": model.text,
                }
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
                            "rating": model.rating,
                            "date": model.date,
                            "collected_at": model.collected_at,
                            "url_page": model.url_page,
                        }
                    },
                    upsert=True,
                )
            )
        if ops:
            self.reviews_store.bulk_write(ops, ordered=False)

    def _update_progress(self) -> None:
        """
        Met à jour les compteurs et log la progression globale.
        """
        with self._progress_lock:
            self.newly_processed += 1
            done = self.already_done + self.newly_processed
            total = self.total_in_queue or 1
            pct = (done / total) * 100.0
            # Pour un débit réaliste, on ne considère que les communes traitées
            # pendant ce run (newly_processed), pas celles déjà marquées done avant le démarrage.
            elapsed = max(time.time() - self.start_time, 1e-6)
            rate_per_min = (self.newly_processed / elapsed) * 60.0
            elapsed_h = int(elapsed // 3600)
            elapsed_m = int((elapsed % 3600) // 60)
            elapsed_s = int(elapsed % 60)
            current_workers = self.active_workers
            max_workers = self.max_active_workers
        logging.info(
            "Progression : %d/%d communes traitées (%.2f%%) — écoulé: %02d:%02d:%02d — %.2f communes/min — workers actifs: %d (max observé: %d).",
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
            {
                "$set": {"is_processed": True, "processed_at": now_utc, "updated_at": now_utc},
                "$inc": {"attempt_count": 1},
            },
        )

    def _mark_queue_failed_mongo(self, url: str, error_msg: str) -> None:
        now_utc = datetime.now(timezone.utc)
        self.queue_store.update_one(
            {"url": url},
            {
                "$set": {"last_error": error_msg[:500], "updated_at": now_utc},
                "$inc": {"attempt_count": 1},
            },
        )

    def _process_queue_entry(self, entry: Tuple[str, str, str]) -> Optional[Dict[str, Any]]:
        """
        Wrapper appelé par les threads :
        - lance le scraping,
        - met à jour scrap_queue,
        - met à jour la progression.
        """
        com, nom_commune, url = entry
        # Sécurité : si l'URL n'est pas valide, on loggue et on skip
        try:
            _ = self._extract_com_id_from_url(url)  # revalidation de l'URL
        except ValueError as exc:
            logging.warning("Entrée de queue ignorée (URL malformée) : %s", exc)
            return None

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
            self._mark_queue_failed_mongo(url, str(exc))
            logging.warning("Erreur de traitement queue pour %s (%s): %s", nom_commune, com, exc)
            return None
        finally:
            with self._progress_lock:
                self.active_workers -= 1

    # ---------- PIPELINE PRINCIPAL ----------

    def start(self) -> None:
        try:
            # 1) Initialisation + chargement de la queue Mongo
            self._sync_queue_from_sitemap(force_rescrape=True)
            queue_entries = self._load_queue_entries()

            if not queue_entries:
                return

            self.start_time = time.time()
            max_workers = 12
            logging.info(
                "Début de la collecte pour %d communes avec ThreadPoolExecutor(max_workers=%d).",
                len(queue_entries),
                max_workers,
            )

            # 2) Multi‑threading sur la file d'URLs (ThreadPoolExecutor)
            with ThreadPoolExecutor(max_workers=max_workers) as executor:
                results = list(executor.map(self._process_queue_entry, queue_entries))

            # 3) Statistiques finales
            valid_results = [r for r in results if r]
            nb_errors = len(queue_entries) - len(valid_results)
            elapsed = max(time.time() - self.start_time, 1e-6)
            rate_per_min = (len(valid_results) / elapsed) * 60.0
            elapsed_h = int(elapsed // 3600)
            elapsed_m = int((elapsed % 3600) // 60)
            elapsed_s = int(elapsed % 60)
            logging.info(
                "Collecte terminée: %d communes traitées, %d erreur(s) sur %d à traiter. Durée totale: %02d:%02d:%02d (%.1fs, %.2f communes/min). Max workers actifs observés: %d.",
                len(valid_results),
                nb_errors,
                len(queue_entries),
                elapsed_h,
                elapsed_m,
                elapsed_s,
                elapsed,
                rate_per_min,
                self.max_active_workers,
            )
        except Exception as err:
            logging.critical("Erreur fatale du pipeline : %s", err)
        finally:
            try:
                self.mongo_client.close()
            except Exception:
                pass


if __name__ == "__main__":
    HomepediaHarvester().start()
