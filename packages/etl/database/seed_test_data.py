"""
Seed de TEST — insère quelques communes réelles dans MongoDB pour valider la
chaîne DB → back → front SANS lancer tout le scraping/Spark.

Cible les collections lues par le module backend `communes` :
  - communes_direct        (données principales à plat)
  - reviews_raw            (avis)
  - real_estate_history    (historique prix)

Les noms de champs correspondent EXACTEMENT à ce que lit
apps/backend/src/modules/communes/communes.repository.ts.
Bonus : on met longitude/latitude (absentes du vrai pipeline) pour que la carte
fonctionne aussi.

Lancer depuis la racine du projet :
    python packages/etl/database/seed_test_data.py

Idempotent : ré-exécutable (upsert par `com`). Pour repartir propre, passer
`--reset` (supprime d'abord les documents seed).
"""

import hashlib
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "packages" / "shared"))

from util.config import get_mongo_uri, get_mongo_db_name  # noqa: E402

try:
    from pymongo import MongoClient, UpdateOne
except ImportError:
    print("pymongo requis : pip install pymongo")
    sys.exit(1)


# (com, nom, cp, dept_code, dept_nom, region_code, region_nom, metropole,
#  lon, lat, pop, densite, superficie, age, revenu, chomage,
#  prix_maison, prix_appart, %proprio, %locat,
#  agr, camb, vols, stup, note_globale/5, sec/5, edu/5, loisirs/5, env/5, vie/5, nb_avis)
CITIES = [
    ("75056", "Paris", "75001", "75", "Paris", "11", "Île-de-France", "Métropole du Grand Paris",
     2.3522, 48.8566, 2133111, 20500, 105, 42, 39000, 12.1, 10800, 10800, 33, 67,
     620, 90, 780, 210, 3.4, 2.6, 3.8, 4.6, 2.9, 4.4, 4200),
    ("69123", "Lyon", "69001", "69", "Rhône", "84", "Auvergne-Rhône-Alpes", "Métropole de Lyon",
     4.8357, 45.7640, 522250, 10800, 48, 38, 27500, 11.0, 5200, 5100, 36, 64,
     240, 55, 420, 130, 3.9, 3.1, 4.0, 4.3, 3.4, 4.1, 2800),
    ("13055", "Marseille", "13001", "13", "Bouches-du-Rhône", "93", "Provence-Alpes-Côte d'Azur", "Métropole Aix-Marseille-Provence",
     5.3698, 43.2965, 870018, 3600, 240, 40, 21500, 15.4, 3900, 3600, 45, 55,
     510, 120, 690, 320, 3.1, 2.3, 3.4, 4.4, 3.0, 3.8, 3600),
    ("33063", "Bordeaux", "33000", "33", "Gironde", "75", "Nouvelle-Aquitaine", "Bordeaux Métropole",
     -0.5792, 44.8378, 260958, 5500, 49, 37, 26000, 12.2, 5100, 4800, 34, 66,
     170, 40, 300, 90, 4.0, 3.2, 4.1, 4.2, 3.6, 4.0, 1900),
    ("31555", "Toulouse", "31000", "31", "Haute-Garonne", "76", "Occitanie", "Toulouse Métropole",
     1.4442, 43.6047, 498003, 4200, 118, 36, 24800, 12.8, 3900, 3600, 33, 67,
     260, 60, 450, 150, 3.9, 3.0, 4.2, 4.1, 3.5, 4.0, 2200),
    ("44109", "Nantes", "44000", "44", "Loire-Atlantique", "52", "Pays de la Loire", "Nantes Métropole",
     -1.5536, 47.2184, 320732, 4800, 65, 36, 25500, 11.4, 4100, 3900, 38, 62,
     150, 45, 280, 80, 4.1, 3.3, 4.2, 4.3, 3.7, 4.1, 1700),
    ("59350", "Lille", "59000", "59", "Nord", "32", "Hauts-de-France", "Métropole Européenne de Lille",
     3.0573, 50.6292, 236234, 6800, 35, 33, 20500, 15.0, 3200, 3000, 27, 73,
     220, 58, 400, 140, 3.7, 2.9, 3.9, 3.9, 3.2, 4.0, 1500),
    ("67482", "Strasbourg", "67000", "67", "Bas-Rhin", "44", "Grand Est", "Eurométropole de Strasbourg",
     7.7521, 48.5734, 290576, 3600, 78, 37, 23800, 13.1, 3600, 3400, 32, 68,
     200, 52, 360, 120, 3.9, 3.1, 4.0, 4.1, 3.5, 4.0, 1600),
]

# Répartition par tranche d'âge (%) — profil urbain générique, somme ≈ 100.
AGE_DIST = {
    "part_0_14_ans": 16.0, "part_15_29_ans": 22.0, "part_30_44_ans": 21.0,
    "part_45_59_ans": 17.0, "part_60_74_ans": 14.0, "part_75_89_ans": 8.5,
    "part_90_plus": 1.5,
}


def per_capita(count_per_1000: float, pop: int) -> int:
    return max(0, round(count_per_1000 * pop / 1000))


