# HomePedia

Projet compose de 3 couches de donnees:

1. MongoDB stocke les donnees brutes de scrap et les reviews.
2. Spark nettoie, normalise et prepare les tables.
3. PostgreSQL sert de source de verite pour le backend et le frontend.

## Demarrage local

Pre-requis:

- Docker
- Python 3
- `pip install -r requirements.txt`

### 1. Initialiser les bases

```bash
python setup.py
```

Ce script:

- lance Docker;
- attend MongoDB;
- applique les migrations Mongo;
- charge les donnees de base en Mongo.

### 2. Lancer le scrap

```bash
python packages/scraping/script_BDMV.py
```

Le scrap alimente MongoDB uniquement.

### 3. Lancer la pipeline Spark

```bash
python spark/main.py
```

Cette etape:

- lit les donnees brutes depuis Mongo;
- nettoie et harmonise les champs;
- construit les tables Postgres;
- remplit Postgres via les upserts Spark.

Si tu fais seulement le scrap, le backend peut rester vide, car il lit Postgres et non Mongo pour les communes, la geo, les stats et le ranking.

## Ordre recommande apres un reset complet

```bash
docker compose down -v
docker compose up -d
python setup.py
python packages/scraping/script_BDMV.py
python spark/main.py
```

## Verification rapide

- `GET /health`
- `GET /communes`
- `GET /regions`
- `GET /departements`
- `GET /communes/search?q=...`

## Documentation utile

- [Contract API communes](docs/api-contract-communes.md)
- [Analyse des donnees](docs/data-analysis.md)
- [Structure Mongo finale](docs/mongo-final-structure.md)
