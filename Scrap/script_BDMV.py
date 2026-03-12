import logging
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import psycopg2
import requests
from bs4 import BeautifulSoup
from psycopg2 import extras
from pymongo import MongoClient
from unidecode import unidecode

_ROOT = Path(__file__).resolve().parents[1]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))
from util.config import get_pg_params, get_mongo_db_name, get_mongo_uri

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")


@dataclass
class CityScrapeResult:
    com: str
    nccenr: str
    metrics: Dict[str, Any] = field(default_factory=dict)
    presentation: Dict[str, Any] = field(default_factory=dict)
    security_services: Dict[str, Any] = field(default_factory=dict)
    real_estate: Dict[str, Any] = field(default_factory=dict)
    reviews_summary: Dict[str, Any] = field(default_factory=dict)
    reviews_full: List[Dict[str, Any]] = field(default_factory=list)

    def to_sql_row(self) -> Dict[str, Any]:
        m = self.metrics
        re_data = self.real_estate
        return {
            "com": self.com,
            "nccenr": self.nccenr,
            "nb_habitant": m.get("nb_habitant"),
            "age_moyen": m.get("age_moyen"),
            "pop_active": m.get("pop_active"),
            "taux_chomage": m.get("taux_chomage"),
            "pop_densite": m.get("pop_densite"),
            "revenu_moyen": m.get("revenu_moyen"),
            "superficie_km2": m.get("superficie_km2"),
            "agressions": m.get("agressions"),
            "cambriolages": m.get("cambriolages"),
            "vols_degradations": m.get("vols_degradations"),
            "stupefiants": m.get("stupefiants"),
            "note_moyenne_globale": m.get("note_moyenne_globale"),
            "nb_avis": m.get("nb_avis"),
            "score_securite": m.get("score_securite"),
            "score_education": m.get("score_education"),
            "score_loisirs": m.get("score_loisirs"),
            "score_environnement": m.get("score_environnement"),
            "score_vie_pratique": m.get("score_vie_pratique"),
            "estimation_pop_2026": m.get("estimation_pop_2026"),
            "estimation_pop_2025": m.get("estimation_pop_2025"),
            "part_0_14_ans": m.get("part_0_14_ans"),
            "part_15_29_ans": m.get("part_15_29_ans"),
            "part_30_44_ans": m.get("part_30_44_ans"),
            "part_45_59_ans": m.get("part_45_59_ans"),
            "part_60_74_ans": m.get("part_60_74_ans"),
            "part_75_89_ans": m.get("part_75_89_ans"),
            "part_90_plus": m.get("part_90_plus"),
            "part_cadres": m.get("part_cadres"),
            "part_retraites": m.get("part_retraites"),
            "part_employes": m.get("part_employes"),
            "part_ouvriers": m.get("part_ouvriers"),
            "part_sans_diplome": m.get("part_sans_diplome"),
            "part_bac5_plus": m.get("part_bac5_plus"),
            "part_couple_avec_enfant": m.get("part_couple_avec_enfant"),
            "part_personnes_seules": m.get("part_personnes_seules"),
            "participation_1er_tour": m.get("participation_1er_tour"),
            "participation_2nd_tour": m.get("participation_2nd_tour"),
            "inscrits_election": m.get("inscrits_election"),
            "code_postal": m.get("code_postal"),
            "nom_region": m.get("nom_region"),
            "nom_departement": m.get("nom_departement"),
            "nom_metropole": m.get("nom_metropole"),
            "nom_maire": m.get("nom_maire"),
            # Services à la population : Commerce
            "nb_hypermarches": m.get("nb_hypermarches"),
            "nb_supermarches": m.get("nb_supermarches"),
            "nb_superettes": m.get("nb_superettes"),
            "nb_boulangeries": m.get("nb_boulangeries"),
            "nb_boucheries": m.get("nb_boucheries"),
            "nb_restaurants": m.get("nb_restaurants"),
            "nb_garages": m.get("nb_garages"),
            "nb_stations_service": m.get("nb_stations_service"),
            "nb_banques": m.get("nb_banques"),
            "nb_bureaux_poste": m.get("nb_bureaux_poste"),
            "nb_coiffeurs": m.get("nb_coiffeurs"),
            "nb_tabacs": m.get("nb_tabacs"),
            "nb_bars_discotheques": m.get("nb_bars_discotheques"),
            "nb_bibliotheques": m.get("nb_bibliotheques"),
            "nb_cinemas": m.get("nb_cinemas"),
            "nb_veterinaires": m.get("nb_veterinaires"),
            # Services à la population : Santé
            "nb_pharmacies": m.get("nb_pharmacies"),
            "nb_hopitaux": m.get("nb_hopitaux"),
            "nb_laboratoires_analyses": m.get("nb_laboratoires_analyses"),
            "nb_etablissements_handicapes": m.get("nb_etablissements_handicapes"),
            "nb_ehpa": m.get("nb_ehpa"),
            "nb_medecins": m.get("nb_medecins"),
            "nb_dentistes": m.get("nb_dentistes"),
            "nb_chirurgiens": m.get("nb_chirurgiens"),
            "nb_dermatologues": m.get("nb_dermatologues"),
            "nb_anesthesistes": m.get("nb_anesthesistes"),
            "nb_gastroenterologues": m.get("nb_gastroenterologues"),
            "nb_gynecologues": m.get("nb_gynecologues"),
            "nb_cancerologues": m.get("nb_cancerologues"),
            "nb_neurologues": m.get("nb_neurologues"),
            "nb_ophtalmologues": m.get("nb_ophtalmologues"),
            "nb_orl": m.get("nb_orl"),
            "nb_cardiologues": m.get("nb_cardiologues"),
            "nb_pediatres": m.get("nb_pediatres"),
            "nb_pneumologues": m.get("nb_pneumologues"),
            "nb_psychologues": m.get("nb_psychologues"),
            "nb_radiologues": m.get("nb_radiologues"),
            "nb_rhumatologues": m.get("nb_rhumatologues"),
            "nb_sages_femmes": m.get("nb_sages_femmes"),
            # Services à la population : Éducation
            "nb_creches": m.get("nb_creches"),
            "nb_ecoles_maternelles_publiques": m.get("nb_ecoles_maternelles_publiques"),
            "nb_ecoles_maternelles_privees": m.get("nb_ecoles_maternelles_privees"),
            "nb_ecoles_primaires_publiques": m.get("nb_ecoles_primaires_publiques"),
            "nb_ecoles_primaires_privees": m.get("nb_ecoles_primaires_privees"),
            "nb_colleges_publics": m.get("nb_colleges_publics"),
            "nb_colleges_prives": m.get("nb_colleges_prives"),
            "nb_lycees_publics": m.get("nb_lycees_publics"),
            "nb_lycees_prives": m.get("nb_lycees_prives"),
            "prix_m2_maison": re_data.get("prix_m2_maison"),
            "prix_m2_appartement": re_data.get("prix_m2_appartement"),
            "part_residences_principales": re_data.get("part_residences_principales"),
            "part_residences_secondaires": re_data.get("part_residences_secondaires"),
            "part_taux_proprietaires": re_data.get("part_taux_proprietaires"),
            "part_taux_locataires": re_data.get("part_taux_locataires"),
        }

    def has_any_demographic_or_reviews(self) -> bool:
        m = self.metrics
        return any(
            m.get(k)
            for k in (
                "nb_habitant",
                "age_moyen",
                "pop_active",
                "note_moyenne_globale",
            )
        )


