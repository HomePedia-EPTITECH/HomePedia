import logging
import os
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import psycopg2
import requests
from bs4 import BeautifulSoup
from psycopg2 import extras
from pymongo import MongoClient
from unidecode import unidecode

try:
    from dotenv import load_dotenv  # type: ignore
except ImportError:
    load_dotenv = None  # type: ignore[assignment]

# Configuration du logging pour le suivi de la collecte
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

if load_dotenv is not None:
    load_dotenv(Path(__file__).resolve().parents[1] / ".env", override=False)


class HomepediaHarvester:
    def __init__(self):
        # Configuration PostgreSQL (via variables d'environnement)
        self.pg_params = {
            "dbname": os.getenv("POSTGRES_DB", "homepedia"),
            "user": os.getenv("POSTGRES_USER", "admin"),
            "password": os.getenv("POSTGRES_PASSWORD", ""),
            "host": os.getenv("POSTGRES_HOST", "localhost"),
            "port": int(os.getenv("POSTGRES_PORT", "5432")),
        }

        # Configuration MongoDB (via variables d'environnement)
        mongo_uri = os.getenv("MONGO_URI")
        mongo_db_name = os.getenv("MONGO_DB", "homepedia_raw")
        if mongo_uri:
            self.mongo_client = MongoClient(mongo_uri)
        else:
            mongo_host = os.getenv("MONGO_HOST", "localhost")
            mongo_port = os.getenv("MONGO_PORT", "27017")
            mongo_user = os.getenv("MONGO_USER") or os.getenv("MONGO_ROOT_USER")
            mongo_password = os.getenv("MONGO_PASSWORD") or os.getenv("MONGO_ROOT_PASSWORD")

            if mongo_user and mongo_password:
                self.mongo_client = MongoClient(
                    f"mongodb://{mongo_user}:{mongo_password}@{mongo_host}:{mongo_port}/?authSource=admin"
                )
            else:
                self.mongo_client = MongoClient(f"mongodb://{mongo_host}:{mongo_port}/")

        self.raw_db = self.mongo_client[mongo_db_name]
        self.city_store = self.raw_db["city_backups"]

        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
        }

    def _generate_url(self, com, name):
        """Standardisation de l'URL cible."""
        name_clean = unidecode(name).lower().replace(" ", "-")
        return f"https://www.bien-dans-ma-ville.fr/{name_clean}-{com}/"

    def process_city(self, city_info):
        """Scrape complet d'une ville avec indicateurs bonus."""
        com, name = city_info
        target_url = self._generate_url(com, name)

        try:
            with requests.Session() as session:
                response = session.get(target_url, headers=self.headers, timeout=15)
                response.raise_for_status()

            soup = BeautifulSoup(response.text, "html.parser")

            # Initialisation du dictionnaire de données enrichies [cite: 35]
            data = {
                "com": com,
                "nccenr": name,
                "nb_habitant": None,
                "age_moyen": None,
                "pop_active": None,
                "score_securite": None,
                "score_environnement": None,
                "score_vie_pratique": None,
                "score_loisirs": None,
                "score_sante": None,
                "score_transports": None,
                "score_education": None,
            }

            # 1. Extraction Démographique (Tableau bloc_chiffre) [cite: 34, 35]
            mapping_stats = {
                "Nombre d'habitants": "nb_habitant",
                "Age moyen": "age_moyen",
                "Pop active": "pop_active",
            }
            table = soup.find("table", class_="bloc_chiffre")
            if table:
                for row in table.find_all("tr"):
                    tds = row.find_all("td")
                    if len(tds) == 2:
                        label = tds[0].get_text(strip=True)
                        if label in mapping_stats:
                            data[mapping_stats[label]] = tds[1].get_text(strip=True)

            # 2. Extraction des Scores Qualité de Vie (Notes /5) [cite: 35, 57]
            # Basé sur la structure des jauges de notes du site
            notes_section = soup.find("div", id="commune-note")
            if notes_section:
                mapping_notes = {
                    "Sécurité": "score_securite",
                    "Environnement": "score_environnement",
                    "Vie pratique": "score_vie_pratique",
                    "Loisirs": "score_loisirs",
                    "Santé": "score_sante",
                    "Transports": "score_transports",
                    "Éducation": "score_education",
                }
                for item in notes_section.find_all("div", class_="line-note"):
                    label = item.find("span", class_="label-note").get_text(strip=True)
                    val = item.find("span", class_="val-note").get_text(strip=True)
                    if label in mapping_notes:
                        data[mapping_notes[label]] = val

            # 3. Extraction Textuelle Séparée (Pour Word Cloud & Sentiment)
            pos_avis = [
                p.get_text(strip=True) for p in soup.find_all("p", class_="review_positive")
            ]
            neg_avis = [
                p.get_text(strip=True) for p in soup.find_all("p", class_="review_negative")
            ]
            all_reviews = [p.get_text(strip=True) for p in soup.find_all("p", class_="review_text")]

            # Archivage MongoDB (Données non-tabulaires) [cite: 47]
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

            return data

        except Exception as e:
            logging.warning(f"Erreur sur {name} ({com}): {e}")
            return None

    def start(self):
        """Coordonne la collecte parallèle et la synchronisation SQL."""
        try:
            with psycopg2.connect(**self.pg_params) as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT com, nccenr FROM bdd.v_commune_2023")
                    cities = cur.fetchall()

            logging.info(f"Début de la collecte pour {len(cities)} communes.")

            # Multi-threading (Traitement parallèle exigé pour le volume) [cite: 50, 51]
            with ThreadPoolExecutor(max_workers=12) as executor:
                results = list(executor.map(self.process_city, cities))

            valid_results = [r for r in results if r]

            # Mise à jour PostgreSQL par lots (Execute Batch) [cite: 37]
            if valid_results:
                sql = """
                      UPDATE bdd.v_commune_2023
                      SET nb_habitant         = %(nb_habitant)s, \
                          age_moyen           = %(age_moyen)s,
                          pop_active          = %(pop_active)s, \
                          score_securite      = %(score_securite)s,
                          score_environnement = %(score_environnement)s, \
                          score_sante         = %(score_sante)s,
                          score_transports    = %(score_transports)s, \
                          score_education     = %(score_education)s
                      WHERE com = %(com)s \
                        AND nccenr = %(nccenr)s \
                      """
                with psycopg2.connect(**self.pg_params) as conn:
                    with conn.cursor() as cur:
                        extras.execute_batch(cur, sql, valid_results)
                    conn.commit()
                logging.info("Toutes les bases de données sont synchronisées.")

        except Exception as err:
            logging.critical(f"Erreur fatale du pipeline : {err}")


if __name__ == "__main__":
    HomepediaHarvester().start()
