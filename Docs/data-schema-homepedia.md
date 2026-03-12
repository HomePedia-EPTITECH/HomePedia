## Schéma de données Homepedia (PostgreSQL & MongoDB)

Ce document décrit **les données disponibles pour le backend** après scraping de `bien-dans-ma-ville.fr` pour chaque commune.

---

## 1. PostgreSQL – table `homepedia.communes`

**Rôle** : référentiel tabulaire des communes, pour les indicateurs utilisables en filtres / tris / agrégations.

- **Clé primaire**
  - `com` : code INSEE (ex. `"35238"`).
  - `nccenr` : nom officiel (ex. `"Rennes"`).

- **Démographie (statistiques population)**
  - `nb_habitant`
  - `age_moyen`
  - `pop_active`
  - `taux_chomage`
  - `pop_densite`
  - `revenu_moyen`

- **Géographie**
  - `superficie_km2`

- **Sécurité (délinquance)**
  - `agressions`
  - `cambriolages`
  - `vols_degradations`
  - `stupefiants`

- **Avis / qualité de vie**
  - `note_moyenne_globale`
  - `nb_avis`
  - `score_securite`
  - `score_education`
  - `score_loisirs`
  - `score_environnement`
  - `score_vie_pratique`

- **Démographie détaillée (graphes)**
  - `estimation_pop_2026`, `estimation_pop_2025`
  - `part_0_14_ans`, `part_15_29_ans`, `part_30_44_ans`, `part_45_59_ans`
  - `part_60_74_ans`, `part_75_89_ans`, `part_90_plus`
  - `part_cadres`, `part_retraites`, `part_employes`, `part_ouvriers`
  - `part_sans_diplome`, `part_bac5_plus`
  - `part_couple_avec_enfant`, `part_personnes_seules`

- **Élections**
  - `participation_1er_tour`
  - `participation_2nd_tour`
  - `inscrits_election`

- **Territoire / administration**
  - `code_postal`
  - `nom_region`
  - `nom_departement`
  - `nom_metropole`
  - `nom_maire`

- **Services à la population – Commerce**
  - `nb_hypermarches`
  - `nb_supermarches`
  - `nb_superettes`
  - `nb_boulangeries`
  - `nb_boucheries`
  - `nb_restaurants`
  - `nb_garages`
  - `nb_stations_service`
  - `nb_banques`
  - `nb_bureaux_poste`
  - `nb_coiffeurs`
  - `nb_tabacs`
  - `nb_bars_discotheques`
  - `nb_bibliotheques`
  - `nb_cinemas`
  - `nb_veterinaires`

- **Services à la population – Santé**
  - `nb_pharmacies`
  - `nb_hopitaux`
  - `nb_laboratoires_analyses`
  - `nb_etablissements_handicapes`
  - `nb_ehpa`
  - `nb_medecins`
  - `nb_dentistes`
  - `nb_chirurgiens`
  - `nb_dermatologues`
  - `nb_anesthesistes`
  - `nb_gastroenterologues`
  - `nb_gynecologues`
  - `nb_cancerologues`
  - `nb_neurologues`
  - `nb_ophtalmologues`
  - `nb_orl`
  - `nb_cardiologues`
  - `nb_pediatres`
  - `nb_pneumologues`
  - `nb_psychologues`
  - `nb_radiologues`
  - `nb_rhumatologues`
  - `nb_sages_femmes`

- **Services à la population – Éducation**
  - `nb_creches`
  - `nb_ecoles_maternelles_publiques`
  - `nb_ecoles_maternelles_privees`
  - `nb_ecoles_primaires_publiques`
  - `nb_ecoles_primaires_privees`
  - `nb_colleges_publics`
  - `nb_colleges_prives`
  - `nb_lycees_publics`
  - `nb_lycees_prives`

- **Immobilier (`/immobilier.html`)**
  - `prix_m2_maison`
  - `prix_m2_appartement`
  - `evolution_prix_historique` (chaîne JSON brute, points des graphes)
  - `part_residences_principales`
  - `part_residences_secondaires`
  - `part_baux_meubles`
  - `part_baux_non_meubles`