class HomepediaHarvester:
    def __init__(self) -> None:
        self.pg_params = get_pg_params()
        self.mongo_client = MongoClient(get_mongo_uri())
        self.raw_db = self.mongo_client[get_mongo_db_name()]
        self.city_store = self.raw_db["communes_harvest"]
        self.headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/121.0.0.0 Safari/537.36"
            )
        }

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

    def _extract_presentation_media(self, soup: BeautifulSoup) -> Dict[str, Any]:
        result: Dict[str, Any] = {"intro_text": None, "images": []}
        try:
            main_section = soup.find("section", id="presentation")
            if not main_section:
                h1 = soup.find("h1")
                if h1:
                    main_section = h1.find_parent("section") or h1.find_next("section")
            if main_section:
                paras = [p.get_text(" ", strip=True) for p in main_section.find_all("p")]
                if not paras:
                    paras = [
                        p.get_text(" ", strip=True)
                        for p in main_section.find_all("p", recursive=True)
                    ]
                if paras:
                    result["intro_text"] = "\n\n".join(paras)
            for img in soup.select("section img, .illustration img, .content img"):
                src = img.get("data-src") or img.get("src")
                if src and src not in result["images"]:
                    result["images"].append(src)
        except Exception as exc:
            logging.warning("Erreur extraction présentation/média : %s", exc)
        return result

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
                        metrics[label_stats[th.get_text(strip=True)]] = tds[0].get_text(
                            strip=True
                        )
                    elif len(tds) >= 2 and tds[0].get_text(strip=True) in label_stats:
                        metrics[label_stats[tds[0].get_text(strip=True)]] = tds[
                            1
                        ].get_text(strip=True)
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
                metrics["participation_1er_tour"] = (
                    m_part1.group(1).replace(",", ".").strip()
                )
            m_inscrits = re.search(r"(\d[\d\s]*?)\s+inscrits", text)
            if m_inscrits:
                metrics["inscrits_election"] = m_inscrits.group(1).replace("\xa0", " ").strip()
            idx_2nd = text.find("Second tour")
            if idx_2nd >= 0:
                m_part2 = re.search(
                    r"Participation\s*:\s*([\d,.\s]+)%", text[idx_2nd:]
                )
                if m_part2:
                    metrics["participation_2nd_tour"] = (
                        m_part2.group(1).replace(",", ".").strip()
                    )
            m_cp = re.search(r"code postal (?:de \w+ )?est (\d+)", text, re.IGNORECASE)
            if m_cp:
                metrics["code_postal"] = m_cp.group(1)
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
            # Mapping label -> clé de métrique SQL lisible
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
                        # Renseigner aussi dans metrics pour usage SQL (si mappé)
                        metric_key = label_to_metric.get(label)
                        if metric_key:
                            metrics[metric_key] = value
                        if category:
                            by_cat = result.setdefault("services_population_counts_by_category", {})
                            by_cat.setdefault(category, {})[label] = value
        except Exception as exc:
            logging.warning("Erreur extraction sécurité/services : %s", exc)
        return result

    def _extract_real_estate(
        self, session: requests.Session, base_url: str
    ) -> Dict[str, Any]:
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
                    container.find("p", class_="review_text")
                    or container.find("p")
                    or container
                )
                text = text_el.get_text(" ", strip=True) if text_el else None
                if not text:
                    continue
                rating_el = container.select_one(
                    '[itemprop="ratingValue"], .rating, .note, .review_note'
                )
                rating = rating_el.get_text(strip=True) if rating_el else None
                date_el = container.find("time") or container.select_one(".date, .review_date")
                date = date_el.get("datetime") or date_el.get_text(
                    strip=True
                ) if date_el else None
                full_reviews.append({"text": text, "rating": rating, "date": date})
        except Exception as exc:
            logging.warning("Erreur extraction avis détaillés : %s", exc)
        return full_reviews, sentiment_source

    def process_city(self, city_info: Tuple[str, str]) -> Optional[Dict[str, Any]]:
        com, name = city_info
        base_url = self._generate_url(com, name)
        avis_url = base_url.rstrip("/") + "/avis.html"
        result = CityScrapeResult(com=com, nccenr=name)
        result.metrics.update(
            {
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
        )
        soup_ville: Optional[BeautifulSoup] = None
        soup_avis: Optional[BeautifulSoup] = None
        try:
            with requests.Session() as session:
                soup_ville = self._safe_get(session, base_url)
                if not soup_ville:
                    logging.warning("Impossible de charger la page ville pour %s (%s)", name, com)
                    return None
                result.presentation = self._extract_presentation_media(soup_ville)
                self._extract_demographics(soup_ville, result.metrics)
                result.security_services = self._extract_security_services(
                    soup_ville, result.metrics
                )
                result.real_estate = self._extract_real_estate(session, base_url)
                soup_avis = self._safe_get(session, avis_url)
                if soup_avis:
                    result.reviews_summary = self._extract_reviews_summary(
                        soup_avis, result.metrics
                    )
                    full_reviews, sentiment_source = self._extract_reviews_full(soup_avis)
                else:
                    full_reviews, sentiment_source = ([], {"positive": [], "negative": [], "all": []})
            source_soup = soup_avis or soup_ville
            if not source_soup:
                logging.warning("Aucun HTML exploitable pour %s (%s)", name, com)
                return None
            result.reviews_full = full_reviews
            self.city_store.update_one(
                {"com": com},
                {
                    "$set": {
                        "metrics": result.metrics,
                        "presentation": result.presentation,
                        "security_services": result.security_services,
                        "real_estate": result.real_estate,
                        "reviews_summary": result.reviews_summary,
                        "reviews_full": result.reviews_full,
                        "sentiment_analysis_source": sentiment_source,
                        "url_source": base_url,
                        "url_avis": avis_url,
                        "harvested_at": time.time(),
                    }
                },
                upsert=True,
            )
            if not result.has_any_demographic_or_reviews():
                logging.warning("Aucune donnée trouvée pour %s (%s)", name, com)
            else:
                logging.info(
                    "Collecté: %s (%s) — %s hab., note %s",
                    name,
                    com,
                    result.metrics.get("nb_habitant") or "?",
                    result.metrics.get("note_moyenne_globale") or "?",
                )
            return result.to_sql_row()
        except Exception as exc:
            logging.warning("Erreur sur %s (%s): %s", name, com, exc)
            return None

    def start(self) -> None:
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
            with ThreadPoolExecutor(max_workers=12) as executor:
                results = list(executor.map(self.process_city, cities))
            valid_results = [r for r in results if r]
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
            if to_update:
                sql = """
                      UPDATE homepedia.communes
                      SET nb_habitant                 = %(nb_habitant)s,
                          age_moyen                   = %(age_moyen)s,
                          pop_active                  = %(pop_active)s,
                          taux_chomage                = %(taux_chomage)s,
                          pop_densite                 = %(pop_densite)s,
                          revenu_moyen                = %(revenu_moyen)s,
                          superficie_km2              = %(superficie_km2)s,
                          agressions                  = %(agressions)s,
                          cambriolages                = %(cambriolages)s,
                          vols_degradations           = %(vols_degradations)s,
                          stupefiants                 = %(stupefiants)s,
                          note_moyenne_globale        = %(note_moyenne_globale)s,
                          nb_avis                     = %(nb_avis)s,
                          score_securite              = %(score_securite)s,
                          score_education             = %(score_education)s,
                          score_loisirs               = %(score_loisirs)s,
                          score_environnement         = %(score_environnement)s,
                          score_vie_pratique          = %(score_vie_pratique)s,
                          estimation_pop_2026         = %(estimation_pop_2026)s,
                          estimation_pop_2025         = %(estimation_pop_2025)s,
                          part_0_14_ans               = %(part_0_14_ans)s,
                          part_15_29_ans              = %(part_15_29_ans)s,
                          part_30_44_ans              = %(part_30_44_ans)s,
                          part_45_59_ans              = %(part_45_59_ans)s,
                          part_60_74_ans              = %(part_60_74_ans)s,
                          part_75_89_ans              = %(part_75_89_ans)s,
                          part_90_plus                = %(part_90_plus)s,
                          part_cadres                 = %(part_cadres)s,
                          part_retraites              = %(part_retraites)s,
                          part_employes               = %(part_employes)s,
                          part_ouvriers               = %(part_ouvriers)s,
                          part_sans_diplome           = %(part_sans_diplome)s,
                          part_bac5_plus              = %(part_bac5_plus)s,
                          part_couple_avec_enfant     = %(part_couple_avec_enfant)s,
                          part_personnes_seules       = %(part_personnes_seules)s,
                          participation_1er_tour      = %(participation_1er_tour)s,
                          participation_2nd_tour      = %(participation_2nd_tour)s,
                          inscrits_election           = %(inscrits_election)s,
                          code_postal                 = %(code_postal)s,
                          nom_region                  = %(nom_region)s,
                          nom_departement             = %(nom_departement)s,
                          nom_metropole               = %(nom_metropole)s,
                          nom_maire                   = %(nom_maire)s,
                          nb_hypermarches             = %(nb_hypermarches)s,
                          nb_supermarches             = %(nb_supermarches)s,
                          nb_superettes               = %(nb_superettes)s,
                          nb_boulangeries             = %(nb_boulangeries)s,
                          nb_boucheries               = %(nb_boucheries)s,
                          nb_restaurants              = %(nb_restaurants)s,
                          nb_garages                  = %(nb_garages)s,
                          nb_stations_service         = %(nb_stations_service)s,
                          nb_banques                  = %(nb_banques)s,
                          nb_bureaux_poste            = %(nb_bureaux_poste)s,
                          nb_coiffeurs                = %(nb_coiffeurs)s,
                          nb_tabacs                   = %(nb_tabacs)s,
                          nb_bars_discotheques        = %(nb_bars_discotheques)s,
                          nb_bibliotheques            = %(nb_bibliotheques)s,
                          nb_cinemas                  = %(nb_cinemas)s,
                          nb_veterinaires             = %(nb_veterinaires)s,
                          nb_pharmacies               = %(nb_pharmacies)s,
                          nb_hopitaux                 = %(nb_hopitaux)s,
                          nb_laboratoires_analyses    = %(nb_laboratoires_analyses)s,
                          nb_etablissements_handicapes= %(nb_etablissements_handicapes)s,
                          nb_ehpa                     = %(nb_ehpa)s,
                          nb_medecins                 = %(nb_medecins)s,
                          nb_dentistes                = %(nb_dentistes)s,
                          nb_chirurgiens              = %(nb_chirurgiens)s,
                          nb_dermatologues            = %(nb_dermatologues)s,
                          nb_anesthesistes            = %(nb_anesthesistes)s,
                          nb_gastroenterologues       = %(nb_gastroenterologues)s,
                          nb_gynecologues             = %(nb_gynecologues)s,
                          nb_cancerologues            = %(nb_cancerologues)s,
                          nb_neurologues              = %(nb_neurologues)s,
                          nb_ophtalmologues           = %(nb_ophtalmologues)s,
                          nb_orl                      = %(nb_orl)s,
                          nb_cardiologues             = %(nb_cardiologues)s,
                          nb_pediatres                = %(nb_pediatres)s,
                          nb_pneumologues             = %(nb_pneumologues)s,
                          nb_psychologues             = %(nb_psychologues)s,
                          nb_radiologues              = %(nb_radiologues)s,
                          nb_rhumatologues            = %(nb_rhumatologues)s,
                          nb_sages_femmes             = %(nb_sages_femmes)s,
                          nb_creches                  = %(nb_creches)s,
                          nb_ecoles_maternelles_publiques = %(nb_ecoles_maternelles_publiques)s,
                          nb_ecoles_maternelles_privees   = %(nb_ecoles_maternelles_privees)s,
                          nb_ecoles_primaires_publiques   = %(nb_ecoles_primaires_publiques)s,
                          nb_ecoles_primaires_privees     = %(nb_ecoles_primaires_privees)s,
                          nb_colleges_publics             = %(nb_colleges_publics)s,
                          nb_colleges_prives              = %(nb_colleges_prives)s,
                          nb_lycees_publics               = %(nb_lycees_publics)s,
                          nb_lycees_prives                = %(nb_lycees_prives)s,
                          prix_m2_maison                  = %(prix_m2_maison)s,
                          prix_m2_appartement             = %(prix_m2_appartement)s,
                          part_residences_principales     = %(part_residences_principales)s,
                          part_residences_secondaires     = %(part_residences_secondaires)s,
                          part_taux_proprietaires         = %(part_taux_proprietaires)s,
                          part_taux_locataires            = %(part_taux_locataires)s
                      WHERE com = %(com)s AND nccenr = %(nccenr)s
                      """
                with psycopg2.connect(**self.pg_params) as conn:
                    with conn.cursor() as cur:
                        extras.execute_batch(cur, sql, to_update)
                    conn.commit()
                logging.info("PostgreSQL mis à jour: %d communes synchronisées.", len(to_update))
        except Exception as err:
            logging.critical("Erreur fatale du pipeline : %s", err)


if __name__ == "__main__":
    HomepediaHarvester().start()