def build_commune_doc(row) -> dict:
    (com, nom, cp, dep_c, dep_n, reg_c, reg_n, metro, lon, lat, pop, dens, sup,
     age, revenu, chomage, pmaison, pappart, proprio, locat,
     agr, camb, vols, stup, ng, sec, edu, lois, env, vie, nb_avis) = row

    res_princ = 88.0
    res_sec = 4.0
    doc = {
        "com": com,
        "source": "seed",
        "nom_commune": nom,
        "nccenr": nom.upper(),
        "code_postal": cp,
        "code_dept": dep_c,
        "nom_departement": dep_n,
        "region_id": reg_c,
        "nom_region": reg_n,
        "nom_metropole": metro,
        "longitude": lon,
        "latitude": lat,
        "nb_habitant": pop,
        "pop_densite": dens,
        "superficie": sup,
        "age_moyen": age,
        "revenu_moyen": revenu,
        "taux_chomage": chomage,
        "prix_m2_maison": pmaison,
        "prix_m2_appartement": pappart,
        "part_taux_proprietaires": proprio,
        "part_taux_locataires": locat,
        "part_residences_principales": res_princ,
        "part_residences_secondaires": res_sec,
        # Sécurité (faits / an)
        "agressions": agr,
        "cambriolages": camb,
        "vols_degradations": vols,
        "stupefiants": stup,
        # Notes : scores /5 → le back les passe en /10 (×2)
        "note_moyenne_globale": ng,
        "score_securite": sec,
        "score_education": edu,
        "score_loisirs": lois,
        "score_environnement": env,
        "score_vie_pratique": vie,
        "score_transports": vie,
        "score_sante": round((edu + vie) / 2, 1),
        "nb_avis": nb_avis,
        # Salaires nets mensuels moyens (€)
        "salaire_net_mensuel_moyen_total": round(revenu / 12),
        "salaire_net_mensuel_moyen_cadre": round(revenu / 12 * 1.8),
        "salaire_net_mensuel_moyen_prof_intermediaire": round(revenu / 12 * 1.2),
        "salaire_net_mensuel_moyen_employe": round(revenu / 12 * 0.85),
        "salaire_net_mensuel_moyen_ouvrier": round(revenu / 12 * 0.8),
        # Services (dérivés de la population, ordres de grandeur réalistes)
        "nb_medecins": per_capita(1.1, pop),
        "nb_pharmacies": per_capita(0.32, pop),
        "nb_hopitaux": max(1, per_capita(0.02, pop)),
        "nb_dentistes": per_capita(0.7, pop),
        "nb_creches": per_capita(0.18, pop),
        "nb_ecoles_maternelles_publiques": per_capita(0.25, pop),
        "nb_ecoles_primaires_publiques": per_capita(0.30, pop),
        "nb_colleges_publics": per_capita(0.08, pop),
        "nb_lycees_publics": per_capita(0.045, pop),
        "nb_hypermarches": per_capita(0.012, pop),
        "nb_supermarches": per_capita(0.09, pop),
        "nb_restaurants": per_capita(2.4, pop),
        "nb_banques": per_capita(0.24, pop),
        "nb_boulangeries": per_capita(0.42, pop),
    }
    doc.update(AGE_DIST)
    return doc


POS_TEXTS = [
    "Cadre de vie très agréable, on s'y sent bien au quotidien.",
    "Bonne offre de commerces et de transports, ville dynamique.",
    "Beaucoup d'espaces verts et une vie culturelle riche.",
]
NEG_TEXTS = [
    "Le logement reste cher pour ce que c'est.",
    "Circulation et stationnement compliqués aux heures de pointe.",
]


def build_reviews():
    docs = []
    for row in CITIES:
        com, nom = row[0], row[1]
        for i, txt in enumerate(POS_TEXTS):
            docs.append(_review(com, nom, txt, 4 + (i % 2), "positive"))
        for i, txt in enumerate(NEG_TEXTS):
            docs.append(_review(com, nom, txt, 2 + (i % 2), "negative"))
    return docs


def _review(com, nom, text, rating, sentiment):
    text_hash = hashlib.sha1(f"seed:{com}:{text}".encode()).hexdigest()
    return {
        "source": "seed",
        "com": com,
        "nom_commune": nom.upper(),
        "text": text,
        "text_hash": text_hash,
        "rating": rating,
        "sentiment_label": sentiment,
        "url_page": f"seed://{com}",
    }


def build_history():
    docs = []
    for row in CITIES:
        com = row[0]
        base = row[17]  # prix_m2_appartement
        for k, annee in enumerate(range(2020, 2026)):
            prix = round(base / (1.032 ** (5 - k)))
            docs.append({
                "source": "seed",
                "com": com,
                "transaction_id": f"seed-{com}-{annee}",
                "prix_m2": prix,
                "date_mutation": f"{annee}-06-15",
            })
    return docs


def main():
    reset = "--reset" in sys.argv
    client = MongoClient(get_mongo_uri())
    db = client[get_mongo_db_name()]
    coms = [c[0] for c in CITIES]

    if reset:
        db.communes_direct.delete_many({"com": {"$in": coms}, "source": "seed"})
        print(f"[seed] reset : documents seed supprimés")

    # communes_direct (upsert par com)
    ops = [UpdateOne({"com": c[0]}, {"$set": build_commune_doc(c)}, upsert=True) for c in CITIES]
    res = db.communes_direct.bulk_write(ops)
    print(f"[seed] communes_direct : {res.upserted_count} insérées / {res.modified_count} mises à jour")

    # reviews_raw (on remplace les avis seed)
    db.reviews_raw.delete_many({"source": "seed", "com": {"$in": coms}})
    reviews = build_reviews()
    if reviews:
        db.reviews_raw.insert_many(reviews)
    print(f"[seed] reviews_raw : {len(reviews)} avis insérés")

    # real_estate_history (on remplace l'historique seed)
    db.real_estate_history.delete_many({"source": "seed", "com": {"$in": coms}})
    hist = build_history()
    if hist:
        db.real_estate_history.insert_many(hist)
    print(f"[seed] real_estate_history : {len(hist)} points insérés")

    total = db.communes_direct.count_documents({})
    print(f"[seed] Terminé. communes_direct total = {total}. Villes seed : {', '.join(coms)}")
    client.close()


if __name__ == "__main__":
    main()