> Tous les champs sont actuellement en `TEXT` (valeurs brutes : `"230 890"`, `"9.7%"`, `"4 618 h/km²"`, etc.). Les conversions numériques sont à faire dans la couche de service si besoin.

### Exemples de requêtes SQL

- **Top 10 villes par nombre d’habitants** :

```sql
SELECT com, nccenr, nb_habitant
FROM homepedia.communes
ORDER BY NULLIF(regexp_replace(nb_habitant, '\D', '', 'g'), '')::BIGINT DESC
LIMIT 10;
```

- **Commerces et santé pour une ville** :

```sql
SELECT
  nb_hypermarches,
  nb_supermarches,
  nb_superettes,
  nb_restaurants,
  nb_pharmacies,
  nb_medecins
FROM homepedia.communes
WHERE com = '35238';
```

---

## 2. MongoDB – collection `communes_harvest`

**Rôle** : stockage documentaire complet, pour les pages de détail et les usages texte/IA.

### Structure logique d’un document

```json
{
  "com": "35238",
  "metrics": { ... },
  "presentation": { ... },
  "security_services": { ... },
  "real_estate": { ... },
  "reviews_summary": { ... },
  "reviews_full": [ ... ],
  "sentiment_analysis_source": { ... },
  "url_source": "https://www.bien-dans-ma-ville.fr/rennes-35238/",
  "url_avis": "https://www.bien-dans-ma-ville.fr/rennes-35238/avis.html",
  "harvested_at": 1710000000.0
}
```

- **`metrics`**
  - Contient les mêmes clés que la table `homepedia.communes` (voir section 1).
  - Sert de snapshot brut de tous les indicateurs numériques/percentages.

- **`presentation`**
  - `intro_text` : texte de présentation complet de la ville.
  - `images` : liste d’URLs d’images de la page principale.

- **`security_services`**
  - `services_population` : liste textuelle des éléments de services.
  - `services_population_counts` : dict `libellé → valeur` (tous les tableaux Commerce / Santé / Éducation).
  - `services_population_counts_by_category` :
    - `commerce`, `sante`, `education` → sous-dicts `libellé → valeur`.

- **`real_estate`**
  - `prix_m2_maison`
  - `prix_m2_appartement`
  - `evolution_prix_historique` : liste d’objets `{ "raw": "<contenu script tronqué>" }`.
  - `part_residences_principales`
  - `part_residences_secondaires`
  - `part_baux_meubles`
  - `part_baux_non_meubles`

- **`reviews_summary`**
  - `note_moyenne_globale`
  - `nb_avis`
  - `score_securite`
  - `score_education`
  - `score_loisirs`
  - `score_environnement`
  - `score_vie_pratique`

- **`reviews_full`**
  - Liste d’avis structurés :
    - `text` : texte intégral de l’avis.
    - `rating` : note brute (ex. `"4/5"` ou `"4.2"` suivant la source HTML).
    - `date` : date extraite si disponible (attribut `datetime` ou texte).

- **`sentiment_analysis_source`**
  - `positive` : avis positifs (`p.review_positive`).
  - `negative` : avis négatifs (`p.review_negative`).
  - `all` : union de tous les textes d’avis.

### Exemples de requêtes Mongo

- **Récupérer le document complet d’une commune** :

```js
db.communes_harvest.findOne({ com: "35238" });
```

- **Lister les compteurs de services pour une commune** :

```js
db.communes_harvest.findOne(
  { com: "35238" },
  {
    "security_services.services_population_counts": 1,
    "metrics.nb_hypermarches": 1,
    "metrics.nb_pharmacies": 1
  }
);
```

---

## 3. Usage backend recommandé

- **Pour les API de liste / filtres / cartes / comparateurs** :
  - Interroger principalement **PostgreSQL** (`homepedia.communes`).

- **Pour les pages de détail de ville, textes, avis complets, graphiques personnalisés** :
  - Interroger principalement **MongoDB** (`communes_harvest`), en combinant au besoin :
    - `metrics` (valeurs brutes),
    - `presentation`, `security_services`, `real_estate`,
    - `reviews_summary`, `reviews_full`.

