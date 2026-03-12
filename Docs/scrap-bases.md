## Moteur de scraping et bases de données

Ce document décrit l’étape actuelle du projet HomePedia :

- le **moteur de scraping** qui collecte les données depuis `bien-dans-ma-ville.fr` ;
- la **structure des bases de données** (PostgreSQL et MongoDB) utilisées pour stocker ces données ;
- le **flux de données** entre le site source, le script et les bases.

Aucune étape de nettoyage, d’agrégation Big Data ou d’IA n’est décrite ici.

---

## 1. Moteur de scraping `Scrap/script_BDMV.py`

### 1.1. Rôle

Le script `Scrap/script_BDMV.py` constitue le **pipeline d’ingestion** des données :

- lecture de la liste des communes à traiter ;
- construction des URLs de `bien-dans-ma-ville.fr` ;
- téléchargement des pages HTML ;
- extraction des informations utiles ;
- écriture des résultats dans :
  - **PostgreSQL** pour les indicateurs tabulaires,
  - **MongoDB** pour les avis textuels et une représentation JSON des métriques.

### 1.2. Technologies utilisées

- **HTTP** : `requests.Session` avec en-têtes `User-Agent` pour la stabilité des requêtes.
- **Parsing HTML** : `BeautifulSoup` pour analyser la structure des pages (tableaux, sections de notes, avis).
- **Parallélisation** : `ThreadPoolExecutor` pour traiter plusieurs communes en parallèle.
- **Configuration** :
  - paramètres PostgreSQL : `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_HOST`, `POSTGRES_PORT` ;
  - paramètres MongoDB : `MONGO_URI` ou, à défaut, `MONGO_HOST`, `MONGO_PORT`, `MONGO_ROOT_USER`, `MONGO_ROOT_PASSWORD`, `MONGO_DB` ;
  - ces paramètres sont chargés depuis le fichier `.env` à la racine du projet (via `python-dotenv`).

### 1.3. Données extraites par commune

Pour chaque commune identifiée par `(com, nccenr)` :
com = code INSEE de la commune (ex. "75056") ;
nccenr = nom officiel de la commune (ex. "Paris 75056")
- **Présentation & média**
  - bloc de présentation textuelle de la ville ;
  - URLs des images principales de la page.

- **Indicateurs démographiques et sociaux**
  - nombre d’habitants, âge moyen, part de population active ;
  - tranches d’âge, structure par catégories socioprofessionnelles, niveau de diplôme ;
  - composition des ménages ;
  - participation électorale et nombre d’inscrits.

- **Sécurité & services**
  - tableau de délinquance par grande catégorie (agressions, cambriolages, vols/dégradations, stupéfiants) ;
  - liste textuelle des principaux services à la population (si présents sur la page).

- **Scores de qualité de vie** (notes sur 5)
  - sécurité ;
  - environnement ;
  - vie pratique ;
  - loisirs ;
  - éducation.

- **Immobilier**
  - prix moyen au m² pour les maisons et les appartements ;
  - points d’évolution historique des prix (extraits des scripts/graphes) ;
  - répartition résidences principales / secondaires ;
  - parts estimées des baux meublés / non meublés.

- **Avis textuels**
  - note moyenne globale et nombre d’avis ;
  - notes par critère (sécurité, environnement, éducation, etc.) ;
  - liste d’avis structurés (texte intégral, note, date quand disponible) ;
  - listes brutes d’avis positifs, négatifs et complets (support pour l’IA de sentiment).

Ces éléments sont utilisés ensuite pour alimenter les bases de données décrites ci-dessous.

---

## 2. Base relationnelle – PostgreSQL

### 2.1. Rôle de PostgreSQL

PostgreSQL est utilisé comme **base de données relationnelle** pour stocker les indicateurs de chaque commune dans un format tabulaire :

- adapté aux jointures avec d’autres référentiels (INSEE, données socio-économiques, etc.) ;
- adapté aux futures analyses statistiques et requêtes de filtrage / tri ;
- base de référence pour les indicateurs numériques (population, scores, etc.).

