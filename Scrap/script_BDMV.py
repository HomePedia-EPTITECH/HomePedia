import logging
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import psycopg2
import requests
from bs4 import BeautifulSoup
from psycopg2 import extras
from pymongo import MongoClient
from unidecode import unidecode

_ROOT = Path(__file__).resolve().parents[1]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))
from util.config import get_pg_params, get_mongo_uri, get_mongo_db_name

# Configuration du logging pour le suivi de la collecte
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")


class HomepediaHarvester:
    def __init__(self):
        self.pg_params = get_pg_params()
        self.mongo_client = MongoClient(get_mongo_uri())
        self.raw_db = self.mongo_client[get_mongo_db_name()]
        self.city_store = self.raw_db["communes_harvest"]

        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
        }

    def _generate_url(self, com, name):
        """Standardisation de l'URL cible."""
        name_clean = unidecode(name).lower().replace(" ", "-")
        return f"https://www.bien-dans-ma-ville.fr/{name_clean}-{com}/"

    def _extract_page_ville(self, soup, data):
        """Extrait les 11 colonnes depuis la page principale (stats + sécurité + superficie)."""
        # 1. Tableau démographique (bloc_chiffre)
        LABEL_STATS = {
            "Nombre d'habitants": "nb_habitant",
            "Age moyen": "age_moyen",
            "Pop active": "pop_active",
            "Taux chômage": "taux_chomage",
            "Pop densité": "pop_densite",
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
                if th and tds and th.get_text(strip=True) in LABEL_STATS:
                    data[LABEL_STATS[th.get_text(strip=True)]] = tds[0].get_text(strip=True)
                elif len(tds) >= 2 and tds[0].get_text(strip=True) in LABEL_STATS:
                    data[LABEL_STATS[tds[0].get_text(strip=True)]] = tds[1].get_text(strip=True)

        # 2. Section Sécurité (tableau délinquance)
        sec_section = soup.find("section", id="securite")
        if not sec_section:
            for h2 in soup.find_all("h2"):
                if "Sécurité" in (h2.get_text() or ""):
                    sec_section = h2.find_parent("section") or h2.find_next("section")
                    break
        if sec_section:
            sec_table = sec_section.find("table")
            if sec_table:
                LABEL_SECU = {
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
                        if label in LABEL_SECU:
                            data[LABEL_SECU[label]] = tds[0].get_text(strip=True)

        # 3. Superficie (texte du type "s'étend sur une superficie de 50 km²")
        text = soup.get_text()
        m = re.search(r"superficie\s+de\s+([\d\s]+)\s*km²", text, re.IGNORECASE)
        if m:
            data["superficie_km2"] = m.group(1).replace("\xa0", " ").strip()

    def _extract_page_avis(self, soup_avis, data):
        """Extrait note_moyenne_globale, nb_avis et les 5 scores depuis la page avis."""
        text = soup_avis.get_text()
        # Note moyenne (ex: "3.4/5")
        m_note = re.search(r"(\d[,.]?\d*)\s*/\s*5", text)
        if m_note:
            data["note_moyenne_globale"] = m_note.group(1).replace(",", ".")
        # Nombre d'avis (ex: "292 commentaires")
        m_avis = re.search(r"(\d+)\s+commentaires?", text, re.IGNORECASE)
        if m_avis:
            data["nb_avis"] = m_avis.group(1)

        # Tableau "Moyenne par critère" (section id="note")
        section_note = soup_avis.find("section", id="note")
        if not section_note:
            for h2 in soup_avis.find_all("h2"):
                if "Moyenne par critère" in (h2.get_text() or ""):
                    section_note = h2.find_parent("section") or h2.find_next("section")
                    break
        if section_note:
            table = section_note.find("table")
            if table:
                LABEL_SCORES = {
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
                        if label in LABEL_SCORES:
                            val_span = tds[0].find("span")
                            if val_span:
                                data[LABEL_SCORES[label]] = val_span.get_text(strip=True)
                            else:
                                data[LABEL_SCORES[label]] = tds[0].get_text(strip=True)

    def process_city(self, city_info):
        """Scrape page ville + page avis et remplit les 18 colonnes."""
        com, name = city_info
        target_url = self._generate_url(com, name)
        avis_url = target_url.rstrip("/") + "/avis.html"

        data = {
            "com": com,
            "nccenr": name,
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
        }

        soup_avis = None
        try:
            with requests.Session() as session:
                response = session.get(target_url, headers=self.headers, timeout=15)
                response.raise_for_status()
                soup = BeautifulSoup(response.text, "html.parser")
                self._extract_page_ville(soup, data)

                resp_avis = session.get(avis_url, headers=self.headers, timeout=15)
                if resp_avis.status_code == 200:
                    soup_avis = BeautifulSoup(resp_avis.text, "html.parser")
                    self._extract_page_avis(soup_avis, data)

            # MongoDB (backup brut ; les avis sont sur la page avis)
            s = soup_avis if soup_avis is not None else soup
            pos_avis = [p.get_text(strip=True) for p in s.find_all("p", class_="review_positive")]
            neg_avis = [p.get_text(strip=True) for p in s.find_all("p", class_="review_negative")]
            all_reviews = [p.get_text(strip=True) for p in s.find_all("p", class_="review_text")]
            self.city_store.update_one(
                {"com": com},
                {
                    "$set": {
                        "metrics": data,
                        "sentiment_analysis_source": {
                            "positive": pos_avis,
                            "negative": neg_avis,
                            "all": all_reviews,
                        },
                        "url_source": target_url,
                        "harvested_at": time.time(),
                    }
                },
                upsert=True,
            )

            has_any = any(
                data.get(k)
                for k in ("nb_habitant", "age_moyen", "pop_active", "note_moyenne_globale")
            )
            if not has_any:
                logging.warning("Aucune donnée trouvée pour %s (%s)", name, com)
            else:
                logging.info(
                    "Collecté: %s (%s) — %s hab., note %s",
                    name,
                    com,
                    data.get("nb_habitant") or "?",
                    data.get("note_moyenne_globale") or "?",
                )
            return data

        except Exception as e:
            logging.warning("Erreur sur %s (%s): %s", name, com, e)
            return None

    def start(self):
        """Coordonne la collecte parallèle et la synchronisation SQL."""
        try:
            with psycopg2.connect(**self.pg_params) as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT com, nccenr FROM homepedia.communes")
                    cities = cur.fetchall()

            if not cities:
                logging.critical(
                    "La table homepedia.communes est vide. Exécutez d'abord les migrations puis "
                    "Database/load_communes.py (ou python Database/main.py)."
                )
                return

            logging.info("Début de la collecte pour %d communes.", len(cities))

            # Multi-threading (Traitement parallèle exigé pour le volume) [cite: 50, 51]
            with ThreadPoolExecutor(max_workers=12) as executor:
                results = list(executor.map(self.process_city, cities))

            valid_results = [r for r in results if r]
            # Ne mettre à jour en base que les lignes où on a au moins une donnée démographique
            to_update = [
                r
                for r in valid_results
                if r.get("nb_habitant") or r.get("age_moyen") or r.get("pop_active")
            ]
            nb_errors = len(cities) - len(valid_results)
            nb_no_data = len(valid_results) - len(to_update)
            logging.info(
                "Collecte terminée: %d communes avec données, %d sans données, %d erreur(s) sur %d total.",
                len(to_update),
                nb_no_data,
                nb_errors,
                len(cities),
            )

            # Mise à jour PostgreSQL : 18 colonnes
            if to_update:
                sql = """
                      UPDATE homepedia.communes
                      SET nb_habitant           = %(nb_habitant)s,
                          age_moyen             = %(age_moyen)s,
                          pop_active            = %(pop_active)s,
                          taux_chomage          = %(taux_chomage)s,
                          pop_densite           = %(pop_densite)s,
                          revenu_moyen          = %(revenu_moyen)s,
                          superficie_km2        = %(superficie_km2)s,
                          agressions            = %(agressions)s,
                          cambriolages          = %(cambriolages)s,
                          vols_degradations     = %(vols_degradations)s,
                          stupefiants           = %(stupefiants)s,
                          note_moyenne_globale  = %(note_moyenne_globale)s,
                          nb_avis               = %(nb_avis)s,
                          score_securite        = %(score_securite)s,
                          score_education       = %(score_education)s,
                          score_loisirs         = %(score_loisirs)s,
                          score_environnement   = %(score_environnement)s,
                          score_vie_pratique    = %(score_vie_pratique)s
                      WHERE com = %(com)s AND nccenr = %(nccenr)s
                      """
                with psycopg2.connect(**self.pg_params) as conn:
                    with conn.cursor() as cur:
                        extras.execute_batch(cur, sql, to_update)
                    conn.commit()
                logging.info("PostgreSQL mis à jour: %d communes synchronisées.", len(to_update))

        except Exception as err:
            logging.critical(f"Erreur fatale du pipeline : {err}")


if __name__ == "__main__":
    HomepediaHarvester().start()
