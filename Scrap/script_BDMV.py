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

        # 3. Superficie
        text = soup.get_text()
        m = re.search(r"superficie\s+de\s+([\d\s]+)\s*km²", text, re.IGNORECASE)
        if m:
            data["superficie_km2"] = m.group(1).replace("\xa0", " ").strip()

        # 4. Estimations population (ex: "estimée à 234 641 habitants", "232 774 en 2025")
        m_est = re.search(r"estimée\s+à\s+([\d\s]+)\s+habitants", text)
        if m_est:
            data["estimation_pop_2026"] = m_est.group(1).replace("\xa0", " ").strip()
        m_2025 = re.search(r"\((\d[\d\s]*?)\s+en\s+2025\)", text)
        if m_2025:
            data["estimation_pop_2025"] = m_2025.group(1).replace("\xa0", " ").strip()

        # 5. Graphiques (tranches d'âge, activité, diplôme, ménages) : .chart > h3 + .graph .item (h4 + .pourcent)
        LABEL_CHARTS = {
            "Tranche d'âge": {"0-14 ans": "part_0_14_ans", "15-29 ans": "part_15_29_ans", "30-44 ans": "part_30_44_ans",
                             "45-59 ans": "part_45_59_ans", "60-74 ans": "part_60_74_ans", "75-89 ans": "part_75_89_ans", "90 ans et +": "part_90_plus"},
            "Activité professionnelle": {"Cadres et sup.": "part_cadres", "Retraité": "part_retraites", "Employé": "part_employes", "Ouvrier": "part_ouvriers"},
            "Niveau de diplôme": {"Sans diplôme ou CEP": "part_sans_diplome", "BAC+5 ou plus": "part_bac5_plus"},
            "Composition des ménages": {"Couple avec enfant(s)": "part_couple_avec_enfant", "Personnes seules": "part_personnes_seules"},
        }
        for chart in soup.find_all("div", class_="chart"):
            h3 = chart.find("h3")
            if not h3 or h3.get_text(strip=True) not in LABEL_CHARTS:
                continue
            mapping = LABEL_CHARTS[h3.get_text(strip=True)]
            for item in chart.select("div.graph div.item"):
                h4 = item.find("h4")
                pourcent = item.find("div", class_="pourcent")
                if h4 and pourcent and h4.get_text(strip=True) in mapping:
                    data[mapping[h4.get_text(strip=True)]] = pourcent.get_text(strip=True)

        # 6. Élections (Participation : 75.74%, inscrits)
        m_part1 = re.search(r"Participation\s*:\s*([\d,.\s]+)%", text)
        if m_part1:
            data["participation_1er_tour"] = m_part1.group(1).replace(",", ".").strip()
        m_inscrits = re.search(r"(\d[\d\s]*?)\s+inscrits", text)
        if m_inscrits:
            data["inscrits_election"] = m_inscrits.group(1).replace("\xa0", " ").strip()
        # Second tour participation (après "Second tour")
        idx_2nd = text.find("Second tour")
        if idx_2nd >= 0:
            m_part2 = re.search(r"Participation\s*:\s*([\d,.\s]+)%", text[idx_2nd:])
            if m_part2:
                data["participation_2nd_tour"] = m_part2.group(1).replace(",", ".").strip()

        # 7. Code postal, région, département, métropole
        m_cp = re.search(r"code postal (?:de \w+ )?est (\d+)", text, re.IGNORECASE)
        if m_cp:
            data["code_postal"] = m_cp.group(1)
        # liens région/département/métropole : ignorer le menu global ("Régions", "Départements", "Métropoles")
        for link in soup.select('a[href*="/regions/"]'):
            t = link.get_text(strip=True)
            if not t or t in {"Régions"}:
                continue
            data["nom_region"] = t
            break
        for link in soup.select('a[href*="/departements/"]'):
            t = link.get_text(strip=True)
            if not t or t in {"Départements"}:
                continue
            data["nom_departement"] = t
            break
        for link in soup.select('a[href*="/metropoles/"]'):
            t = link.get_text(strip=True)
            if not t or t in {"Métropoles"}:
                continue
            data["nom_metropole"] = t
            break

        # 8. Mairie (section id="mairie" ou premier bloc avec "Maire")
        section_mairie = soup.find("section", id="mairie")
        if not section_mairie:
            for h2 in soup.find_all("h2"):
                if "Mairie" in (h2.get_text() or ""):
                    section_mairie = h2.find_parent("section") or h2.find_next("section")
                    break
        if section_mairie:
            m_maire = re.search(r"(?:M\.|Mme|Monsieur|Madame)\s+[\w\s\-]+(?=\s*Maire|\s*$)", section_mairie.get_text())
            if m_maire:
                data["nom_maire"] = m_maire.group(0).strip()



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
        """Scrape page ville + page avis et remplit ~50 colonnes."""
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

            # Mise à jour PostgreSQL : ~50 colonnes
            if to_update:
                sql = """
                      UPDATE homepedia.communes
                      SET nb_habitant              = %(nb_habitant)s,
                          age_moyen                = %(age_moyen)s,
                          pop_active               = %(pop_active)s,
                          taux_chomage             = %(taux_chomage)s,
                          pop_densite              = %(pop_densite)s,
                          revenu_moyen             = %(revenu_moyen)s,
                          superficie_km2           = %(superficie_km2)s,
                          agressions               = %(agressions)s,
                          cambriolages             = %(cambriolages)s,
                          vols_degradations        = %(vols_degradations)s,
                          stupefiants              = %(stupefiants)s,
                          note_moyenne_globale     = %(note_moyenne_globale)s,
                          nb_avis                 = %(nb_avis)s,
                          score_securite           = %(score_securite)s,
                          score_education         = %(score_education)s,
                          score_loisirs           = %(score_loisirs)s,
                          score_environnement      = %(score_environnement)s,
                          score_vie_pratique       = %(score_vie_pratique)s,
                          estimation_pop_2026      = %(estimation_pop_2026)s,
                          estimation_pop_2025      = %(estimation_pop_2025)s,
                          part_0_14_ans            = %(part_0_14_ans)s,
                          part_15_29_ans           = %(part_15_29_ans)s,
                          part_30_44_ans           = %(part_30_44_ans)s,
                          part_45_59_ans           = %(part_45_59_ans)s,
                          part_60_74_ans           = %(part_60_74_ans)s,
                          part_75_89_ans           = %(part_75_89_ans)s,
                          part_90_plus             = %(part_90_plus)s,
                          part_cadres              = %(part_cadres)s,
                          part_retraites           = %(part_retraites)s,
                          part_employes            = %(part_employes)s,
                          part_ouvriers            = %(part_ouvriers)s,
                          part_sans_diplome       = %(part_sans_diplome)s,
                          part_bac5_plus          = %(part_bac5_plus)s,
                          part_couple_avec_enfant  = %(part_couple_avec_enfant)s,
                          part_personnes_seules    = %(part_personnes_seules)s,
                          participation_1er_tour   = %(participation_1er_tour)s,
                          participation_2nd_tour   = %(participation_2nd_tour)s,
                          inscrits_election        = %(inscrits_election)s,
                          code_postal              = %(code_postal)s,
                          nom_region               = %(nom_region)s,
                          nom_departement          = %(nom_departement)s,
                          nom_metropole            = %(nom_metropole)s,
                          nom_maire                = %(nom_maire)s
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