### 2.2. Table `homepedia.communes`

- **Création** : script `Database/postgres/migrations/01_init_communes.sql`.
- **Fonction** : recevoir les valeurs issues du scraping pour chaque commune.

**Principales colonnes :**

- `com` (`VARCHAR(10)`) : code INSEE de la commune ;
- `nccenr` (`TEXT`) : nom officiel de la commune ;
- `nb_habitant` (`TEXT`) ;
- `age_moyen` (`TEXT`) ;
- `pop_active` (`TEXT`) ;
- `score_securite` (`TEXT`) ;
- `score_environnement` (`TEXT`) ;
- `score_vie_pratique` (`TEXT`) ;
- `score_loisirs` (`TEXT`) ;
- `score_sante` (`TEXT`) ;
- `score_transports` (`TEXT`) ;
- `score_education` (`TEXT`).

**Pourquoi ces colonnes sont actuellement en `TEXT` :**

- les pages HTML fournissent des valeurs sous forme de chaînes (`"1 250 hab"`, `"36 ans"`, `"65 %"`…) ;
- à ce stade, l’objectif est de **conserver l’information telle qu’extraite** par le scraper, sans imposer immédiatement un typage strict ;
- la conversion en types numériques (`INTEGER`, `NUMERIC`, pourcentages, etc.) sera réalisée dans un traitement ultérieur de nettoyage.

**Clé primaire et index :**

- clé primaire sur `(com, nccenr)` pour identifier de manière unique chaque commune ;
- index complémentaires pour faciliter les recherches par nom de commune ou par certains scores.

---

## 3. Base non relationnelle – MongoDB

### 3.1. Rôle de MongoDB

MongoDB est utilisée comme **base de données documentaire** pour :

- stocker les **avis textuels** associés à chaque commune ;
- conserver une représentation **JSON** des métriques, plus flexible qu’un schéma relationnel rigide ;
- servir de support aux futurs traitements de texte (analyse de sentiment, extraction de mots-clés, word clouds, etc.).

### 3.2. Collection `communes_harvest`

- **Création** :
  - script d’initialisation : `Database/mongo/init/01_init.js` ;
  - script de migration : `Database/mongo/migrations/01_init_communes_harvest.js`.
- **Fonction** : stocker, pour chaque commune, les éléments suivants :

Structure logique simplifiée d’un document :

```json
{
  "com": "75056",
  "metrics": {
    "nb_habitant": "2 145 906",
    "age_moyen": "36 ans",
    "pop_active": "65 %",
    "score_securite": "3.5",
    "score_environnement": "4.0"
    // ...
  },
  "sentiment_analysis_source": {
    "positive": ["Ville très calme...", "..."],
    "negative": ["Beaucoup de bruit...", "..."],
    "all": ["Avis brut 1...", "Avis brut 2..."]
  },
  "url_source": "https://www.bien-dans-ma-ville.fr/paris-75056/",
  "harvested_at": 1710000000.0
}
```

**Index :**

- index **unique** sur le champ `com` pour garantir une seule entrée par commune ;
- index supplémentaires sur certains champs de `metrics` afin de faciliter des requêtes exploratoires.

---

## 4. Flux de données actuel

Le flux actuel, limité au scraping et au stockage, peut être résumé ainsi :

```mermaid
flowchart LR
    A[Site bien-dans-ma-ville.fr] --> B[Script Python<br/>Scrap/script_BDMV.py]

    B -->|Indicateurs (formes brutes)| C[(PostgreSQL<br/>homepedia.communes)]
    B -->|Avis + métriques JSON| D[(MongoDB<br/>communes_harvest)]

    subgraph "Stockage après scraping"
        C
        D
    end
```

- **Source** : le site `bien-dans-ma-ville.fr` ;
- **Traitement** : `Scrap/script_BDMV.py` (collecte, parsing, extraction) ;
- **Stockage** :
  - indicateurs tabulaires dans PostgreSQL (`homepedia.communes`) ;
  - avis et structure JSON des métriques dans MongoDB (`communes_harvest`).


