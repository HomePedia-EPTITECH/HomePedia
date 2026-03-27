# Scraper BDMV (`script_BDMV.py`)

## Objectif

Ce script collecte les donnees communales depuis [bien-dans-ma-ville.fr](https://www.bien-dans-ma-ville.fr/) et les ecrit dans MongoDB, avec une structure orientee exploitation (BI, export CSV, Spark).

Le pipeline couvre :
- la constitution d'une queue d'URLs communes depuis le sitemap ;
- le scraping des pages ville, avis et immobilier ;
- l'upsert des donnees dans plusieurs collections Mongo.

## Perimetre fonctionnel

Le scraper extrait notamment :
- demographie (population, age, revenus, densite, elections, etc.) ;
- securite (agressions, cambriolages, vols, stupefiants) ;
- services a la population (commerce, sante, education) ;
- immobilier (prix m2, repartition residences, proprietaires/locataires) ;
- avis (resume et avis bruts).

## Architecture de donnees Mongo

Le script met a jour les collections suivantes :

- `city_pages_queue`  
  File de traitement des pages communes (URL, statut, tentatives, erreurs).

- `communes_harvest`  
  Document riche et structure par blocs (`demography`, `security`, `quality_of_life`, etc.).

- `communes_direct`  
  Version aplatie (1 document par commune, colonnes en racine), recommandee pour SQL-like / Spark.

- `reviews_raw`  
  Avis bruts dedupliques via :
  - `(source, com, external_comment_id)` quand un identifiant existe ;
  - `(source, com, text_hash)` sinon.

- `departements`  
  Table de reference departementale alimentee au fil du scraping.

## Index Mongo

Les index sont assures au demarrage (`_ensure_mongo_indexes`) :
- idempotents ;
- compatibles avec des index deja presents sous un autre nom (code Mongo 85).

Si un index existe deja avec un nom different, le script logue l'information et continue.

## Prerequis

- Python 3.11+ (environnement virtuel recommande) ;
- dependances du projet installees ;
- MongoDB accessible (local Docker ou serveur distant) ;
- variables d'environnement Mongo configurees.

Variables supportees par la config partagee (`packages/shared/util/config.py`) :
- `MONGO_URI` (prioritaire si definie) ;
- sinon `MONGO_HOST`, `MONGO_PORT`, `MONGO_DB` ;
- et selon auth : `MONGO_ROOT_USER` / `MONGO_ROOT_PASSWORD` (ou `MONGO_USER` / `MONGO_PASSWORD`).

## Execution

Depuis la racine projet :

```bash
python packages/scraping/script_BDMV.py
```

Le script :
1. teste la connexion Mongo (`ping`) ;
2. cree/verifie les index ;
3. synchronise la queue via sitemap ;
4. traite les communes en multi-thread ;
5. ferme proprement la connexion Mongo en fin de run.

## Comportement de traitement

- Le scraping est execute via `ThreadPoolExecutor` (`max_workers=12`).
- Chaque thread reutilise sa propre `requests.Session` (thread-local), avec retry HTTP.
- Les ecritures Mongo sont faites en `bulk_write` par lots (`MONGO_BULK_BATCH_SIZE=500`) quand pertinent.
- Les erreurs par commune n'arretent pas tout le run : la queue est mise a jour (`is_processed`, `last_error`, `attempt_count`).

## Qualite et robustesse

- Validation minimale des documents critiques avant persistence (`_validate_commune_doc`) ;
- logs centralises via `logging` ;
- gestion explicite des erreurs HTTP et Mongo ;
- deduplication des avis pour limiter les doublons inter-runs.

## Sorties et exploitation aval (Spark)

Pour un usage analytique, la collection recommandee est `communes_direct` :
- structure plate ;
- plus simple a charger en DataFrame ;
- moins de transformations initiales qu'un document fortement nestee.

`communes_harvest` reste utile comme source detaillee et tracable.

## Points d'attention

- Certaines valeurs restent textuelles (ex. `%`, espaces milliers, devise) : normaliser/caster dans l'etape analytique.
- Le parsing HTML repose sur la structure actuelle du site : si le DOM evolue, ajuster les selecteurs d'extraction.
- Le mode `force_rescrape=True` (dans `start`) re-marque la queue en non traitee pour un run complet.

## Fichiers lies

- `packages/scraping/script_BDMV.py` : pipeline principal ;
- `packages/scraping/models.py` : modeles de donnees (TypedDict/dataclasses) ;
- `packages/shared/util/config.py` : chargement `.env` et URI Mongo ;
- `packages/etl/database/*` : migrations et outillage base de donnees.

